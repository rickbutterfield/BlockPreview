import { expect } from '@open-wc/testing';
import { decideGridRenderTrigger, ResizeDebouncer, GRID_RESIZE_DEBOUNCE_MS } from './render-scheduler';

/**
 * Unit tests for the Block Grid preview's render-timing decision, extracted from
 * block-grid-preview.custom-view.element.ts to make issues #293/#294 (previews
 * rendering blank or before layoutAreas is available) provable by assertion.
 */
describe('decideGridRenderTrigger areas-resolved (CMS 19.0.0-rc1)', () => {
    const unresolved = { areas: undefined, layoutAreas: [{ key: 'a', items: [{ key: 'x' }] }], layout: undefined };
    const withAreas = { areas: [{ key: 'a' }], layoutAreas: [{ key: 'a', items: [{ key: 'x' }] }], layout: undefined };
    const noAreas = { areas: [] as unknown[], layoutAreas: [{ key: 'a', items: [] }], layout: undefined };
    const idle = { hasMarkup: false, isLoading: false, managerObserved: true };

    it('renders when areas resolve to some and nothing has rendered', () => {
        expect(decideGridRenderTrigger(unresolved, withAreas, idle)).to.deep.equal({ kind: 'render', reason: 'areas-resolved' });
    });

    it('renders when areas resolve to none and nothing has rendered', () => {
        expect(decideGridRenderTrigger(unresolved, noAreas, idle)).to.deep.equal({ kind: 'render', reason: 'areas-resolved' });
    });

    it('does not render again when a render is in flight or done (the view never renders while areas are unknown, so it carries them)', () => {
        for (const next of [withAreas, noAreas]) {
            expect(decideGridRenderTrigger(unresolved, next, { ...idle, isLoading: true })).to.deep.equal({ kind: 'none' });
            expect(decideGridRenderTrigger(unresolved, next, { ...idle, hasMarkup: true })).to.deep.equal({ kind: 'none' });
        }
    });

    it('waits for the manager to be observed', () => {
        expect(decideGridRenderTrigger(unresolved, withAreas, { ...idle, managerObserved: false })).to.deep.equal({ kind: 'none' });
    });

    it('does nothing while areas are still undefined', () => {
        expect(decideGridRenderTrigger(unresolved, unresolved, idle)).to.deep.equal({ kind: 'none' });
    });

    it('is one render, not two, when layoutAreas arrives on the same emission', () => {
        const prev = { areas: undefined, layoutAreas: undefined, layout: undefined };
        expect(decideGridRenderTrigger(prev, withAreas, idle)).to.deep.equal({ kind: 'render', reason: 'areas-resolved' });
    });
});

describe('decideGridRenderTrigger (issue #293/#294)', () => {
    const noAreas = { areas: [] as { key: string }[], layoutAreas: undefined, layout: undefined };
    const readyState = { hasMarkup: true, managerObserved: true };

    it('renders when layoutAreas arrives for the first time and the manager is observed', () => {
        const prev = { areas: [] as unknown[], layoutAreas: undefined, layout: undefined };
        const next = { areas: [{ key: 'a' }], layoutAreas: [{ key: 'a', items: [] }], layout: undefined };

        expect(decideGridRenderTrigger(prev, next, readyState)).to.deep.equal({ kind: 'render', reason: 'layout-areas-arrived' });
    });

    it('does nothing when layoutAreas arrives but the manager has not been observed yet', () => {
        const prev = { areas: [] as unknown[], layoutAreas: undefined, layout: undefined };
        const next = { areas: [{ key: 'a' }], layoutAreas: [{ key: 'a', items: [] }], layout: undefined };

        expect(decideGridRenderTrigger(prev, next, { ...readyState, managerObserved: false })).to.deep.equal({ kind: 'none' });
    });

    it('does nothing when the block has no areas', () => {
        const prev = { areas: [] as unknown[], layoutAreas: undefined, layout: undefined };
        const next = { areas: [] as { key: string }[], layoutAreas: [{ key: 'a', items: [] }], layout: undefined };

        expect(decideGridRenderTrigger(prev, next, readyState)).to.deep.equal({ kind: 'none' });
    });

    it('debounces a re-render when columnSpan changes after the first render', () => {
        const prev = { areas: [] as unknown[], layoutAreas: undefined, layout: { columnSpan: 6, rowSpan: 1 } };
        const next = { ...noAreas, layout: { columnSpan: 12, rowSpan: 1 } };

        expect(decideGridRenderTrigger(prev, next, readyState)).to.deep.equal({ kind: 'debounce', reason: 'resized', delayMs: GRID_RESIZE_DEBOUNCE_MS });
    });

    it('does not debounce a resize before the first render has happened', () => {
        const prev = { areas: [] as unknown[], layoutAreas: undefined, layout: { columnSpan: 6, rowSpan: 1 } };
        const next = { ...noAreas, layout: { columnSpan: 12, rowSpan: 1 } };

        expect(decideGridRenderTrigger(prev, next, { ...readyState, hasMarkup: false })).to.deep.equal({ kind: 'none' });
    });

    it('does nothing when neither layoutAreas nor layout span changed', () => {
        const prev = { areas: [] as unknown[], layoutAreas: [{ key: 'a', items: [] }], layout: { columnSpan: 6, rowSpan: 1 } };
        const next = { areas: [{ key: 'a' }], layoutAreas: [{ key: 'a', items: [] }], layout: { columnSpan: 6, rowSpan: 1 } };

        expect(decideGridRenderTrigger(prev, next, readyState)).to.deep.equal({ kind: 'none' });
    });

    it('renders (not debounce) when layoutAreas arrives on the same emission as a span change', () => {
        // Both conditions are true here: layoutAreas just arrived (prev undefined ->
        // next defined, block has areas, manager observed, not loading) AND the layout
        // span changed (hasMarkup true, prev.layout undefined -> next.layout has a
        // defined columnSpan/rowSpan, so both differ from prev). The old two-`if`-block
        // caller would have fired an immediate render AND scheduled a 300ms debounce;
        // the pure function must report only 'render'.
        const prev = { areas: [] as unknown[], layoutAreas: undefined, layout: undefined };
        const next = { areas: [{ key: 'a' }], layoutAreas: [{ key: 'a', items: [] }], layout: { columnSpan: 6, rowSpan: 1 } };

        expect(decideGridRenderTrigger(prev, next, readyState)).to.deep.equal({ kind: 'render', reason: 'layout-areas-arrived' });
    });
});

describe('ResizeDebouncer', () => {
    it('invokes the callback once after the delay', async () => {
        const debouncer = new ResizeDebouncer();
        let calls = 0;
        debouncer.schedule(20, () => { calls++; });

        await new Promise((r) => setTimeout(r, 50));

        expect(calls).to.equal(1);
    });

    it('cancels a pending call when scheduled again before it fires', async () => {
        const debouncer = new ResizeDebouncer();
        let calls = 0;
        debouncer.schedule(20, () => { calls++; });
        debouncer.schedule(20, () => { calls++; });

        await new Promise((r) => setTimeout(r, 50));

        expect(calls).to.equal(1);
    });

    it('does not invoke the callback if cancelled', async () => {
        const debouncer = new ResizeDebouncer();
        let calls = 0;
        debouncer.schedule(20, () => { calls++; });
        debouncer.cancel();

        await new Promise((r) => setTimeout(r, 50));

        expect(calls).to.equal(0);
    });
});
