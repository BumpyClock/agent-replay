import { expect, test } from "@playwright/test";
import { getFileUrl, waitForReady } from "./setup.js";

const pressKey = (page, key) => page.keyboard.press(key);

async function goto(page, hash = "") {
  await page.goto(getFileUrl(hash));
  await waitForReady(page);
}

test("desktop: title, speed, filter visible; more hidden", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await goto(page);
  await pressKey(page, " ");
  await expect(page.locator(".bar-title")).toBeVisible();
  await expect(page.locator("#speed-btn")).toBeVisible();
  await expect(page.locator("#filter-btn")).toBeVisible();
  await expect(page.locator(".more-wrap")).toBeHidden();
});

test("narrow: title hidden, more button visible, speed/filter hidden", async ({
  page,
}) => {
  await page.setViewportSize({ width: 450, height: 600 });
  await goto(page);
  await pressKey(page, " ");
  await expect(page.locator(".bar-title")).toBeHidden();
  await expect(page.locator(".more-wrap")).toBeVisible();
  await expect(page.locator(".controls-secondary")).toBeHidden();
});

test("turn skip buttons visible at all sizes", async ({ page }) => {
  for (const width of [800, 450, 320]) {
    await page.setViewportSize({ width, height: 600 });
    await goto(page);
    await pressKey(page, " ");
    await expect(page.locator("#btn-prev-turn")).toBeVisible();
    await expect(page.locator("#btn-next-turn")).toBeVisible();
  }
});

test("next turn button skips to next turn", async ({ page }) => {
  await goto(page, "turn=1");
  await page.locator("#btn-next-turn").click();
  await expect(page.locator('.turn[data-index="2"]')).toBeVisible();
  await expect(page.locator('.turn[data-index="2"]')).toHaveClass(/active/);
});

test("prev turn button skips to previous turn", async ({ page }) => {
  await goto(page, "turn=3");
  await page.locator("#btn-prev-turn").click();
  await expect(page.locator('.turn[data-index="2"]')).toHaveClass(/active/);
});
