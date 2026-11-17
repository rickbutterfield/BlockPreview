import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbStringState } from "@umbraco-cms/backoffice/observable-api";
import { BlockPreviewRequestQueue } from "./block-preview-request-queue";
import { resolveStylesheetUrls } from "./stylesheet-urls";

export class BlockPreviewContext extends UmbControllerBase {

    #requestQueue = new BlockPreviewRequestQueue(3);
    #stylesheetCache = new Map<string, Promise<CSSStyleSheet>>();

    /** Shared concurrency-limited queue for preview API requests. */
    get requestQueue(): BlockPreviewRequestQueue {
        return this.#requestQueue;
    }

    // Node key cache used as a fallback when a preview cannot reach its content
    // workspace directly (e.g. when nested inside another block, whose workspace
    // context shadows the document workspace under the shared 'UmbWorkspaceContext'
    // alias).
    #unique = new UmbStringState('');
    #documentTypeUnique = new UmbStringState('');

    constructor(host: UmbControllerHost) {
        super(host);
    }

    getUnique(): string {
        return this.#unique.getValue();
    }

    async setUnique(unique: string) {
        if (unique !== '') {
            this.#unique.setValue(unique);
        }
    }

    getDocumentTypeUnique(): string {
        return this.#documentTypeUnique.getValue();
    }

    async setDocumentTypeUnique(documentTypeUnique: string) {
        if (documentTypeUnique !== '') {
            this.#documentTypeUnique.setValue(documentTypeUnique);
        }
    }

    getOrCreateStylesheet(href: string): Promise<CSSStyleSheet> {
        const cached = this.#stylesheetCache.get(href);
        if (cached) return cached;

        const promise = fetch(href)
            .then(async response => {
                const css = await response.text();
                const sheet = new CSSStyleSheet();
                // A constructed stylesheet resolves relative url()s against the document, so
                // they are resolved against the stylesheet itself before it is adopted.
                sheet.replaceSync(resolveStylesheetUrls(css, response.url || new URL(href, document.baseURI).href));
                return sheet;
            });
        this.#stylesheetCache.set(href, promise);
        return promise;
    }

}

export default BlockPreviewContext;
