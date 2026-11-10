/**
 * Block layout items have their own `key`, separate from the `contentKey` of the element
 * they reference (Umbraco 19). The same Library (reusable) element can be used by several
 * layout items, so a block must be told apart by its layout key, never by its content key.
 */
export interface LayoutItemLike {
    key?: string;
    contentKey: string;
    isExternalContent?: boolean;
}

/**
 * The key that identifies a block's layout item. Mirrors the CMS, where an item that has
 * no `key` yet (a block still being created) is identified by its content key.
 */
export function resolveLayoutKey(layout: Pick<LayoutItemLike, 'key'> | undefined, contentKey: string): string {
    return layout?.key || contentKey;
}

/** The layout items of one block: those whose identity is the given layout key. */
export function filterLayoutsByKey<T extends LayoutItemLike>(layouts: ReadonlyArray<T> | undefined, layoutKey: string): T[] {
    if (!layoutKey) return [];
    return (layouts ?? []).filter((x) => resolveLayoutKey(x, x.contentKey) === layoutKey);
}

/** A layout item that may hold child items in areas (Block Grid). */
export type LayoutItemWithAreas = LayoutItemLike & {
    areas?: ReadonlyArray<{ items?: ReadonlyArray<LayoutItemWithAreas> }>;
};

/**
 * The block's position, as sent to the preview views as `blockIndex`: its place among the
 * layout items, for every block alike (local or Library). The block's identity is its layout
 * key, so two blocks never share an index the way content positions would.
 *
 * A root item gets its place in `layouts`. An area child is not in that list, so it gets its
 * place within its parent area's items, found by searching the root items' areas. A block
 * found nowhere (not yet in the manager) gets 0.
 */
export function findBlockIndex(
    layouts: ReadonlyArray<LayoutItemWithAreas> | undefined,
    contentKey: string,
    layoutKey: string,
): number {
    const matches = (x: LayoutItemLike) => resolveLayoutKey(x, x.contentKey) === layoutKey;
    // A block with no layout key yet is identified by its content key (see resolveLayoutKey).
    const matchesAny = (x: LayoutItemLike) => matches(x) || (!layoutKey && x.contentKey === contentKey);

    const search = (items: ReadonlyArray<LayoutItemWithAreas> | undefined): number => {
        const list = items ?? [];
        const index = list.findIndex(matchesAny);
        if (index >= 0) return index;
        for (const item of list) {
            for (const area of item.areas ?? []) {
                const nested = search(area.items);
                if (nested >= 0) return nested;
            }
        }
        return -1;
    };

    return Math.max(search(layouts), 0);
}
