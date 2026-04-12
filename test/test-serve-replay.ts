import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { resolveFileUrlPath } from "./helpers/file-url-path.js";
import { withTsx } from "./helpers/run-typescript.js";

const FIXTURE = resolveFileUrlPath("./e2e/fixture.jsonl", import.meta.url);
const SERVE_REPLAY_MODULE = resolveFileUrlPath(
  "../src/serve-replay.ts",
  import.meta.url,
);
const THEMES_MODULE = resolveFileUrlPath("../src/themes.ts", import.meta.url);
const WATCH_TIMEOUT_MS = 10000;

function makeHelper(mode: "serve" | "watch") {
  const dir = mkdtempSync(join(tmpdir(), "serve-replay-helper-"));
  const helperPath = join(dir, `${mode}.ts`);
  const serveReplayUrl = pathToFileURL(SERVE_REPLAY_MODULE).href;
  const themesUrl = pathToFileURL(THEMES_MODULE).href;

  writeFileSync(
    helperPath,
    `
import { serveReplay, watchAndWrite } from ${JSON.stringify(serveReplayUrl)};
import { getTheme } from ${JSON.stringify(themesUrl)};

const [, , mode, fixturePath, arg] = process.argv;

const buildOpts = {
  timing: "auto",
  speed: 1,
  theme: getTheme("tokyo-night"),
  fontSize: "normal",
  title: "Serve Replay Test",
  userLabel: "User",
  redactSecrets: false,
  redactRules: [],
  showThinking: true,
  showToolCalls: true,
  cliBookmarks: [],
  minified: false,
  compress: false,
};

if (mode === "serve") {
  serveReplay([fixturePath], buildOpts, { port: Number(arg) });
} else {
  watchAndWrite([fixturePath], buildOpts, { outputFile: arg });
}
`,
  );

  return helperPath;
}

function waitForOutput(
  child: ReturnType<typeof spawn>,
  needle: string,
  timeoutMs: number,
) {
  return new Promise<void>((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for: ${needle}\n${stderr}`));
    }, timeoutMs);

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      if (stderr.includes(needle)) {
        clearTimeout(timeout);
        resolve();
      }
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Child exited early with code ${code}\n${stderr}`));
    });
  });
}

async function waitForFileText(
  path: string,
  needle: string,
  timeoutMs: number,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (readFileSync(path, "utf-8").includes(needle)) {
        return;
      }
    } catch {
      // Wait for initial write.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${needle} in ${path}`);
}

describe("serveReplay", () => {
  it("serves HTML with reload endpoint and injected scripts", async () => {
    const port = 19100 + Math.floor(Math.random() * 100);
    const helper = makeHelper("serve");
    const child = spawn(
      process.execPath,
      withTsx([helper, "serve", FIXTURE, String(port)]),
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    try {
      await waitForOutput(child, "Serving replay at", WATCH_TIMEOUT_MS);

      const html = await fetch(`http://127.0.0.1:${port}`).then((res) =>
        res.text(),
      );
      assert.match(html, /fetch\("\/__reload"\)/);
      assert.match(html, /#splash\{display:none!important\}/);

      const reload = await fetch(`http://127.0.0.1:${port}/__reload`).then(
        (res) => res.json() as Promise<{ version: number; turns: number }>,
      );
      assert.equal(typeof reload.version, "number");
      assert.equal(reload.turns > 0, true);
    } finally {
      child.kill();
    }
  });

  it("rewrites output when watched input changes", async () => {
    const helper = makeHelper("watch");
    const workDir = mkdtempSync(join(tmpdir(), "serve-replay-watch-"));
    const fixtureCopy = join(workDir, "fixture.jsonl");
    const outputFile = join(workDir, "out.html");
    writeFileSync(fixtureCopy, readFileSync(FIXTURE, "utf-8"));

    const child = spawn(
      process.execPath,
      withTsx([helper, "watch", fixtureCopy, outputFile]),
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    try {
      await waitForOutput(child, `Wrote ${outputFile}`, WATCH_TIMEOUT_MS);
      await waitForFileText(
        outputFile,
        "Scan for BLE devices",
        WATCH_TIMEOUT_MS,
      );

      const updated = readFileSync(fixtureCopy, "utf-8").replace(
        "Scan for BLE devices",
        "Scan for USB devices",
      );
      writeFileSync(fixtureCopy, updated);

      await waitForFileText(
        outputFile,
        "Scan for USB devices",
        WATCH_TIMEOUT_MS,
      );
    } finally {
      child.kill();
    }
  });
});
