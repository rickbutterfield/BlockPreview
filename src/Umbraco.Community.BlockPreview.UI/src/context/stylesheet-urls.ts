/**
 * A constructed stylesheet (`new CSSStyleSheet()` + `replaceSync`) has no location of its
 * own, so the browser resolves every relative `url()` in it against the document
 * (`/umbraco/` in the backoffice) instead of against the stylesheet it was fetched from.
 * Resolving the urls up front keeps images, masks and icons pointing at the same files as
 * on the website, where the stylesheet is loaded through a `<link>`.
 */

/**
 * Matches a CSS string, a CSS comment or a `url(...)` token. Strings and comments come first
 * so they are consumed as a whole: a `url(` inside one (for example in an inline SVG data
 * URI) is never matched on its own. Only the `url(...)` alternative has capture groups.
 */
const CSS_TOKEN = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\*[\s\S]*?\*\/|url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'"()\s\\]+))\s*\)/gi;

/** Fragment-only references (`#clip`) point into the document; anything with a scheme is already absolute. */
const NOT_RELATIVE = /^(?:#|[a-z][a-z\d+.-]*:)/i;

/**
 * Returns the CSS with every relative `url()` resolved against the URL of its stylesheet.
 * Absolute urls, `data:` URIs, fragment-only references, empty urls and urls containing CSS
 * escapes are left untouched, as is all other text.
 */
export function resolveStylesheetUrls(css: string, stylesheetUrl: string): string {
    return css.replace(CSS_TOKEN, (token, doubleQuoted?: string, singleQuoted?: string, unquoted?: string) => {
        const value = doubleQuoted ?? singleQuoted ?? unquoted;
        if (!value || value.includes('\\') || NOT_RELATIVE.test(value)) {
            return token;
        }

        try {
            return `url("${new URL(value, stylesheetUrl).href}")`;
        } catch {
            return token;
        }
    });
}
