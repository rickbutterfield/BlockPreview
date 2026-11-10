import BlockPreviewContext from '../context/block-preview.context';
import { BLOCK_PREVIEW_CONTEXT } from '../context/block-preview.context-token';
import { BlockContext } from './types';
import { css, html, ifDefined, nothing, property, PropertyValueMap, state, unsafeHTML } from '@umbraco-cms/backoffice/external/lit';
import { UMB_BLOCK_WORKSPACE_CONTEXT, UmbBlockDataType, type UmbBlockExposeModel } from '@umbraco-cms/backoffice/block';
import type { UmbBlockEditorCustomViewConfiguration, UmbBlockEditorCustomViewElement } from '@umbraco-cms/backoffice/block-custom-view';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UmbApiError } from '@umbraco-cms/backoffice/resources';
import { resolvePreviewCulture } from './preview-culture';

/** Umbraco elements that make up a block's action bar / resize affordances. A click
 *  whose composed path passes through one of these did not target the block body. */
const BLOCK_ACTION_ELEMENTS = ['UUI-ACTION-BAR', 'UMB-BLOCK-ACTION', 'UMB-BLOCK-SCALE-HANDLER'];

/**
 * Decides whether a click should cancel the preview anchor's navigation.
 *
 * Each preview is wrapped in an `<a class="block-preview-edit">`; when a Block Grid
 * block has areas, its child block entries — including their action bars — render
 * *inside* that anchor. A click on a child action (delete/copy/…) must not follow
 * the ancestor anchor's href (issue #312). Returns true when the click originated in
 * a block action bar or resize handle, except for the edit button, which carries its
 * own `block/edit` href and should be allowed through to open the block workspace.
 */
export function isBlockActionNavigation(path: EventTarget[]): boolean {
    const inActionBar = path.some((x) => x instanceof Element && BLOCK_ACTION_ELEMENTS.includes(x.tagName));
    if (!inActionBar) {
        return false;
    }
    const isEditButton = path.some(
        (x) => x instanceof Element && x.tagName === 'UUI-BUTTON' && (x.getAttribute('href') ?? '').includes('block/edit'),
    );
    return !isEditButton;
}

/**
 * Abstract base class for block preview custom view elements.
 * Extracts shared behavior (lifecycle, rendering, click handling, validation,
 * context observation helpers, and CSS) so that block-type-specific subclasses
 * only implement the parts that differ.
 */
