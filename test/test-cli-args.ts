import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCliArgs } from "../src/cli-args.js";

class ExitSignal extends Error {
  code: number | undefined;

  constructor(code: number | undefined) {
    super("EXIT");
    this.code = code;
  }
}

function withPatchedArgv(argv: string[], fn: () => void) {
  const originalArgv = process.argv;
  process.argv = argv;
  try {
    fn();
  } finally {
    process.argv = originalArgv;
  }
}

describe("parseCliArgs", () => {
  it("parses known flags and positionals", () => {
    withPatchedArgv(
      ["node", "claude-replay", "--theme", "dracula", "session.jsonl"],
      () => {
        const parsed = parseCliArgs();

        assert.equal(parsed.values.theme, "dracula");
        assert.deepEqual(parsed.positionals, ["session.jsonl"]);
      },
    );
  });

  it("prints an error and exits with code 1 for invalid flags", () => {
    const originalExit = process.exit;
    const originalError = console.error;
    let captured = "";

    process.exit = ((code?: number) => {
      throw new ExitSignal(code);
    }) as typeof process.exit;
    console.error = ((message?: unknown) => {
      captured += String(message);
    }) as typeof console.error;

    try {
      withPatchedArgv(["node", "claude-replay", "--bad-flag"], () => {
        assert.throws(
          () => parseCliArgs(),
          (error) => {
            assert.ok(error instanceof ExitSignal);
            assert.equal(error.code, 1);
            return true;
          },
        );
      });
      assert.match(captured, /Unknown option/);
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
  });
});
