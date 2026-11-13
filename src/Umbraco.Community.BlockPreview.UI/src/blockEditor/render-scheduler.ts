/**
 * Extracted from BlockGridPreviewCustomView so the render-timing decision behind
 * issues #293/#294 (Block Grid area previews rendering blank or before layoutAreas
 * was available) is a pure function instead of four fields read at two call sites.
 */

export interface GridLayoutSpan {
    columnSpan?: number;
    rowSpan?: number;
}

export const GRID_RESIZE_DEBOUNCE_MS = 300;

export type GridRenderTrigger =
    | { kind: 'none' }
    | { kind: 'render'; reason: 'layout-areas-arrived' | 'areas-resolved' }
    | { kind: 'debounce'; reason: 'resized'; delayMs: number };

/**
 * Decides whether an already-rendered (or render-pending) Block Grid preview should
 * re-render in response to an observed layout/layoutAreas update.
 */
export function decideGridRenderTrigger(
    prev: { areas: unknown[] | undefined; layoutAreas: unknown[] | undefined; layout: GridLayoutSpan | undefined },
    next: { areas: unknown[] | undefined; layoutAreas: unknown[] | undefined; layout: GridLayoutSpan | undefined },
    state: { hasMarkup: boolean; managerObserved: boolean; isLoading?: boolean },
): GridRenderTrigger {
    const hasAreas = (next.areas?.length ?? 0) > 0;
    // `areas` is undefined until the block type resolves (a Library block's does so
    // asynchronously), which is "not known yet", not "no areas". The view does not
    // render while it is unknown, so this is the first moment it can.
    const areasJustResolved = prev.areas === undefined && next.areas !== undefined;
    const layoutAreasJustArrived = !prev.layoutAreas && !!next.layoutAreas;

    // One-shot, like the one below: render once, and only if nothing has rendered yet. The
    // view never renders while `areas` is unknown (validatePreviewData), so no earlier
    // render can have carried an empty area list and none needs replacing; rendering again
    // here would send a second request for every block that has areas on load. Checked
    // before layout-areas-arrived so both arriving together give one render.
    if (areasJustResolved && state.managerObserved && !state.hasMarkup && !state.isLoading) {
        return { kind: 'render', reason: 'areas-resolved' };
    }

    // Deliberately not gated on an in-flight request. `layoutAreasJustArrived` is a
    // one-shot: the caller reads prevLayoutAreas from state it overwrites on the same
    // emission, so a render skipped here is never retried and the preview keeps its
    // empty-area markup for good (#293). Since the first render now goes out before
    // layoutAreas is known (#322), that request is very often still open at this
    // point. Superseding it is safe -- renderBlockPreview() bumps _requestId and
    // discards the stale response.
    //
    // Render takes precedence over debounce when both conditions hold on the same
    // emission. Before this function existed, the caller ran two independent `if`
    // blocks, so an emission where layoutAreas arrived *and* the layout span changed
    // fired an immediate render plus a redundant 300ms-later debounced render. This
    // intentionally collapses that into a single immediate render: the freshly-updated
    // layout/areas data used here is the same data the debounced branch would have used
    // moments later, so the second render added nothing but a delayed duplicate.
    if (hasAreas && layoutAreasJustArrived && state.managerObserved) {
        return { kind: 'render', reason: 'layout-areas-arrived' };
    }

    const resized = state.hasMarkup && !!next.layout && (
        next.layout.columnSpan !== prev.layout?.columnSpan ||
        next.layout.rowSpan !== prev.layout?.rowSpan
    );
    if (resized) {
        return { kind: 'debounce', reason: 'resized', delayMs: GRID_RESIZE_DEBOUNCE_MS };
    }

    return { kind: 'none' };
}

/** Replaces an inline `setTimeout`/`clearTimeout` pair with a named, testable debounce. */
export class ResizeDebouncer {
    #timer?: ReturnType<typeof setTimeout>;

    schedule(delayMs: number, fn: () => void): void {
        clearTimeout(this.#timer);
        this.#timer = setTimeout(fn, delayMs);
    }

    cancel(): void {
        clearTimeout(this.#timer);
    }
}
