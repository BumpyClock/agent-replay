/**
 * CLI argument schema and parse helper for claude-replay.
 *
 * Extracted here so the schema can be imported by tests and other tooling
 * without pulling in the full CLI entry point.
 */

import { parseArgs } from "node:util";

/** All recognised CLI options with their types, shorts, and defaults. */
export const cliOptions = {
  port: { type: "string" },
  host: { type: "string" },
  "no-origin-check": { type: "boolean", default: false },
  output: { type: "string", short: "o" },
  turns: { type: "string" },
  "exclude-turns": { type: "string" },
  from: { type: "string" },
  to: { type: "string" },
  speed: { type: "string", default: "1" },
  "no-thinking": { type: "boolean", default: false },
  "no-tool-calls": { type: "boolean", default: false },
  theme: { type: "string", default: "tokyo-night" },
  "theme-file": { type: "string" },
  "list-themes": { type: "boolean", default: false },
  "font-size": { type: "string" },
  "no-auto-redact": { type: "boolean", default: false },
  redact: { type: "string", multiple: true },
  title: { type: "string" },
  description: { type: "string" },
  "og-image": { type: "string" },
  "user-label": { type: "string", default: "User" },
  "assistant-label": { type: "string" },
  timing: { type: "string" },
  mark: { type: "string", multiple: true },
  bookmarks: { type: "string" },
  "no-minify": { type: "boolean", default: false },
  "no-compress": { type: "boolean", default: false },
  format: { type: "string" },
  serve: { type: "boolean", default: false },
  watch: { type: "boolean", default: false },
  open: { type: "boolean", default: false },
  version: { type: "boolean", short: "v", default: false },
  help: { type: "boolean", short: "h", default: false },
} as const;

/**
 * Parse process.argv using the CLI options schema.
 *
 * On parse failure prints the error to stderr and exits with code 1,
 * matching the behaviour previously inline in the entry point.
 */
export function parseCliArgs() {
  try {
    return parseArgs({ options: cliOptions, allowPositionals: true });
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}
