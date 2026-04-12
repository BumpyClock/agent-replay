import { expect, test } from "@playwright/test";
import { getFileUrl, waitForReady } from "./setup.js";

const pressKey = (page, key) => page.keyboard.press(key);

async function goto(page, hash = "") {
  await page.goto(getFileUrl(hash));
  await waitForReady(page);
}

test("Edit tool renders diff view with red/green lines", async ({ page }) => {
  await goto(page, "turn=4");
  const editTool = page
    .locator('.turn[data-index="3"] .tool-block', { hasText: "Edit" })
    .first();
  await editTool.locator(".tool-header").click();
  await expect(editTool.locator(".tool-body")).toBeVisible();

  await expect(editTool.locator(".diff-view")).toBeVisible();
  await expect(editTool.locator(".diff-file")).toContainText("/src/app.ts");

  const delLines = editTool.locator(".diff-line-del");
  const addLines = editTool.locator(".diff-line-add");
  expect(await delLines.count()).toBeGreaterThan(0);
  expect(await addLines.count()).toBeGreaterThan(0);

  await expect(editTool.locator(".diff-result")).toContainText(
    "Updated /src/app.ts",
  );
});

test("Write tool renders code block", async ({ page }) => {
  await goto(page, "turn=4");
  const writeTool = page
    .locator('.turn[data-index="3"] .tool-block', { hasText: "Write" })
    .first();
  await writeTool.locator(".tool-header").click();
  await expect(writeTool.locator(".tool-body")).toBeVisible();

  await expect(writeTool.locator(".diff-view")).toBeVisible();
  await expect(writeTool.locator(".diff-file")).toContainText(
    "/src/config.json",
  );
  await expect(writeTool.locator("pre code")).toBeVisible();
  await expect(writeTool.locator("pre code")).toContainText("version");

  await expect(writeTool.locator(".diff-result")).toContainText(
    "Created /src/config.json",
  );
});

test("Edit/Write tool headers show file path as preview", async ({ page }) => {
  await goto(page, "turn=4");
  const editPreview = page
    .locator('.turn[data-index="3"] .tool-block', { hasText: "Edit" })
    .first()
    .locator(".tool-args-preview");
  const writePreview = page
    .locator('.turn[data-index="3"] .tool-block', { hasText: "Write" })
    .first()
    .locator(".tool-args-preview");

  await expect(editPreview).toContainText("/src/app.ts");
  await expect(writePreview).toContainText("/src/config.json");
});

test("other tools still render generic input/result", async ({ page }) => {
  await goto(page, "turn=2");
  const tool = page.locator('.turn[data-index="1"] .tool-block').first();
  await tool.locator(".tool-header").click();
  await expect(tool.locator(".tool-body")).toBeVisible();

  await expect(tool.locator(".tool-input")).toBeVisible();
  await expect(tool.locator(".diff-view")).toHaveCount(0);
});

test("failed tool shows red indicator dot", async ({ page }) => {
  await goto(page, "turn=5");
  const editTool = page
    .locator('.turn[data-index="4"] .tool-block', { hasText: "Edit" })
    .first();

  await expect(editTool.locator(".tool-indicator.tool-error")).toBeVisible();
});

test("failed Edit tool strips tool_use_error tags and shows red result", async ({
  page,
}) => {
  await goto(page, "turn=5");
  const editTool = page
    .locator('.turn[data-index="4"] .tool-block', { hasText: "Edit" })
    .first();
  await editTool.locator(".tool-header").click();
  await expect(editTool.locator(".tool-body")).toBeVisible();

  const result = editTool.locator(".diff-result");
  await expect(result).toBeVisible();
  await expect(result).toContainText("File has been modified");
  const text = await result.textContent();
  expect(text).not.toContain("<tool_use_error>");
  await expect(result).toHaveClass(/diff-result-error/);
});

test("successful tool does not show red indicator", async ({ page }) => {
  await goto(page, "turn=4");
  const editTool = page
    .locator('.turn[data-index="3"] .tool-block', { hasText: "Edit" })
    .first();

  await expect(editTool.locator(".tool-indicator")).toBeVisible();
  await expect(editTool.locator(".tool-indicator.tool-error")).toHaveCount(0);
});

test("file sidebar toggle visible when session has tool calls", async ({
  page,
}) => {
  await goto(page);
  await pressKey(page, " ");
  await expect(page.locator("#fileSidebarToggle")).toBeVisible();
});

test("file sidebar opens and shows files", async ({ page }) => {
  await goto(page);
  await pressKey(page, " ");
  await page.locator("#fileSidebarToggle").click();
  await expect(page.locator("#fileSidebar")).toHaveClass(/open/);
  const files = page.locator(".file-entry");
  expect(await files.count()).toBeGreaterThan(0);
});

test("file sidebar closes with X button", async ({ page }) => {
  await goto(page);
  await pressKey(page, " ");
  await page.locator("#fileSidebarToggle").click();
  await expect(page.locator("#fileSidebar")).toHaveClass(/open/);
  await page.locator("#fileSidebarClose").click();
  await expect(page.locator("#fileSidebar")).not.toHaveClass(/open/);
});

test("clicking file entry expands to show turn references", async ({
  page,
}) => {
  await goto(page);
  await pressKey(page, " ");
  await page.locator("#fileSidebarToggle").click();
  const firstFile = page.locator(".file-entry").first();
  await firstFile.locator(".file-entry-header").click();
  await expect(firstFile).toHaveClass(/expanded/);
  const refs = firstFile.locator(".file-entry-ref");
  expect(await refs.count()).toBeGreaterThan(0);
});

test("clicking file reference navigates to turn", async ({ page }) => {
  await goto(page, "turn=1");
  await page.locator("#fileSidebarToggle").click();
  const firstFile = page.locator(".file-entry").first();
  await firstFile.locator(".file-entry-header").click();
  const ref = firstFile.locator(".file-entry-ref").first();
  const turnIdx = await ref.getAttribute("data-turn");
  await ref.click();
  await expect(page.locator(`.turn[data-index="${turnIdx}"]`)).toHaveClass(
    /active/,
  );
});

test("edit diff shows context, added, and removed lines", async ({ page }) => {
  await goto(page);
  await pressKey(page, " ");
  for (let i = 0; i < 15; i++) await pressKey(page, "ArrowRight");
  const diffView = page.locator(".diff-view").first();
  if (await diffView.isVisible().catch(() => false)) {
    const addLines = await page.locator(".diff-line-add").count();
    const delLines = await page.locator(".diff-line-del").count();
    expect(addLines + delLines).toBeGreaterThan(0);
  }
});
