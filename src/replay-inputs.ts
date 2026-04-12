import { readFileSync } from "node:fs";
import {
  detectSourceFormatFromText,
  parseSourceTranscriptFromText,
} from "./source-providers.js";
import type { Turn } from "./types.js";

/**
 * Parsed replay input collected from one or more transcript files.
 */
export interface ParsedReplayInputs {
  turns: Turn[];
  format: string;
}

function sortMergedTurnsByTimestamp(turns: Turn[]): void {
  const allHaveTimestamps =
    turns.length > 0 && turns.every((turn) => Boolean(turn.timestamp));
  if (!allHaveTimestamps) {
    return;
  }

  turns.sort(
    (left, right) =>
      new Date(left.timestamp as string).getTime() -
      new Date(right.timestamp as string).getTime(),
  );

  for (let index = 0; index < turns.length; index++) {
    turns[index].index = index + 1;
  }
}

export function parseReplayInputs(inputFiles: string[]): ParsedReplayInputs {
  let format = detectSourceFormatFromText(readFileSync(inputFiles[0], "utf-8"));
  const turns: Turn[] = [];

  for (const file of inputFiles) {
    const text = readFileSync(file, "utf-8");
    const fileFormat = detectSourceFormatFromText(text);
    const fileTurns = parseSourceTranscriptFromText(text);
    if (inputFiles.length > 1 && fileFormat === "cursor") {
      format = "cursor";
    }
    turns.push(...fileTurns);
  }

  if (inputFiles.length > 1) {
    sortMergedTurnsByTimestamp(turns);
  }

  return { turns, format };
}
