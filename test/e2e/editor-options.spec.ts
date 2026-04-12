import { expect, test } from "@playwright/test";
import { gotoEditor } from "./editor-helpers.js";

test("theme select has options", async ({ page }) => {
  await gotoEditor(page);
  expect(await page.locator("#optTheme option").count()).toBeGreaterThanOrEqual(
    5,
  );
});

test("speed input accepts value changes", async ({ page }) => {
  await gotoEditor(page);
  await page.locator("#optSpeed").fill("2.5");
  await expect(page.locator("#optSpeed")).toHaveValue("2.5");
});

test("thinking toggle can be unchecked", async ({ page }) => {
  await gotoEditor(page);
  const checkbox = page.locator("#optThinking");
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
});

test("tool calls toggle can be unchecked", async ({ page }) => {
  await gotoEditor(page);
  const checkbox = page.locator("#optToolCalls");
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
});

test("timing select has three options", async ({ page }) => {
  await gotoEditor(page);
  await expect(page.locator("#optTiming option")).toHaveCount(3);
});

test("help button opens modal", async ({ page }) => {
  await gotoEditor(page);
  await expect(page.locator("#helpModal")).not.toHaveClass(/open/);
  await page.locator("#helpBtn").click();
  await expect(page.locator("#helpModal")).toHaveClass(/open/);
});

test("help modal closes with X button", async ({ page }) => {
  await gotoEditor(page);
  await page.locator("#helpBtn").click();
  await expect(page.locator("#helpModal")).toHaveClass(/open/);
  await page.locator("#helpModalClose").click();
  await expect(page.locator("#helpModal")).not.toHaveClass(/open/);
});

test("help modal closes with Escape", async ({ page }) => {
  await gotoEditor(page);
  await page.locator("#helpBtn").click();
  await expect(page.locator("#helpModal")).toHaveClass(/open/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpModal")).not.toHaveClass(/open/);
});

test("dark/light toggle switches mode", async ({ page }) => {
  await gotoEditor(page);

  const htmlElement = page.locator("html");
  await expect(htmlElement).not.toHaveClass(/light/);
  await page.locator("#themeModeBtn").click();
  await expect(htmlElement).toHaveClass(/light/);
  await page.locator("#themeModeBtn").click();
  await expect(htmlElement).not.toHaveClass(/light/);
});

test("sidebar toggle collapses and expands sidebar", async ({ page }) => {
  await gotoEditor(page);

  await expect(page.locator("body")).not.toHaveClass(/sidebar-collapsed/);
  await page.locator("#sidebarToggleBtn").click();
  await expect(page.locator("body")).toHaveClass(/sidebar-collapsed/);
  await page.locator("#sidebarToggleBtn").click();
  await expect(page.locator("body")).not.toHaveClass(/sidebar-collapsed/);
});

test("sidebar is visible after reopen when resize handle was dragged", async ({
  page,
}) => {
  await gotoEditor(page);

  const sidebar = page.locator(".sidebar");
  await page.locator("#sidebarToggleBtn").click();
  await expect(page.locator("body")).toHaveClass(/sidebar-collapsed/);

  const handle = page.locator("#resizeHandle");
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 2, box.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y + 2);
  await page.mouse.up();

  await page.locator("#sidebarToggleBtn").click();
  await expect(page.locator("body")).not.toHaveClass(/sidebar-collapsed/);
  const width = await sidebar.evaluate((element) => {
    return element.getBoundingClientRect().width;
  });
  expect(width).toBeGreaterThan(100);
});
