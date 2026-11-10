import { expect, fixture, defineCE } from '@open-wc/testing';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbStringState, UmbArrayState, UmbBasicState } from '@umbraco-cms/backoffice/observable-api';
import { UMB_CONTENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/content';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { UMB_BLOCK_LIST_ENTRY_CONTEXT, UMB_BLOCK_LIST_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/block-list';
import { UMB_BLOCK_SINGLE_ENTRY_CONTEXT, UMB_BLOCK_SINGLE_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/block-single';
import { UMB_BLOCK_GRID_ENTRY_CONTEXT, UMB_BLOCK_GRID_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/block-grid';
import { UMB_BLOCK_RTE_ENTRY_CONTEXT, UMB_BLOCK_RTE_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/block-rte';
import { BLOCK_PREVIEW_CONTEXT } from '../context/block-preview.context-token';
import { BlockPreviewService } from '../api';
import { BlockListPreviewCustomView } from './block-list-preview.custom-view.element';
import { BlockSinglePreviewCustomView } from './block-single-preview.custom-view.element';
import { BlockGridPreviewCustomView } from './block-grid-preview.custom-view.element';
import { RichTextPreviewCustomView } from './rich-text-preview.custom-view.element';

/**
 * Umbraco 19 gives every block layout item its own `key`. The same Library element can be
 * used more than once, and its layout item has `isExternalContent: true` with no entry in
 * the manager's content data. These tests pin what each custom view sends to the server.
 */

const DOC_KEY = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DOC_TYPE_KEY = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ELEMENT_KEY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ELEMENT_TYPE_KEY = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const LAYOUT_FIRST = '11111111-1111-1111-1111-111111111111';
const LAYOUT_SECOND = '22222222-2222-2222-2222-222222222222';
const LOCAL_KEY = '99999999-9999-9999-9999-999999999999';

class TestHostElement extends UmbLitElement {}
const testHostTag = defineCE(TestHostElement);

class ListView extends BlockListPreviewCustomView {
    protected override async fetchStylesheets() { return []; }
}
class SingleView extends BlockSinglePreviewCustomView {
    protected override async fetchStylesheets() { return []; }
}
class GridView extends BlockGridPreviewCustomView {
    protected override async fetchStylesheets() { return []; }
}
class RteView extends RichTextPreviewCustomView {
    protected override async fetchStylesheets() { return []; }
}
const listTag = defineCE(ListView);
const singleTag = defineCE(SingleView);
const gridTag = defineCE(GridView);
const rteTag = defineCE(RteView);

type PreviewCall = { body: string; query: Record<string, unknown> };
const originals = {
    list: BlockPreviewService.previewListBlock,
    single: BlockPreviewService.previewSingleBlock,
    grid: BlockPreviewService.previewGridBlock,
    rte: BlockPreviewService.previewRichTextMarkup,
};

/** Replaces the generated SDK's preview calls and records what each view posts. */
function captureRequests(): PreviewCall[] {
    const calls: PreviewCall[] = [];
    const fake = async (options: PreviewCall) => {
        calls.push({ body: options.body, query: options.query });
        return { data: '<div>preview</div>' };
    };
    (BlockPreviewService as any).previewListBlock = fake;
    (BlockPreviewService as any).previewSingleBlock = fake;
    (BlockPreviewService as any).previewGridBlock = fake;
    (BlockPreviewService as any).previewRichTextMarkup = fake;
    return calls;
}

function restoreSdk() {
    (BlockPreviewService as any).previewListBlock = originals.list;
    (BlockPreviewService as any).previewSingleBlock = originals.single;
    (BlockPreviewService as any).previewGridBlock = originals.grid;
    (BlockPreviewService as any).previewRichTextMarkup = originals.rte;
}

function previewContextFake(host: HTMLElement) {
    return {
        getUnique: () => '',
        setUnique: () => {},
        getDocumentTypeUnique: () => '',
        setDocumentTypeUnique: () => {},
        requestQueue: { enqueue: <T>(fn: () => Promise<T>) => fn() },
        getOrCreateStylesheet: () => Promise.resolve(new CSSStyleSheet()),
        getHostElement: () => host,
    };
}

function contentWorkspaceFake(host: HTMLElement) {
    return {
        IS_CONTENT_WORKSPACE_CONTEXT: true,
        getEntityType: () => 'document',
        unique: new UmbStringState(DOC_KEY).asObservable(),
        structure: { contentTypeUniques: new UmbArrayState<string>([DOC_TYPE_KEY], (x) => x).asObservable() },
        getHostElement: () => host,
    };
}

function documentWorkspaceFake(host: HTMLElement) {
    return {
        getEntityType: () => 'document',
        unique: new UmbStringState(DOC_KEY).asObservable(),
        contentTypeUnique: new UmbStringState(DOC_TYPE_KEY).asObservable(),
        getHostElement: () => host,
    };
}

function entryFake(host: HTMLElement, layout: Record<string, unknown>, contentKey = ELEMENT_KEY) {
    return {
        contentKey: new UmbStringState(contentKey).asObservable(),
        settingsKey: new UmbBasicState<string | undefined>(undefined).asObservable(),
        workspaceEditContentPath: new UmbStringState('/edit/path').asObservable(),
        contentElementTypeAlias: new UmbStringState('myElement').asObservable(),
        contentElementTypeKey: new UmbStringState(ELEMENT_TYPE_KEY).asObservable(),
        areas: new UmbArrayState([], (x: { key: string }) => x.key).asObservable(),
        layoutAreas: new UmbBasicState<undefined>(undefined).asObservable(),
        layout: new UmbBasicState<Record<string, unknown>>(layout).asObservable(),
        getHostElement: () => host,
    };
}

/** A manager for a Library block: no entry in `contents`, the element is used by two layout items. */
function managerFake(host: HTMLElement, contents: Array<{ key: string }>, layouts: Array<Record<string, unknown>>) {
    return {
        contents: new UmbArrayState(contents, (x) => x.key).asObservable(),
        settings: new UmbArrayState<{ key: string }>([], (x) => x.key).asObservable(),
        layouts: new UmbArrayState(layouts, (x) => x.key as string).asObservable(),
        exposes: new UmbArrayState<{ contentKey: string }>([], (x) => x.contentKey).asObservable(),
        propertyAlias: new UmbStringState('myBlocks').asObservable(),
        getHostElement: () => host,
    };
}

async function waitFor(fn: () => boolean, timeout = 3000): Promise<boolean> {
    const start = performance.now();
    while (performance.now() - start < timeout) {
        if (fn()) return true;
        await new Promise((r) => setTimeout(r, 20));
    }
    return fn();
}

const externalLayouts = [
    { key: LAYOUT_FIRST, contentKey: ELEMENT_KEY, isExternalContent: true },
    { key: LAYOUT_SECOND, contentKey: ELEMENT_KEY, isExternalContent: true },
];

describe('layout key sent with block previews (Umbraco 19)', () => {
    let calls: PreviewCall[];
    let host: TestHostElement;

    beforeEach(() => { calls = captureRequests(); });
    afterEach(() => { restoreSdk(); host?.remove(); });

    /** Both workspace contexts share one alias, so a host provides only the one its view consumes. */
    async function mount(workspace: 'content' | 'document' = 'content') {
        host = await fixture<TestHostElement>(`<${testHostTag}></${testHostTag}>`);
        host.provideContext(BLOCK_PREVIEW_CONTEXT, previewContextFake(host) as never);
        if (workspace === 'content') {
            host.provideContext(UMB_CONTENT_WORKSPACE_CONTEXT, contentWorkspaceFake(host) as never);
        } else {
            host.provideContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, documentWorkspaceFake(host) as never);
        }
    }

    const listLike = [
        { name: 'block list', tag: () => listTag, entry: UMB_BLOCK_LIST_ENTRY_CONTEXT, manager: UMB_BLOCK_LIST_MANAGER_CONTEXT, alias: 'Umbraco.BlockList' },
        { name: 'single block', tag: () => singleTag, entry: UMB_BLOCK_SINGLE_ENTRY_CONTEXT, manager: UMB_BLOCK_SINGLE_MANAGER_CONTEXT, alias: 'Umbraco.SingleBlock' },
    ];

    for (const view of listLike) {
        describe(view.name, () => {
            it('posts only its own layout item when an element is used twice, and its layout key', async () => {
                await mount();
                host.provideContext(view.entry as never, entryFake(host, externalLayouts[1]) as never);
                host.provideContext(view.manager as never, managerFake(host, [], externalLayouts) as never);

                host.appendChild(document.createElement(view.tag()));
                expect(await waitFor(() => calls.length > 0), 'a Library block with no content data must still render').to.be.true;

                const layout = JSON.parse(calls[0].body).layout[view.alias];
                expect(layout).to.deep.equal([externalLayouts[1]]);
                expect(calls[0].query.layoutKey).to.equal(LAYOUT_SECOND);
            });

            it('sends an empty contentData for a Library block and a non-negative blockIndex', async () => {
                await mount();
                host.provideContext(view.entry as never, entryFake(host, externalLayouts[1]) as never);
                host.provideContext(view.manager as never, managerFake(host, [], externalLayouts) as never);

                host.appendChild(document.createElement(view.tag()));
                await waitFor(() => calls.length > 0);

                expect(JSON.parse(calls[0].body).contentData).to.deep.equal([]);
                expect(calls[0].query.blockIndex).to.equal(1);
            });

            it('gives a local block and a Library block distinct blockIndex values', async () => {
                const local = { key: LAYOUT_SECOND, contentKey: LOCAL_KEY };
                const layouts = [externalLayouts[0], local];
                await mount();
                host.provideContext(view.entry as never, entryFake(host, local, LOCAL_KEY) as never);
                host.provideContext(view.manager as never, managerFake(host, [{ key: LOCAL_KEY }], layouts) as never);

                host.appendChild(document.createElement(view.tag()));
                await waitFor(() => calls.length > 0);

                // contents=[local] alone would give 0, the same as the Library block before it.
                expect(calls[0].query.blockIndex).to.equal(1);
            });

            it('keeps a local block working, identified by its layout key', async () => {
                const layout = { key: LAYOUT_FIRST, contentKey: ELEMENT_KEY };
                await mount();
                host.provideContext(view.entry as never, entryFake(host, layout) as never);
                host.provideContext(view.manager as never, managerFake(host, [{ key: ELEMENT_KEY }], [layout]) as never);

                host.appendChild(document.createElement(view.tag()));
                await waitFor(() => calls.length > 0);

                const body = JSON.parse(calls[0].body);
                expect(body.contentData).to.deep.equal([{ key: ELEMENT_KEY }]);
                expect(body.layout[view.alias]).to.deep.equal([layout]);
                expect(calls[0].query.layoutKey).to.equal(LAYOUT_FIRST);
                expect(calls[0].query.blockIndex).to.equal(0);
            });
        });
    }

    describe('rich text', () => {
        it('posts only its own layout item and its layout key', async () => {
            await mount('document');
            host.provideContext(UMB_BLOCK_RTE_ENTRY_CONTEXT as never, entryFake(host, externalLayouts[0]) as never);
            host.provideContext(UMB_BLOCK_RTE_MANAGER_CONTEXT as never, managerFake(host, [], externalLayouts) as never);

            host.appendChild(document.createElement(rteTag));
            expect(await waitFor(() => calls.length > 0), 'a Library block with no content data must still render').to.be.true;

            expect(JSON.parse(calls[0].body).layout['Umbraco.RichText']).to.deep.equal([externalLayouts[0]]);
            expect(calls[0].query.layoutKey).to.equal(LAYOUT_FIRST);
        });
    });

    describe('block grid', () => {
        it('posts the layout item key and isExternalContent, and the layout key', async () => {
            await mount();
            host.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT as never, entryFake(host, { ...externalLayouts[1], columnSpan: 6, rowSpan: 1, areas: [] }) as never);
            host.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT as never, managerFake(host, [], []) as never);

            host.appendChild(document.createElement(gridTag));
            expect(await waitFor(() => calls.length > 0), 'a Library block with no content data must still render').to.be.true;

            const item = JSON.parse(calls[0].body).layout['Umbraco.BlockGrid'][0];
            expect(item.key).to.equal(LAYOUT_SECOND);
            expect(item.contentKey).to.equal(ELEMENT_KEY);
            expect(item.isExternalContent).to.be.true;
            expect(calls[0].query.layoutKey).to.equal(LAYOUT_SECOND);
            expect(calls[0].query.blockIndex).to.equal(0);
        });

        it('sends a root block its place in the manager layouts, not 0 for every Library block', async () => {
            const local = { key: LAYOUT_FIRST, contentKey: LOCAL_KEY, columnSpan: 6, rowSpan: 1, areas: [] };
            await mount();
            host.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT as never, entryFake(host, { ...externalLayouts[1], columnSpan: 6, rowSpan: 1, areas: [] }) as never);
            host.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT as never, managerFake(host, [{ key: LOCAL_KEY }], [local, externalLayouts[1]]) as never);

            host.appendChild(document.createElement(gridTag));
            await waitFor(() => calls.length > 0);

            expect(calls[0].query.blockIndex).to.equal(1);
        });

        it('sends an area child its place within its parent area', async () => {
            const child = { key: LAYOUT_SECOND, contentKey: ELEMENT_KEY, isExternalContent: true, areas: [] };
            const parent = { key: LAYOUT_FIRST, contentKey: LOCAL_KEY, areas: [{ key: 'area', items: [{ key: 'other', contentKey: 'x' }, child] }] };
            await mount();
            host.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT as never, entryFake(host, child) as never);
            host.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT as never, managerFake(host, [{ key: LOCAL_KEY }], [parent]) as never);

            host.appendChild(document.createElement(gridTag));
            await waitFor(() => calls.length > 0);

            expect(calls[0].query.blockIndex).to.equal(1);
        });

        it('falls back to the content key as the layout key while the layout entry has not arrived', async () => {
            await mount();
            const entry = entryFake(host, {});
            entry.layout = new UmbBasicState<undefined>(undefined).asObservable() as never;
            host.provideContext(UMB_BLOCK_GRID_ENTRY_CONTEXT as never, entry as never);
            host.provideContext(UMB_BLOCK_GRID_MANAGER_CONTEXT as never, managerFake(host, [{ key: ELEMENT_KEY }], []) as never);

            host.appendChild(document.createElement(gridTag));
            await waitFor(() => calls.length > 0);

            expect(JSON.parse(calls[0].body).layout['Umbraco.BlockGrid'][0].key).to.equal(ELEMENT_KEY);
            expect(calls[0].query.layoutKey).to.equal(ELEMENT_KEY);
        });
    });
});
