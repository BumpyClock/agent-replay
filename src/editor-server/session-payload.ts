import type {
  EditorBlockSummary,
  EditorTurnSummary,
  SessionPayload,
} from "../editor-app-types.js";
import type { Turn } from "../types.js";
import type { EditorSession } from "./types.js";

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function summarizeBlocks(blocks: Turn["blocks"]): string {
  const counts: Record<string, number> = { text: 0, thinking: 0, tool_use: 0 };
  for (const block of blocks) {
    counts[block.kind] = (counts[block.kind] || 0) + 1;
  }

  const parts: string[] = [];
  if (counts.text) {
    parts.push(`${counts.text} text`);
  }
  if (counts.thinking) {
    parts.push(`${counts.thinking} thinking`);
  }
  if (counts.tool_use) {
    parts.push(`${counts.tool_use} tool call${counts.tool_use > 1 ? "s" : ""}`);
  }
  return parts.join(", ") || "empty";
}

function summarizeBlock(block: Turn["blocks"][number]): EditorBlockSummary {
  if (block.kind === "tool_use" && block.tool_call) {
    return {
      kind: block.kind,
      name: block.tool_call.name,
      input: truncate(JSON.stringify(block.tool_call.input), 200),
      result: truncate(block.tool_call.result || "", 500),
    };
  }
  return {
    kind: block.kind === "thinking" ? "thinking" : "text",
    text: truncate(block.text || "", 1000),
  };
}

export function hasSessionEdits(session: EditorSession): boolean {
  return (
    JSON.stringify(session.workingTurns) !==
    JSON.stringify(session.originalTurns)
  );
}

export function summarizeTurns(turns: Turn[]): EditorTurnSummary[] {
  return turns.map((turn) => ({
    index: turn.index,
    user_text: turn.user_text,
    blockSummary: summarizeBlocks(turn.blocks),
    blocks: turn.blocks.map(summarizeBlock),
    timestamp: turn.timestamp,
    system_events: turn.system_events || [],
  }));
}

export function createSessionPayload(
  sessionId: string,
  session: EditorSession,
): SessionPayload {
  return {
    sessionId,
    format: session.format,
    hasEdits: hasSessionEdits(session),
    turns: summarizeTurns(session.workingTurns),
    excludedTurns: session.excludedTurns,
    bookmarks: session.bookmarks,
  };
}
