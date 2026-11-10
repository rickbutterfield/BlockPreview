import { expect, fixture, defineCE } from '@open-wc/testing';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbStringState, UmbArrayState, UmbBasicState } from '@umbraco-cms/backoffice/observable-api';
import { UMB_CONTENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/content';
import {
    UMB_BLOCK_GRID_ENTRY_CONTEXT,
    UMB_BLOCK_GRID_MANAGER_CONTEXT,
    type UmbBlockGridLayoutAreaItemModel,
    type UmbBlockGridLayoutModel,
} from '@umbraco-cms/backoffice/block-grid';
import { BLOCK_PREVIEW_CONTEXT } from '../context/block-preview.context-token';
import { BlockGridPreviewCustomView } from './block-grid-preview.custom-view.element';

/**
 * Element-level regression tests for the Block Grid preview's render timing.
 * render-scheduler.test.ts covers the decision in isolation; this proves
 * BlockGridPreviewCustomView is actually wired to it.
 *
 * Two issues pull in opposite directions and are both pinned here:
 *
 *  - #322: a newly added, unsaved block has no `areas` key on its layout entry at
 *    all, so `layoutAreas` never arrives. Deferring the first render on missing
 *    layoutAreas left those blocks permanently blank.
 *  - #293: a saved block's `layoutAreas` can arrive after the first preview request
 *    has already gone out, so the first render carries empty areas and the preview
 *    must re-render once the real area data lands.
 *
 * Rendering immediately (#322) is only safe because the layoutAreas-arrived
 * re-render is guaranteed to fire even mid-request (#293).
 */

const DOC_KEY = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DOC_TYPE_KEY = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CONTENT_KEY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ELEMENT_TYPE_KEY = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const AREA_KEY = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const NESTED_CONTENT_KEY = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

class TestHostElement extends UmbLitElement {}
const testHostTag = defineCE(TestHostElement);

class SpyGridPreview extends BlockGridPreviewCustomView {
    public renderCalls: string[] = [];
    /** Holds each preview request open so a test can act while one is in flight. */
    public apiDelayMs = 0;
    protected override async callPreviewApi() {
        this.renderCalls.push(JSON.stringify(this.blockGridValue.layout));
        if (this.apiDelayMs > 0) {
            await new Promise((r) => setTimeout(r, this.apiDelayMs));
        }
        return { data: '<div>preview</div>' };
    }
    protected override async fetchStylesheets() {
        return [];
    }
}
const previewTag = defineCE(SpyGridPreview);

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

function createContentWorkspaceFake(host: HTMLElement) {
    return {
        IS_CONTENT_WORKSPACE_CONTEXT: true,
        getEntityType: () => 'document',
        unique: new UmbStringState(DOC_KEY).asObservable(),
        structure: {
            contentTypeUniques: new UmbArrayState<string>([DOC_TYPE_KEY], (x) => x).asObservable(),
        },
        getHostElement: () => host,
    };
}

function createGridEntryFake(host: HTMLElement, layoutAreasState: UmbBasicState<UmbBlockGridLayoutAreaItemModel[] | undefined>, hasAreas: boolean) {
    return {
        contentKey: new UmbStringState(CONTENT_KEY).asObservable(),
        settingsKey: new UmbBasicState<string | undefined>(undefined).asObservable(),
        workspaceEditContentPath: new UmbStringState('/edit/path').asObservable(),
        contentElementTypeAlias: new UmbStringState('myElement').asObservable(),
        contentElementTypeKey: new UmbStringState(ELEMENT_TYPE_KEY).asObservable(),
        areas: new UmbArrayState(hasAreas ? [{ key: AREA_KEY }] : [], (x: { key: string }) => x.key).asObservable(),
        layout: new UmbBasicState<UmbBlockGridLayoutModel>({ contentKey: CONTENT_KEY, columnSpan: 6, rowSpan: 1, areas: [] }).asObservable(),
        layoutAreas: layoutAreasState.asObservable(),
        getHostElement: () => host,
    };
}

function createGridManagerFake(host: HTMLElement) {
    return {
        contents: new UmbArrayState([{ key: CONTENT_KEY, contentTypeKey: ELEMENT_TYPE_KEY }], (x: { key: string }) => x.key).asObservable(),
        settings: new UmbArrayState<{ key: string }>([], (x) => x.key).asObservable(),
        exposes: new UmbArrayState<{ contentKey: string }>([], (x) => x.contentKey).asObservable(),
        propertyAlias: new UmbStringState('myBlockGrid').asObservable(),
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

describe('block grid preview render timing (issues #293/#294/#322)', () => {
    let root: TestHostElement;

    afterEach(() => root?.remove());

    async function mountHost() {
        const host = await fixture<TestHostElement>(`<${testHostTag}></${testHostTag}>`);
        host.provideContext(BLOCK_PREVIEW_CONTEXT, createBlockPreviewContextFake(host) as never);
        host.provideContext(UMB_CONTENT_WORKSPACE_CONTEXT, createContentWorkspaceFake(host) as never);
        return host;
    }

    it('renders a block with areas immediately, before layoutAreas arrives (issue #322)', async () => {
        root = await mountHost();

        const layoutAreasState = new UmbBasicState<UmbBlockGridLayoutAreaItemModel[] | undefined>(undefined);
        root.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT, createGridEntryFake(root, layoutAreasState, true) as never);
        root.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT, createGridManagerFake(root) as never);

        const el = document.createElement(previewTag) as SpyGridPreview;
        root.appendChild(el);

        // A newly added block never receives layoutAreas, so nothing may be waited on.
        const rendered = await waitForCondition(() => el.renderCalls.length > 0);

        expect(rendered, 'a new block with areas must render without waiting for layoutAreas').to.be.true;
        expect(el.renderCalls.length).to.equal(1);
        // The area must still be present in the payload, with no items, so the server
        // renders the area container and its "Add new Layout" button.
        expect(JSON.parse(el.renderCalls[0])['Umbraco.BlockGrid'][0].areas).to.deep.equal([{ key: AREA_KEY, items: [] }]);
    });

    it('posts the block\'s own content key when its layout entry has not arrived', async () => {
        root = await mountHost();

        const entryFake = createGridEntryFake(root, new UmbBasicState<UmbBlockGridLayoutAreaItemModel[] | undefined>(undefined), true);
        entryFake.layout = new UmbBasicState<UmbBlockGridLayoutModel>(undefined as never).asObservable();
        root.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT, entryFake as never);
        root.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT, createGridManagerFake(root) as never);

        const el = document.createElement(previewTag) as SpyGridPreview;
        root.appendChild(el);

        const rendered = await waitForCondition(() => el.renderCalls.length > 0);

        expect(rendered).to.be.true;
        // An empty contentKey fails Guid deserialisation on the server.
        expect(JSON.parse(el.renderCalls[0])['Umbraco.BlockGrid'][0].contentKey).to.equal(CONTENT_KEY);
    });

    it('leaves settingsKey out for a block with no settings', async () => {
        root = await mountHost();

        root.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT, createGridEntryFake(root, new UmbBasicState<UmbBlockGridLayoutAreaItemModel[] | undefined>(undefined), false) as never);
        root.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT, createGridManagerFake(root) as never);

        const el = document.createElement(previewTag) as SpyGridPreview;
        root.appendChild(el);

        const rendered = await waitForCondition(() => el.renderCalls.length > 0);

        expect(rendered).to.be.true;
        // The view stores "no settings" as '', which fails Guid deserialisation on the server like an empty contentKey.
        const entry = JSON.parse(el.renderCalls[0])['Umbraco.BlockGrid'][0];
        expect(entry.settingsKey).to.be.undefined;
        expect('settingsKey' in entry).to.be.false; // JSON.stringify drops undefined
    });

    it('re-renders with area content when layoutAreas arrives mid-request (issue #293)', async () => {
        root = await mountHost();

        const layoutAreasState = new UmbBasicState<UmbBlockGridLayoutAreaItemModel[] | undefined>(undefined);
        root.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT, createGridEntryFake(root, layoutAreasState, true) as never);
        root.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT, createGridManagerFake(root) as never);

        const el = document.createElement(previewTag) as SpyGridPreview;
        el.apiDelayMs = 300;
        root.appendChild(el);

        await waitForCondition(() => el.renderCalls.length === 1);

        // layoutAreas lands while the first request is still open. The re-render must
        // not be suppressed by the in-flight request: prevLayoutAreas is consumed on
        // this emission, so a render skipped here is never retried.
        layoutAreasState.setValue([{ key: AREA_KEY, items: [{ contentKey: NESTED_CONTENT_KEY }] }] as never);

        const rerendered = await waitForCondition(() => el.renderCalls.length === 2);

        expect(rerendered, 'layoutAreas arriving mid-request must still trigger a re-render').to.be.true;
        expect(el.renderCalls[1], 'the re-render must carry the nested area content').to.contain(NESTED_CONTENT_KEY);
    });

    it('renders immediately for a block with no areas, regardless of layoutAreas', async () => {
        root = await mountHost();

        root.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT, createGridEntryFake(root, new UmbBasicState(undefined), false) as never);
        root.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT, createGridManagerFake(root) as never);

        const el = document.createElement(previewTag) as SpyGridPreview;
        root.appendChild(el);
        await el.updateComplete;

        const rendered = await waitForCondition(() => el.renderCalls.length > 0);

        expect(rendered).to.be.true;
    });

    it('debounces a re-render when the block is resized after the first render', async () => {
        root = await mountHost();

        const entryFake = createGridEntryFake(root, new UmbBasicState(undefined), false);
        const layoutState = new UmbBasicState<UmbBlockGridLayoutModel>({ contentKey: CONTENT_KEY, columnSpan: 6, rowSpan: 1, areas: [] });
        entryFake.layout = layoutState.asObservable();
        root.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT, entryFake as never);
        root.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT, createGridManagerFake(root) as never);

        const el = document.createElement(previewTag) as SpyGridPreview;
        root.appendChild(el);
        await waitForCondition(() => el.renderCalls.length === 1);

        layoutState.setValue({ contentKey: CONTENT_KEY, columnSpan: 12, rowSpan: 1, areas: [] });
        await new Promise((r) => setTimeout(r, 100));
        expect(el.renderCalls.length, 'debounce window should not have elapsed yet').to.equal(1);

        const rerendered = await waitForCondition(() => el.renderCalls.length === 2, 1000);
        expect(rerendered, 'should render again after the debounce window').to.be.true;
    });
});
