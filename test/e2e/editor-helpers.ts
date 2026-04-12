import { basename, dirname } from "node:path";
import { expect, type Page } from "@playwright/test";
import { resolveFileUrlPath } from "../helpers/file-url-path.js";

const FIXTURE_PATH = resolveFileUrlPath("./fixture.jsonl", import.meta.url);

let baseUrlPromise: Promise<string> | undefined;

async function startEditorServer() {
  const { startEditor } = await import("../../src/editor-server.js");
  const port = 17331 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;

  startEditor(port, { open: false });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/themes`);
      if (response.ok) {
        return baseUrl;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Editor server did not start");
}

async function getBaseUrl() {
  if (!baseUrlPromise) {
    baseUrlPromise = startEditorServer();
  }

  return baseUrlPromise;
}

export async function gotoEditor(page: Page) {
  await page.goto(await getBaseUrl());
  await page.waitForSelector("#sessionsTree", { timeout: 5000 });
}

export async function loadFixture(page: Page) {
  await page.locator("#browseToggle").click();
  await page.waitForSelector("#browseBody:not([style*='display: none'])", {
    timeout: 2000,
  });
  await page.locator("#browsePathInput").fill(dirname(FIXTURE_PATH));
  await page.locator("#browsePathInput").press("Enter");

  const fixtureItem = page.locator(".browse-item", {
    hasText: basename(FIXTURE_PATH),
  });
  await expect(fixtureItem).toBeVisible({ timeout: 5000 });
  await fixtureItem.click();
  await page.waitForSelector(".turn-card", { timeout: 5000 });
}

export async function waitForPreviewRefresh(page: Page) {
  await expect(page.locator("#refreshIndicator")).not.toHaveClass(/active/, {
    timeout: 10000,
  });
}

export async function waitForPreviewIframe(page: Page) {
  await page.waitForFunction(
    () =>
      (
        document.getElementById("previewIframe") as HTMLIFrameElement | null
      )?.src?.startsWith("blob:"),
    { timeout: 10000 },
  );
}
