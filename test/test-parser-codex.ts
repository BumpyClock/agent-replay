import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFormat, parseTranscript } from "../src/parser.js";
import {
  CODEX_EDGES_FIXTURE,
  CODEX_FIXTURE,
  CODEX_PATCH_FIXTURE,
} from "./parser-test-helpers.js";

describe("Codex format", () => {
  it("detects codex format", () => {
    assert.equal(detectFormat(CODEX_FIXTURE), "codex");
  });

  it("parses turns from task boundaries", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    assert.equal(turns.length, 3);
  });

  it("extracts user text after 'My request for Codex:' marker", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    assert.equal(turns[0].user_text, "list files here");
    assert.equal(turns[1].user_text, "create hello.txt");
    assert.equal(turns[2].user_text, "fix the typo");
  });

  it("maps commentary to thinking and final_answer to text", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    const thinking = turns[0].blocks.filter(
      (block) => block.kind === "thinking",
    );
    const text = turns[0].blocks.filter((block) => block.kind === "text");
    assert.equal(thinking.length, 1);
    assert.match(thinking[0].text, /Checking the directory/);
    assert.equal(text.length, 1);
    assert.equal(text[0].text, "Found 2 files.");
  });

  it("skips encrypted reasoning blocks", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    const reasoning = turns[0].blocks.filter((block) =>
      block.text?.includes("gAAAA"),
    );
    assert.equal(reasoning.length, 0);
  });

  it("maps exec_command to Bash with normalized input", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    const bash = turns[0].blocks.find((block) => block.kind === "tool_use");
    assert.equal(bash.tool_call.name, "Bash");
    assert.equal(bash.tool_call.input.command, "cd /tmp/test && ls");
  });

  it("strips Codex metadata from tool output", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    const bash = turns[0].blocks.find((block) => block.kind === "tool_use");
    assert.equal(bash.tool_call.result, "file1.txt\nfile2.txt");
    assert.ok(!bash.tool_call.result.includes("Chunk ID"));
  });

  it("maps apply_patch Add File to Write with file_path and content", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    const write = turns[1].blocks.find((block) => block.kind === "tool_use");
    assert.equal(write.tool_call.name, "Write");
    assert.equal(write.tool_call.input.file_path, "/tmp/hello.txt");
    assert.equal(write.tool_call.input.content, "hello world");
  });

  it("maps apply_patch Update File to Edit with old_string and new_string", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    const edit = turns[2].blocks.find((block) => block.kind === "tool_use");
    assert.equal(edit.tool_call.name, "Edit");
    assert.equal(edit.tool_call.input.file_path, "/tmp/hello.txt");
    assert.equal(edit.tool_call.input.old_string, "hello world");
    assert.equal(edit.tool_call.input.new_string, "hello, world!");
  });

  it("attaches tool results with timestamps", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    const edit = turns[2].blocks.find((block) => block.kind === "tool_use");
    assert.equal(edit.tool_call.result, "Success.");
    assert.ok(edit.tool_call.resultTimestamp);
  });

  it("preserves timestamps on turns", () => {
    const turns = parseTranscript(CODEX_FIXTURE);
    assert.ok(turns[0].timestamp.startsWith("2026-03-13"));
  });
});

describe("parseCodexPatch", () => {
  it("handles patch with context lines", () => {
    const turns = parseTranscript(CODEX_PATCH_FIXTURE);
    const edit = turns[0].blocks.find((block) => block.kind === "tool_use");
    assert.equal(edit.tool_call.name, "Edit");
    assert.equal(edit.tool_call.input.file_path, "/src/app.js");
    assert.match(String(edit.tool_call.input.old_string), /const x = 1;/);
    assert.match(String(edit.tool_call.input.old_string), /const y = 2;/);
    assert.match(String(edit.tool_call.input.old_string), /const z = 4;/);
    assert.match(String(edit.tool_call.input.new_string), /const x = 1;/);
    assert.match(String(edit.tool_call.input.new_string), /const y = 3;/);
    assert.match(String(edit.tool_call.input.new_string), /const z = 4;/);
  });

  it("handles empty patch (just Begin/End markers)", () => {
    const turns = parseTranscript(CODEX_PATCH_FIXTURE);
    const tool = turns[1].blocks.find((block) => block.kind === "tool_use");
    assert.equal(tool.tool_call.input.file_path, "");
    assert.equal(tool.tool_call.input.old_string, "");
    assert.equal(tool.tool_call.input.new_string, "");
  });

  it("handles multiple files via separate tool calls in one turn", () => {
    const turns = parseTranscript(CODEX_PATCH_FIXTURE);
    const toolBlocks = turns[2].blocks.filter(
      (block) => block.kind === "tool_use",
    );
    assert.equal(toolBlocks.length, 2);
    assert.equal(toolBlocks[0].tool_call.name, "Write");
    assert.equal(toolBlocks[0].tool_call.input.file_path, "/src/new.js");
    assert.equal(toolBlocks[1].tool_call.name, "Edit");
    assert.equal(toolBlocks[1].tool_call.input.file_path, "/src/old.js");
  });
});

describe("Codex edge cases", () => {
  it("handles session that ends without task_complete (truncated)", () => {
    const turns = parseTranscript(CODEX_EDGES_FIXTURE);
    const truncated = turns.find(
      (turn) => turn.user_text === "truncated session",
    );
    assert.ok(truncated, "truncated turn should be captured");
    assert.ok(truncated.blocks.length > 0);
  });

  it("handles tool call with no result (pending)", () => {
    const turns = parseTranscript(CODEX_EDGES_FIXTURE);
    const pendingTurn = turns.find(
      (turn) => turn.user_text === "pending tool call",
    );
    assert.ok(pendingTurn, "should find the pending tool call turn");
    const toolBlock = pendingTurn.blocks.find(
      (block) => block.kind === "tool_use",
    );
    assert.ok(toolBlock, "should have a tool_use block");
    assert.equal(toolBlock.tool_call.name, "Bash");
    assert.equal(toolBlock.tool_call.result, null);
  });

  it("uses full text when 'My request for Codex:' marker is absent", () => {
    const turns = parseTranscript(CODEX_EDGES_FIXTURE);
    const noMarker = turns.find(
      (turn) => turn.user_text === "Just do something without the marker",
    );
    assert.ok(noMarker, "should find turn with full text as user_text");
  });

  it("captures multiple commentary blocks in one turn as thinking", () => {
    const turns = parseTranscript(CODEX_EDGES_FIXTURE);
    const multiTurn = turns.find(
      (turn) => turn.user_text === "multiple commentary blocks",
    );
    assert.ok(multiTurn, "should find the multi-commentary turn");
    const thinking = multiTurn.blocks.filter(
      (block) => block.kind === "thinking",
    );
    assert.equal(thinking.length, 3);
    assert.equal(thinking[0].text, "First thought.");
    assert.equal(thinking[1].text, "Second thought.");
    assert.equal(thinking[2].text, "Third thought.");
    const text = multiTurn.blocks.filter((block) => block.kind === "text");
    assert.equal(text.length, 1);
    assert.equal(text[0].text, "Final answer here.");
  });
});
