import type { ToolCall } from "../types.js";
import { parseCodexPatch } from "./codex-patch.js";

/**
 * Parsed Codex tool arguments before normalization to replay tool input.
 */
export interface CodexCommandInput extends Record<string, unknown> {
  cmd?: string;
  workdir?: string;
  raw?: string;
  command?: string;
  file_path?: string;
  content?: string;
  old_string?: string;
  new_string?: string;
  isNew?: boolean;
}

/**
 * Tool metadata after mapping Codex-specific names and arguments.
 */
export interface NormalizedCodexToolCall {
  name: string;
  input: Record<string, unknown>;
}

/**
 * Parse Codex JSON-stringified tool arguments with raw fallback.
 */
export function parseCodexCommandInput(argumentsText): CodexCommandInput {
  try {
    return JSON.parse(argumentsText ?? "{}");
  } catch {
    return { raw: argumentsText };
  }
}

/**
 * Strip Codex shell wrapper from command strings.
 */
export function normalizeCodexShellCommand(command) {
  return String(command ?? "")
    .replace(/^\/bin\/bash\s+-lc\s+/, "")
    .replace(/^'(.*)'$/, "$1")
    .replace(/^"(.*)"$/, "$1");
}

/**
 * Map Codex function_call payload into canonical replay tool name + input.
 */
export function normalizeCodexFunctionCall(
  name,
  argumentsText,
): NormalizedCodexToolCall {
  const input = parseCodexCommandInput(argumentsText);
  if (name === "exec_command" && input.cmd) {
    const command = input.workdir
      ? `cd ${input.workdir} && ${input.cmd}`
      : input.cmd;
    return {
      name: "Bash",
      input: { command },
    };
  }

  if (name === "apply_patch") {
    const patch = parseCodexPatch(argumentsText ?? input.raw ?? "");
    return {
      name: patch.isNew ? "Write" : "Edit",
      input: patch,
    };
  }

  return {
    name: name ?? "unknown",
    input,
  };
}

/**
 * Map Codex custom_tool_call payload into canonical replay tool name + input.
 */
export function normalizeCodexCustomToolCall(
  name,
  inputText,
): NormalizedCodexToolCall {
  if (name === "apply_patch") {
    const patch = parseCodexPatch(inputText ?? "");
    return {
      name: patch.isNew ? "Write" : "Edit",
      input: patch,
    };
  }

  return {
    name: name ?? "unknown",
    input: { raw: inputText ?? "" },
  };
}

/**
 * Build canonical replay tool call object.
 */
export function createCodexToolCall({
  id,
  name,
  input,
  result = null,
  resultTimestamp = null,
  isError = false,
}): ToolCall {
  return {
    tool_use_id: id,
    name,
    input,
    result,
    resultTimestamp,
    is_error: isError,
  };
}

/**
 * Remove Codex CLI wrapper lines from exec output.
 */
export function cleanCodexFunctionCallOutput(output) {
  return String(output ?? "")
    .replace(/^Chunk ID:.*\n?/m, "")
    .replace(/^Wall time:.*\n?/m, "")
    .replace(/^Process exited with code \d+\n?/m, "")
    .replace(/^Original token count:.*\n?/m, "")
    .replace(/^Output:\n?/m, "")
    .trim();
}

/**
 * Update pending tool call with final output payload.
 */
export function attachCodexToolResult(
  toolCall: ToolCall | undefined,
  result,
  resultTimestamp,
  isError,
) {
  if (!toolCall) {
    return;
  }

  toolCall.result = result;
  toolCall.resultTimestamp = resultTimestamp;
  toolCall.is_error = isError;
}
