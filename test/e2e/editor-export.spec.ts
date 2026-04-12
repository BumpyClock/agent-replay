import { expect, test } from "@playwright/test";
import {
  gotoEditor,
  loadFixture,
  waitForPreviewRefresh,
} from "./editor-helpers.js";

test("export button triggers download", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);
  await waitForPreviewRefresh(page);

  const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
  await page.locator("#exportBtn").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.html$/);
});
