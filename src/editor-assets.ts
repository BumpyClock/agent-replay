import { readFileSync } from "node:fs";

export const EDITOR_HTML_PATH = new URL(
  "../template/editor.html",
  import.meta.url,
);
export const EDITOR_APP_OUTPUT_PATH = new URL(
  "../template/editor-app.js",
  import.meta.url,
);
export const EDITOR_CSS_OUTPUT_PATH = new URL(
  "../template/editor-app.css",
  import.meta.url,
);

export function readEditorShell(): string {
  return readFileSync(EDITOR_HTML_PATH, "utf-8");
}

export function readBuiltEditorApp(): string {
  return readFileSync(EDITOR_APP_OUTPUT_PATH, "utf-8");
}

export function readBuiltEditorCss(): string {
  return readFileSync(EDITOR_CSS_OUTPUT_PATH, "utf-8");
}
