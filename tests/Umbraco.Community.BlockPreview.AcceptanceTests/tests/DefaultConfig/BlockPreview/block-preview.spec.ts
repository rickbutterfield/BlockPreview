import { expect } from "@playwright/test";
import { ConstantHelper } from "@umbraco-cms/acceptance-test-helpers";
import { test } from "../../../lib/index";

/**
 * Searches shadow DOM recursively for block preview elements.
 * Returns the count of preview elements, the number that rendered actual markup,
 * and any error messages found.
 *
 * `renderedCount` is important: a preview can exist and report no error yet still
 * render nothing (empty `_htmlMarkup`). That is the failure mode behind #294/#300,
 * where the RTE/list preview stayed blank instead of showing the block. Checking
 * only `errors` would not catch it, so we also assert markup was actually rendered.
 */
async function getBlockPreviewStatus(page: import("@playwright/test").Page, tagFilter?: string[]) {
  return page.evaluate((filter) => {
    const previewTags = filter ?? ['block-grid-preview', 'block-list-preview', 'rich-text-preview'];
    const results = { previewCount: 0, renderedCount: 0, errors: [] as string[] };

    function search(root: Document | ShadowRoot) {
      for (const tag of previewTags) {
        const elements = root.querySelectorAll(tag);
        for (const el of elements) {
          results.previewCount++;
          if (el.shadowRoot) {
            // A rendered preview wraps the server markup in <a class="block-preview-edit">.
            const rendered = el.shadowRoot.querySelector('a.block-preview-edit');
            if (rendered && (rendered.textContent?.trim() || rendered.querySelector('*'))) {
              results.renderedCount++;
            }
            const errorAlerts = el.shadowRoot.querySelectorAll('.preview-alert-error');
            for (const alert of errorAlerts) {
              results.errors.push(alert.textContent?.trim() ?? '');
            }
          }
        }
      }

      for (const el of root.querySelectorAll('*')) {
        if ((el as HTMLElement).shadowRoot) {
          search((el as HTMLElement).shadowRoot!);
        }
      }
    }

    search(document);
    return results;
  }, tagFilter);
}

/** Waits until at least one block preview has rendered markup, or fails after 30 seconds. */
async function waitForRenderedPreview(page: import("@playwright/test").Page, tagFilter?: string[]) {
  await expect
    .poll(async () => (await getBlockPreviewStatus(page, tagFilter)).renderedCount, { timeout: 30000 })
    .toBeGreaterThan(0);
}

