import { expect, test } from "@playwright/test";
import { gotoEditor } from "./editor-helpers.js";

test("theme select has options", async ({ page }) => {
  await gotoEditor(page);
  await expect
    .poll(async () => {
      return page.locator("#optTheme option").count();
    })
    .toBeGreaterThanOrEqual(5);
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
  await expect(page.locator("#helpModal")).toHaveCount(0);
  await page.locator("#helpBtn").click();
  await expect(page.locator("#helpModal")).toHaveClass(/open/);
});

test("help modal closes with X button", async ({ page }) => {
  await gotoEditor(page);
  await page.locator("#helpBtn").click();
  await expect(page.locator("#helpModal")).toHaveClass(/open/);
  await page.locator("#helpModalClose").click();
  await expect(page.locator("#helpModal")).toHaveCount(0);
});

test("help modal closes with Escape", async ({ page }) => {
  await gotoEditor(page);
  await page.locator("#helpBtn").click();
  await expect(page.locator("#helpModal")).toHaveClass(/open/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpModal")).toHaveCount(0);
});

test("dark/light toggle switches mode", async ({ page }) => {
  await gotoEditor(page);

  const shell = page.locator(".editor-shell");
  await expect(shell).not.toHaveClass(/light/);
  await page.locator("#themeModeBtn").click();
  await expect(shell).toHaveClass(/light/);
  await page.locator("#themeModeBtn").click();
  await expect(shell).not.toHaveClass(/light/);
});

test("sidebar toggle collapses and expands sidebar", async ({ page }) => {
  await gotoEditor(page);

  const shell = page.locator(".editor-shell");
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  await page.locator("#sidebarToggleBtn").click();
  await expect(shell).toHaveClass(/sidebar-collapsed/);
  await page.locator("#sidebarToggleBtn").click();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
});

test("sidebar is visible after reopen when resize handle was dragged", async ({
  page,
}) => {
  await gotoEditor(page);

  const shell = page.locator(".editor-shell");
  const sidebar = page.locator(".sidebar");
  await page.locator("#sidebarToggleBtn").click();
  await expect(shell).toHaveClass(/sidebar-collapsed/);

  const handle = page.locator("#resizeHandle");
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 2, box.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 50, box.y + 2);
  await page.mouse.up();

  await page.locator("#sidebarToggleBtn").click();
  await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  const width = await sidebar.evaluate((element) => {
    return element.getBoundingClientRect().width;
  });
  expect(width).toBeGreaterThan(100);
});

test("resize handle drags editor panel width cleanly", async ({ page }) => {
  await gotoEditor(page);

  const editorPanel = page.locator(".editor-panel");
  const handle = page.locator("#resizeHandle");
  const beforeWidth = await editorPanel.evaluate((element) => {
    return element.getBoundingClientRect().width;
  });
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error("Missing resize handle bounds");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(handle).toHaveClass(/active/);
  await page.mouse.move(box.x + box.width / 2 + 96, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(handle).not.toHaveClass(/active/);

  const afterWidth = await editorPanel.evaluate((element) => {
    return element.getBoundingClientRect().width;
  });
  expect(afterWidth).toBeGreaterThan(beforeWidth + 40);
});
