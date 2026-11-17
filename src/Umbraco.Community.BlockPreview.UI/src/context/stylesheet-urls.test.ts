import { expect } from '@open-wc/testing';
import { resolveStylesheetUrls } from './stylesheet-urls';

const STYLESHEET = 'https://example.com/dist/assets/stylesheets/style.css';

/**
 * Preview stylesheets are adopted as constructed stylesheets, where relative url()s resolve
 * against the backoffice document instead of the stylesheet. These tests lock in that the
 * urls are resolved against the stylesheet before the CSS is handed to replaceSync.
 */
describe('resolveStylesheetUrls', () => {
    it('resolves an unquoted relative url against the stylesheet', () => {
        expect(resolveStylesheetUrls('.a{mask-image:url(../images/masks/mask.svg)}', STYLESHEET))
            .to.equal('.a{mask-image:url("https://example.com/dist/assets/images/masks/mask.svg")}');
    });

    it('resolves quoted relative urls and keeps the query string and fragment', () => {
        expect(resolveStylesheetUrls(`.a{background:url('img/bg.png?v=1#x')}.b{background:url( "img/b.png" )}`, STYLESHEET))
            .to.equal('.a{background:url("https://example.com/dist/assets/stylesheets/img/bg.png?v=1#x")}.b{background:url("https://example.com/dist/assets/stylesheets/img/b.png")}');
    });

    it('resolves a root-relative url against the origin of the stylesheet', () => {
        expect(resolveStylesheetUrls('.a{background:url(/img/a.png)}', 'https://cdn.example.com/css/site.css'))
            .to.equal('.a{background:url("https://cdn.example.com/img/a.png")}');
    });

    it('leaves absolute urls, data URIs, fragment references and empty urls untouched', () => {
        const css = '.a{background:url(https://cdn.example.com/a.png)}'
            + '.b{background:url(data:image/png;base64,AAAA)}'
            + '.c{clip-path:url(#clip)}'
            + '.d{background:url()}'
            + '.e{background:url("")}';

        expect(resolveStylesheetUrls(css, STYLESHEET)).to.equal(css);
    });

    it('does not touch a url() inside an inline SVG data URI', () => {
        const css = `.a{background:url("data:image/svg+xml,%3Csvg%3E%3Cg clip-path='url(%23a)'%3E%3Cg clip-path='url(%23b)'/%3E%3C/g%3E%3C/svg%3E")}`;

        expect(resolveStylesheetUrls(css, STYLESHEET)).to.equal(css);
    });

    it('does not touch a url() inside a string or a comment', () => {
        const css = '/* url(a.png) */.a::before{content:"url(a.png)"}';

        expect(resolveStylesheetUrls(css, STYLESHEET)).to.equal(css);
    });

    it('leaves a url with CSS escapes untouched', () => {
        const css = '.a{background:url(my\\ image.png)}.b{background:url("my\\"image.png")}';

        expect(resolveStylesheetUrls(css, STYLESHEET)).to.equal(css);
    });
});
