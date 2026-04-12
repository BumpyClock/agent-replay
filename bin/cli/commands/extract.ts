import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extractData } from "../../../src/extract.js";
import type { CliContext } from "../context.js";
import { exitWithError, getErrorMessage } from "../utils.js";

export function handleExtractCommand({
  positionals,
  values,
}: CliContext): boolean {
  if (positionals[0] !== "extract") {
    return false;
  }

  const htmlFile = positionals[1];
  if (!htmlFile) {
    exitWithError(
      "Error: input file is required. Usage: claude-replay extract <replay.html> [-o output.jsonl] [--format jsonl|json]",
    );
  }
  if (!existsSync(htmlFile)) {
    exitWithError(`Error: file not found: ${htmlFile}`);
  }

  let data;
  try {
    data = extractData(readFileSync(htmlFile, "utf-8"));
  } catch (error) {
    exitWithError(`Error: ${getErrorMessage(error)}`);
  }

  const format = values.format || "jsonl";
  if (format !== "json" && format !== "jsonl") {
    exitWithError(
      `Error: unknown --format "${format}". Use jsonl (default) or json.`,
    );
  }

  const output =
    format === "json" ? JSON.stringify(data, null, 2) : toJsonLines(data);

  if (values.output) {
    writeFileSync(values.output, output);
    console.error(
      `Wrote ${values.output} (${data.turns.length} turns, ${data.bookmarks.length} bookmarks)`,
    );
  } else {
    process.stdout.write(`${output}\n`);
  }

  return true;
}

function toJsonLines(data: {
  turns: Array<Record<string, unknown> & { index: number }>;
  bookmarks: Array<{ turn: number; label: string }>;
}): string {
  const bookmarks = new Map(
    data.bookmarks.map((bookmark) => [bookmark.turn, bookmark.label]),
  );
  return data.turns
    .map((turn) => {
      const label = bookmarks.get(turn.index);
      return JSON.stringify(label ? { ...turn, bookmark: label } : turn);
    })
    .join("\n");
}
