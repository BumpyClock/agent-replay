import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  cloneTurns,
  parseReplayInputs,
  prepareReplayData,
} from "../src/replay-prepare.js";
import type { Turn } from "../src/types.js";

function writeFile(dir: string, name: string, lines: unknown[]) {
  const path = join(dir, name);
  writeFileSync(path, lines.map((line) => JSON.stringify(line)).join("\n"));
  return path;
}

function makeTurn(bookmark?: string): Turn {
  return {
    index: 1,
    user_text: "Hello",
    blocks: [{ kind: "text", text: "Hi", tool_call: null, timestamp: null }],
    timestamp: "2026-01-01T00:00:00Z",
    ...(bookmark ? { bookmark } : {}),
  };
}

describe("replay-prepare", () => {
  it("does not mutate source turns when consuming inline bookmarks", () => {
    const turns = [makeTurn("Start")];
    const cloned = cloneTurns(turns);

    const prepared = prepareReplayData(cloned, {
      timing: "real",
      consumeInlineTurnBookmarks: true,
    });

    assert.equal(turns[0].bookmark, "Start");
    assert.equal(cloned[0].bookmark, "Start");
    assert.deepEqual(prepared.bookmarks, [{ turn: 1, label: "Start" }]);
    assert.equal(prepared.turns[0].bookmark, undefined);
  });

  it("keeps cursor assistant label precedence for merged inputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "replay-prepare-test-"));
    const claudePath = writeFile(dir, "claude.jsonl", [
      {
        type: "user",
        message: { role: "user", content: "Hello" },
      },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Hi" }],
        },
      },
    ]);
    const cursorPath = writeFile(dir, "cursor.jsonl", [
      {
        role: "user",
        message: { content: "<user_query>Cursor</user_query>" },
      },
      {
        role: "assistant",
        message: { content: "Reply" },
      },
    ]);

    const parsed = parseReplayInputs([claudePath, cursorPath]);
    const prepared = prepareReplayData(parsed.turns, {
      timing: "real",
      format: parsed.format,
    });

    assert.equal(parsed.format, "cursor");
    assert.equal(prepared.assistantLabel, "Assistant");
  });

  it("remaps bookmarks after filtering and reindexing", () => {
    const turns: Turn[] = [
      {
        index: 1,
        user_text: "First",
        blocks: [
          { kind: "text", text: "Reply 1", tool_call: null, timestamp: null },
        ],
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        index: 2,
        user_text: "Second",
        blocks: [
          { kind: "text", text: "Reply 2", tool_call: null, timestamp: null },
        ],
        timestamp: "2026-01-01T00:01:00Z",
      },
      {
        index: 3,
        user_text: "Third",
        blocks: [
          { kind: "text", text: "Reply 3", tool_call: null, timestamp: null },
        ],
        timestamp: "2026-01-01T00:02:00Z",
      },
    ];

    const prepared = prepareReplayData(turns, {
      timing: "real",
      excludeTurns: [2],
      bookmarks: [{ turn: 3, label: "Keep" }],
    });

    assert.deepEqual(prepared.bookmarks, [{ turn: 2, label: "Keep" }]);
    assert.deepEqual(
      prepared.turns.map((turn) => turn.index),
      [1, 2],
    );
  });
});
