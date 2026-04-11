import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildReplay } from "../src/build-replay.js";
import { extractData } from "../src/extract.js";
import { getTheme } from "../src/themes.js";

function writeSession(
  turns: Array<{ user: string; reply: string; ts?: string; bookmark?: string }>,
) {
  const dir = mkdtempSync(join(tmpdir(), "build-replay-test-"));
  const path = join(dir, "session.jsonl");
  const lines: string[] = [];

  for (const turn of turns) {
    lines.push(
      JSON.stringify({
        type: "user",
        message: { role: "user", content: turn.user },
        ...(turn.ts ? { timestamp: turn.ts } : {}),
      }),
    );
    lines.push(
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: turn.reply }],
        },
        ...(turn.ts ? { timestamp: turn.ts } : {}),
      }),
    );
  }

  writeFileSync(path, lines.join("\n"));
  return path;
}

function makeOpts(overrides = {}) {
  return {
    timing: "auto" as const,
    speed: 1,
    theme: getTheme("tokyo-night"),
    fontSize: "normal",
    title: "Build Replay Test",
    userLabel: "User",
    redactSecrets: false,
    redactRules: [],
    showThinking: true,
    showToolCalls: true,
    cliBookmarks: [],
    minified: false,
    compress: false,
    ...overrides,
  };
}

describe("buildReplay", () => {
  it("remaps CLI bookmarks after excluded turns are removed", () => {
    const session = writeSession([
      { user: "Turn 1", reply: "Reply 1", ts: "2026-01-01T10:00:00Z" },
      { user: "Turn 2", reply: "Reply 2", ts: "2026-01-01T10:01:00Z" },
      { user: "Turn 3", reply: "Reply 3", ts: "2026-01-01T10:02:00Z" },
    ]);

    const { html, turnCount } = buildReplay(
      [session],
      makeOpts({
        excludeTurns: [2],
        cliBookmarks: [{ turn: 3, label: "TestBookmark" }],
      }),
    );

    const { bookmarks } = extractData(html);
    assert.equal(turnCount, 2);
    assert.deepEqual(bookmarks, [{ turn: 2, label: "TestBookmark" }]);
  });

  it('keeps turns untimed when timing is "real" but source has no timestamps', () => {
    const session = writeSession([
      { user: "Untimed 1", reply: "Reply 1" },
      { user: "Untimed 2", reply: "Reply 2" },
    ]);

    const { html } = buildReplay([session], makeOpts({ timing: "real" }));
    const { turns } = extractData(html);

    assert.equal(turns.length, 2);
    assert.deepEqual(
      turns.map((turn) => turn.timestamp),
      ["", ""],
    );
  });

  it("sorts merged sessions chronologically when all turns have timestamps", () => {
    const later = writeSession([
      { user: "Later turn", reply: "Reply later", ts: "2026-01-02T10:00:00Z" },
    ]);
    const earlier = writeSession([
      {
        user: "Earlier turn",
        reply: "Reply earlier",
        ts: "2026-01-01T10:00:00Z",
      },
    ]);

    const { html, turnCount } = buildReplay([later, earlier], makeOpts());
    const { turns } = extractData(html);

    assert.equal(turnCount, 2);
    assert.equal(turns[0].user_text, "Earlier turn");
    assert.equal(turns[1].user_text, "Later turn");
    assert.equal(turns[0].index, 1);
    assert.equal(turns[1].index, 2);
  });
});
