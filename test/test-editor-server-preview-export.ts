import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createEditorServerHarness } from "./helpers/editor-server.js";

const harness = createEditorServerHarness();

describe("editor-server preview and export", () => {
  before(async () => {
    await harness.start();
  });

  after(() => {
    harness.stop();
  });

  it("POST /api/edit updates user text and reports hasEdits=true", async () => {
    const { data: loadData } = await harness.load();
    const res = await harness.postJson("/api/edit", {
      sessionId: loadData.sessionId,
      turnIndex: loadData.turns[0].index,
      user_text: "Edited text",
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.hasEdits, true);
  });

  it("POST /api/reset restores original turns", async () => {
    const { data: loadData } = await harness.load();
    const res = await harness.postJson("/api/reset", {
      sessionId: loadData.sessionId,
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.turns));
    assert.notEqual(data.turns[0].user_text, "Edited text");
  });

  it("POST /api/preview returns HTML string", async () => {
    const { data: loadData } = await harness.load();
    const res = await harness.postJson("/api/preview", {
      sessionId: loadData.sessionId,
      options: {},
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.html === "string");
    assert.match(data.html, /<!DOCTYPE html>/);
  });

  it("POST /api/export returns HTML with Content-Disposition header", async () => {
    const { data: loadData } = await harness.load();
    const res = await harness.postJson("/api/export", {
      sessionId: loadData.sessionId,
      options: { title: "test-export" },
    });
    assert.equal(res.status, 200);
    const disposition = res.headers.get("content-disposition");
    assert.ok(disposition);
    assert.match(disposition, /attachment/);
    assert.match(disposition, /test-export\.html/);
    const html = await res.text();
    assert.match(html, /<!DOCTYPE html>/);
  });

  it("POST /api/export-data returns JSON with turns and bookmarks", async () => {
    const { data: loadData } = await harness.load();
    const res = await harness.postJson("/api/export-data", {
      sessionId: loadData.sessionId,
      options: { title: "test-data", bookmarks: [{ turn: 1, label: "Ch1" }] },
    });
    assert.equal(res.status, 200);
    const disposition = res.headers.get("content-disposition");
    assert.match(disposition, /test-data\.json/);
    const data = JSON.parse(await res.text());
    assert.ok(Array.isArray(data.turns));
    assert.ok(data.turns.length > 0);
    assert.equal(data.turns[0].user_text, loadData.turns[0].user_text);
    assert.ok(Array.isArray(data.bookmarks));
    assert.equal(data.bookmarks[0].label, "Ch1");
  });

  it("POST /api/preview remaps bookmark indices after excluding turns", async () => {
    const { data: loadData } = await harness.load();
    assert.ok(loadData.turns.length >= 4, "fixture needs at least 4 turns");
    const originalTurn4 = loadData.turns[3];
    const res = await harness.postJson("/api/preview", {
      sessionId: loadData.sessionId,
      options: {
        excludeTurns: [loadData.turns[1].index],
        bookmarks: [{ turn: originalTurn4.index, label: "Important turn" }],
        compress: false,
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(
      data.html.includes("Important turn"),
      "bookmark label should be in HTML",
    );
    const bookmarkMatches =
      data.html.match(/\\"turn\\":\d+/g) || data.html.match(/"turn":\d+/g);
    assert.ok(bookmarkMatches, "should have bookmark turn reference in HTML");
    assert.ok(
      bookmarkMatches.some((match: string) => match.includes("3")),
      `bookmark should reference turn 3, got: ${bookmarkMatches}`,
    );
    assert.ok(
      !bookmarkMatches.some((match: string) => match.includes("4")),
      `bookmark should not reference turn 4, got: ${bookmarkMatches}`,
    );
  });
});
