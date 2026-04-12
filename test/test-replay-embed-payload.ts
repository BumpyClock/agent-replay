import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReplayEmbedPayload,
  encodeReplayEmbedPayload,
  injectReplayEmbedPayload,
} from "../src/replay-embed-payload.js";
import { serializeBrowserTurns } from "../src/replay-turn-serialization.js";
import { escapeJsonForScript } from "../src/script-embed.js";
import type { Turn } from "../src/types.js";

const SAMPLE_TURNS: Turn[] = [
  {
    index: 1,
    user_text: 'Hello </script>\n"quote"',
    blocks: [
      {
        kind: "tool_use",
        text: "",
        tool_call: {
          name: "Read",
          input: { file_path: "/repo/src/app.ts" },
          result: 'result </script>\n"quote"',
        },
      },
    ],
    timestamp: "2026-04-11T00:00:00Z",
  },
];

describe("replay embed payload", () => {
  it("builds files from serialized turns and injects encoded placeholders", () => {
    const payload = buildReplayEmbedPayload({
      turns: SAMPLE_TURNS,
      bookmarks: [{ turn: 1, label: "Start" }],
      serializeTurns: (turns) =>
        serializeBrowserTurns(turns, {
          redact: false,
        }),
    });

    assert.deepEqual(
      payload.files.map((file) => file.relPath),
      ["app.ts"],
    );

    const encoded = encodeReplayEmbedPayload(payload, escapeJsonForScript);
    const html = injectReplayEmbedPayload(
      'const bookmarks = "/*BOOKMARKS_DATA*/"; const files = "/*FILES_DATA*/"; const turns = "/*TURNS_DATA*/";',
      encoded,
    );

    assert.match(html, /Start/);
    assert.match(html, /app\.ts/);
    assert.match(html, /<\\\/script>/);
  });

  it("does not replace placeholder tokens inside embedded payload text", () => {
    const html = injectReplayEmbedPayload(
      'A "/*BOOKMARKS_DATA*/" B "/*FILES_DATA*/" C "/*TURNS_DATA*/"',
      {
        bookmarks: "bookmark /*FILES_DATA*/ token",
        files: "file /*TURNS_DATA*/ token",
        turns: "turn payload",
      },
    );

    assert.equal(
      html,
      'A "bookmark /*FILES_DATA*/ token" B "file /*TURNS_DATA*/ token" C "turn payload"',
    );
  });
});
