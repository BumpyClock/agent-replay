import assert from "node:assert/strict";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { render } from "../src/renderer.js";
import { createEditorServerHarness } from "./helpers/editor-server.js";

const harness = createEditorServerHarness();

describe("editor-server import", () => {
  before(async () => {
    await harness.start();
  });

  after(() => {
    harness.stop();
  });

  it("POST /api/import extracts turns from valid HTML replay", async () => {
    const sampleTurns = [
      {
        index: 1,
        user_text: "Hello",
        blocks: [{ kind: "text", text: "Hi!", tool_call: null }],
        timestamp: "2025-06-01T10:00:00Z",
      },
      {
        index: 2,
        user_text: "Bye",
        blocks: [{ kind: "text", text: "Goodbye!", tool_call: null }],
        timestamp: "2025-06-01T10:01:00Z",
      },
    ];
    const sampleBookmarks = [{ turn: 1, label: "Start" }];
    const html = render(sampleTurns, {
      minified: false,
      redactSecrets: false,
      bookmarks: sampleBookmarks,
    });

    const res = await harness.postJson("/api/import", {
      html,
      filename: "test-import.html",
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.sessionId);
    assert.equal(data.format, "extracted");
    assert.equal(data.turns.length, 2);
    assert.equal(data.turns[0].user_text, "Hello");
    assert.equal(data.bookmarks.length, 1);
    assert.equal(data.bookmarks[0].label, "Start");
  });

  it("POST /api/import rejects non-replay HTML", async () => {
    const res = await harness.postJson("/api/import", {
      html: "<html><body>Not a replay</body></html>",
      filename: "bad.html",
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Not a valid claude-replay/);
  });

  it("POST /api/import rejects missing html field", async () => {
    const res = await harness.postJson("/api/import", {
      filename: "test.html",
    });
    assert.equal(res.status, 400);
  });

  it("POST /api/load supports .html replay files", async () => {
    const html = render(
      [
        {
          index: 1,
          user_text: "Test",
          blocks: [{ kind: "text", text: "Reply", tool_call: null }],
        },
      ],
      { minified: false, redactSecrets: false },
    );
    const tmpHtml = join(homedir(), `.claude-replay-test-${process.pid}.html`);
    writeFileSync(tmpHtml, html);

    try {
      const { res, data } = await harness.load(tmpHtml);
      assert.equal(res.status, 200);
      assert.ok(data.sessionId);
      assert.equal(data.format, "extracted");
      assert.equal(data.turns.length, 1);
      assert.equal(data.turns[0].user_text, "Test");
    } finally {
      if (existsSync(tmpHtml)) {
        unlinkSync(tmpHtml);
      }
    }
  });

  it("POST /api/load rejects invalid .html files", async () => {
    const tmpHtml = join(
      homedir(),
      `.claude-replay-test-bad-${process.pid}.html`,
    );
    writeFileSync(tmpHtml, "<html><body>Not a replay</body></html>");

    try {
      const { res } = await harness.load(tmpHtml);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Not a valid claude-replay/);
    } finally {
      if (existsSync(tmpHtml)) {
        unlinkSync(tmpHtml);
      }
    }
  });
});
