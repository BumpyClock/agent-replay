import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFormat, parseTranscript } from "../src/parser.js";
import { CLAUDE_FIXTURE, CURSOR_FIXTURE } from "./parser-test-helpers.js";

describe("Cursor format", () => {
  it("parses Cursor entries into turns", () => {
    const turns = parseTranscript(CURSOR_FIXTURE);
    assert.equal(turns.length, 2);
  });

  it("strips <user_query> tags", () => {
    const turns = parseTranscript(CURSOR_FIXTURE);
    assert.equal(turns[0].user_text, "scan for ble devices");
    assert.equal(turns[1].user_text, "connect to the first one");
  });

  it("merges consecutive assistant messages into one turn", () => {
    const turns = parseTranscript(CURSOR_FIXTURE);
    assert.equal(turns[0].blocks.length, 2);
    assert.match(turns[0].blocks[0].text, /Planning scan/);
    assert.match(turns[0].blocks[1].text, /Found 3 devices/);
  });

  it("reclassifies all but last assistant block as thinking", () => {
    const turns = parseTranscript(CURSOR_FIXTURE);
    assert.equal(turns[0].blocks[0].kind, "thinking");
    assert.equal(turns[0].blocks[1].kind, "text");
    assert.equal(turns[1].blocks[0].kind, "text");
  });

  it("has no timestamps before applyPacedTiming", () => {
    const turns = parseTranscript(CURSOR_FIXTURE);
    assert.equal(turns[0].timestamp, "");
  });

  it("detects cursor format", () => {
    assert.equal(detectFormat(CURSOR_FIXTURE), "cursor");
    assert.equal(detectFormat(CLAUDE_FIXTURE), "claude-code");
  });
});
