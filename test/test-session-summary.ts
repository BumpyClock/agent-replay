import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { extractSessionSummary } from "../src/editor-server/session-summary.js";

describe("extractSessionSummary", () => {
  function fixtureFile(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), "session-summary-"));
    const path = join(dir, "session.jsonl");
    writeFileSync(path, content, "utf-8");
    return path;
  }

  it("extracts first user message from Claude Code format", () => {
    const path = fixtureFile(
      [
        '{"type":"session-id","id":"abc123"}',
        '{"type":"user","message":{"role":"user","content":"Hello, what is 2+2?"}}',
        '{"type":"assistant","message":{"role":"assistant","content":"4"}}',
      ].join("\n"),
    );

    assert.equal(extractSessionSummary(path), "Hello, what is 2+2?");
  });

  it("extracts text from Claude Code content block array", () => {
    const path = fixtureFile(
      [
        '{"type":"session-id","id":"abc123"}',
        '{"type":"user","message":{"role":"user","content":[{"type":"image","source":"data:..."},{"type":"text","text":"Describe this image"}]}}',
      ].join("\n"),
    );

    assert.equal(extractSessionSummary(path), "Describe this image");
  });

  it("extracts first user message from Copilot format", () => {
    const path = fixtureFile(
      [
        '{"type":"session.start","data":{"sessionId":"sess1"}}',
        '{"type":"user.message","data":{"content":"list the files in src/"}}',
      ].join("\n"),
    );

    assert.equal(extractSessionSummary(path), "list the files in src/");
  });

  it("extracts first user message from Codex format", () => {
    const path = fixtureFile(
      [
        '{"type":"session_meta","payload":{"id":"sess1"}}',
        '{"type":"event_msg","payload":{"type":"user_message","message":"list files here"}}',
      ].join("\n"),
    );

    assert.equal(extractSessionSummary(path), "list files here");
  });

  it("truncates long messages to 80 characters with ellipsis", () => {
    const longMsg = "A".repeat(120);
    const path = fixtureFile(
      `{"type":"user","message":{"role":"user","content":"${longMsg}"}}\n`,
    );

    const result = extractSessionSummary(path);
    assert.ok(result);
    assert.equal(result.length, 83);
    assert.ok(result.endsWith("..."));
    assert.equal(result, "A".repeat(80) + "...");
  });

  it("returns undefined for empty file", () => {
    const path = fixtureFile("");
    assert.equal(extractSessionSummary(path), undefined);
  });

  it("returns undefined for file with no user messages", () => {
    const path = fixtureFile(
      [
        '{"type":"session-id","id":"abc123"}',
        '{"type":"assistant","message":{"role":"assistant","content":"4"}}',
      ].join("\n"),
    );

    assert.equal(extractSessionSummary(path), undefined);
  });

  it("returns undefined for nonexistent file", () => {
    assert.equal(
      extractSessionSummary("/tmp/nonexistent-session-file-abc.jsonl"),
      undefined,
    );
  });

  it("returns undefined for malformed JSON lines", () => {
    const path = fixtureFile("not json at all\n{broken json\n");
    assert.equal(extractSessionSummary(path), undefined);
  });

  it("skips malformed lines and finds user message on later line", () => {
    const path = fixtureFile(
      [
        "not json",
        '{"type":"user","message":{"role":"user","content":"found it"}}',
      ].join("\n"),
    );

    assert.equal(extractSessionSummary(path), "found it");
  });

  it("falls back to generic content field extraction", () => {
    const path = fixtureFile(
      '{"role":"user","content":"generic fallback content"}\n',
    );

    assert.equal(extractSessionSummary(path), "generic fallback content");
  });

  it("falls back to generic message field extraction", () => {
    const path = fixtureFile('{"role":"user","message":"generic message"}\n');

    assert.equal(extractSessionSummary(path), "generic message");
  });

  it("only reads the first 8KB of a large file", () => {
    const padding = '{"type":"padding"}\n'.repeat(500);
    const userLine =
      '{"type":"user","message":{"role":"user","content":"should not be found"}}\n';
    const path = fixtureFile(padding + userLine);

    const result = extractSessionSummary(path);
    assert.equal(result, undefined);
  });

  it("trims whitespace from extracted summary", () => {
    const path = fixtureFile(
      '{"type":"user","message":{"role":"user","content":"  spaced out  "}}\n',
    );

    assert.equal(extractSessionSummary(path), "spaced out");
  });

  it("returns undefined when content is an empty string", () => {
    const path = fixtureFile(
      '{"type":"user","message":{"role":"user","content":""}}\n',
    );

    assert.equal(extractSessionSummary(path), undefined);
  });

  it("returns undefined when content is whitespace only", () => {
    const path = fixtureFile(
      '{"type":"user","message":{"role":"user","content":"   "}}\n',
    );

    assert.equal(extractSessionSummary(path), undefined);
  });
});
