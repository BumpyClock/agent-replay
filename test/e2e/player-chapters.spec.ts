import { expect, test } from "@playwright/test";
import { getChapterFileUrl, getFileUrl, waitForReady } from "./setup.js";

const pressKey = (page, key) => page.keyboard.press(key);

async function goto(page, hash = "") {
  await page.goto(getFileUrl(hash));
  await waitForReady(page);
}

async function gotoChapters(page, hash = "") {
  await page.goto(getChapterFileUrl(hash));
  await waitForReady(page);
}

test("chapter dropdown is visible when bookmarks configured", async ({
  page,
}) => {
  await gotoChapters(page);
  await expect(page.locator("#chapter-wrap")).toBeVisible();
  await expect(page.locator("#chapter-btn")).toBeVisible();
});

test("chapter dropdown is hidden when no bookmarks", async ({ page }) => {
  await goto(page);
  await expect(page.locator("#chapter-wrap")).toBeHidden();
});

test("clicking chapter navigates to turn", async ({ page }) => {
  await gotoChapters(page, "turn=1");
  await page.locator("#chapter-btn").click();
  await expect(page.locator("#chapter-menu")).toBeVisible();
  await page
    .locator("#chapter-menu .chapter-item", { hasText: "Connect" })
    .click();
  await expect(page.locator('.turn[data-index="2"]')).toBeVisible();
});

test("chapter click stops playback", async ({ page }) => {
  await gotoChapters(page);
  await pressKey(page, " ");
  await page.waitForTimeout(300);

  await page.locator("#chapter-btn").click();
  await page
    .locator("#chapter-menu .chapter-item", { hasText: "Wrap up" })
    .click();

  await expect(page.locator('.turn[data-index="5"]')).toBeVisible();
  const btnText = await page.locator("#btn-play").textContent();
  expect(btnText).toBe("▶");
});

test("chapter button visible with bookmarks, hidden without", async ({
  page,
}) => {
  await page.goto(getChapterFileUrl());
  await waitForReady(page);
  await pressKey(page, " ");
  await expect(page.locator("#chapter-btn")).toBeVisible();

  await goto(page);
  await pressKey(page, " ");
  await expect(page.locator("#chapter-wrap")).toBeHidden();
});
