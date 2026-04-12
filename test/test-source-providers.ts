import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  discoverProviderSessions,
  getSourceProvider,
} from "../src/source-providers.js";

function createFakeHome() {
  const home = mkdtempSync(join(tmpdir(), "source-providers-test-"));

  const claudeDir = join(home, ".claude", "projects", "-Users-me-alpha");
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(join(claudeDir, "claude-1.jsonl"), "{}");

  const codexDir = join(home, ".codex", "sessions", "2026", "04", "11");
  mkdirSync(codexDir, { recursive: true });
  writeFileSync(
    join(codexDir, "rollout-2026-04-11T09-00-00-codex-1.jsonl"),
    `${JSON.stringify({
      type: "session_meta",
      payload: { cwd: "/tmp/codex-project" },
    })}\n`,
  );

  const copilotDir = join(home, ".copilot", "session-state", "copilot-1");
  mkdirSync(copilotDir, { recursive: true });
  writeFileSync(join(copilotDir, "events.jsonl"), "{}");
  writeFileSync(
    join(copilotDir, "workspace.yaml"),
    "cwd: /tmp/copilot-project",
  );

  return home;
}

describe("source-providers", () => {
  it("merges discovered sessions by project name across providers", () => {
    const groups = discoverProviderSessions({ home: createFakeHome() });
    const names = groups.map((group) => group.name);

    assert.deepEqual(names, ["codex-project", "copilot-project", "me-alpha"]);
    assert.equal(groups[0].projects[0].sessions[0].source, "Codex");
    assert.equal(groups[1].projects[0].sessions[0].source, "Copilot");
    assert.equal(groups[2].projects[0].sessions[0].source, "Claude Code");
  });

  it("keeps canonical assistant labels in provider registry", () => {
    assert.equal(getSourceProvider("claude-code")?.assistantLabel, "Claude");
    assert.equal(getSourceProvider("copilot")?.assistantLabel, "Claude");
    assert.equal(getSourceProvider("cursor")?.assistantLabel, "Assistant");
    assert.equal(getSourceProvider("codex")?.assistantLabel, "Codex");
  });
});