test.describe("Block Preview", () => {
  test.beforeEach(async ({ umbracoApi }, testInfo) => {
    await umbracoApi.report.report(testInfo);
  });

  /*
   * Smoke Tests - Verify backoffice loads and content section is accessible
   */

  test("Can navigate to the content section @smoke", async ({ umbracoUi }) => {
    // Act
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);

    // Assert
    await expect(umbracoUi.page.locator('umb-section-main')).toBeVisible();
  });

  /*
   * Block Grid Preview Tests
   */

  test("Block Grid page renders block previews @smoke", async ({ umbracoUi, page }) => {
    // Arrange
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);

    // Act - Expand Home node and navigate to a Block Grid content node
    await umbracoUi.content.openContentCaretButtonForName('Home');
    await umbracoUi.content.goToContentWithName('Nested Block Grid Test');

    // Wait for at least one preview to render. The first render on a cold site can take
    // several seconds (view compilation), so a fixed sleep is flaky.
    await waitForRenderedPreview(page);

    // Assert - Preview elements should be present, rendered, and error-free
    const status = await getBlockPreviewStatus(page);
    expect(status.previewCount).toBeGreaterThan(0);
    expect(status.renderedCount).toBeGreaterThan(0);
    expect(status.errors).toEqual([]);
  });

  test("Block List page renders block previews @smoke", async ({ umbracoUi, page }) => {
    // Arrange
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);

    // Act - Expand Home node and navigate to a Block List content node
    await umbracoUi.content.openContentCaretButtonForName('Home');
    await umbracoUi.content.goToContentWithName('Block List Test');

    // Wait for at least one preview to render. The first render on a cold site can take
    // several seconds (view compilation), so a fixed sleep is flaky.
    await waitForRenderedPreview(page);

    // Assert - Preview elements should be present, rendered, and error-free
    const status = await getBlockPreviewStatus(page);
    expect(status.previewCount).toBeGreaterThan(0);
    expect(status.renderedCount).toBeGreaterThan(0);
    expect(status.errors).toEqual([]);
  });

  /*
   * Rich Text (Tiptap) Block Preview Tests
   *
   * Regression coverage for #300 (and the RTE half of #294): RTE blocks embedded in a
   * rich text field must render their BlockPreview markup in the backoffice, not stay
   * blank (raw <umb-rte-block>).
   *
   * The rich text field lives on a `richTextBlock` nested inside the Home Block Grid, so
   * the RTE editor (and its embedded block) only mounts when that block's edit modal is
   * open. We open it by clicking the grid preview for the block that contains the RTE
   * block; its content key is fixed by the test site's uSync data.
   */
  const RTE_HOST_BLOCK_KEY = '0d8e8778-175b-4b89-8a6a-ed340ea86934';

  test("Rich Text block renders embedded block preview @smoke", async ({ umbracoUi, page }) => {
    // Arrange
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content);

    // Act - Open Home, then open the richTextBlock (which contains an RTE block) for editing
    await umbracoUi.content.goToContentWithName('Home');

    // Wait for the target grid block's preview to mount in the (nested) shadow DOM.
    await page.waitForFunction((key) => {
      const find = (root: Document | ShadowRoot): boolean => {
        for (const el of root.querySelectorAll('block-grid-preview')) {
          const contentKey = (el as any).contentKey ?? (el as any).content?.key;
          if (contentKey === key && el.shadowRoot?.querySelector('a.block-preview-edit')) return true;
        }
        for (const el of root.querySelectorAll('*')) {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr && find(sr)) return true;
        }
        return false;
      };
      return find(document);
    }, RTE_HOST_BLOCK_KEY, { timeout: 30000 });

    const opened = await page.evaluate((key) => {
      const search = (root: Document | ShadowRoot): boolean => {
        for (const el of root.querySelectorAll('block-grid-preview')) {
          const contentKey = (el as any).contentKey ?? (el as any).content?.key;
          if (contentKey === key) {
            const anchor = el.shadowRoot?.querySelector('a.block-preview-edit') as HTMLElement | null;
            if (anchor) { anchor.click(); return true; }
          }
        }
        for (const el of root.querySelectorAll('*')) {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr && search(sr)) return true;
        }
        return false;
      };
      return search(document);
    }, RTE_HOST_BLOCK_KEY);

    expect(opened, 'Expected to find and open the richTextBlock grid preview').toBe(true);

    // Wait for the RTE preview inside the modal to render its markup (not stay blank).
    await page.waitForFunction(() => {
      const find = (root: Document | ShadowRoot): boolean => {
        for (const el of root.querySelectorAll('rich-text-preview')) {
          const anchor = el.shadowRoot?.querySelector('a.block-preview-edit');
          if (anchor && (anchor.textContent?.trim() || anchor.querySelector('*'))) return true;
        }
        for (const el of root.querySelectorAll('*')) {
          const sr = (el as HTMLElement).shadowRoot;
          if (sr && find(sr)) return true;
        }
        return false;
      };
      return find(document);
    }, { timeout: 30000 });

    // Assert - The RTE preview must exist AND render markup (not stay blank), with no errors
    const status = await getBlockPreviewStatus(page, ['rich-text-preview']);
    expect(status.previewCount).toBeGreaterThan(0);
    expect(status.renderedCount).toBeGreaterThan(0);
    expect(status.errors).toEqual([]);
  });
});
