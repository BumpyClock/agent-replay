import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  appendText,
  copyFixture,
  makeTempFile,
  makeTempHtml,
  safeUnlink,
  startCli,
  waitForServerReady,
  waitForWatcherReady,
} from "./helpers/cli.js";

describe("CLI watch", () => {
  it("--serve --watch rebuilds on file change", async () => {
    const inputPath = makeTempFile("watch-test");
    copyFixture(inputPath);
    const port = 19000 + Math.floor(Math.random() * 100);
    const child = startCli([
      inputPath,
      "--serve",
      "--watch",
      "--port",
      String(port),
    ]);

    try {
      await waitForServerReady(child);

      const initial = await fetch(`http://127.0.0.1:${port}/__reload`);
      const initialData = await initial.json();

      appendText(inputPath, "\n");
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));

      const updated = await fetch(`http://127.0.0.1:${port}/__reload`);
      const updatedData = await updated.json();
      assert.ok(updatedData.version > initialData.version);
    } finally {
      child.kill();
      safeUnlink(inputPath);
    }
  });

  it("--watch -o writes file and rewrites on change", async () => {
    const inputPath = makeTempFile("watch-input");
    const outputPath = makeTempHtml("watch-output");
    copyFixture(inputPath);
    const child = startCli([inputPath, "--watch", "-o", outputPath]);

    try {
      await waitForWatcherReady(child);
      assert.ok(existsSync(outputPath), "output file should exist");
      const initialSize = readFileSync(outputPath).length;

      appendText(
        inputPath,
        '{"type":"user","message":{"role":"user","content":"extra"},"timestamp":"2025-06-01T10:10:00Z"}\n',
      );
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));

      const updatedSize = readFileSync(outputPath).length;
      assert.ok(updatedSize !== initialSize);
    } finally {
      child.kill();
      safeUnlink(inputPath);
      safeUnlink(outputPath);
    }
  });
});
