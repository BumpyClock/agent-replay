import { expect, test } from "@playwright/test";
import { getFileUrl, getPacedFileUrl, waitForReady } from "./setup.js";

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

test("play button starts and pauses playback", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  expect(await isSplashVisible(page)).toBe(false);

  await page.locator("#btn-play").click();
  await page.waitForTimeout(500);
  const revealed = await visibleBlockCount(page, 1);
  expect(revealed).toBeGreaterThan(0);

  await page.locator("#btn-play").click();
  const afterPause = await visibleBlockCount(page, 1);
  await page.waitForTimeout(300);
  expect(await visibleBlockCount(page, 1)).toBe(afterPause);
});

test("next button steps forward", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  await page.locator("#btn-next").click();
  expect(await visibleBlockCount(page, 1)).toBe(1);
  await page.locator("#btn-next").click();
  expect(await visibleBlockCount(page, 1)).toBe(2);
});

test("prev button steps back", async ({ page }) => {
  await goto(page);
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  await pressKey(page, "ArrowRight");
  expect(await visibleBlockCount(page, 1)).toBe(2);

  await page.locator("#btn-prev").click();
  expect(await visibleBlockCount(page, 1)).toBe(1);
});

test("progress bar fill advances with turns", async ({ page }) => {
  const getFillWidth = () =>
    page
      .locator("#progress-fill")
      .evaluate((el) => parseFloat(el.style.width) || 0);

  await goto(page, "turn=1");
  expect(await getFillWidth()).toBe(0);

  await page.goto("about:blank");
  await goto(page, "turn=2");
  expect(await getFillWidth()).toBe(25);

  await page.goto("about:blank");
  await goto(page, "turn=5");
  expect(await getFillWidth()).toBe(100);
});

test("clicking progress bar seeks to position", async ({ page }) => {
  await goto(page, "turn=1");
  const bar = page.locator("#progress-bar");
  const box = await bar.boundingBox();
  await bar.click({ position: { x: box.width - 5, y: box.height / 2 } });
  await expect(page.locator('.turn[data-index="5"]')).toBeVisible();
});

test("progress text shows timer", async ({ page }) => {
  await goto(page);
  const text = await page.locator("#progress-text").textContent();
  expect(text).toMatch(/\d+:\d{2}\s*\/\s*\d+:\d{2}/);
});

test("speed popover changes speed", async ({ page }) => {
  await goto(page);
  const getSpeed = () => page.locator("#speed-btn").textContent();
  expect(await getSpeed()).toContain("1x");

  await page.locator("#speed-btn").click();
  await expect(page.locator("#speed-popover")).toBeVisible();
  await page.locator('#speed-popover button[data-speed="2"]').click();
  expect(await getSpeed()).toBe("2x");
});

test("font size button cycles through S, M, L", async ({ page }) => {
  await goto(page);
  await pressKey(page, " ");
  await page.locator("#filter-btn").click();
  const btn = page.locator("#font-size-cycle");
  await expect(btn).toHaveText("M");
  await btn.click();
  await expect(btn).toHaveText("L");
  await btn.click();
  await expect(btn).toHaveText("S");
  await btn.click();
  await expect(btn).toHaveText("M");
});

test("auto-paced toggle visible in speed popover with real timestamps", async ({
  page,
}) => {
  await goto(page);
  await pressKey(page, " ");
  await page.locator("#speed-btn").click();
  await expect(page.locator("#paced-toggle-wrap")).toBeVisible();
});

test("auto-paced toggle hidden when built with paced timing", async ({
  page,
}) => {
  await page.goto(getPacedFileUrl());
  await waitForReady(page);
  await pressKey(page, " ");
  await page.locator("#speed-btn").click();
  const toggle = page.locator("#paced-toggle-wrap");
  await expect(toggle).toHaveCount(0);
});

test("toggling auto-paced changes timer display", async ({ page }) => {
  await goto(page, "turn=3");
  const realTime = await page.locator("#progress-text").textContent();
  await page.locator("#speed-btn").click();
  await page.locator("#toggle-paced").check();
  const pacedTime = await page.locator("#progress-text").textContent();
  expect(pacedTime).not.toBe(realTime);
});
