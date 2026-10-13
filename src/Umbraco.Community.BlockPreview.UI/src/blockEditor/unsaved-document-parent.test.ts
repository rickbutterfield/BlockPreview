import { expect, fixture, defineCE } from '@open-wc/testing';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbStringState, UmbArrayState, UmbBasicState } from '@umbraco-cms/backoffice/observable-api';
import { UMB_CONTENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/content';
import { UMB_PARENT_ENTITY_CONTEXT, type UmbEntityModel } from '@umbraco-cms/backoffice/entity';
import { UMB_BLOCK_LIST_ENTRY_CONTEXT, UMB_BLOCK_LIST_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/block-list';
import { BLOCK_PREVIEW_CONTEXT } from '../context/block-preview.context-token';
import { BlockPreviewService } from '../api';
import { BlockListPreviewCustomView } from './block-list-preview.custom-view.element';

/**
 * A document that has not been saved yet does not exist on the server, so the server
 * cannot find it by nodeKey. Every preview then failed: the block data had no owner and
 * the published request had no page, so views reading Umbraco.AssignedContentItem threw.
 * The preview now sends the parent's key, which the server renders against instead.
 *
 * The parent comes from UMB_PARENT_ENTITY_CONTEXT, which resolves asynchronously. A new
 * document must render again once it arrives; a saved one must not, or every block on
 * every document would render twice on load.
 */

const DOC_KEY = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DOC_TYPE_KEY = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CONTENT_KEY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ELEMENT_TYPE_KEY = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const PARENT_KEY = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const PARENT: UmbEntityModel = { entityType: 'document', unique: PARENT_KEY };

class TestHostElement extends UmbLitElement {}
const testHostTag = defineCE(TestHostElement);
const previewTag = defineCE(class extends BlockListPreviewCustomView {});

function createBlockPreviewContextFake(host: HTMLElement) {
    return {
        getUnique: () => '',
        setUnique: (_u: string) => {},
        getDocumentTypeUnique: () => '',
        setDocumentTypeUnique: (_d: string) => {},
        requestQueue: { enqueue: <T>(fn: () => Promise<T>) => fn() },
        getOrCreateStylesheet: (_href: string) => Promise.resolve(new CSSStyleSheet()),
        getHostElement: () => host,
    };
}

function createContentWorkspaceFake(host: HTMLElement, isNew: boolean) {
    return {
        IS_CONTENT_WORKSPACE_CONTEXT: true,
        getEntityType: () => 'document',
        unique: new UmbStringState(DOC_KEY).asObservable(),
        isNew: new UmbBasicState<boolean | undefined>(isNew).asObservable(),
        structure: {
            contentTypeUniques: new UmbArrayState<string>([DOC_TYPE_KEY], (x) => x).asObservable(),
        },
        getHostElement: () => host,
    };
}

function createParentEntityFake(host: HTMLElement, parentState: UmbBasicState<UmbEntityModel | undefined>) {
    return {
        parent: parentState.asObservable(),
        getHostElement: () => host,
    };
}

function createListEntryFake(host: HTMLElement) {
    return {
        contentKey: new UmbStringState(CONTENT_KEY).asObservable(),
        settingsKey: new UmbBasicState<string | undefined>(undefined).asObservable(),
        workspaceEditContentPath: new UmbStringState('/edit/path').asObservable(),
        contentElementTypeAlias: new UmbStringState('myElement').asObservable(),
        contentElementTypeKey: new UmbStringState(ELEMENT_TYPE_KEY).asObservable(),
        getHostElement: () => host,
    };
}

function createListManagerFake(host: HTMLElement) {
    return {
        contents: new UmbArrayState([{ key: CONTENT_KEY, contentTypeKey: ELEMENT_TYPE_KEY }], (x: { key: string }) => x.key).asObservable(),
        settings: new UmbArrayState<{ key: string }>([], (x) => x.key).asObservable(),
        layouts: new UmbArrayState([{ contentKey: CONTENT_KEY }], (x: { contentKey: string }) => x.contentKey).asObservable(),
        exposes: new UmbArrayState<{ contentKey: string }>([], (x) => x.contentKey).asObservable(),
        propertyAlias: new UmbStringState('myBlockList').asObservable(),
        getHostElement: () => host,
    };
}

async function waitForCondition(fn: () => boolean, timeout = 2000, interval = 20): Promise<boolean> {
    const start = performance.now();
    while (performance.now() - start < timeout) {
        if (fn()) return true;
        await new Promise((r) => setTimeout(r, interval));
    }
    return fn();
}

describe('block list preview of an unsaved document', () => {
    let root: TestHostElement;
    let previewQueries: { parentKey?: string }[];
    let stylesheetQueries: { parentKey?: string }[];
    const originalPreviewListBlock = BlockPreviewService.previewListBlock;
    const originalGetListStylesheets = BlockPreviewService.getListStylesheets;

    beforeEach(() => {
        previewQueries = [];
        stylesheetQueries = [];
        BlockPreviewService.previewListBlock = ((options: { query: { parentKey?: string } }) => {
            previewQueries.push(options.query);
            return Promise.resolve({ data: '<div>preview</div>' });
        }) as never;
        BlockPreviewService.getListStylesheets = ((options: { query: { parentKey?: string } }) => {
            stylesheetQueries.push(options.query);
            return Promise.resolve({ data: ['/css/preview.css'] });
        }) as never;
    });

    afterEach(() => {
        root?.remove();
        BlockPreviewService.previewListBlock = originalPreviewListBlock;
        BlockPreviewService.getListStylesheets = originalGetListStylesheets;
    });

    async function mount(isNew: boolean, parentState: UmbBasicState<UmbEntityModel | undefined>) {
        root = await fixture<TestHostElement>(`<${testHostTag}></${testHostTag}>`);
        root.provideContext(BLOCK_PREVIEW_CONTEXT, createBlockPreviewContextFake(root) as never);
        root.provideContext(UMB_CONTENT_WORKSPACE_CONTEXT, createContentWorkspaceFake(root, isNew) as never);
        root.provideContext(UMB_PARENT_ENTITY_CONTEXT, createParentEntityFake(root, parentState) as never);
        root.provideContext(UMB_BLOCK_LIST_ENTRY_CONTEXT, createListEntryFake(root) as never);
        root.provideContext(UMB_BLOCK_LIST_MANAGER_CONTEXT, createListManagerFake(root) as never);

        root.appendChild(document.createElement(previewTag));
    }

    it('sends the parent key with the preview and stylesheet requests', async () => {
        await mount(true, new UmbBasicState<UmbEntityModel | undefined>(PARENT));

        const rendered = await waitForCondition(() => previewQueries.length > 0 && stylesheetQueries.length > 0);

        expect(rendered).to.be.true;
        expect(previewQueries[0].parentKey).to.equal(PARENT_KEY);
        expect(stylesheetQueries[0].parentKey).to.equal(PARENT_KEY);
    });

    it('renders a new document again once its parent resolves', async () => {
        const parentState = new UmbBasicState<UmbEntityModel | undefined>(undefined);
        await mount(true, parentState);

        await waitForCondition(() => previewQueries.length > 0);
        expect(previewQueries[0].parentKey).to.be.undefined;

        parentState.setValue(PARENT);

        const reRendered = await waitForCondition(() => previewQueries.length > 1);

        expect(reRendered, 'expected a second preview request once the parent resolved').to.be.true;
        expect(previewQueries[1].parentKey).to.equal(PARENT_KEY);
    });

    it('does not render a saved document again when its parent resolves', async () => {
        const parentState = new UmbBasicState<UmbEntityModel | undefined>(undefined);
        await mount(false, parentState);

        await waitForCondition(() => previewQueries.length > 0);
        parentState.setValue(PARENT);

        const reRendered = await waitForCondition(() => previewQueries.length > 1, 500);

        expect(reRendered, `expected a single preview request, got ${previewQueries.length}`).to.be.false;
    });
});
