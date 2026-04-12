import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runValidateFormat } from "./helpers/validate-format.js";

describe("validate-format Cursor", () => {
  it("passes for valid Cursor format", () => {
    const result = runValidateFormat("cursor", [
      { role: "user", message: { content: "hello" } },
      { role: "assistant", message: { content: "hi" } },
    ]);
    assert.equal(result.code, 0);
  });

  it("fails if Cursor has no user entries", () => {
    const result = runValidateFormat("cursor", [
      { role: "assistant", message: { content: "hi" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /No 'user' entries/);
  });

  it("fails if Cursor has no assistant entries", () => {
    const result = runValidateFormat("cursor", [
      { role: "user", message: { content: "hello" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /No 'assistant' entries/);
  });

  it("fails if Cursor entry missing role", () => {
    const result = runValidateFormat("cursor", [
      { message: { content: "hello" } },
      { role: "assistant", message: { content: "hi" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /missing 'role'/);
  });

  it("fails if Cursor entry missing message", () => {
    const result = runValidateFormat("cursor", [
      { role: "user" },
      { role: "assistant", message: { content: "hi" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /missing 'message'/);
  });

  it("fails if Cursor message missing content", () => {
    const result = runValidateFormat("cursor", [
      { role: "user", message: { text: "wrong field" } },
      { role: "assistant", message: { content: "hi" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /missing 'content'/);
  });

  it("warns on unknown Cursor roles", () => {
    const result = runValidateFormat("cursor", [
      { role: "user", message: { content: "hello" } },
      { role: "assistant", message: { content: "hi" } },
      { role: "tool", message: { content: "result" } },
    ]);
    assert.equal(result.code, 0);
    assert.match(result.stderr, /Unknown roles.*tool/);
  });

  it("warns if Cursor entries have type field", () => {
    const result = runValidateFormat("cursor", [
      { role: "user", type: "user", message: { content: "hello" } },
      { role: "assistant", message: { content: "hi" } },
    ]);
    assert.equal(result.code, 0);
    assert.match(result.stderr, /may be Claude Code format/);
  });
});
