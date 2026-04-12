import type { AssistantBlock, ToolCall, Turn } from "../types.js";
import {
  attachCodexToolResult,
  cleanCodexFunctionCallOutput,
  createCodexToolCall,
  normalizeCodexCustomToolCall,
  normalizeCodexFunctionCall,
} from "./codex-tools.js";
import {
  extractCodexInputText,
  extractCodexUserText,
} from "./codex-user-text.js";
import { filterEmptyTurns } from "./turn-filter.js";

/**
 * Parse legacy Codex format with task boundaries + response_item payloads.
 */
export function parseLegacyCodexFormat(events): Turn[] {
  const turns: Turn[] = [];
  let turnIndex = 0;
  let currentUserText = "";
  let currentTimestamp = "";
  let currentBlocks: AssistantBlock[] = [];
  let pendingCalls = new Map<string, ToolCall>();
  let inTurn = false;

  for (const event of events) {
    const type = event.type;
    const payload = event.payload ?? {};
    const timestamp = event.timestamp ?? null;

    if (type === "event_msg" && payload.type === "task_started") {
      inTurn = true;
      currentUserText = "";
      currentTimestamp = timestamp ?? "";
      currentBlocks = [];
      pendingCalls = new Map();
      continue;
    }

    if (type === "event_msg" && payload.type === "task_complete") {
      if (inTurn) {
        turnIndex += 1;
        turns.push({
          index: turnIndex,
          user_text: currentUserText,
          blocks: currentBlocks,
          timestamp: currentTimestamp,
        });
      }
      inTurn = false;
      continue;
    }

    if (!inTurn) {
      continue;
    }

    if (type === "event_msg" && payload.type === "user_message") {
      currentUserText = extractCodexUserText(payload.message ?? "");
      if (timestamp) {
        currentTimestamp = timestamp;
      }
      continue;
    }

    if (type !== "response_item") {
      continue;
    }

    const payloadType = payload.type;
    const role = payload.role ?? "";
    const phase = payload.phase ?? "";

    if (payloadType === "message" && role === "user") {
      const extracted = extractCodexUserText(
        extractCodexInputText(payload.content ?? []),
      );
      if (extracted && !currentUserText) {
        currentUserText = extracted;
      }
      continue;
    }

    if (payloadType === "message" && role === "developer") {
      continue;
    }

    if (payloadType === "message" && role === "assistant") {
      const blockText = Array.isArray(payload.content)
        ? payload.content
            .filter((block) => block.type === "output_text")
            .map((block) => block.text ?? "")
            .join("\n")
            .trim()
        : "";
      if (!blockText) {
        continue;
      }

      currentBlocks.push({
        kind: phase === "commentary" ? "thinking" : "text",
        text: blockText,
        tool_call: null,
        timestamp,
      });
      continue;
    }

    if (payloadType === "reasoning") {
      continue;
    }

    if (payloadType === "function_call") {
      const normalized = normalizeCodexFunctionCall(
        payload.name,
        payload.arguments ?? "{}",
      );
      const toolCall = createCodexToolCall({
        id: payload.call_id ?? "",
        name: normalized.name,
        input: normalized.input,
      });
      currentBlocks.push({
        kind: "tool_use",
        text: "",
        tool_call: toolCall,
        timestamp,
      });
      pendingCalls.set(payload.call_id ?? "", toolCall);
      continue;
    }

    if (payloadType === "function_call_output") {
      const callId = payload.call_id ?? "";
      attachCodexToolResult(
        pendingCalls.get(callId),
        cleanCodexFunctionCallOutput(payload.output ?? ""),
        timestamp,
        String(payload.output ?? "").includes("Process exited with code") &&
          !String(payload.output ?? "").includes("code 0"),
      );
      pendingCalls.delete(callId);
      continue;
    }

    if (payloadType === "custom_tool_call") {
      const normalized = normalizeCodexCustomToolCall(
        payload.name,
        payload.input ?? "",
      );
      const toolCall = createCodexToolCall({
        id: payload.call_id ?? "",
        name: normalized.name,
        input: normalized.input,
      });
      currentBlocks.push({
        kind: "tool_use",
        text: "",
        tool_call: toolCall,
        timestamp,
      });
      pendingCalls.set(payload.call_id ?? "", toolCall);
      continue;
    }

    if (payloadType === "custom_tool_call_output") {
      const callId = payload.call_id ?? "";
      const output =
        typeof payload.output === "string"
          ? payload.output
          : (payload.output?.output ?? "");
      attachCodexToolResult(
        pendingCalls.get(callId),
        output.trim(),
        timestamp,
        typeof payload.output === "object" &&
          payload.output?.metadata?.exit_code !== 0,
      );
      pendingCalls.delete(callId);
    }
  }

  if (inTurn && (currentUserText || currentBlocks.length)) {
    turnIndex += 1;
    turns.push({
      index: turnIndex,
      user_text: currentUserText,
      blocks: currentBlocks,
      timestamp: currentTimestamp,
    });
  }

  return filterEmptyTurns(turns);
}
