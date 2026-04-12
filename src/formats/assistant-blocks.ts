/**
 * Assistant block collection and tool-result matching for Claude-like transcripts.
 * @module
 */

function extractToolResultText(content) {
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("\n");
  }
  if (typeof content === "string") return content;
  return String(content);
}

/**
 * Collect all assistant content blocks starting from index `start`.
 * Returns [blocks, nextIndex].
 */
export function collectAssistantBlocks(entries, start) {
  const blocks = [];
  const seenKeys = new Set();
  let index = start;

  while (index < entries.length) {
    const entry = entries[index];
    const role = entry.message?.role ?? entry.type;
    if (role !== "assistant") break;

    const entryTimestamp = entry.timestamp ?? null;
    const content = entry.message?.content ?? [];
    if (Array.isArray(content)) {
      for (const block of content) {
        const blockType = block.type;
        if (blockType === "text") {
          const text = (block.text ?? "").trim();
          if (!text || text === "No response requested.") continue;
          const key = `text:${text}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          blocks.push({
            kind: "text",
            text,
            tool_call: null,
            timestamp: entryTimestamp,
          });
          continue;
        }

        if (blockType === "thinking") {
          const text = (block.thinking ?? "").trim();
          if (!text) continue;
          const key = `thinking:${text}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          blocks.push({
            kind: "thinking",
            text,
            tool_call: null,
            timestamp: entryTimestamp,
          });
          continue;
        }

        if (blockType !== "tool_use") continue;
        const toolId = block.id ?? "";
        const key = `tool_use:${toolId}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        blocks.push({
          kind: "tool_use",
          text: "",
          tool_call: {
            tool_use_id: toolId,
            name: block.name ?? "",
            input: block.input ?? {},
            result: null,
            resultTimestamp: null,
            is_error: false,
          },
          timestamp: entryTimestamp,
        });
      }
    }
    index++;
  }

  return [blocks, index];
}

/**
 * Scan forward from resultStart for user messages containing tool_result blocks.
 * Match them to tool_use blocks by tool_use_id.
 * Returns index after consumed entries.
 */
export function attachToolResults(blocks, entries, resultStart) {
  const pending = new Map();
  for (const block of blocks) {
    if (block.kind === "tool_use" && block.tool_call) {
      pending.set(block.tool_call.tool_use_id, block.tool_call);
    }
  }
  if (pending.size === 0) return resultStart;

  let index = resultStart;
  while (index < entries.length && pending.size > 0) {
    const entry = entries[index];
    const role = entry.message?.role ?? entry.type;
    if (role === "assistant") break;
    if (role === "user") {
      const content = entry.message?.content ?? "";
      if (!Array.isArray(content)) break;

      let hasToolResult = false;
      for (const block of content) {
        if (block.type !== "tool_result") continue;
        hasToolResult = true;
        const toolId = block.tool_use_id ?? "";
        if (!pending.has(toolId)) continue;
        const resultText = extractToolResultText(block.content).replace(
          /^<tool_use_error>([\s\S]*)<\/tool_use_error>$/,
          "$1",
        );
        const toolCall = pending.get(toolId);
        toolCall.result = resultText;
        toolCall.resultTimestamp = entry.timestamp ?? null;
        toolCall.is_error = !!block.is_error;
        pending.delete(toolId);
      }
      if (!hasToolResult) break;
    }
    index++;
  }

  return index;
}
