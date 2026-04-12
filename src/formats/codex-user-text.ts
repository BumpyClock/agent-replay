/**
 * Extract the actual user request from Codex user messages.
 * Codex prepends IDE context; the real text follows "## My request for Codex:".
 */
export function extractCodexUserText(text) {
  const marker = "## My request for Codex:";
  const markerIndex = text.indexOf(marker);
  if (markerIndex !== -1) {
    return text.slice(markerIndex + marker.length).trim();
  }

  const fallbackMarker = "## My request for Codex";
  const fallbackIndex = text.indexOf(fallbackMarker);
  if (fallbackIndex === -1) {
    return text.trim();
  }

  const trailingText = text.slice(fallbackIndex + fallbackMarker.length);
  return trailingText.replace(/^:?\s*/, "").trim();
}

/**
 * Extract joined input text blocks from Codex message content.
 */
export function extractCodexInputText(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((block) => block.type === "input_text")
    .map((block) => block.text ?? "")
    .join("\n");
}
