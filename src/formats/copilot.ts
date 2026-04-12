/**
 * GitHub Copilot CLI format parser.
 *
 * Format: event-sourced JSONL from ~/.copilot/session-state/<uuid>/events.jsonl
 *
 * Events have { type, data, id, timestamp, parentId } structure.
 * Key event types:
 *   session.start          — session metadata (producer, version, context)
 *   user.message           — user prompt (data.content = raw text)
 *   assistant.turn_start   — turn boundary open (turnId, interactionId)
 *   assistant.message      — response (content, reasoningText, toolRequests[])
 *   tool.execution_start   — tool call begin (toolCallId, toolName, arguments)
 *   tool.execution_complete — tool result (toolCallId, result, success)
 *   assistant.turn_end     — turn boundary close
 *   hook.start/hook.end    — internal hooks (skipped)
 *   session.shutdown       — session metrics
 */

import { cleanSystemTags } from "./system-tags.js";
import { filterEmptyTurns } from "./turn-filter.js";

export const name = "copilot";

/* ── Tool name mapping ── */

const TOOL_MAP = {
  powershell: "Bash",
  view: "Read",
  create: "Write",
  edit: "Edit",
  glob: "Glob",
  grep: "Grep",
  rg: "Grep",
  web_fetch: "WebFetch",
  web_search: "WebSearch",
};

/** Tools that are internal to Copilot and shouldn't be shown. */
const SKIP_TOOLS = new Set([
  "report_intent",
  "store_memory",
  "exit_plan_mode",
  "task_complete",
  "sql",
  "read_powershell",
  "stop_powershell",
]);

/**
 * Normalize Copilot tool arguments to standard input shape.
 */
function normalizeInput(toolName, args) {
  switch (toolName) {
    case "powershell":
      return { command: args.command ?? "" };
    case "view":
      return { file_path: args.path ?? "" };
    case "create":
      return { file_path: args.path ?? "", content: args.file_text ?? "" };
    case "edit":
      return {
        file_path: args.path ?? "",
        old_string: args.old_str ?? "",
        new_string: args.new_str ?? "",
      };
    case "glob":
      return { pattern: args.pattern ?? "", path: args.path };
    case "grep":
    case "rg":
      return { pattern: args.pattern ?? "", path: args.path };
    case "web_fetch":
      return { url: args.url ?? "" };
    case "web_search":
      return { query: args.query ?? "" };
    default:
      return args;
  }
}

/**
 * Detect if a JSONL line belongs to Copilot CLI format.
 */
export function detect(firstObj) {
  // session.start with copilot producer is definitive
  if (
    firstObj.type === "session.start" &&
    firstObj.data?.producer === "copilot-agent"
  )
    return true;
  // user.message with transformedContent (Copilot wraps with <current_datetime> etc.)
  if (
    firstObj.type === "user.message" &&
    firstObj.data?.transformedContent != null
  )
    return true;
  // assistant.turn_start with turnId + parentId shape
  if (
    firstObj.type === "assistant.turn_start" &&
    firstObj.data?.turnId != null &&
    firstObj.parentId != null
  )
    return true;
  return false;
}

/**
 * Strip Copilot-specific system tags from user text.
 * Copilot wraps user content in transformedContent with <current_datetime>,
 * <reminder>, <sql_tables> etc. — we use data.content (raw) instead,
 * but apply cleanSystemTags for any residual markup.
 */
function extractUserText(data) {
  // Prefer raw content over transformedContent
  const raw = data.content ?? data.transformedContent ?? "";
  return cleanSystemTags(raw);
}

/**
 * Parse Copilot CLI events.jsonl into Turn[].
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

  const turns = [];
  let turnIndex = 0;

  // Track current interaction state
  let currentUserText = "";
  let currentTimestamp = "";
  let currentBlocks = [];
  let pendingCalls = new Map(); // toolCallId → toolCall object
  let inInteraction = false;

  for (const evt of events) {
    const type = evt.type;
    const data = evt.data ?? {};
    const ts = evt.timestamp ?? null;

    // ── User message starts a new interaction ──
    if (type === "user.message") {
      // Flush previous interaction if we had one
      if (inInteraction && (currentUserText || currentBlocks.length)) {
        turnIndex++;
        turns.push({
          index: turnIndex,
          user_text: currentUserText,
          blocks: currentBlocks,
          timestamp: currentTimestamp,
        });
      }
      currentUserText = extractUserText(data);
      currentTimestamp = ts ?? "";
      currentBlocks = [];
      pendingCalls = new Map();
      inInteraction = true;
      continue;
    }

    // ── Assistant message: text + reasoning + tool requests ──
    if (type === "assistant.message") {
      const content = (data.content ?? "").trim();
      const reasoning = (data.reasoningText ?? "").trim();

      // Add reasoning as thinking block
      if (reasoning) {
        currentBlocks.push({
          kind: "thinking",
          text: reasoning,
          tool_call: null,
          timestamp: ts,
        });
      }

      // Add text content (if present and not empty)
      if (content) {
        currentBlocks.push({
          kind: "text",
          text: content,
          tool_call: null,
          timestamp: ts,
        });
      }

      // Process tool requests
      for (const req of data.toolRequests ?? []) {
        const rawName = req.name ?? "unknown";
        if (SKIP_TOOLS.has(rawName)) continue;

        const mappedName = TOOL_MAP[rawName] ?? rawName;
        const args = req.arguments ?? {};
        const input = normalizeInput(rawName, args);

        const toolCall = {
          tool_use_id: req.toolCallId ?? "",
          name: mappedName,
          input,
          result: null,
          resultTimestamp: null,
          is_error: false,
        };

        currentBlocks.push({
          kind: "tool_use",
          text: "",
          tool_call: toolCall,
          timestamp: ts,
        });
        pendingCalls.set(req.toolCallId, toolCall);
      }
      continue;
    }

    // ── Tool execution complete: attach results ──
    if (type === "tool.execution_complete") {
      const callId = data.toolCallId ?? "";
      if (pendingCalls.has(callId)) {
        const tc = pendingCalls.get(callId);
        tc.result = (data.result?.content ?? "").trim() || null;
        tc.resultTimestamp = ts;
        tc.is_error = data.success === false;
        pendingCalls.delete(callId);
      }
      continue;
    }

    // ── Session shutdown: flush final interaction ──
    if (type === "session.shutdown" || type === "session.resume") {
      if (inInteraction && (currentUserText || currentBlocks.length)) {
        turnIndex++;
        turns.push({
          index: turnIndex,
          user_text: currentUserText,
          blocks: currentBlocks,
          timestamp: currentTimestamp,
        });
        inInteraction = false;
        currentUserText = "";
        currentBlocks = [];
        pendingCalls = new Map();
      }
    }

    // Skip hooks, warnings, context changes, plan changes, etc.
  }

  // Flush any remaining interaction
  if (inInteraction && (currentUserText || currentBlocks.length)) {
    turnIndex++;
    turns.push({
      index: turnIndex,
      user_text: currentUserText,
      blocks: currentBlocks,
      timestamp: currentTimestamp,
    });
  }

  return filterEmptyTurns(turns);
}
