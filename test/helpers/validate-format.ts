import { spawnSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveFileUrlPath } from "./file-url-path.js";
import { withTsx } from "./run-typescript.js";

const VALIDATOR = resolveFileUrlPath("../validate-format.ts", import.meta.url);

export function runValidateFormat(format: string, lines: unknown[]) {
  const tmp = join(
    tmpdir(),
    `validate-test-${process.pid}-${Date.now()}.jsonl`,
  );
  writeFileSync(tmp, lines.map((line) => JSON.stringify(line)).join("\n"));
  try {
    const { status, stdout, stderr } = spawnSync(
      "node",
      withTsx([VALIDATOR, format, tmp]),
      {
        encoding: "utf-8",
      },
    );
    return { code: status, stdout: stdout || "", stderr: stderr || "" };
  } finally {
    try {
      unlinkSync(tmp);
    } catch {}
  }
}
