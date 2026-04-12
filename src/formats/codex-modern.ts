import type { AssistantBlock, Turn } from "../types.js";
import {
  createCodexToolCall,
  normalizeCodexFunctionCall,
  normalizeCodexShellCommand,
} from "./codex-tools.js";
import {
  extractCodexInputText,
  extractCodexUserText,
} from "./codex-user-text.js";

/**
 * Parse newer Codex format with item.completed events.
 */
export function parseNewCodexFormat(events): Turn[] {
  const blocks: AssistantBlock[] = [];
  let userText = "";

  for (const event of events) {
    if (event.type !== "item.completed") {
      continue;
    }

    const item = event.item;
    if (!item || typeof item !== "object") {
      continue;
    }

    const itemType = item.type ?? "";
    const timestamp = event.timestamp ?? null;

    if (itemType === "command_execution") {
      blocks.push({
        kind: "tool_use",
        text: "",
        tool_call: createCodexToolCall({
          id: item.id ?? "",
          name: "Bash",
          input: {
            command: normalizeCodexShellCommand(item.command),
          },
          result: (item.aggregated_output ?? "").trim(),
          resultTimestamp: timestamp,
          isError: item.exit_code != null && item.exit_code !== 0,
        }),
        timestamp,
      });
      continue;
    }

    if (itemType === "reasoning") {
      const text = item.text ?? "";
      if (text.trim()) {
        blocks.push({
          kind: "thinking",
          text,
          tool_call: null,
          timestamp,
        });
      }
      continue;
    }

    if (itemType === "agent_message") {
      const text = item.text ?? "";
      if (text.trim()) {
        blocks.push({
          kind: "text",
          text,
          tool_call: null,
          timestamp,
        });
      }
      continue;
    }

    if (itemType === "function_call") {
      const normalized = normalizeCodexFunctionCall(
        item.name,
        item.arguments ?? "",
      );
      blocks.push({
        kind: "tool_use",
        text: "",
        tool_call: createCodexToolCall({
          id: item.id ?? "",
          name: normalized.name,
          input: normalized.input,
          result: (item.output ?? "").trim() || null,
          resultTimestamp: timestamp,
          isError: item.status === "failed",
        }),
        timestamp,
      });
      continue;
    }

    if (itemType === "message" && item.role === "user") {
      userText = extractCodexUserText(
        extractCodexInputText(item.content ?? []),
      );
    }
  }

  if (!blocks.length) {
    return [];
  }

  return [
    {
      index: 1,
      user_text: userText || "Task",
      blocks,
      timestamp: "",
    },
  ];
}
