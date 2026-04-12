import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectFormatFromText,
  filterTurns,
  parseTranscript,
  parseTranscriptFromText,
} from "../src/parser.js";
import { CLAUDE_FIXTURE } from "./parser-test-helpers.js";

describe("parseTranscript", () => {
  it("parses turns from JSONL", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    assert.equal(turns.length, 3);
  });

  it("extracts user text", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    assert.equal(turns[0].user_text, "Hello, what is 2+2?");
    assert.equal(turns[2].user_text, "Thanks!");
  });

  it("merges continuation assistant blocks into previous turn", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const toolBlocks = turns[1].blocks.filter(
      (block) => block.kind === "tool_use",
    );
    assert.equal(toolBlocks.length, 1);
    const textBlocks = turns[1].blocks.filter((block) => block.kind === "text");
    assert.equal(textBlocks.length, 1);
    assert.match(textBlocks[0].text, /file contains/);
  });

  it("extracts thinking blocks", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const thinking = turns[0].blocks.filter(
      (block) => block.kind === "thinking",
    );
    assert.equal(thinking.length, 1);
    assert.match(thinking[0].text, /simple math/);
  });

  it("extracts text blocks", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const text = turns[0].blocks.filter((block) => block.kind === "text");
    assert.equal(text.length, 1);
    assert.equal(text[0].text, "2 + 2 = 4");
  });

  it("extracts tool calls with results", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const toolBlocks = turns[1].blocks.filter(
      (block) => block.kind === "tool_use",
    );
    assert.equal(toolBlocks.length, 1);
    assert.equal(toolBlocks[0].tool_call.name, "Read");
    assert.equal(toolBlocks[0].tool_call.result, "file contents here");
  });

  it("assigns sequential turn indices", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    assert.deepEqual(
      turns.map((turn) => turn.index),
      [1, 2, 3],
    );
  });

  it("preserves timestamps", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    assert.equal(turns[0].timestamp, "2025-06-01T10:00:00Z");
  });

  it("detects and parses sessions with leading metadata entries", () => {
    const lines = [
      JSON.stringify({ type: "queue-operation", operation: "enqueue" }),
      JSON.stringify({ type: "session-id", id: "abc-123" }),
      JSON.stringify({
        type: "user",
        message: { role: "user", content: "Hello" },
        timestamp: "2025-06-01T10:00:00Z",
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Hi!" }],
        },
        timestamp: "2025-06-01T10:00:01Z",
      }),
      JSON.stringify({ type: "last-prompt", text: "Hello" }),
    ];
    const text = lines.join("\n");
    assert.equal(detectFormatFromText(text), "claude-code");
    const turns = parseTranscriptFromText(text);
    assert.equal(turns.length, 1);
    assert.equal(turns[0].user_text, "Hello");
  });
});

describe("filterTurns", () => {
  it("filters by turn range", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const filtered = filterTurns(turns, { turnRange: [2, 3] });
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].index, 2);
  });

  it("filters by time range", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const filtered = filterTurns(turns, {
      timeFrom: "2025-06-01T10:01:00Z",
      timeTo: "2025-06-01T10:02:05Z",
    });
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].index, 2);
  });

  it("excludes specific turns", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const filtered = filterTurns(turns, { excludeTurns: [1, 3] });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].index, 2);
  });

  it("combines turn range with exclude", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const filtered = filterTurns(turns, {
      turnRange: [1, 3],
      excludeTurns: [2],
    });
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].index, 1);
    assert.equal(filtered[1].index, 3);
  });

  it("returns all turns with no filters", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const filtered = filterTurns(turns);
    assert.equal(filtered.length, 3);
  });
});
