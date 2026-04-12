import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractReplayFileData } from "../src/replay-file-data.js";
import {
  serializeBrowserTurns,
  serializeRendererTurns,
} from "../src/replay-turn-serialization.js";
import type { Turn } from "../src/types.js";

const SAMPLE_TURNS: Turn[] = [
  {
    index: 1,
    user_text: "Hello /tmp/x",
    blocks: [
      {
        kind: "text",
        text: "",
        tool_call: null,
        timestamp: null,
      },
      {
        kind: "tool_use",
        text: "",
        tool_call: {
          name: "Read",
          input: { file_path: "/repo/src/app.ts" },
          result: "content from /tmp/x",
          is_error: false,
        },
      },
    ],
    timestamp: "2026-01-01T00:00:00Z",
    system_events: ["opened /tmp/x"],
  },
  {
    index: 2,
    user_text: "Next",
    blocks: [
      {
        kind: "tool_use",
        text: "",
        tool_call: {
          name: "Edit",
          input: { file_path: "/repo/src/utils.ts" },
          result: "",
        },
      },
    ],
    timestamp: "2026-01-01T00:01:00Z",
  },
];

describe("replay-serialization", () => {
  it("preserves browser serialization normalization and custom redaction", () => {
    const turns = serializeBrowserTurns(SAMPLE_TURNS, {
      redact: false,
      redactRules: [{ search: "/tmp/x", replacement: "/safe/path" }],
    });

    assert.equal(turns[0].user_text, "Hello /safe/path");
    assert.equal(turns[0].blocks[0].timestamp, null);
    assert.equal(
      turns[0].blocks[1].tool_call?.result,
      "content from /safe/path",
    );
    assert.deepEqual(turns[0].system_events, ["opened /safe/path"]);
  });

  it("preserves renderer serialization sparse fields", () => {
    const turns = serializeRendererTurns(SAMPLE_TURNS, {
      redact: false,
    });

    assert.equal("timestamp" in turns[0].blocks[0], false);
    assert.equal(turns[1].blocks[0].tool_call?.result, "");
    assert.deepEqual(turns[0].system_events, ["opened /tmp/x"]);
  });

  it("extracts file references with relative paths", () => {
    const turns = serializeRendererTurns(SAMPLE_TURNS, {
      redact: false,
    });
    const files = extractReplayFileData(turns);

    assert.deepEqual(
      files.map((file) => file.relPath),
      ["app.ts", "utils.ts"],
    );
    assert.deepEqual(files[0].refs, [{ turn: 1, block: 1, tool: "Read" }]);
    assert.deepEqual(files[1].refs, [{ turn: 2, block: 0, tool: "Edit" }]);
  });
});
