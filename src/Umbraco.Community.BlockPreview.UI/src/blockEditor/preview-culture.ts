import type { UmbBlockExposeModel } from '@umbraco-cms/backoffice/block';

/**
 * Picks the culture a block preview should render in (issue #340).
 *
 * With block level variance a block only has content in the cultures it has been
 * exposed (created) in. Viewing a culture it hasn't been created in yet, Umbraco
 * still renders the block's custom view underneath its "create" overlay, but the
 * block has no values for that culture, so the preview rendered empty. In that case
 * render the culture the block was first created in instead, so the overlay sits
 * over a ghost of the existing content.
 *
 * Returns `culture` unchanged when the block is exposed in it, when its element
 * type doesn't vary by culture (exposed with a null culture) or when there is
 * nothing to fall back to.
 */
export function resolvePreviewCulture(culture: string, contentKey: string, exposes: ReadonlyArray<UmbBlockExposeModel>): string {
    if (!culture) return culture;

    const blockExposes = exposes.filter((x) => x.contentKey === contentKey);
    if (blockExposes.some((x) => !x.culture || x.culture === culture)) return culture;

    return blockExposes.find((x) => x.culture)?.culture ?? culture;
}
