import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE, runCli } from "./helpers/cli.js";

describe("CLI extract", () => {
  it("outputs JSONL by default", async () => {
    const outputPath = "/tmp/cli-extract-test.html";
    const { code: genCode } = await runCli([
      FIXTURE,
      "--mark",
      "1:BM",
      "-o",
      outputPath,
      "--no-minify",
    ]);
    assert.equal(genCode, 0);

    const { code, stdout } = await runCli(["extract", outputPath]);
    assert.equal(code, 0);
    const lines = stdout.trim().split("\n");
    assert.ok(lines.length >= 3, "should have at least 3 turn lines");

    const first = JSON.parse(lines[0]);
    assert.ok(first.user_text, "first turn should have user_text");

    const withBookmark = lines
      .map((line) => JSON.parse(line))
      .find((turn) => turn.bookmark);
    assert.ok(withBookmark, "one turn should have a bookmark field");
    assert.equal(withBookmark.bookmark, "BM");
  });

  it("outputs legacy JSON with --format json", async () => {
    const outputPath = "/tmp/cli-extract-json.html";
    const { code: genCode } = await runCli([
      FIXTURE,
      "-o",
      outputPath,
      "--no-minify",
    ]);
    assert.equal(genCode, 0);

    const { code, stdout } = await runCli([
      "extract",
      outputPath,
      "--format",
      "json",
    ]);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(Array.isArray(data.turns));
    assert.ok(Array.isArray(data.bookmarks));
  });

  it("round-trips JSONL extract back into replay HTML", async () => {
    const { code: sourceCode } = await runCli([
      FIXTURE,
      "--mark",
      "1:Start",
      "--mark",
      "3:End",
      "-o",
      "/tmp/cli-rt-source.html",
      "--no-minify",
    ]);
    assert.equal(sourceCode, 0);

    const { code: extractCode } = await runCli([
      "extract",
      "/tmp/cli-rt-source.html",
      "-o",
      "/tmp/cli-rt.jsonl",
    ]);
    assert.equal(extractCode, 0);

    const { code: rerenderCode, stdout } = await runCli([
      "/tmp/cli-rt.jsonl",
      "--no-compress",
    ]);
    assert.equal(rerenderCode, 0);
    assert.match(stdout, /<!DOCTYPE html>/);
    assert.ok(stdout.includes('\\"label\\":\\"Start\\"'));
    assert.ok(stdout.includes('\\"label\\":\\"End\\"'));
  });
});
