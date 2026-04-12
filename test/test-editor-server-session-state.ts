import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createEditorServerHarness } from "./helpers/editor-server.js";

const harness = createEditorServerHarness();

describe("editor-server session state", () => {
  before(async () => {
    await harness.start();
  });

  after(() => {
    harness.stop();
  });

  it("persists excluded turns and bookmarks across session switches", async () => {
    const { data: loadData } = await harness.load();

    await harness.postJson("/api/preview", {
      sessionId: loadData.sessionId,
      options: {
        excludeTurns: [2, 4],
        bookmarks: [
          { turn: 1, label: "First" },
          { turn: 3, label: "Third" },
        ],
      },
    });

    const { data: reloadData } = await harness.load();
    assert.deepEqual(reloadData.excludedTurns, [2, 4]);
    assert.equal(reloadData.bookmarks.length, 2);
    assert.deepEqual(reloadData.bookmarks[0], { turn: 1, label: "First" });
    assert.deepEqual(reloadData.bookmarks[1], { turn: 3, label: "Third" });
  });

  it("reset clears persisted excluded turns and bookmarks", async () => {
    const { data: loadData } = await harness.load();

    await harness.postJson("/api/preview", {
      sessionId: loadData.sessionId,
      options: {
        excludeTurns: [1],
        bookmarks: [{ turn: 2, label: "BM" }],
      },
    });

    await harness.postJson("/api/reset", {
      sessionId: loadData.sessionId,
    });

    const { data: reloadData } = await harness.load();
    assert.deepEqual(reloadData.excludedTurns, []);
    assert.deepEqual(reloadData.bookmarks, []);
  });
});
