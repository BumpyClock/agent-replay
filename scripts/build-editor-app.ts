#!/usr/bin/env node

import { rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "vite";

rmSync(new URL("../template/assets", import.meta.url), {
  force: true,
  recursive: true,
});

await build({
  configFile: fileURLToPath(
    new URL("../vite.editor.config.ts", import.meta.url),
  ),
});

const jsSize = statSync(
  new URL("../template/editor-app.js", import.meta.url),
).size;
const cssSize = statSync(
  new URL("../template/editor-app.css", import.meta.url),
).size;

console.log(
  `Built template/editor-app.js (${jsSize} bytes) and template/editor-app.css (${cssSize} bytes)`,
);
