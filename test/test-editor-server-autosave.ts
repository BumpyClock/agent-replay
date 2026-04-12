import assert from "node:assert/strict";
import { copyFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  createEditorServerHarness,
  delay,
  EDITOR_FIXTURE_PATH,
  getAutosavePath,
} from "./helpers/editor-server.js";

const harness = createEditorServerHarness();

describe("editor-server autosave", () => {
  before(async () => {
    await harness.start();
  });

  after(() => {
    harness.stop();
  });

  it("autosaves edits to disk and restores on reload", async () => {
    const tmpFixture = join(
      homedir(),
      `.claude-replay-autosave-test-${process.pid}.jsonl`,
    );
    const autosavePath = getAutosavePath(tmpFixture);
    copyFileSync(EDITOR_FIXTURE_PATH, tmpFixture);

    try {
      const { data: loadData } = await harness.load(tmpFixture);
      await harness.postJson("/api/edit", {
        sessionId: loadData.sessionId,
        turnIndex: loadData.turns[0].index,
        user_text: "Autosave test",
      });
      await harness.postJson("/api/preview", {
        sessionId: loadData.sessionId,
        options: {
          excludeTurns: [2],
          bookmarks: [{ turn: 1, label: "Saved" }],
        },
      });
      await delay(2500);

      assert.ok(existsSync(autosavePath), "autosave file should exist");
      const saved = JSON.parse(readFileSync(autosavePath, "utf-8"));
      assert.equal(saved.sourcePath, tmpFixture);
      assert.equal(saved.workingTurns[0].user_text, "Autosave test");
      assert.deepEqual(saved.excludedTurns, [2]);
      assert.deepEqual(saved.bookmarks, [{ turn: 1, label: "Saved" }]);
    } finally {
      if (existsSync(tmpFixture)) {
        unlinkSync(tmpFixture);
      }
      if (existsSync(autosavePath)) {
        unlinkSync(autosavePath);
      }
    }
  });

  it("reset deletes autosave file", async () => {
    const tmpFixture = join(
      homedir(),
      `.claude-replay-reset-test-${process.pid}.jsonl`,
    );
    const autosavePath = getAutosavePath(tmpFixture);
    copyFileSync(EDITOR_FIXTURE_PATH, tmpFixture);

    try {
      const { data: loadData } = await harness.load(tmpFixture);
      await harness.postJson("/api/edit", {
        sessionId: loadData.sessionId,
        turnIndex: 1,
        user_text: "Will be reset",
      });
      await harness.postJson("/api/preview", {
        sessionId: loadData.sessionId,
        options: {},
      });
      await delay(2500);

      assert.ok(existsSync(autosavePath), "autosave should exist before reset");
      await harness.postJson("/api/reset", {
        sessionId: loadData.sessionId,
      });
      assert.ok(
        !existsSync(autosavePath),
        "autosave should be deleted after reset",
      );
    } finally {
      if (existsSync(tmpFixture)) {
        unlinkSync(tmpFixture);
      }
      if (existsSync(autosavePath)) {
        unlinkSync(autosavePath);
      }
    }
  });
});
