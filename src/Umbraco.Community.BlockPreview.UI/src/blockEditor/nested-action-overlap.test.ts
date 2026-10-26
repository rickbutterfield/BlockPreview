import { expect } from '@open-wc/testing';
import { ACTION_BAR_GAP, findNestedEntry, getParentActionOffset } from './nested-action-overlap';

/**
 * Regression tests for issue #332 — "Layout action buttons cover grid item action buttons".
 *
 * A Block Grid block's action bar and the action bar of a block nested in one of its
 * areas are both pinned to the top-right corner of their entry. When the nested block
 * sits flush with that corner the parent's bar covers the child's. While a nested
 * block is hovered, the parent's bar is slid left just far enough to clear it.
 */
describe('getParentActionOffset (issue #332)', () => {
    const bar = (left: number, top: number, width = 100, height = 32) => new DOMRect(left, top, width, height);

    it('shifts the parent bar to sit left of an overlapping child bar', () => {
        const parent = bar(500, 8);
        const child = bar(500, 9);

        expect(getParentActionOffset(parent, child, 0)).to.equal(100 + ACTION_BAR_GAP);
    });

    it('does not shift when the child bar is below the parent bar', () => {
        const parent = bar(500, 8);
        const child = bar(500, 69);

        expect(getParentActionOffset(parent, child, 0)).to.equal(0);
    });

    it('does not shift when the child bar is to the left of the parent bar', () => {
        const parent = bar(500, 8);
        const child = bar(300, 8);

        expect(getParentActionOffset(parent, child, 0)).to.equal(0);
    });

    it('measures from the unshifted position so the offset is stable once applied', () => {
        const child = bar(500, 9);
        const offset = getParentActionOffset(bar(500, 8), child, 0);

        const shiftedParent = bar(500 - offset, 8);
        expect(getParentActionOffset(shiftedParent, child, offset)).to.equal(offset);
    });
});

describe('findNestedEntry (issue #332)', () => {
    it('returns the entry nested directly inside the parent', () => {
        const parent = document.createElement('umb-block-grid-entry');
        const child = document.createElement('umb-block-grid-entry');
        const grandchild = document.createElement('umb-block-grid-entry');
        const target = document.createElement('div');

        const path = [target, grandchild, document.createElement('div'), child, document.createElement('div'), parent, document.body];

        expect(findNestedEntry(path, parent)).to.equal(child);
    });

    it('returns undefined when the pointer is over the parent itself', () => {
        const parent = document.createElement('umb-block-grid-entry');
        const target = document.createElement('div');

        expect(findNestedEntry([target, parent, document.body], parent)).to.equal(undefined);
    });

    it('returns undefined when the parent is not in the path', () => {
        const parent = document.createElement('umb-block-grid-entry');
        const other = document.createElement('umb-block-grid-entry');

        expect(findNestedEntry([document.createElement('div'), other], parent)).to.equal(undefined);
    });
});
