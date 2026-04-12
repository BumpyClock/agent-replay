import { redactObject, redactSecrets } from "./secrets.js";
import type {
  RedactRule,
  SerializedBlock,
  SerializedTurn,
  Turn,
} from "./types.js";

export interface ReplaySerializationOptions {
  /** Remove secrets and masked values while serializing. Default true. */
  redact?: boolean;
  /** Custom redaction replacements applied after built-in redaction. */
  redactRules?: RedactRule[];
}

function buildRedactor(rules?: RedactRule[]) {
  if (!rules || rules.length === 0) {
    return <T>(value: T) => value;
  }

  return (value: unknown) => {
    if (typeof value !== "string") {
      return value;
    }
    let result = value;
    for (const { search, replacement } of rules) {
      result = result.replaceAll(search, replacement);
    }
    return result;
  };
}

function transformStrings(
  value: unknown,
  transform: (value: unknown) => unknown,
): unknown {
  if (typeof value === "string") {
    return transform(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => transformStrings(item, transform));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = transformStrings(entry, transform);
    }
    return result;
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Serialize turns for browser rendering path (DOM-side rendering). */
export function serializeBrowserTurns(
  turns: Turn[],
  { redact = true, redactRules }: ReplaySerializationOptions = {},
): SerializedTurn[] {
  let processed = structuredClone(turns);
  if (redact) {
    processed = redactObject(processed) as Turn[];
  }
  if (redactRules && redactRules.length > 0) {
    const redactor = buildRedactor(redactRules);
    processed = transformStrings(processed, redactor) as Turn[];
  }

  return processed.map((turn) => ({
    index: turn.index,
    user_text: turn.user_text,
    blocks: (turn.blocks || []).map((block) => {
      const serializedBlock: SerializedBlock = {
        kind: block.kind,
        text: block.text || "",
        timestamp: block.timestamp || null,
      };
      if (block.tool_call) {
        serializedBlock.tool_call = {
          name: block.tool_call.name,
          input: asRecord(block.tool_call.input),
          result: block.tool_call.result || null,
        };
        if (block.tool_call.is_error) {
          serializedBlock.tool_call.is_error = true;
        }
        if (block.tool_call.resultTimestamp) {
          serializedBlock.tool_call.resultTimestamp =
            block.tool_call.resultTimestamp;
        }
      }
      return serializedBlock;
    }),
    timestamp: turn.timestamp,
    ...(turn.system_events ? { system_events: turn.system_events } : {}),
  }));
}

/** Serialize turns for static HTML renderer output (full text scrub). */
export function serializeRendererTurns(
  turns: Turn[],
  { redact = true, redactRules }: ReplaySerializationOptions = {},
): SerializedTurn[] {
  const customRedact = buildRedactor(redactRules);
  const scrubText = (text: string | null | undefined) => {
    if (typeof text !== "string") {
      return text;
    }
    const base = redact ? redactSecrets(text) : text;
    return customRedact(base) as string;
  };
  const scrubObject = (value: unknown) =>
    transformStrings(redact ? redactObject(value) : value, customRedact);

  return turns.map((turn) => ({
    index: turn.index,
    user_text: scrubText(turn.user_text) ?? "",
    blocks: turn.blocks.map((block) => {
      const serializedBlock: SerializedBlock = {
        kind: block.kind,
        text: scrubText(block.text) ?? "",
      };
      if (block.timestamp) {
        serializedBlock.timestamp = block.timestamp;
      }
      if (block.tool_call) {
        serializedBlock.tool_call = {
          name: block.tool_call.name,
          input: asRecord(scrubObject(block.tool_call.input)),
          result: scrubText(block.tool_call.result) as string | null,
        };
        if (block.tool_call.is_error) {
          serializedBlock.tool_call.is_error = true;
        }
        if (block.tool_call.resultTimestamp) {
          serializedBlock.tool_call.resultTimestamp =
            block.tool_call.resultTimestamp;
        }
      }
      return serializedBlock;
    }),
    timestamp: turn.timestamp,
    ...(turn.system_events ? { system_events: turn.system_events } : {}),
  }));
}
