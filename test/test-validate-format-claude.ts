import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runValidateFormat } from "./helpers/validate-format.js";

describe("validate-format Claude", () => {
  it("passes for valid Claude format", () => {
    const result = runValidateFormat("claude", [
      {
        type: "user",
        message: { role: "user", content: "hello" },
        timestamp: "2025-01-01T00:00:00Z",
      },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
    ]);
    assert.equal(result.code, 0);
  });

  it("fails if Claude has no user entries", () => {
    const result = runValidateFormat("claude", [
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /No 'user' entries found/);
  });

  it("fails if Claude has no assistant entries", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /No 'assistant' entries found/);
  });

  it("fails if Claude user entry missing message field", () => {
    const result = runValidateFormat("claude", [
      { type: "user", content: "hello" },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /missing 'message' field/);
  });

  it("fails if Claude user entry has wrong role", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "system", content: "hello" } },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /role !== 'user'/);
  });

  it("fails if Claude assistant content is not an array", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: { role: "assistant", content: "just a string" },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /not an array/);
  });

  it("warns on unknown entry types", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
      { type: "new_fancy_type", data: {} },
    ]);
    assert.equal(result.code, 0);
    assert.match(
      result.stdout + (result.stderr || ""),
      /Unknown entry types.*new_fancy_type/,
    );
  });

  it("warns on unknown block types in assistant content", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "magic_block", text: "hi" }],
        },
      },
    ]);
    assert.equal(result.code, 0);
  });

  it("fails on empty file", () => {
    const result = runValidateFormat("claude", []);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /empty/i);
  });

  it("fails if tool_use block missing id", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            { type: "tool_use", name: "Read", input: { file_path: "/tmp/x" } },
          ],
        },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /tool_use block missing 'id'/);
  });

  it("fails if tool_use block missing name", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "tool_use", id: "t1", input: {} }],
        },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /tool_use block missing 'name'/);
  });

  it("fails if tool_use block missing input", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "tool_use", id: "t1", name: "Read" }],
        },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /tool_use block missing 'input'/);
  });

  it("fails if text block has no text field", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", value: "renamed field" }],
        },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /text block missing 'text' field/);
  });

  it("fails if thinking block has no thinking field", () => {
    const result = runValidateFormat("claude", [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "thinking", text: "wrong field name" }],
        },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /thinking block missing 'thinking' field/);
  });

  it("fails if tool_result missing tool_use_id", () => {
    const result = runValidateFormat("claude", [
      {
        type: "user",
        message: {
          role: "user",
          content: [{ type: "tool_result", content: "result" }],
        },
      },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "ok" }] },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /tool_result missing 'tool_use_id'/);
  });

  it("fails if tool_result missing content", () => {
    const result = runValidateFormat("claude", [
      {
        type: "user",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "t1" }],
        },
      },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "ok" }] },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /tool_result missing 'content'/);
  });

  it("fails on unparseable timestamp", () => {
    const result = runValidateFormat("claude", [
      {
        type: "user",
        message: { role: "user", content: "hello" },
        timestamp: "not-a-date",
      },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Timestamp not parseable/);
  });

  it("warns if timestamp is not a string", () => {
    const result = runValidateFormat("claude", [
      {
        type: "user",
        message: { role: "user", content: "hello" },
        timestamp: 1704067200000,
      },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
    ]);
    assert.match(result.stderr, /not a string/);
  });
});
