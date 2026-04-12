import { expect, test } from "@playwright/test";
import {
  gotoEditor,
  loadFixture,
  waitForPreviewIframe,
  waitForPreviewRefresh,
} from "./editor-helpers.js";

test("editor page loads with sessions panel", async ({ page }) => {
  await gotoEditor(page);
  await expect(page.locator("#sessionsSection")).toBeVisible();
  await expect(page.locator("#sessionsSearch")).toBeVisible();
  await expect(page.locator("#titleInput")).toBeVisible();
  await expect(page.locator("#exportBtn")).toBeVisible();
});

test("loading a session shows turns in editor", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  const cards = page.locator(".turn-card");
  await expect(cards).toHaveCount(5);

  const firstTextarea = page.locator(
    'textarea[data-action="edit"][data-index="1"]',
  );
  await expect(firstTextarea).toContainText("Scan for BLE devices");
});

test("turns toolbar appears after loading session", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);
  await expect(page.locator("#turnsToolbar")).toBeVisible();
  await expect(page.locator("#selectAllBtn")).toBeVisible();
  await expect(page.locator("#selectNoneBtn")).toBeVisible();
});

test("preview iframe loads after session load", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);
  await waitForPreviewIframe(page);
});

test("clicking turn header updates preview hash", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);
  await waitForPreviewIframe(page);
  await waitForPreviewRefresh(page);
  await page.waitForTimeout(500);
  await page.locator('.turn-card[data-index="3"] .turn-label').click();
  await page.waitForFunction(() => {
    const iframe = document.getElementById("previewIframe") as
      | HTMLIFrameElement
      | null;
    return iframe?.contentWindow?.location.hash === "#turn=3";
  });

  const iframe = page.frameLocator("#previewIframe");
  await expect(iframe.locator('.turn[data-index="3"]')).toBeVisible({
    timeout: 5000,
  });
});
