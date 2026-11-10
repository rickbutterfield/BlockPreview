import { BlockPreviewBaseElement } from './block-preview-base.element';
import { BlockListContext } from './types';
import { PreviewDataSource } from '../repository';
import { css, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_BLOCK_LIST_ENTRY_CONTEXT, UMB_BLOCK_LIST_MANAGER_CONTEXT, UmbBlockListValueModel } from "@umbraco-cms/backoffice/block-list";
import { UMB_CONTENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/content";
import { observeMultiple } from "@umbraco-cms/backoffice/observable-api";

const elementName = "block-list-preview";

@customElement(elementName)
export class BlockListPreviewCustomView extends BlockPreviewBaseElement<BlockListContext> {

    #previewDataSource: PreviewDataSource;

    constructor() {
        super();
        this.#previewDataSource = new PreviewDataSource(this);
    }

    protected _blockContext: BlockListContext = {
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
    private _blockListValue: UmbBlockListValueModel = {
        layout: {},
        expose: [],
        contentData: [],
        settingsData: []
    };

    @property({ attribute: false })
    public set blockListValue(value: UmbBlockListValueModel | undefined) {
        const buildUpValue: Partial<UmbBlockListValueModel> = value ? { ...value } : {};
        buildUpValue.layout ??= {};
        buildUpValue.contentData ??= [];
        buildUpValue.settingsData ??= [];
        buildUpValue.expose ??= [];
        this._blockListValue = buildUpValue as UmbBlockListValueModel;
    }

    public get blockListValue(): UmbBlockListValueModel {
        return this._blockListValue;
    }

    protected async setupContextObservers() {
        this.observePropertyDataset();
        await this.#observeContentWorkspace();
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
        this.consumeContext(UMB_BLOCK_LIST_ENTRY_CONTEXT, (context) => {
            if (context) {
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
                    }
                );
            }
        });
    }

    #managerObserved = false;

    #observeBlockPropertyValue() {
        this.consumeContext(UMB_BLOCK_LIST_MANAGER_CONTEXT, (context) => {
            if (context) {
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

                        this.blockListValue = {
                            contentData: contents?.filter(x => x.key === this._blockContext.contentUdi) ?? [],
                            settingsData: settings?.filter(x => x.key === this._blockContext.settingsUdi) ?? [],
                            expose: exposes?.filter(x => x.contentKey === this._blockContext.contentUdi) ?? [],
                            layout: {
                                ['Umbraco.BlockList']: layouts?.filter(x => x.contentKey === this._blockContext.contentUdi) ?? []
                            }
                        };

                        this.setExposes(exposes);
                        this._blockContext.blockIndex = contents?.indexOf(this.blockListValue.contentData[0]);
                        if (!this._htmlMarkup && !this._isLoading) {
                            this.renderBlockPreview();
                        }
                    }
                );
            }
        });
    }

    protected async callPreviewApi() {
        return await this.#previewDataSource.previewListBlock(
            JSON.stringify(this.blockListValue),
            {
                blockEditorAlias: this._blockContext.blockEditorAlias,
                nodeKey: this._blockContext.unique,
                contentElementAlias: this._blockContext.contentElementTypeAlias,
                documentTypeUnique: this._blockContext.documentTypeUnique,
                contentUdi: this._blockContext.contentUdi,
                settingsUdi: this._blockContext.settingsUdi,
                culture: this.previewCulture,
                blockIndex: this._blockContext.blockIndex,
            }
        );
    }

    protected async fetchStylesheets() {
        const { data } = await this.#previewDataSource.getListStylesheets({
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

export default BlockListPreviewCustomView;

declare global {
    interface HTMLElementTagNameMap {
        [elementName]: BlockListPreviewCustomView;
    }
}
