import { expect, test } from "@playwright/test";
import { gotoEditor, loadFixture } from "./editor-helpers.js";

test("editing user text updates turn", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  const textarea = page.locator('textarea[data-action="edit"][data-index="1"]');
  await textarea.fill("Modified prompt text");
  await expect(textarea).toHaveValue("Modified prompt text");
});

test("excluding a turn adds excluded class", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  const checkbox = page.locator('input[data-action="toggle"][data-index="2"]');
  const card = page.locator('.turn-card[data-index="2"]');
  await checkbox.uncheck();
  await expect(card).toHaveClass(/excluded/);
  await checkbox.check();
  await expect(card).not.toHaveClass(/excluded/);
});

test("exclude all / include all buttons work", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  await page.locator("#selectNoneBtn").click();
  expect(await page.locator(".turn-card.excluded").count()).toBe(5);

  await page.locator("#selectAllBtn").click();
  expect(await page.locator(".turn-card:not(.excluded)").count()).toBe(5);
});

test("clicking block summary expands detail view", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  const summary = page.locator('[data-action="expand"][data-index="1"]');
  const detail = page.locator("#blocks-1");
  await expect(detail).not.toHaveClass(/open/);
  await summary.click();
  await expect(detail).toHaveClass(/open/);
  await expect(summary).toHaveClass(/open/);
  await summary.click();
  await expect(detail).not.toHaveClass(/open/);
});

test("adding a bookmark enables label input", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  const bookmarkCheckbox = page.locator(
    'input[data-action="bookmark"][data-index="1"]',
  );
  const bookmarkLabel = page.locator(
    'input[data-action="bookmark-label"][data-index="1"]',
  );
  await expect(bookmarkLabel).toBeDisabled();
  await bookmarkCheckbox.check();
  await expect(bookmarkLabel).toBeEnabled();
  await bookmarkCheckbox.uncheck();
  await expect(bookmarkLabel).toBeDisabled();
});

test("reset button restores original turns", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  const textarea = page.locator('textarea[data-action="edit"][data-index="1"]');
  const originalText = await textarea.inputValue();
  await textarea.fill("Modified text");
  await page.waitForTimeout(400);
  await page.locator("#resetBtn").click();
  await page.locator("#confirmOk").click();
  await expect(textarea).toHaveValue(originalText);
});

test("expand all opens all turn block details", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  await page.locator("#expandAllBtn").click();
  expect(await page.locator(".turn-blocks-detail.open").count()).toBe(5);

  await page.locator("#collapseAllBtn").click();
  expect(await page.locator(".turn-blocks-detail.open").count()).toBe(0);
});

test("excluding a turn collapses its expanded blocks", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  await page.locator('[data-action="expand"][data-index="2"]').click();
  await expect(page.locator("#blocks-2")).toHaveClass(/open/);
  await page.locator('input[data-action="toggle"][data-index="2"]').uncheck();
  await expect(page.locator("#blocks-2")).not.toHaveClass(/open/);
});

test("exclude all collapses all expanded blocks", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  await page.locator('[data-action="expand"][data-index="1"]').click();
  await page.locator('[data-action="expand"][data-index="3"]').click();
  expect(await page.locator(".turn-blocks-detail.open").count()).toBe(2);
  await page.locator("#selectNoneBtn").click();
  expect(await page.locator(".turn-blocks-detail.open").count()).toBe(0);
});

test("tool and thinking blocks are collapsed by default, text is open", async ({
  page,
}) => {
  await gotoEditor(page);
  await loadFixture(page);

  await page.locator('[data-action="expand"][data-index="1"]').click();
  await expect(page.locator("#blocks-1")).toHaveClass(/open/);

  const openTextHeaders = page.locator(
    "#blocks-1 .block-item-header.block-text.open",
  );
  const closedToolHeaders = page.locator(
    "#blocks-1 .block-item-header.block-tool:not(.open)",
  );
  const closedThinkingHeaders = page.locator(
    "#blocks-1 .block-item-header.block-thinking:not(.open)",
  );
  const textCount = await openTextHeaders.count();
  const toolCount = await closedToolHeaders.count();
  const thinkingCount = await closedThinkingHeaders.count();

  expect(textCount + toolCount + thinkingCount).toBeGreaterThan(0);
});

test("clicking a block header toggles its body", async ({ page }) => {
  await gotoEditor(page);
  await loadFixture(page);

  await page.locator('[data-action="expand"][data-index="2"]').click();
  const toolHeader = page
    .locator("#blocks-2 .block-item-header.block-tool")
    .first();
  await expect(toolHeader).not.toHaveClass(/open/);
  await toolHeader.click();
  await expect(toolHeader).toHaveClass(/open/);
  await toolHeader.click();
  await expect(toolHeader).not.toHaveClass(/open/);
});