export abstract class BlockPreviewBaseElement<TContext extends BlockContext = BlockContext>
    extends UmbLitElement
    implements UmbBlockEditorCustomViewElement {

    protected _blockPreviewContext?: BlockPreviewContext;
    protected _workspaceContextResolved: boolean = false;

    /**
     * The content type that OWNS the block-editor property being previewed.
     * For a top-level block editor this is the document type; but when the block
     * editor is nested inside an element type, the property is declared on that
     * element type — from the nearest block workspace — not on the root document.
     * Undefined until (and unless) a nearest block workspace is resolved.
     */
    protected _ownerContentTypeUnique?: string;

    @property({ attribute: false, hasChanged: (val: any, old: any) => JSON.stringify(val) !== JSON.stringify(old) })
    content?: UmbBlockDataType;

    @property({ attribute: false, hasChanged: (val: any, old: any) => JSON.stringify(val) !== JSON.stringify(old) })
    settings?: UmbBlockDataType;

    @property({ attribute: false })
    contentKey?: string;

    @property({ attribute: false })
    config?: UmbBlockEditorCustomViewConfiguration;

    @property({ attribute: false })
    unpublished?: boolean;

    @property({ attribute: false })
    icon?: string;

    @property({ attribute: false })
    label?: string;

    @state()
    protected _htmlMarkup: string = '';

    @state()
    protected _isLoading: boolean = false;

    @state()
    protected _error: string | null = null;

    protected _stylesheetsAdopted: boolean = false;

    protected _requestId: number = 0;

    protected _isConnected: boolean = false;

    private _exposes: ReadonlyArray<UmbBlockExposeModel> = [];

    /** Tracks pointerdown position on the <a> tag to distinguish clicks from drags. */
    private _pointerStartPos: { x: number; y: number } | null = null;

    /** Subclass provides a concrete block context object with block-type-specific fields. */
    protected abstract _blockContext: TContext;

    /** Set up all context observers (sort mode, property dataset, workspace). */
    protected abstract setupContextObservers(): Promise<void> | void;

    /** Observe the block entry context for content/settings keys and element type info. */
    protected abstract observeBlockValue(): void;

    /** Call the appropriate BlockPreviewService API method and return the result. */
    protected abstract callPreviewApi(): Promise<{ data?: string | null; error?: unknown }>;

    /** Fetch stylesheet paths from the appropriate BlockPreviewService endpoint. */
    protected abstract fetchStylesheets(): Promise<string[] | undefined>;

    constructor() {
        super();
        this.consumeContext(BLOCK_PREVIEW_CONTEXT, async (context) => {
            this._blockPreviewContext = context;
            // Shared across all block types: resolve the owning content type from the
            // nearest block workspace when nested, so no individual view can silently
            // miss it. Harmless for top-level previews (no block workspace to observe).
            this.observeOwnerContentType();
            await this.setupContextObservers();
        });
    }

    override connectedCallback() {
        super.connectedCallback();
        this._isConnected = true;
        // Capture phase: Umbraco 17.5+ wraps block actions in <umb-block-action>, which
        // stops the click before it can bubble to this preview's <a>. Running in capture
        // lets us cancel the unwanted ancestor navigation before propagation is stopped.
        this.addEventListener('click', this._handleAnchorNavGuard, { capture: true });
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this._isConnected = false;
        this.removeEventListener('click', this._handleAnchorNavGuard, { capture: true });
    }

    /**
     * Cancels the preview anchor's default navigation when a click targets a nested
     * block's action bar rather than the block body (issue #312). Does not stop
     * propagation, so the action button's own handler still runs.
     */
    private _handleAnchorNavGuard = (event: Event) => {
        if (isBlockActionNavigation(event.composedPath())) {
            event.preventDefault();
        }
    };

    protected override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        super.updated(_changedProperties);
        if (_changedProperties.has('content') || _changedProperties.has('settings')) {
            this.renderBlockPreview();
        }
    }

    // region Shared context observers

    protected observePropertyDataset() {
        this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, (instance) => {
            if (instance) {
                this._blockContext.culture = instance.getVariantId().culture ?? '';
            }
        });
    }

    // endregion

    // region Workspace helpers

    /**
     * Shared handler called once the workspace context provides a unique + documentTypeUnique.
     * Sets up block context, triggers block value observation, and loads stylesheets.
     */
    protected async handleWorkspaceData(unique: string | undefined, documentTypeUnique: string | undefined) {
        if (!this._isConnected || !documentTypeUnique) {
            return;
        }

        this._blockContext.unique = unique?.toString() ?? '';
        this._blockPreviewContext?.setUnique(this._blockContext.unique);

        // Prefer the owning element type (nested block editor) over the root document
        // type, so the server can resolve the block-editor property on the type that
        // actually declares it. Falls back to the document type for top-level editors.
        this._blockContext.documentTypeUnique = this._ownerContentTypeUnique ?? documentTypeUnique;
        this._blockPreviewContext?.setDocumentTypeUnique(this._blockContext.documentTypeUnique);
        this._workspaceContextResolved = true;

        this.observeBlockValue();
        await this.fetchAndLoadStylesheets();
    }

    /**
     * Observe the nearest block workspace to resolve the content type that owns the
     * block-editor property. The document/node key still comes from the content
     * workspace (see #297); only the owning content type differs when nested.
     */
    protected observeOwnerContentType() {
        this.consumeContext(UMB_BLOCK_WORKSPACE_CONTEXT, (context) => {
            if (!context) return;
            this.observe(context.content.structure.contentTypeUniques, (contentTypeUniques) => {
                const owner = contentTypeUniques?.[0];
                if (!owner || owner === this._ownerContentTypeUnique) return;
                this._ownerContentTypeUnique = owner;

                if (this._blockContext.documentTypeUnique === owner) return;
                this._blockContext.documentTypeUnique = owner;
                this._blockPreviewContext?.setDocumentTypeUnique(owner);

                // If the workspace already resolved with the (wrong) document type and
                // rendered, re-render now that the owning type is known.
                if (this._workspaceContextResolved) {
                    this.renderBlockPreview();
                }
            });
        });
    }

    /**
     * Fallback workspace observation via UMB_BLOCK_WORKSPACE_CONTEXT.
     * Used when the primary workspace context is unavailable (e.g. nested block editing).
     */
    protected observeBlockWorkspaceFallback() {
        if (this._workspaceContextResolved || !this._blockPreviewContext || this._blockContext.unique !== '') {
            return;
        }

        this.consumeContext(UMB_BLOCK_WORKSPACE_CONTEXT, async (context) => {
            if (context) {
                this.observe(context.content.structure.contentTypeUniques, async (contentTypeUniques) => {
                    const documentTypeUnique = contentTypeUniques[0];
                    if (!this._isConnected || !documentTypeUnique) {
                        return;
                    }

                    // Try to get unique from context, then fallback to extraction
                    this._blockContext.unique = this._blockPreviewContext?.getUnique() ?? '';
                    if (!this._blockContext.unique && this._blockContext.workspaceEditContentPath) {
                        this._blockContext.unique = this.extractUniqueFromWorkspacePath(this._blockContext.workspaceEditContentPath);
                    }

                    this._blockContext.documentTypeUnique = documentTypeUnique;
                    this.observeBlockValue();
                    await this.fetchAndLoadStylesheets();
                });
            }
        });
    }

    protected async fetchAndLoadStylesheets() {
        if (this._stylesheetsAdopted || !this._blockPreviewContext) return;
        const data = await this.fetchStylesheets();
        if (data && data.length > 0) {
            const sheets = await Promise.all(
                data.map(href => this._blockPreviewContext!.getOrCreateStylesheet(href))
            );
            const shadowRoot = this.renderRoot as ShadowRoot;
            shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, ...sheets];
            this._stylesheetsAdopted = true;
        }
    }

    // endregion

    // region Preview rendering

    protected resolveUniqueFromContext() {
        if (this._blockPreviewContext != null && this._blockContext.unique === '') {
            this._blockContext.unique = this._blockPreviewContext.getUnique();
            if (!this._blockContext.unique && this._blockContext.workspaceEditContentPath) {
                this._blockContext.unique = this.extractUniqueFromWorkspacePath(this._blockContext.workspaceEditContentPath);
            }
        }
        if (this._blockPreviewContext != null && this._blockContext.documentTypeUnique === '') {
            this._blockContext.documentTypeUnique = this._blockPreviewContext.getDocumentTypeUnique();
        }
    }

    /**
     * The culture to render the preview in: the culture being edited, or the culture the
     * block was first created in when it hasn't been created in this one yet (#340).
     */
    protected get previewCulture(): string {
        return resolvePreviewCulture(this._blockContext.culture, this._blockContext.contentUdi, this._exposes);
    }

    /**
     * Stores the block value's exposes and re-renders an existing preview when they change
     * the preview culture, e.g. once the block is created in the culture being edited.
     */
    protected setExposes(exposes: ReadonlyArray<UmbBlockExposeModel> | undefined) {
        const previousCulture = this.previewCulture;
        this._exposes = exposes ?? [];

        if (this._htmlMarkup && this.previewCulture !== previousCulture) {
            this.renderBlockPreview();
        }
    }

    protected async renderBlockPreview() {
        if (!this._isConnected) {
            return;
        }

        this.resolveUniqueFromContext();

        if (!this.validatePreviewData()) {
            return;
        }

        this._isLoading = true;
        this._error = null;

        const requestId = ++this._requestId;

        try {
            const { data, error } = await this._blockPreviewContext!.requestQueue.enqueue(() =>
                this.callPreviewApi()
            );

            if (this._requestId !== requestId) return;

            if (data != null) {
                this._htmlMarkup = data;
                this._isLoading = false;
            }
            else if (error) {
                this._error = UmbApiError.isUmbApiError(error) ? error.message : this.localize.term('blockPreview_renderError');
                this._isLoading = false;
            }
            else {
                this._isLoading = false;
            }
        } catch (error) {
            if (this._requestId !== requestId) return;
            this._error = this.localize.term('blockPreview_renderFailed');
            this._isLoading = false;
            console.error('Block preview error:', error);
        }
    }

    /**
     * Validates that sufficient data is available for a preview request.
     * Subclasses may override to add additional checks (e.g. contentUdi).
     */
    protected validatePreviewData(): boolean {
        const context = this._blockContext;
        return !!(
            context.unique !== '' &&
            context.blockEditorAlias !== '' &&
            context.contentElementTypeAlias !== ''
        );
    }

    // endregion

    // region Utilities

    protected extractUniqueFromWorkspacePath(path: string): string {
        // Extract the document unique from the workspace edit path
        // Pattern: /workspace/document/edit/{unique}/
        const match = path.match(/\/workspace\/document\/edit\/([a-f0-9-]{36})/i);
        return match ? match[1] : '';
    }

    protected _handlePointerDown(event: PointerEvent) {
        this._pointerStartPos = { x: event.clientX, y: event.clientY };
    }

    protected _handleClick(event: PointerEvent) {
        // Detect drag/resize interactions: if the pointer moved significantly between
        // pointerdown and click, suppress the navigation. This prevents the edit modal
        // from opening when the user finishes resizing a grid block.
        const pointerType = 'pointerType' in event ? (event as PointerEvent).pointerType : '';
        if (pointerType !== '') {
            if (!this._pointerStartPos) {
                // Pointer click with no corresponding pointerdown on this element —
                // likely a resize/drag that ended over our <a> tag.
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            const dx = Math.abs(event.clientX - this._pointerStartPos.x);
            const dy = Math.abs(event.clientY - this._pointerStartPos.y);
            this._pointerStartPos = null;
            if (dx > 5 || dy > 5) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
        this._pointerStartPos = null;

        const path = event.composedPath();

        // Cancel navigation for clicks on a nested block's action bar / resize handle
        // (delete, copy, …) so the parent block's <a> doesn't navigate when interacting
        // with child blocks inside areas. Shares its decision with the capture-phase
        // guard; the edit button carries its own block/edit href and is allowed through.
        if (isBlockActionNavigation(path)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        // Handle custom links within the preview
        const containsLink = path.filter(x => x instanceof Element && x.tagName === 'A' && x.hasAttribute('data-block-preview-link')) as Element[];
        if (containsLink.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            const blockPreviewEdit = path.find(x => x instanceof Element && x.tagName === 'A' && x.classList.contains('block-preview-edit'));
            if (blockPreviewEdit instanceof Element) {
                window.history.pushState({}, '', blockPreviewEdit.getAttribute('href'));
            } else {
                window.history.pushState({}, '', this._blockContext.workspaceEditContentPath);
            }
            return;
        }

        // All other clicks fall through to the <a> element's default behavior,
        // which navigates to this block's edit workspace.
    }

    // endregion

    // region Rendering

    override render() {
        return html`
            ${this._isLoading
                ? html`<div class="preview-alert preview-alert-info"><uui-loader></uui-loader> <umb-localize key="blockPreview_loading">Loading preview...</umb-localize></div>`
                : this._error
                    ? html`<div class="preview-alert preview-alert-error" role="alert">${this._error}</div>`
                    : this._htmlMarkup
                        ? html`<a
                            href=${ifDefined(this._blockContext.workspaceEditContentPath)}
                            @pointerdown=${this._handlePointerDown}
                            @click=${this._handleClick}
                            aria-label=${this.localize.term('blockPreview_editBlock')}
                            class="block-preview-edit"
							title=${ifDefined(this._blockContext.contentElementTypeAlias)}
                        >${unsafeHTML(this._htmlMarkup)}</a>`
                        : nothing}
        `;
    }

    // endregion

    static styles = [
        css`
            a.block-preview-edit {
                display: block;
                color: inherit;
                text-decoration: inherit;
                border: 1px solid transparent;
                border-radius: 2px;
            }

            a.block-preview-edit:hover {
                border-color: var(--uui-color-interactive-emphasis, #3544b1);
            }

            .preview-alert {
                background-color: var(--uui-color-danger, #f0ac00);
                border: 1px solid transparent;
                border-radius: 0;
                margin-bottom: 20px;
                padding: 8px 35px 8px 14px;
                position: relative;

                &, a, h4 {
                    color: #fff;
                }

                pre {
                    white-space: normal;
                }

                uui-loader {
                    color: #fff;
                    margin-right: 16px;
                }
            }

            .preview-alert-warning {
                background-color: var(--uui-color-warning, #f0ac00);
                border-color: transparent;
                color: #000;
            }

            .preview-alert-info {
                background-color: var(--uui-color-default, #3544b1);
                border-color: transparent;
                color: #fff;
            }

            .preview-alert-danger, .preview-alert-error {
                background-color: var(--uui-color-danger, #f0ac00);
                border-color: transparent;
                color: #fff;
            }
        `
    ]
}
