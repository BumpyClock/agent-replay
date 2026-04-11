import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  assertUnderHome,
  browseDirectory,
  discoverSessions,
} from "../src/editor-discovery.js";

describe("editor-discovery", () => {
  it("accepts the home directory itself", () => {
    assert.equal(assertUnderHome(homedir()), homedir());
  });

  it("rejects paths outside the home directory", () => {
    assert.throws(
      () => assertUnderHome(join(homedir(), "..")),
      /Access denied/,
    );
  });

  it("lists child directories and replay files under a home-scoped directory", () => {
    const root = mkdtempSync(join(homedir(), "claude-replay-discovery-"));
    mkdirSync(join(root, "b-dir"));
    mkdirSync(join(root, "a-dir"));
    writeFileSync(join(root, "recent.html"), "<!DOCTYPE html>");
    writeFileSync(join(root, "session.jsonl"), "{}\n{}");
    writeFileSync(join(root, "notes.txt"), "ignore me");

    const result = browseDirectory(root);

    assert.deepEqual(
      result.dirs.map((dir) => dir.name),
      ["a-dir", "b-dir"],
    );
    assert.deepEqual(result.files.map((file) => file.name).sort(), [
      "recent.html",
      "session.jsonl",
    ]);
  });

  it("discovers sessions without throwing on the current machine", () => {
    assert.equal(Array.isArray(discoverSessions()), true);
  });
});
