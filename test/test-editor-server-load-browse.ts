import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  createEditorServerHarness,
  EDITOR_FIXTURE_DIR,
} from "./helpers/editor-server.js";

const harness = createEditorServerHarness();

describe("editor-server load and browse", () => {
  before(async () => {
    await harness.start();
  });

  after(() => {
    harness.stop();
  });

  it("POST /api/load with fixture path returns turns", async () => {
    const { res, data } = await harness.load();
    assert.equal(res.status, 200);
    assert.ok(data.sessionId);
    assert.ok(Array.isArray(data.turns));
    assert.ok(data.turns.length > 0);
    assert.equal(data.hasEdits, false);
    assert.ok(data.format);
  });

  it("POST /api/load with non-existent path returns error", async () => {
    const res = await harness.postJson("/api/load", {
      path: resolve(homedir(), "nonexistent-file-abc123.jsonl"),
    });
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.ok(data.error);
  });

  it("POST /api/search returns matching sessions with snippets", async () => {
    const res = await harness.postJson("/api/search", { query: "BLE" });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.results));
  });

  it("POST /api/search with short query returns empty", async () => {
    const res = await harness.postJson("/api/search", { query: "ab" });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data.results, []);
  });

  it("POST /api/browse with valid directory returns dirs and files", async () => {
    const res = await harness.postJson("/api/browse", {
      path: EDITOR_FIXTURE_DIR,
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.path === "string");
    assert.ok(Array.isArray(data.dirs));
    assert.ok(Array.isArray(data.files));
    const fileNames = data.files.map((file: { name: string }) => file.name);
    assert.ok(fileNames.includes("fixture.jsonl"));
  });

  it("POST /api/browse with non-existent path returns error", async () => {
    const res = await harness.postJson("/api/browse", {
      path: join(homedir(), "nonexistent-dir-xyz789"),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  it("POST /api/browse rejects paths outside home directory", async () => {
    const res = await harness.postJson("/api/browse", { path: "/etc" });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Permission denied/);
  });

  it("POST /api/load rejects paths outside home directory", async () => {
    const res = await harness.postJson("/api/load", { path: "/etc/passwd" });
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.match(data.error, /home directory/);
  });
});
