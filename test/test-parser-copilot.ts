import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFormat, parseTranscript } from "../src/parser.js";
import {
  CLAUDE_FIXTURE,
  CODEX_FIXTURE,
  COPILOT_FIXTURE,
} from "./parser-test-helpers.js";

describe("Copilot CLI format", () => {
  it("detects copilot format", () => {
    assert.equal(detectFormat(COPILOT_FIXTURE), "copilot");
  });

  it("does not confuse copilot with claude-code", () => {
    assert.equal(detectFormat(CLAUDE_FIXTURE), "claude-code");
  });

  it("does not confuse copilot with codex", () => {
    assert.equal(detectFormat(CODEX_FIXTURE), "codex");
  });

  it("parses turns from Copilot session", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    assert.equal(turns.length, 3);
  });

  it("extracts user text, stripping system tags from transformedContent", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    assert.equal(turns[0].user_text, "list the files in src/");
    assert.equal(turns[1].user_text, "read index.ts and fix the typo in it");
    assert.equal(turns[2].user_text, "thanks!");
  });

  it("maps powershell tool to Bash with normalized input", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    const bash = turns[0].blocks.find(
      (block) => block.kind === "tool_use" && block.tool_call.name === "Bash",
    );
    assert.ok(bash, "should have a Bash tool_use block");
    assert.equal(bash.tool_call.input.command, "ls src/");
    assert.match(bash.tool_call.result, /index\.ts/);
  });

  it("maps view tool to Read with normalized input", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    const read = turns[1].blocks.find(
      (block) => block.kind === "tool_use" && block.tool_call.name === "Read",
    );
    assert.ok(read, "should have a Read tool_use block");
    assert.match(String(read.tool_call.input.file_path), /index\.ts/);
    assert.match(read.tool_call.result, /Helo/);
  });

  it("maps edit tool to Edit with normalized input", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    const edit = turns[1].blocks.find(
      (block) => block.kind === "tool_use" && block.tool_call.name === "Edit",
    );
    assert.ok(edit, "should have an Edit tool_use block");
    assert.match(String(edit.tool_call.input.file_path), /index\.ts/);
    assert.equal(
      edit.tool_call.input.old_string,
      "  return `Helo, $" + "{name}!`;",
    );
    assert.equal(
      edit.tool_call.input.new_string,
      "  return `Hello, $" + "{name}!`;",
    );
  });

  it("skips report_intent tool (internal)", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    const intent = turns[0].blocks.find(
      (block) =>
        block.kind === "tool_use" && block.tool_call?.name === "report_intent",
    );
    assert.equal(intent, undefined, "report_intent should be filtered out");
  });

  it("extracts reasoning as thinking blocks", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    const thinking = turns[0].blocks.filter(
      (block) => block.kind === "thinking",
    );
    assert.equal(thinking.length, 1);
    assert.match(thinking[0].text, /list them/);
  });

  it("extracts text blocks", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    const text = turns[0].blocks.filter((block) => block.kind === "text");
    assert.ok(text.length >= 1);
    assert.match(text[text.length - 1].text, /3 items/);
  });

  it("preserves timestamps", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    assert.equal(turns[0].timestamp, "2026-04-01T10:00:10.000Z");
  });

  it("assigns sequential turn indices", () => {
    const turns = parseTranscript(COPILOT_FIXTURE);
    assert.deepEqual(
      turns.map((turn) => turn.index),
      [1, 2, 3],
    );
  });
});
