/**
 * Keeps a Block Grid block's action bar from covering the action bar of a block
 * nested in one of its areas (issue #332).
 *
 * Both action bars are pinned to the top-right corner of their own entry, so when a
 * preview places its first area item flush with that corner the parent's bar sits
 * on top of the child's and the child's actions can't be clicked. While the pointer
 * is over a nested block whose action bar would be covered, the parent's bar is
 * slid left so both sit side by side and stay clickable.
 */

const ENTRY_TAG = 'UMB-BLOCK-GRID-ENTRY';

/** Umbraco 17.5+ renders `<umb-block-action-list id="actions">`; earlier 17.x versions render `<uui-action-bar>`. */
const ACTION_BAR_SELECTOR = '#actions, uui-action-bar';

const OFFSET_PROPERTY = '--block-preview-parent-actions-offset';

/** Space (px) left between the nested block's action bar and the shifted parent action bar. */
export const ACTION_BAR_GAP = 8;

let offsetStyleSheet: CSSStyleSheet | undefined;
const styledRoots = new WeakSet<ShadowRoot>();

/**
 * Returns how far (px) the parent action bar must move left to clear the nested
 * block's action bar, or 0 when they don't overlap.
 * `parentBar` is measured with `currentOffset` already applied.
 */
export function getParentActionOffset(
    parentBar: DOMRectReadOnly,
    childBar: DOMRectReadOnly,
    currentOffset: number,
    gap: number = ACTION_BAR_GAP,
): number {
    const left = parentBar.left + currentOffset;
    const right = parentBar.right + currentOffset;
    const overlaps =
        left < childBar.right &&
        right > childBar.left &&
        parentBar.top < childBar.bottom &&
        parentBar.bottom > childBar.top;

    return overlaps ? Math.ceil(right - childBar.left + gap) : 0;
}

/**
 * Returns the block grid entry nested directly inside `parentEntry` that the event
 * path passes through, if any. `path` is target-first, as `composedPath()` returns.
 */
export function findNestedEntry(path: EventTarget[], parentEntry: Element): Element | undefined {
    const parentIndex = path.indexOf(parentEntry);
    for (let i = parentIndex - 1; i >= 0; i--) {
        const target = path[i];
        if (target instanceof Element && target.tagName === ENTRY_TAG) {
            return target;
        }
    }
    return undefined;
}

function findOwningEntry(host: Element): HTMLElement | undefined {
    let root = host.getRootNode();
    while (root instanceof ShadowRoot) {
        if (root.host.tagName === ENTRY_TAG) {
            return root.host as HTMLElement;
        }
        root = root.host.getRootNode();
    }
    return undefined;
}

function adoptOffsetStyles(root: ShadowRoot) {
    if (styledRoots.has(root)) return;

    // Custom properties inherit, so reset it on every entry: otherwise nested entries
    // would pick up their parent's offset and their action bars would move with it.
    // The parent's inline value still wins over its own :host rule.
    offsetStyleSheet ??= new CSSStyleSheet();
    offsetStyleSheet.replaceSync(`
        :host { ${OFFSET_PROPERTY}: 0px; }
        ${ACTION_BAR_SELECTOR} { translate: calc(-1 * var(${OFFSET_PROPERTY})) 0; }
    `);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, offsetStyleSheet];
    styledRoots.add(root);
}

export class NestedActionOverlapController {
    #entry?: HTMLElement;
    #offset = 0;

    /** Starts watching the block grid entry that renders `host`. */
    attach(host: Element) {
        this.detach();

        const entry = findOwningEntry(host);
        if (!entry?.shadowRoot) return;

        adoptOffsetStyles(entry.shadowRoot);
        entry.addEventListener('pointerover', this.#onPointerOver);
        entry.addEventListener('pointerleave', this.#onPointerLeave);
        this.#entry = entry;
    }

    detach() {
        if (!this.#entry) return;

        this.#entry.removeEventListener('pointerover', this.#onPointerOver);
        this.#entry.removeEventListener('pointerleave', this.#onPointerLeave);
        this.#setOffset(0);
        this.#entry = undefined;
    }

    #onPointerOver = (event: PointerEvent) => {
        const entry = this.#entry;
        const parentBar = entry?.shadowRoot?.querySelector(ACTION_BAR_SELECTOR);
        if (!entry || !parentBar) return;

        const path = event.composedPath();

        // Hold the current position while the pointer is on the parent's own action bar,
        // otherwise it would jump back under the pointer as soon as it is reached.
        if (path.includes(parentBar)) return;

        const childBar = findNestedEntry(path, entry)?.shadowRoot?.querySelector(ACTION_BAR_SELECTOR);
        this.#setOffset(
            childBar ? getParentActionOffset(parentBar.getBoundingClientRect(), childBar.getBoundingClientRect(), this.#offset) : 0,
        );
    };

    #onPointerLeave = () => this.#setOffset(0);

    #setOffset(offset: number) {
        if (!this.#entry || offset === this.#offset) return;

        this.#offset = offset;
        if (offset) {
            this.#entry.style.setProperty(OFFSET_PROPERTY, `${offset}px`);
        } else {
            this.#entry.style.removeProperty(OFFSET_PROPERTY);
        }
    }
}
