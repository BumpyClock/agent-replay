import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTranscript } from "../src/parser.js";
import { SYSTEM_TAGS_FIXTURE } from "./parser-test-helpers.js";

describe("cleanSystemTags", () => {
  it("strips multiple system-reminder blocks from user text", () => {
    const turns = parseTranscript(SYSTEM_TAGS_FIXTURE);
    assert.equal(turns[0].user_text, "Before reminder\nAfter reminder");
  });

  it("strips ide_opened_file tags", () => {
    const turns = parseTranscript(SYSTEM_TAGS_FIXTURE);
    assert.equal(turns[1].user_text, "Check this\nPlease review");
  });

  it("extracts command-name and keeps non-empty command-args", () => {
    const turns = parseTranscript(SYSTEM_TAGS_FIXTURE);
    assert.match(turns[2].user_text, /review/);
    assert.match(turns[2].user_text, /src\/main\.ts/);
  });

  it("removes empty command-args tags", () => {
    const turns = parseTranscript(SYSTEM_TAGS_FIXTURE);
    assert.ok(!turns[4].user_text.includes("command-args"));
  });

  it("strips local-command-caveat and local-command-stdout", () => {
    const turns = parseTranscript(SYSTEM_TAGS_FIXTURE);
    assert.equal(turns[3].user_text, "Run this");
  });

  it("handles mixed tags in one message", () => {
    const turns = parseTranscript(SYSTEM_TAGS_FIXTURE);
    const text = turns[4].user_text;
    assert.ok(!text.includes("<system-reminder>"));
    assert.ok(!text.includes("<ide_opened_file>"));
    assert.ok(!text.includes("<local-command-caveat>"));
    assert.ok(!text.includes("<local-command-stdout>"));
    assert.match(text, /deploy/);
    assert.match(text, /Actual user message/);
  });
});
