import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  applyPacedTiming,
  detectFormat,
  parseTranscript,
} from "../src/parser.js";
import { CLAUDE_FIXTURE, PACED_FIXTURE } from "./parser-test-helpers.js";

describe("Replay JSONL format", () => {
  const replayLines = [
    JSON.stringify({
      index: 1,
      user_text: "Hello",
      blocks: [{ kind: "text", text: "Hi!" }],
      timestamp: "2025-01-01T00:00:00Z",
    }),
    JSON.stringify({
      index: 2,
      user_text: "Bye",
      blocks: [{ kind: "text", text: "Goodbye" }],
      timestamp: "2025-01-01T00:01:00Z",
      bookmark: "End",
    }),
  ];

  it("detectFormat identifies replay format", () => {
    const tmpFile = join(tmpdir(), `replay-test-${process.pid}.jsonl`);
    writeFileSync(tmpFile, replayLines.join("\n"));

    try {
      assert.equal(detectFormat(tmpFile), "replay");
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {}
    }
  });

  it("parseTranscript reads replay JSONL turns", () => {
    const tmpFile = join(tmpdir(), `replay-test-${process.pid}.jsonl`);
    writeFileSync(tmpFile, replayLines.join("\n"));

    try {
      const turns = parseTranscript(tmpFile);
      assert.equal(turns.length, 2);
      assert.equal(turns[0].user_text, "Hello");
      assert.equal(turns[0].blocks[0].text, "Hi!");
      assert.equal(turns[1].user_text, "Bye");
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {}
    }
  });

  it("preserves bookmark field on turns", () => {
    const tmpFile = join(tmpdir(), `replay-test-${process.pid}.jsonl`);
    writeFileSync(tmpFile, replayLines.join("\n"));

    try {
      const turns = parseTranscript(tmpFile);
      assert.equal(turns[1].bookmark, "End");
      assert.equal(turns[0].bookmark, undefined);
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {}
    }
  });

  it("does not confuse replay format with claude-code", () => {
    const claudeLine = JSON.stringify({
      type: "user",
      message: { role: "user", content: "hi" },
    });
    const tmpFile = join(tmpdir(), `detect-test-${process.pid}.jsonl`);
    writeFileSync(tmpFile, claudeLine);

    try {
      assert.equal(detectFormat(tmpFile), "claude-code");
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {}
    }
  });
});

describe("applyPacedTiming", () => {
  it("generates ordered synthetic timestamps", () => {
    const turns = parseTranscript(PACED_FIXTURE);
    applyPacedTiming(turns);
    assert.ok(turns[0].timestamp, "turn should have a timestamp");
    assert.ok(turns[0].blocks[0].timestamp, "block should have a timestamp");
    const turn0 = new Date(turns[0].timestamp).getTime();
    const turn1 = new Date(turns[1].timestamp).getTime();
    assert.ok(turn1 > turn0, "turn 2 timestamp should be after turn 1");
  });

  it("scales duration with content length", () => {
    const turns = parseTranscript(PACED_FIXTURE);
    applyPacedTiming(turns);
    const gap0 =
      new Date(turns[0].blocks[0].timestamp).getTime() -
      new Date(turns[0].timestamp).getTime();
    const gap1 =
      new Date(turns[1].blocks[0].timestamp).getTime() -
      new Date(turns[1].timestamp).getTime();
    assert.equal(gap0, gap1);
  });

  it("works on Claude Code transcripts too", () => {
    const turns = parseTranscript(CLAUDE_FIXTURE);
    const originalTimestamp = turns[0].timestamp;
    applyPacedTiming(turns);
    assert.notEqual(turns[0].timestamp, originalTimestamp);
  });
});
