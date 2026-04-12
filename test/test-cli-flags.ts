import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE, runCli } from "./helpers/cli.js";

describe("CLI flags", () => {
  it("--version prints version and exits", async () => {
    const { code, stdout } = await runCli(["--version"]);
    assert.equal(code, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("-v prints version and exits", async () => {
    const { code, stdout } = await runCli(["-v"]);
    assert.equal(code, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("--list-themes prints themes and exits", async () => {
    const { code, stdout } = await runCli(["--list-themes"]);
    assert.equal(code, 0);
    const lines = stdout.trim().split("\n");
    assert.ok(lines.length >= 3);
    assert.ok(lines.includes("tokyo-night"));
    assert.ok(lines.includes("dracula"));
  });

  it("--help prints usage and exits", async () => {
    const { code, stdout } = await runCli(["--help"]);
    assert.equal(code, 0);
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /--list-themes/);
  });

  it("-h prints usage and exits", async () => {
    const { code, stdout } = await runCli(["-h"]);
    assert.equal(code, 0);
    assert.match(stdout, /Usage:/);
  });
});

describe("CLI input validation", () => {
  it("extract without file shows error", async () => {
    const { code, stderr } = await runCli(["extract"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /input file is required/);
  });

  it("nonexistent file shows error", async () => {
    const { code, stderr } = await runCli(["nonexistent-file.jsonl"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /file not found/);
  });

  it("editor with nonexistent .jsonl file shows error", async () => {
    const { code, stderr } = await runCli(["editor", "nonexistent-file.jsonl"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /file not found/);
  });
});

describe("CLI render output", () => {
  it("generates HTML to stdout with fixture input", async () => {
    const { code, stdout } = await runCli([FIXTURE]);
    assert.equal(code, 0);
    assert.match(stdout, /<!DOCTYPE html>/);
  });

  it("remaps bookmark indices when excluding turns", async () => {
    const { code, stdout } = await runCli([
      FIXTURE,
      "--exclude-turns",
      "2",
      "--mark",
      "3:TestBookmark",
      "--no-compress",
    ]);
    assert.equal(code, 0);
    assert.ok(stdout.includes("TestBookmark"), "bookmark label in output");
    const bmMatch = stdout.match(/\\"label\\":\\"TestBookmark\\"/);
    assert.ok(bmMatch, "bookmark label should be in bookmarks data");
    const bmSection = stdout.match(
      /\\"turn\\":\d+,\\"label\\":\\"TestBookmark\\"/,
    );
    assert.ok(bmSection, "bookmark should have turn and label");
    assert.ok(
      bmSection[0].includes('\\"turn\\":2'),
      "bookmark should reference remapped turn 2",
    );
  });
});
