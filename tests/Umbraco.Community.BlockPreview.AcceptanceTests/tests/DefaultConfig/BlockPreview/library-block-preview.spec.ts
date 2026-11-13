import { expect, Page } from "@playwright/test";
import { ConstantHelper } from "@umbraco-cms/acceptance-test-helpers";
import { test } from "../../../lib/index";

/**
 * Library (reusable) element previews on the seeded "Library Test" page
 * (Content > Home > Library Test). Every block on that page references the same
 * "Library Hero" Library element, whose headline is "Library Hero".
 *
 * Library blocks have no local content data, so the preview request depends on the
 * layout item `key` and `isExternalContent`; a blank or errored preview here means the
 * client or the server no longer handles external content.
 */

type PreviewStatus = { rendered: boolean; text: string; errors: string[] };

/** Collects every preview of one tag from the (nested) shadow DOM. */
async function getPreviews(page: Page, tag: string): Promise<PreviewStatus[]> {
  return page.evaluate((previewTag) => {
    const results: { rendered: boolean; text: string; errors: string[] }[] = [];

    function search(root: Document | ShadowRoot) {
      for (const el of root.querySelectorAll(previewTag)) {
        const anchor = el.shadowRoot?.querySelector('a.block-preview-edit');
        const text = anchor?.textContent?.trim() ?? '';
        results.push({
          rendered: !!anchor && (!!text || !!anchor.querySelector('*')),
          text,
          errors: [...(el.shadowRoot?.querySelectorAll('.preview-alert-error') ?? [])].map(
            (alert) => alert.textContent?.trim() ?? ''
          ),
        });
      }
      for (const el of root.querySelectorAll('*')) {
        if ((el as HTMLElement).shadowRoot) search((el as HTMLElement).shadowRoot!);
      }
    }

    search(document);
    return results;
  }, tag);
}

/** Waits for `count` previews of `tag` to have rendered, then returns them. */
async function waitForPreviews(page: Page, tag: string, count: number) {
  await expect
    .poll(async () => (await getPreviews(page, tag)).filter((p) => p.rendered).length, { timeout: 30000 })
    .toBeGreaterThanOrEqual(count);
  return getPreviews(page, tag);
}

test.describe("Library element previews", () => {
  test.beforeEach(async ({ umbracoApi, umbracoUi }, testInfo) => {
    await umbracoApi.report.report(testInfo);
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);
    await umbracoUi.content.openContentCaretButtonForName('Home');
    await umbracoUi.content.goToContentWithName('Library Test');
  });

  test("Block List renders the same Library element twice @smoke", async ({ page }) => {
    const previews = await waitForPreviews(page, 'block-list-preview', 2);

    expect(previews).toHaveLength(2);
    for (const preview of previews) {
      expect(preview.rendered).toBe(true);
      expect(preview.text).toContain('Library Hero');
      expect(preview.errors).toEqual([]);
    }
  });

  test("Block Grid renders a root Library element @smoke", async ({ page }) => {
    const previews = await waitForPreviews(page, 'block-grid-preview', 1);

    // The root block is asserted here (>= 1 preview); the area child has its own test below.
    expect(previews[0].rendered).toBe(true);
    expect(previews[0].text).toContain('Library Hero');
    expect(previews[0].errors).toEqual([]);
  });

  // Needs CMS 19.0.0-rc1 or later (umbraco/Umbraco-CMS#24581): earlier builds lost the area child.
  test("Block Grid renders a Library element inside an area", async ({ page }) => {
    const previews = await waitForPreviews(page, 'block-grid-preview', 2);

    expect(previews).toHaveLength(2);
    for (const preview of previews) {
      expect(preview.rendered).toBe(true);
      expect(preview.text).toContain('Library Hero');
      expect(preview.errors).toEqual([]);
    }
  });

  test("Single Block renders a Library element @smoke", async ({ page }) => {
    const previews = await waitForPreviews(page, 'block-single-preview', 1);

    expect(previews).toHaveLength(1);
    expect(previews[0].text).toContain('Library Hero');
    expect(previews[0].errors).toEqual([]);
  });

  test("Rich Text renders an inline Library element @smoke", async ({ page }) => {
    const previews = await waitForPreviews(page, 'rich-text-preview', 1);

    expect(previews).toHaveLength(1);
    expect(previews[0].text).toContain('Library Hero');
    expect(previews[0].errors).toEqual([]);
  });
});
