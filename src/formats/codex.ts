/**
 * Codex CLI format parser entrypoint.
 *
 * Supports two format variants:
 * - Legacy: event_msg with task_started/task_complete boundaries + response_item payloads
 * - New: thread.started/item.completed with nested item objects
 */
import { parseLegacyCodexFormat } from "./codex-legacy.js";
import { parseNewCodexFormat } from "./codex-modern.js";

export const name = "codex";

/**
 * Detect if JSONL lines contain Codex format entries.
 */
export function detect(firstObj) {
  if (firstObj.type === "session_meta") return true;
  if (firstObj.type === "thread.started") return true;
  if (firstObj.type === "item.completed" && firstObj.item) return true;
  return false;
}

/**
 * Parse Codex CLI JSONL text into Turn[].
 */
export function parse(text) {
  const events = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {}
  }

  // Detect newer item-based format
  return events.some(
    (event) =>
      event.type === "thread.started" || event.type === "item.completed",
  )
    ? parseNewCodexFormat(events)
    : parseLegacyCodexFormat(events);
}
