import { applyPacedTiming, filterTurns } from "./parser.js";
import { resolveAssistantLabel } from "./source-providers.js";
import type { Bookmark, FilterTurnsOptions, Turn } from "./types.js";

/**
 * Replay-preparation options shared by CLI, serve mode, and editor preview/export.
 */
export interface ReplayProjectionOptions extends FilterTurnsOptions {
  timing?: "auto" | "real" | "paced";
  bookmarks?: Bookmark[];
  format?: string;
  assistantLabelOverride?: string;
  consumeInlineTurnBookmarks?: boolean;
}

/**
 * Replay-preparation result consumed by render paths.
 */
export interface PreparedReplayData {
  turns: Turn[];
  bookmarks: Bookmark[];
  hasRealTimestamps: boolean;
  assistantLabel: string;
  format: string;
}

function cloneToolCall(toolCall: Turn["blocks"][number]["tool_call"]) {
  if (!toolCall) {
    return null;
  }

  return {
    tool_use_id: toolCall.tool_use_id,
    name: toolCall.name,
    input: structuredClone(toolCall.input),
    result: toolCall.result ?? null,
    resultTimestamp: toolCall.resultTimestamp ?? null,
    is_error: toolCall.is_error ?? false,
  };
}

export function cloneTurns(turns: Turn[]): Turn[] {
  return turns.map((turn) => ({
    index: turn.index,
    user_text: turn.user_text,
    blocks: turn.blocks.map((block) => ({
      kind: block.kind,
      text: block.text,
      tool_call: cloneToolCall(block.tool_call),
      timestamp: block.timestamp ?? null,
    })),
    timestamp: turn.timestamp ?? "",
    ...(turn.system_events ? { system_events: [...turn.system_events] } : {}),
    ...(turn.bookmark ? { bookmark: turn.bookmark } : {}),
  }));
}

function remapBookmarks(
  bookmarks: Bookmark[],
  indexMap: Map<number, number>,
): Bookmark[] {
  return bookmarks
    .map((bookmark) => ({
      turn: indexMap.get(bookmark.turn),
      label: bookmark.label,
    }))
    .filter((bookmark): bookmark is Bookmark => bookmark.turn != null);
}

function consumeInlineBookmarks(
  turns: Turn[],
  bookmarks: Bookmark[],
  consumeInlineTurnBookmarks: boolean,
): void {
  if (!consumeInlineTurnBookmarks) {
    return;
  }

  for (const turn of turns) {
    if (!turn.bookmark) {
      continue;
    }
    bookmarks.push({ turn: turn.index, label: turn.bookmark });
    delete turn.bookmark;
  }
}

export function prepareReplayData(
  inputTurns: Turn[],
  {
    turnRange,
    excludeTurns,
    timeFrom,
    timeTo,
    timing = "auto",
    bookmarks = [],
    format = "unknown",
    assistantLabelOverride,
    consumeInlineTurnBookmarks = false,
  }: ReplayProjectionOptions = {},
): PreparedReplayData {
  const clonedTurns = cloneTurns(inputTurns);
  const filteredTurns = filterTurns(clonedTurns, {
    turnRange,
    excludeTurns,
    timeFrom,
    timeTo,
  });
  const indexMap = new Map<number, number>();

  for (let index = 0; index < filteredTurns.length; index++) {
    indexMap.set(filteredTurns[index].index, index + 1);
    filteredTurns[index].index = index + 1;
  }

  const remappedBookmarks = remapBookmarks(bookmarks, indexMap);
  consumeInlineBookmarks(
    filteredTurns,
    remappedBookmarks,
    consumeInlineTurnBookmarks,
  );
  remappedBookmarks.sort((left, right) => left.turn - right.turn);

  const hasTimestamps = filteredTurns.some((turn) => Boolean(turn.timestamp));
  const usedPacing =
    timing === "paced" || (timing === "auto" && !hasTimestamps);
  if (usedPacing) {
    applyPacedTiming(filteredTurns);
  }

  return {
    turns: filteredTurns,
    bookmarks: remappedBookmarks,
    hasRealTimestamps: hasTimestamps && !usedPacing,
    assistantLabel: assistantLabelOverride ?? resolveAssistantLabel(format),
    format,
  };
}
