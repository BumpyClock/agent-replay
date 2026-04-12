import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFormat, parseTranscript } from "../src/parser.js";
import {
  CLAUDE_FIXTURE,
  CODEX_FIXTURE,
  OPENCODE_FIXTURE,
} from "./parser-test-helpers.js";

describe("OpenCode format", () => {
  it("detects opencode format", () => {
    assert.equal(detectFormat(OPENCODE_FIXTURE), "opencode");
  });

  it("does not confuse opencode with claude-code", () => {
    assert.equal(detectFormat(CLAUDE_FIXTURE), "claude-code");
  });

  it("does not confuse opencode with codex", () => {
    assert.equal(detectFormat(CODEX_FIXTURE), "codex");
  });

  it("parses turns from OpenCode session", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    assert.equal(turns.length, 2);
  });

  it("maps write tool to Write with normalized input", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    const write = turns[0].blocks.find(
      (block) => block.kind === "tool_use" && block.tool_call.name === "Write",
    );
    assert.ok(write, "should have a Write tool_use block");
    assert.equal(write.tool_call.input.file_path, "/tmp/test/fib.py");
    assert.match(String(write.tool_call.input.content), /def fib/);
    assert.equal(write.tool_call.result, "Wrote file successfully.");
  });

  it("maps bash tool to Bash with normalized input", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    const bash = turns[0].blocks.find(
      (block) => block.kind === "tool_use" && block.tool_call.name === "Bash",
    );
    assert.ok(bash, "should have a Bash tool_use block");
    assert.equal(
      bash.tool_call.input.command,
      "cd /tmp/test && python3 fib.py",
    );
    assert.equal(bash.tool_call.result, "55\n");
    assert.equal(bash.tool_call.is_error, false);
  });

  it("extracts reasoning as thinking blocks", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    const thinking = turns[0].blocks.filter(
      (block) => block.kind === "thinking",
    );
    assert.equal(thinking.length, 1);
    assert.match(thinking[0].text, /output 55/);
  });

  it("extracts text blocks", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    const text = turns[0].blocks.filter((block) => block.kind === "text");
    assert.equal(text.length, 1);
    assert.match(text[0].text, /Fibonacci/);
  });

  it("marks error tool calls", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    const errorBash = turns[1].blocks.find(
      (block) => block.kind === "tool_use",
    );
    assert.ok(errorBash, "should have an error tool_use block");
    assert.equal(errorBash.tool_call.is_error, true);
    assert.match(errorBash.tool_call.result, /No such file/);
  });

  it("preserves timestamps as ISO strings", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    assert.ok(turns[0].timestamp, "should have a timestamp");
    assert.match(turns[0].timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("assigns sequential turn indices", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    assert.deepEqual(
      turns.map((turn) => turn.index),
      [1, 2],
    );
  });

  it("groups tool calls, thinking, and text in same turn", () => {
    const turns = parseTranscript(OPENCODE_FIXTURE);
    assert.equal(turns[0].blocks.length, 4);
    assert.equal(turns[0].blocks[0].kind, "tool_use");
    assert.equal(turns[0].blocks[1].kind, "tool_use");
    assert.equal(turns[0].blocks[2].kind, "thinking");
    assert.equal(turns[0].blocks[3].kind, "text");
  });
});
