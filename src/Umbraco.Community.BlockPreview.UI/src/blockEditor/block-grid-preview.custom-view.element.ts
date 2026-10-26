import { BlockPreviewBaseElement } from './block-preview-base.element';
import { BlockGridContext } from './types';
import { PreviewDataSource } from '../repository';
import { css, customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UMB_BLOCK_GRID_ENTRY_CONTEXT, UMB_BLOCK_GRID_MANAGER_CONTEXT, UmbBlockGridLayoutModel, UmbBlockGridValueModel, UmbBlockGridLayoutAreaItemModel } from "@umbraco-cms/backoffice/block-grid";
import { UMB_CONTENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/content";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";
import { decideGridRenderTrigger, ResizeDebouncer } from './render-scheduler';

const elementName = "block-grid-preview";

@customElement(elementName)
export class BlockGridPreviewCustomView extends BlockPreviewBaseElement<BlockGridContext> {

    #previewDataSource: PreviewDataSource;

    constructor() {
        super();
        this.#previewDataSource = new PreviewDataSource(this);
    }

    protected _blockContext: BlockGridContext = {
        unique: "",
        documentTypeUnique: "",
        contentUdi: "",
        settingsUdi: "",
        blockEditorAlias: "",
        culture: "",
        workspaceEditContentPath: "",
        contentElementTypeAlias: "",
        contentElementTypeKey: "",
        areas: [],
        layout: undefined,
        layoutAreas: undefined,
        blockIndex: 0
    };

    private _blockGridValue: UmbBlockGridValueModel = {
        layout: {},
        expose: [],
        contentData: [],
        settingsData: []
    }

    @property({ attribute: false })
    public set blockGridValue(value: UmbBlockGridValueModel | undefined) {
        const buildUpValue: Partial<UmbBlockGridValueModel> = value ? { ...value } : {};
        buildUpValue.layout ??= {};
        buildUpValue.contentData ??= [];
        buildUpValue.settingsData ??= [];
        buildUpValue.expose ??= [];
        this._blockGridValue = buildUpValue as UmbBlockGridValueModel;
    }
    public get blockGridValue(): UmbBlockGridValueModel {
        return this._blockGridValue;
    }

    protected async setupContextObservers() {
        this.observePropertyDataset();
        await this.#observeContentWorkspace();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#resizeDebouncer.cancel();
    }

    async #observeContentWorkspace() {
        try {
            // The content workspace shares its context alias with the block workspace,
            // so when this preview is nested inside another block we must pass beyond
            // the nearer block workspace match to reach the document content workspace.
            await this.getContext(UMB_CONTENT_WORKSPACE_CONTEXT, { passContextAliasMatches: true });
            this.consumeContext(UMB_CONTENT_WORKSPACE_CONTEXT, (context) => {
                if (!context) return;

                this.observe(
                    observeMultiple([context.unique, context.structure.contentTypeUniques]),
                    async ([unique, contentTypeUniques]) => {
                        await this.handleWorkspaceData(unique?.toString(), contentTypeUniques?.[0]);
                    }
                );
            }).passContextAliasMatches();
        } catch {
            this.observeBlockWorkspaceFallback();
        }
    }

    protected observeBlockValue() {
        this.consumeContext(UMB_BLOCK_GRID_ENTRY_CONTEXT, async (context) => {
            if (context) {
                this.observe(
                    observeMultiple([
                        context.contentKey,
                        context.settingsKey,
                        context.workspaceEditContentPath,
                        context.contentElementTypeAlias,
                        context.contentElementTypeKey,
                        context.areas,
                        context.layout,
                        context.layoutAreas
                    ]),
                    async ([
                        contentUdi,
                        settingsUdi,
                        workspaceEditContentPath,
                        contentElementTypeAlias,
                        contentElementTypeKey,
                        areas,
                        layout,
                        layoutAreas
                    ]) => {
                        const prevColumnSpan = this._blockContext.layout?.columnSpan;
                        const prevRowSpan = this._blockContext.layout?.rowSpan;
                        const prevLayoutAreas = this._blockContext.layoutAreas;

                        this._blockContext.contentUdi = contentUdi ?? '';
                        this._blockContext.settingsUdi = settingsUdi ?? '';
                        this._blockContext.workspaceEditContentPath = workspaceEditContentPath ?? '';
                        this._blockContext.contentElementTypeAlias = contentElementTypeAlias ?? '';
                        this._blockContext.contentElementTypeKey = contentElementTypeKey ?? '';
                        this._blockContext.areas = areas;
                        this._blockContext.layout = layout!;
                        this._blockContext.layoutAreas = layoutAreas;

                        if (!this.#managerObserved && this._blockContext.contentUdi) {
                            this.#managerObserved = true;
                            await this.#observeBlockPropertyValue();
                        }

                        const trigger = decideGridRenderTrigger(
                            { layoutAreas: prevLayoutAreas, layout: { columnSpan: prevColumnSpan, rowSpan: prevRowSpan } },
                            { areas, layoutAreas, layout },
                            { hasMarkup: !!this._htmlMarkup, managerObserved: this.#managerObserved },
                        );

                        if (trigger.kind === 'render') {
                            this.blockGridValue = {
                                ...this._blockGridValue,
                                layout: { ['Umbraco.BlockGrid']: this.#filterLayouts() }
                            };
                            this.renderBlockPreview();
                        } else if (trigger.kind === 'debounce') {
                            this.blockGridValue = {
                                ...this._blockGridValue,
                                layout: { ['Umbraco.BlockGrid']: this.#filterLayouts() }
                            };
                            this.#resizeDebouncer.schedule(trigger.delayMs, () => this.renderBlockPreview());
                        }
                    }
                );
            }
        });
    }

    #managerObserved = false;
    #resizeDebouncer = new ResizeDebouncer();

    async #observeBlockPropertyValue() {
        this.consumeContext(UMB_BLOCK_GRID_MANAGER_CONTEXT, (context) => {
            if (context) {
                this.observe(
                    observeMultiple([
                        context.contents,
                        context.settings,
                        context.exposes,
                        context.propertyAlias
                    ]),
                    async ([contents, settings, exposes, propertyAlias]) => {
                        this._blockContext.blockEditorAlias = propertyAlias ?? '';
                        this.blockGridValue = {
                            contentData: contents ?? [],
                            settingsData: settings ?? [],
                            expose: exposes ?? [],
                            layout: { ['Umbraco.BlockGrid']: this.#filterLayouts() }
                        };
                        this.setExposes(exposes);
                        this._blockContext.blockIndex = (contents ?? []).findIndex(x => x.key === this._blockContext.contentUdi);
                        if (!this._htmlMarkup && !this._isLoading) {
                            // Render straight away, even when the block has areas whose
                            // layoutAreas has not arrived. A newly added, unsaved block is
                            // created with an empty partialLayoutEntry, so its layout has no
                            // `areas` key and layoutAreas never arrives at all -- deferring
                            // left those blocks permanently blank, with the area's "Add new
                            // Layout" button unreachable (#322). #filterLayouts() already
                            // defaults each area's items to [], so this renders a correct
                            // empty grid, and decideGridRenderTrigger re-renders if real
                            // layoutAreas does show up later (#293).
                            this.renderBlockPreview();
                        }
                    }
                );
            }
        });
    }

    #filterLayouts(): UmbBlockGridLayoutModel[] {
        const areas = this._blockContext.areas.map(area => {
            const model: UmbBlockGridLayoutAreaItemModel = {
                key: area.key,
                items: this._blockContext.layoutAreas?.find(layout => layout.key === area.key)?.items ?? []
            }
            return model;
        });

        const layoutModel: UmbBlockGridLayoutModel[] =
            [
                {
                    areas: areas,
                    columnSpan: this._blockContext.layout?.columnSpan ?? 0,
                    rowSpan: this._blockContext.layout?.rowSpan ?? 0,
                    contentKey: this._blockContext.layout?.contentKey ?? '',
                    settingsKey: this._blockContext.layout?.settingsKey
                }
            ];

        return layoutModel;
    }

    protected async callPreviewApi() {
        return await this.#previewDataSource.previewGridBlock(
            JSON.stringify(this.blockGridValue),
            {
                blockEditorAlias: this._blockContext.blockEditorAlias,
                nodeKey: this._blockContext.unique,
                contentElementAlias: this._blockContext.contentElementTypeAlias,
                documentTypeUnique: this._blockContext.documentTypeUnique,
                contentUdi: this._blockContext.contentUdi,
                settingsUdi: this._blockContext.settingsUdi,
                culture: this.previewCulture,
                blockIndex: this._blockContext.blockIndex
            }
        );
    }

    protected async fetchStylesheets() {
        const { data } = await this.#previewDataSource.getGridStylesheets({
            documentTypeUnique: this._blockContext.documentTypeUnique,
            nodeKey: this._blockContext.unique
        });
        return data;
    }

    protected override validatePreviewData(): boolean {
        return super.validatePreviewData() && this._blockContext.contentUdi !== '';
    }

    static override styles = [
        ...BlockPreviewBaseElement.styles,
        css`
            :host {
                display: block;
                height: 100%;
            }

            a.block-preview-edit {
                height: 100%;
            }
        `
    ]
}

export default BlockGridPreviewCustomView;

declare global {
    interface HTMLElementTagNameMap {
        [elementName]: BlockGridPreviewCustomView;
    }
}
