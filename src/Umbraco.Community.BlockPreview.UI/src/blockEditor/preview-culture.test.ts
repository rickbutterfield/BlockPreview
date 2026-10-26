import { expect } from '@open-wc/testing';
import { resolvePreviewCulture } from './preview-culture';

/**
 * Regression tests for issue #340 — "Block Level Variance: Empty items rendered when
 * block does not exist in language".
 *
 * A block that hasn't been created (exposed) in the culture being edited has no values
 * for it, so its preview rendered empty under Umbraco's "create" overlay. The preview
 * now renders the culture the block was first created in instead.
 */
describe('resolvePreviewCulture (issue #340)', () => {
    const blockKey = 'block-1';
    const expose = (culture: string | null, contentKey = blockKey) => ({ contentKey, culture, segment: null });

    it('keeps the current culture when the block is exposed in it', () => {
        const exposes = [expose('en-US'), expose('da-DK')];

        expect(resolvePreviewCulture('da-DK', blockKey, exposes)).to.equal('da-DK');
    });

    it('falls back to the culture the block was first created in when it is not exposed in the current one', () => {
        const exposes = [expose('en-US'), expose('de-DE')];

        expect(resolvePreviewCulture('da-DK', blockKey, exposes)).to.equal('en-US');
    });

    it('ignores exposes of other blocks', () => {
        const exposes = [expose('da-DK', 'block-2'), expose('en-US')];

        expect(resolvePreviewCulture('da-DK', blockKey, exposes)).to.equal('en-US');
    });

    it('keeps the current culture for element types that do not vary by culture', () => {
        expect(resolvePreviewCulture('da-DK', blockKey, [expose(null)])).to.equal('da-DK');
    });

    it('keeps the current culture when the block has no exposes to fall back to', () => {
        expect(resolvePreviewCulture('da-DK', blockKey, [])).to.equal('da-DK');
    });

    it('keeps an empty culture for invariant content', () => {
        expect(resolvePreviewCulture('', blockKey, [expose('en-US')])).to.equal('');
    });
});
