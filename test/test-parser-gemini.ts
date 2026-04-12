import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFormat, parseTranscript } from "../src/parser.js";
import { CLAUDE_FIXTURE, GEMINI_FIXTURE } from "./parser-test-helpers.js";

describe("Gemini format", () => {
  it("detects gemini format", () => {
    assert.equal(detectFormat(GEMINI_FIXTURE), "gemini");
  });

  it("does not confuse gemini with claude-code", () => {
    assert.equal(detectFormat(CLAUDE_FIXTURE), "claude-code");
  });

  it("parses turns from Gemini session", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    assert.equal(turns.length, 4);
  });

  it("extracts user text", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    assert.equal(
      turns[0].user_text,
      "What files are in the current directory?",
    );
    assert.equal(turns[1].user_text, "Read the README.md file");
    assert.equal(turns[2].user_text, "Thanks!");
    assert.equal(turns[3].user_text, "Run a failing command");
  });

  it("extracts thoughts as thinking blocks with subject", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    const thinking = turns[0].blocks.filter(
      (block) => block.kind === "thinking",
    );
    assert.equal(thinking.length, 2);
    assert.match(thinking[0].text, /Analyzing Request/);
    assert.match(thinking[0].text, /directory contents/);
    assert.match(thinking[1].text, /Choosing Tool/);
  });

  it("maps run_shell_command to Bash", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    const tool = turns[0].blocks.find((block) => block.kind === "tool_use");
    assert.ok(tool, "should have a tool_use block");
    assert.equal(tool.tool_call.name, "Bash");
    assert.equal(tool.tool_call.input.command, "ls -la");
  });

  it("maps read_file to Read", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    const tool = turns[1].blocks.find((block) => block.kind === "tool_use");
    assert.ok(tool, "should have a tool_use block");
    assert.equal(tool.tool_call.name, "Read");
  });

  it("extracts tool results from nested functionResponse", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    const tool = turns[0].blocks.find((block) => block.kind === "tool_use");
    assert.ok(tool.tool_call.result, "should have a result");
    assert.match(tool.tool_call.result, /README\.md/);
    assert.match(tool.tool_call.result, /package\.json/);
  });

  it("handles empty content with toolCalls (turn 2)", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    const toolBlocks = turns[1].blocks.filter(
      (block) => block.kind === "tool_use",
    );
    assert.equal(toolBlocks.length, 1);
    const textBlocks = turns[1].blocks.filter((block) => block.kind === "text");
    assert.ok(
      textBlocks.length >= 1,
      "should have text from follow-up gemini message",
    );
    assert.match(textBlocks[0].text, /README\.md contains/);
  });

  it("handles empty thoughts array", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    const thinking = turns[2].blocks.filter(
      (block) => block.kind === "thinking",
    );
    assert.equal(thinking.length, 0);
  });

  it("marks error tool calls", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    const tool = turns[3].blocks.find((block) => block.kind === "tool_use");
    assert.ok(tool, "should have a tool_use block");
    assert.equal(tool.tool_call.is_error, true);
  });

  it("preserves timestamps", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    assert.equal(turns[0].timestamp, "2026-03-01T10:00:00.000Z");
  });

  it("assigns sequential turn indices", () => {
    const turns = parseTranscript(GEMINI_FIXTURE);
    assert.deepEqual(
      turns.map((turn) => turn.index),
      [1, 2, 3, 4],
    );
  });
});
