import { expect } from '@open-wc/testing';
import { filterLayoutsByKey, findBlockIndex, resolveLayoutKey } from './layout-key';

const ELEMENT = '11111111-1111-1111-1111-111111111111';
const LAYOUT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LAYOUT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('layout key helpers', () => {
    describe('filterLayoutsByKey', () => {
        it('returns only the layout item with the key when one element is used twice', () => {
            const layouts = [
                { key: LAYOUT_A, contentKey: ELEMENT, isExternalContent: true },
                { key: LAYOUT_B, contentKey: ELEMENT, isExternalContent: true },
            ];

            expect(filterLayoutsByKey(layouts, LAYOUT_B)).to.deep.equal([layouts[1]]);
        });

        it('identifies an item without a key by its content key', () => {
            const layouts = [{ contentKey: ELEMENT }];

            expect(filterLayoutsByKey(layouts, ELEMENT)).to.deep.equal(layouts);
        });

        it('returns nothing without a layout key or layouts', () => {
            expect(filterLayoutsByKey([{ key: LAYOUT_A, contentKey: ELEMENT }], '')).to.deep.equal([]);
            expect(filterLayoutsByKey(undefined, LAYOUT_A)).to.deep.equal([]);
        });
    });

    describe('resolveLayoutKey', () => {
        it('prefers the layout key and falls back to the content key', () => {
            expect(resolveLayoutKey({ key: LAYOUT_A }, ELEMENT)).to.equal(LAYOUT_A);
            expect(resolveLayoutKey({}, ELEMENT)).to.equal(ELEMENT);
            expect(resolveLayoutKey(undefined, ELEMENT)).to.equal(ELEMENT);
        });
    });

    describe('findBlockIndex', () => {
        const LOCAL = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
        const mixed = [
            { key: LAYOUT_A, contentKey: ELEMENT, isExternalContent: true },
            { key: LAYOUT_B, contentKey: LOCAL },
        ];

        it('gives a Library block and a local block distinct positions in the layout', () => {
            expect(findBlockIndex(mixed, ELEMENT, LAYOUT_A)).to.equal(0);
            expect(findBlockIndex(mixed, LOCAL, LAYOUT_B)).to.equal(1);
        });

        it('tells two uses of the same Library element apart', () => {
            const layouts = [
                { key: LAYOUT_A, contentKey: ELEMENT, isExternalContent: true },
                { key: LAYOUT_B, contentKey: ELEMENT, isExternalContent: true },
            ];

            expect(findBlockIndex(layouts, ELEMENT, LAYOUT_B)).to.equal(1);
        });

        it('handles a Library block first and last', () => {
            const layouts = [
                { key: LAYOUT_A, contentKey: ELEMENT, isExternalContent: true },
                { key: LAYOUT_B, contentKey: LOCAL },
                { key: '33333333-3333-3333-3333-333333333333', contentKey: ELEMENT, isExternalContent: true },
            ];

            expect(findBlockIndex(layouts, ELEMENT, LAYOUT_A)).to.equal(0);
            expect(findBlockIndex(layouts, ELEMENT, '33333333-3333-3333-3333-333333333333')).to.equal(2);
        });

        it('finds an item without a key by its content key', () => {
            expect(findBlockIndex([{ contentKey: 'x' }, { contentKey: ELEMENT }], ELEMENT, ELEMENT)).to.equal(1);
        });

        it('gives an area child its position within its parent area', () => {
            const layouts = [
                {
                    key: LAYOUT_A,
                    contentKey: ELEMENT,
                    areas: [{ items: [{ key: 'n1', contentKey: 'x' }, { key: LAYOUT_B, contentKey: LOCAL }] }],
                },
            ];

            expect(findBlockIndex(layouts, LOCAL, LAYOUT_B)).to.equal(1);
        });

        it('falls back to 0 for a block that is not in the layouts, never a negative index', () => {
            expect(findBlockIndex([], ELEMENT, LAYOUT_A)).to.equal(0);
            expect(findBlockIndex(undefined, ELEMENT, LAYOUT_A)).to.equal(0);
        });
    });
});
