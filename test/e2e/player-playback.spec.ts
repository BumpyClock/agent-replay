import { expect, test } from "@playwright/test";
import { getFileUrl, getUncompressedFileUrl, waitForReady } from "./setup.js";

const blockCount = (page, turn, hidden = false) =>
  page
    .locator(
      `.turn[data-index="${turn}"] .block-wrapper${hidden ? ".block-hidden" : ""}`,
    )
    .count();

const visibleBlockCount = (page, turn) =>
  page
    .locator(`.turn[data-index="${turn}"] .block-wrapper:not(.block-hidden)`)
    .count();

const isSplashVisible = (page) =>
  page.locator("#splash").evaluate((el) => !el.classList.contains("hidden"));

const pressKey = (page, key) => page.keyboard.press(key);

async function goto(page, hash = "") {
  await page.goto(getFileUrl(hash));
  await waitForReady(page);
}

test("loads with splash screen visible", async ({ page }) => {
  await goto(page);
  expect(await isSplashVisible(page)).toBe(true);
  await expect(page.locator("#splash-play")).toBeVisible();
});

test("#turn=0 shows splash screen", async ({ page }) => {
  await goto(page, "turn=0");
  expect(await isSplashVisible(page)).toBe(true);
});

test("#turn=2 skips splash and shows turn 2", async ({ page }) => {
  await goto(page, "turn=2");
  expect(await isSplashVisible(page)).toBe(false);
  await expect(page.locator('.turn[data-index="2"]')).toBeVisible();
});

test("clicking play hides splash and starts revealing blocks", async ({
  page,
}) => {
  await goto(page);
  await page.locator("#splash-play").click();
  expect(await isSplashVisible(page)).toBe(false);
  await expect(
    page
      .locator('.turn[data-index="1"] .block-wrapper:not(.block-hidden)')
      .first(),
  ).toBeVisible({ timeout: 5000 });
});

test("step forward reveals blocks one by one", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  expect(await isSplashVisible(page)).toBe(false);
  const total = await blockCount(page, 1);
  expect(total).toBe(6);
  expect(await blockCount(page, 1, true)).toBe(6);

  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(1);

  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(2);

  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(3);
});

test("step forward advances to next turn after all blocks revealed", async ({
  page,
}) => {
  await goto(page, "turn=1");
  expect(await visibleBlockCount(page, 1)).toBe(0);
  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(1);
});

test("step back hides blocks one by one", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(3);

  await pressKey(page, "ArrowLeft");
  expect(await visibleBlockCount(page, 1)).toBe(2);

  await pressKey(page, "ArrowLeft");
  expect(await visibleBlockCount(page, 1)).toBe(1);
});

test("step back to turn 0 shows splash", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowLeft");
  expect(await isSplashVisible(page)).toBe(true);
});

test("expanding a block does not reveal remaining blocks", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(2);

  await page.locator('.turn[data-index="1"] .thinking-header').click();
  await expect(
    page.locator('.turn[data-index="1"] .thinking-block.open'),
  ).toBeVisible();
  expect(await visibleBlockCount(page, 1)).toBe(2);

  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(3);
});

test("expanding tool block does not reveal remaining blocks", async ({
  page,
}) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(3);

  await page.locator('.turn[data-index="1"] .tool-header').first().click();
  expect(await visibleBlockCount(page, 1)).toBe(3);

  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(4);
});

test("stepping back past expanded block collapses it", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(2);

  await page.locator('.turn[data-index="1"] .thinking-header').click();
  await expect(
    page.locator('.turn[data-index="1"] .thinking-block.open'),
  ).toBeVisible();

  await pressKey(page, "ArrowLeft");
  await pressKey(page, "ArrowLeft");
  expect(await visibleBlockCount(page, 1)).toBe(0);

  await pressKey(page, "ArrowRight");
  const isOpen = await page
    .locator('.turn[data-index="1"] .thinking-block')
    .evaluate((el) => el.classList.contains("open"));
  expect(isOpen).toBe(false);
});

test("Space toggles play/pause", async ({ page }) => {
  await goto(page);
  await pressKey(page, " ");
  expect(await isSplashVisible(page)).toBe(false);
  await page.waitForTimeout(500);
  await pressKey(page, " ");
  const before = await visibleBlockCount(page, 1);
  await pressKey(page, "ArrowRight");
  const after = await visibleBlockCount(page, 1);
  expect(after).toBeGreaterThanOrEqual(before);
});

test("K toggles play/pause", async ({ page }) => {
  await goto(page);
  await pressKey(page, "k");
  expect(await isSplashVisible(page)).toBe(false);
});

test("H and L step back and forward", async ({ page }) => {
  await goto(page);
  await pressKey(page, "l");
  expect(await isSplashVisible(page)).toBe(false);
  await pressKey(page, "l");
  expect(await visibleBlockCount(page, 1)).toBe(1);
  await pressKey(page, "h");
  expect(await visibleBlockCount(page, 1)).toBe(0);
});

test("uncompressed: player loads and initializes", async ({ page }) => {
  await page.goto(getUncompressedFileUrl());
  await waitForReady(page);
  expect(await isSplashVisible(page)).toBe(true);
});

test("uncompressed: stepping reveals blocks", async ({ page }) => {
  await page.goto(getUncompressedFileUrl());
  await waitForReady(page);
  await pressKey(page, "ArrowRight");
  expect(await isSplashVisible(page)).toBe(false);
  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(1);
});

test("play from last turn does not reset to beginning", async ({ page }) => {
  await goto(page, "turn=5");
  const hidden = await blockCount(page, 5, true);
  expect(hidden).toBeGreaterThan(0);

  await pressKey(page, " ");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        '.turn[data-index="5"] .block-wrapper:not(.block-hidden)',
      ).length > 0,
    { timeout: 5000 },
  );

  await expect(page.locator('.turn[data-index="5"]')).toBeVisible();
  await expect(page.locator('.turn[data-index="1"]')).toBeVisible();
});

test("deep link with r suffix reveals blocks", async ({ page }) => {
  await goto(page, "turn=3r");
  await expect(page.locator('.turn[data-index="3"]')).toBeVisible();
  const visible = await visibleBlockCount(page, 3);
  expect(visible).toBeGreaterThan(0);
  const hidden = await blockCount(page, 3, true);
  expect(hidden).toBe(0);
});

test("deep link without r suffix hides active blocks", async ({ page }) => {
  await goto(page, "turn=3");
  await expect(page.locator('.turn[data-index="3"]')).toBeVisible();
  const hidden = await blockCount(page, 3, true);
  expect(hidden).toBeGreaterThan(0);
});

test("deep link with r suffix does not trigger scroll animation", async ({
  page,
}) => {
  await goto(page, "turn=5r");
  await expect(page.locator("#splash")).toHaveClass(/hidden/);
  await expect(page.locator('.turn[data-index="5"]')).toBeVisible();
  const visible = await visibleBlockCount(page, 5);
  expect(visible).toBeGreaterThan(0);
});

test("uncompressed: deep link to turn works", async ({ page }) => {
  await page.goto(getUncompressedFileUrl("turn=2"));
  await waitForReady(page);
  expect(await isSplashVisible(page)).toBe(false);
  await expect(page.locator('.turn[data-index="2"]')).toBeVisible();
});
