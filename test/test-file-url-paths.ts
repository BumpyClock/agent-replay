import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { resolveFileUrlPath } from "./helpers/file-url-path.js";

describe("test file URL path resolution", () => {
  it("resolves repository file URLs to usable filesystem paths", () => {
    const cliPath = resolveFileUrlPath(
      "../bin/claude-replay.ts",
      import.meta.url,
    );
    const fixturePath = resolveFileUrlPath("./fixture.jsonl", import.meta.url);

    assert.equal(existsSync(cliPath), true);
    assert.equal(existsSync(fixturePath), true);
  });
});
