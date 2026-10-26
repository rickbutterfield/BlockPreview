import { BlockPreviewBaseElement } from './block-preview-base.element';
import { BlockContext } from './types';
import { PreviewDataSource } from '../repository';
import { customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_BLOCK_RTE_ENTRY_CONTEXT, UMB_BLOCK_RTE_MANAGER_CONTEXT, UmbBlockRteValueModel } from "@umbraco-cms/backoffice/block-rte";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";

const elementName = "rich-text-preview";

@customElement(elementName)
export class RichTextPreviewCustomView extends BlockPreviewBaseElement<BlockContext> {

    #previewDataSource: PreviewDataSource;

    constructor() {
        super();
        this.#previewDataSource = new PreviewDataSource(this);
    }

    protected _blockContext: BlockContext = {
        unique: '',
        documentTypeUnique: '',
        contentUdi: '',
        settingsUdi: '',
        blockEditorAlias: '',
        culture: '',
        workspaceEditContentPath: '',
        contentElementTypeAlias: '',
        contentElementTypeKey: '',
        blockIndex: 0
    };

    @state()
    private _blockRteValue: UmbBlockRteValueModel = {
        layout: {},
        expose: [],
        contentData: [],
        settingsData: []
    }

    @property({ attribute: false })
    public set blockRteValue(value: UmbBlockRteValueModel | undefined) {
        const buildUpValue: Partial<UmbBlockRteValueModel> = value ? { ...value } : {};
        buildUpValue.layout ??= {};
        buildUpValue.contentData ??= [];
        buildUpValue.settingsData ??= [];
        buildUpValue.expose ??= [];
        this._blockRteValue = buildUpValue as UmbBlockRteValueModel;
    }
    public get blockRteValue(): UmbBlockRteValueModel {
        return this._blockRteValue;
    }

    protected setupContextObservers() {
        this.observePropertyDataset();
        // Observe the block entry/manager contexts independently of the workspace.
        // These RTE-specific contexts are always available to the block view, whereas
        // UMB_DOCUMENT_WORKSPACE_CONTEXT is absent when the host block is edited inside a
        // side-panel modal (e.g. an RTE field on a block nested in a Block Grid/List).
        // Gating this behind the document workspace meant the preview never rendered there.
        this.observeBlockValue();
        this.#observeDocumentWorkspace();
    }

    #observeDocumentWorkspace() {
        try {
            // The document workspace shares its context alias with the block workspace,
            // so when this preview is nested inside another block we must pass beyond
            // the nearer block workspace match to reach the document workspace.
            this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (context) => {
                if (context) {
                    this._workspaceContextResolved = true;
                    this.observe(
                        observeMultiple([context.unique, context.contentTypeUnique]),
                        async ([unique, documentTypeUnique]) => {
                            await this.handleWorkspaceData(unique?.toString(), documentTypeUnique);
                        }
                    );
                }
            }).passContextAliasMatches();
        } catch {
            this.observeBlockWorkspaceFallback();
        }
    }

    #entryObserved = false;

    protected observeBlockValue(): void {
        // Set up the entry-context subscription only once; it is now invoked both from
        // setupContextObservers and (for the document-level case) from handleWorkspaceData.
        if (this.#entryObserved) return;
        this.#entryObserved = true;
        this.consumeContext(UMB_BLOCK_RTE_ENTRY_CONTEXT, (context) => {
            if (context != null) {
                this.observe(
                    observeMultiple([
                        context.contentKey,
                        context.settingsKey,
                        context.workspaceEditContentPath,
                        context.contentElementTypeAlias,
                        context.contentElementTypeKey
                    ]),
                    async ([
                        contentUdi,
                        settingsUdi,
                        workspaceEditContentPath,
                        contentElementTypeAlias,
                        contentElementTypeKey
                    ]) => {
                        this._blockContext.contentUdi = contentUdi ?? '';
                        this._blockContext.settingsUdi = settingsUdi ?? '';
                        this._blockContext.workspaceEditContentPath = workspaceEditContentPath ?? '';
                        this._blockContext.contentElementTypeAlias = contentElementTypeAlias ?? '';
                        this._blockContext.contentElementTypeKey = contentElementTypeKey ?? '';

                        // Only subscribe to manager context once contentUdi is known; subscribing with
                        // an empty key causes the manager to filter contentData to [] on its first emit,
                        // and the #managerObserved guard then blocks a corrective re-subscription.
                        if (!this.#managerObserved && this._blockContext.contentUdi) {
                            this.#managerObserved = true;
                            await this.#observeBlockPropertyValue();
                        }
                    });
            }
        });
    }

    #managerObserved = false;

    #observeBlockPropertyValue(): void {
        this.consumeContext(UMB_BLOCK_RTE_MANAGER_CONTEXT, (context) => {
            if (context != null) {
                this.observe(
                    observeMultiple([
                        context.contents,
                        context.settings,
                        context.layouts,
                        context.exposes,
                        context.propertyAlias
                    ]),
                    async ([
                        contents,
                        settings,
                        layouts,
                        exposes,
                        propertyAlias
                    ]) => {
                        this._blockContext.blockEditorAlias = propertyAlias ?? '';

                        this.blockRteValue = {
                            contentData: contents?.filter(x => x.key === this._blockContext.contentUdi) ?? [],
                            settingsData: settings?.filter(x => x.key === this._blockContext.settingsUdi) ?? [],
                            expose: exposes?.filter(x => x.contentKey === this._blockContext.contentUdi) ?? [],
                            layout: {
                                ['Umbraco.RichText']: layouts?.filter(x => x.contentKey === this._blockContext.contentUdi) ?? []
                            }
                        };
                        this.setExposes(exposes);
                        if (!this._htmlMarkup && !this._isLoading) {
                            this.renderBlockPreview();
                        }
                    });
            }
        });
    }

    protected async callPreviewApi() {
        return await this.#previewDataSource.previewRichTextMarkup(
            JSON.stringify(this.blockRteValue),
            {
                blockEditorAlias: this._blockContext.blockEditorAlias,
                nodeKey: this._blockContext.unique,
                contentElementAlias: this._blockContext.contentElementTypeAlias,
                documentTypeUnique: this._blockContext.documentTypeUnique,
                culture: this.previewCulture
            }
        );
    }

    protected async fetchStylesheets() {
        const { data } = await this.#previewDataSource.getRteStylesheets({
            documentTypeUnique: this._blockContext.documentTypeUnique,
            nodeKey: this._blockContext.unique
        });
        return data;
    }
}

export default RichTextPreviewCustomView;

declare global {
    interface HTMLElementTagNameMap {
        [elementName]: RichTextPreviewCustomView;
    }
}
