import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runValidateFormat } from "./helpers/validate-format.js";

describe("validate-format Codex", () => {
  it("passes for valid Codex format", () => {
    const result = runValidateFormat("codex", [
      {
        type: "session_meta",
        timestamp: "2025-01-01T00:00:00Z",
        payload: { id: "s1", model_provider: "openai" },
      },
      {
        type: "event_msg",
        timestamp: "2025-01-01T00:00:01Z",
        payload: { type: "task_started", turn_id: "t1" },
      },
      {
        type: "response_item",
        timestamp: "2025-01-01T00:00:02Z",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "hi" }],
        },
      },
    ]);
    assert.equal(result.code, 0);
  });

  it("fails if Codex has no event_msg or response_item", () => {
    const result = runValidateFormat("codex", [
      { type: "session_meta", payload: { id: "s1" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /No 'event_msg' or 'response_item'/);
  });

  it("fails if Codex event_msg missing payload", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", event_type: "task_started" },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /missing 'payload' field/);
  });

  it("fails if Codex response_item missing payload", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      { type: "response_item", item: { type: "message" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /missing 'payload' field/);
  });

  it("fails if Codex payload missing type", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { data: "no type here" } },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /payload missing 'type'/);
  });

  it("warns on unknown Codex entry types", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "hi" }],
        },
      },
      { type: "telemetry", payload: {} },
    ]);
    assert.equal(result.code, 0);
    assert.match(
      result.stdout + (result.stderr || ""),
      /Unknown entry types.*telemetry/,
    );
  });

  it("fails if Codex function_call missing name", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: { type: "function_call", arguments: '{"cmd":"ls"}' },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /function_call missing 'name'/);
  });

  it("fails if Codex function_call missing arguments", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: { type: "function_call", name: "exec_command" },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /function_call missing 'arguments'/);
  });

  it("fails if exec_command missing cmd in arguments", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: '{"something":"else"}',
        },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /exec_command missing 'cmd'/);
  });

  it("fails if apply_patch missing patch in arguments", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: {
          type: "function_call",
          name: "apply_patch",
          arguments: '{"file":"test.txt"}',
        },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /apply_patch missing 'patch'/);
  });

  it("passes valid exec_command", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: '{"cmd":"ls","workdir":"/tmp"}',
        },
      },
    ]);
    assert.equal(result.code, 0);
  });

  it("passes valid apply_patch", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: {
          type: "function_call",
          name: "apply_patch",
          arguments: '{"patch":"*** Begin Patch\\n*** End Patch"}',
        },
      },
    ]);
    assert.equal(result.code, 0);
  });

  it("fails if Codex message missing role", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: { type: "message", content: [{ type: "text", text: "hi" }] },
      },
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /message.*missing 'role'/);
  });

  it("passes reasoning with null content (encrypted)", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      {
        type: "response_item",
        payload: {
          type: "reasoning",
          content: null,
          encrypted_content: "gAAA",
        },
      },
    ]);
    assert.equal(result.code, 0);
  });

  it("warns on unknown response_item type", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      { type: "response_item", payload: { type: "new_fancy_item" } },
    ]);
    assert.equal(result.code, 0);
    assert.match(result.stderr, /Unknown response_item type.*new_fancy_item/);
  });

  it("warns on unknown event_msg type", () => {
    const result = runValidateFormat("codex", [
      { type: "event_msg", payload: { type: "task_started" } },
      { type: "event_msg", payload: { type: "new_event_type" } },
      {
        type: "response_item",
        payload: { type: "message", role: "assistant", content: [] },
      },
    ]);
    assert.equal(result.code, 0);
    assert.match(result.stderr, /Unknown event_msg type.*new_event_type/);
  });
});
