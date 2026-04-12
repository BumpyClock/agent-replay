import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

export const EDITOR_HTML_PATH = new URL(
  "../template/editor.html",
  import.meta.url,
);
export const EDITOR_APP_OUTPUT_PATH = new URL(
  "../template/editor-app.js",
  import.meta.url,
);

const EDITOR_APP_ENTRY_PATH = new URL("./editor-app.ts", import.meta.url);
const EDITOR_SOURCE_DIR_PATH = new URL("./", import.meta.url);

function editorSourcePaths(): URL[] {
  const sourceDir = fileURLToPath(EDITOR_SOURCE_DIR_PATH);
  const trackedNames = readdirSync(sourceDir).filter(
    (name) => name.startsWith("editor-app") && name.endsWith(".ts"),
  );
  trackedNames.push(
    "editor-app-render.ts",
    "editor-app-types.ts",
    "editor-assets.ts",
  );
  return Array.from(new Set(trackedNames))
    .sort()
    .map((name) => new URL(name, EDITOR_SOURCE_DIR_PATH));
}

export const EDITOR_DEV_SOURCE_PATHS = [
  EDITOR_HTML_PATH,
  ...editorSourcePaths(),
];

export function readEditorShell(): string {
  return readFileSync(EDITOR_HTML_PATH, "utf-8");
}

export function readBuiltEditorApp(): string {
  return readFileSync(EDITOR_APP_OUTPUT_PATH, "utf-8");
}

export async function bundleEditorApp(): Promise<string> {
  const result = await build({
    entryPoints: [fileURLToPath(EDITOR_APP_ENTRY_PATH)],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    write: false,
    outfile: "editor-app.js",
    logLevel: "silent",
  });
  const output = result.outputFiles[0];
  if (!output) {
    throw new Error("Failed to bundle editor app");
  }
  return output.text;
}

export async function writeEditorAppBundle(): Promise<number> {
  const bundle = await bundleEditorApp();
  writeFileSync(EDITOR_APP_OUTPUT_PATH, bundle);
  return Buffer.byteLength(bundle);
}

export function editorDevVersion(): string {
  const latestMtime = Math.max(
    ...EDITOR_DEV_SOURCE_PATHS.map((pathUrl) => statSync(pathUrl).mtimeMs),
  );
  return String(Math.trunc(latestMtime));
}
