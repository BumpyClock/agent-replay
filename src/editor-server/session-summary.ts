/**
 * Extracts a short summary from the first user prompt in a session JSONL file.
 *
 * Reads only the first 8KB of the file for speed, parses line-by-line, and
 * recognises Claude Code, Copilot, Codex, and generic message formats.
 */

import { openSync, readSync, closeSync } from "node:fs";

const MAX_BYTES = 8192;
const MAX_SUMMARY_LENGTH = 80;

/**
 * Read the first user prompt from a JSONL session file and return a truncated
 * summary string.  Returns `undefined` when no user message is found, the file
 * is missing, or the content is unparseable.
 */
export function extractSessionSummary(filePath: string): string | undefined {
  const lines = readFirstLines(filePath);
  if (!lines) return undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const text = extractUserText(parsed);
    if (text) return truncate(text);
  }

  return undefined;
}

function readFirstLines(filePath: string): string[] | undefined {
  let fd: number;
  try {
    fd = openSync(filePath, "r");
  } catch {
    return undefined;
  }

  try {
    const buffer = Buffer.alloc(MAX_BYTES);
    const bytesRead = readSync(fd, buffer, 0, MAX_BYTES, 0);
    if (bytesRead === 0) return undefined;
    return buffer.toString("utf-8", 0, bytesRead).split("\n");
  } catch {
    return undefined;
  } finally {
    closeSync(fd);
  }
}

function extractUserText(parsed: unknown): string | undefined {
  if (typeof parsed !== "object" || parsed === null) return undefined;

  const record = parsed as Record<string, unknown>;

  // Claude Code: {"type":"user","message":{"role":"user","content":...}}
  if (record.type === "user") {
    return extractClaudeCodeContent(record);
  }

  // Copilot: {"type":"user.message","data":{"content":"..."}}
  if (record.type === "user.message") {
    return extractCopilotContent(record);
  }

  // Codex: {"type":"event_msg","payload":{"type":"user_message","message":"..."}}
  if (record.type === "event_msg") {
    return extractCodexContent(record);
  }

  // Generic fallback: any object with a string "content" or "message" field
  return extractGenericContent(record);
}

function extractClaudeCodeContent(
  record: Record<string, unknown>,
): string | undefined {
  const msg = record.message;
  if (typeof msg !== "object" || msg === null) return undefined;
  const content = (msg as Record<string, unknown>).content;

  if (typeof content === "string") return normalise(content);

  if (Array.isArray(content)) {
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        (block as Record<string, unknown>).type === "text"
      ) {
        const text = (block as Record<string, unknown>).text;
        if (typeof text === "string") return normalise(text);
      }
    }
  }

  return undefined;
}

function extractCopilotContent(
  record: Record<string, unknown>,
): string | undefined {
  const data = record.data;
  if (typeof data !== "object" || data === null) return undefined;
  const content = (data as Record<string, unknown>).content;
  if (typeof content === "string") return normalise(content);
  return undefined;
}

function extractCodexContent(
  record: Record<string, unknown>,
): string | undefined {
  const payload = record.payload;
  if (typeof payload !== "object" || payload === null) return undefined;
  const typed = payload as Record<string, unknown>;
  if (typed.type !== "user_message") return undefined;
  const message = typed.message;
  if (typeof message === "string") return normalise(message);
  return undefined;
}

function extractGenericContent(
  record: Record<string, unknown>,
): string | undefined {
  if (typeof record.content === "string") return normalise(record.content);
  if (typeof record.message === "string") return normalise(record.message);
  return undefined;
}

function normalise(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function truncate(text: string): string {
  if (text.length <= MAX_SUMMARY_LENGTH) return text;
  return text.slice(0, MAX_SUMMARY_LENGTH) + "...";
}
