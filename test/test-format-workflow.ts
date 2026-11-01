import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const workflow = readFileSync(
  join(root, ".github/workflows/format-check.yml"),
  "utf8",
);
const fixtures = [
  {
    name: "Claude Code",
    variable: "CLAUDE_SESSION",
    entries: [
      { type: "user", message: { role: "user", content: "hello" } },
      {
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "hi" }] },
      },
    ],
  },
  {
    name: "Codex",
    variable: "CODEX_SESSION",
    entries: [
      {
        type: "event_msg",
        payload: { type: "user_message", message: "hello" },
      },
    ],
  },
  {
    name: "Cursor",
    variable: "CURSOR_SESSION",
    entries: [
      { role: "user", message: { content: "hello" } },
      { role: "assistant", message: { content: "hi" } },
    ],
  },
];

describe("format workflow validator commands", () => {
  for (const fixture of fixtures) {
    it(`validates ${fixture.name} fixtures and propagates errors without provider calls`, () => {
      const step = workflow
        .split(`- name: Validate ${fixture.name} format\n`)[1]
        ?.split("\n\n")[0];
      const command = step?.match(/^\s+run: (.+)$/m)?.[1];
      assert.ok(command, "workflow must provide a validator command");
      const directory = mkdtempSync(join(tmpdir(), "format workflow "));
      const file = join(directory, "session fixture.jsonl");
      try {
        writeFileSync(
          file,
          fixture.entries.map((entry) => JSON.stringify(entry)).join("\n"),
        );
        const env = { ...process.env, [fixture.variable]: file };
        const valid = spawnSync("sh", ["-c", command], {
          cwd: root,
          env,
          encoding: "utf8",
        });
        assert.equal(valid.status, 0, valid.stderr);
        writeFileSync(file, "");
        const invalid = spawnSync("sh", ["-c", command], {
          cwd: root,
          env,
          encoding: "utf8",
        });
        assert.equal(invalid.status, 1, invalid.stderr);
        assert.match(invalid.stderr, /FORMAT ERRORS/);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  }
});
