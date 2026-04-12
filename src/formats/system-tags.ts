/**
 * Shared user-text cleanup for transcript formats that embed system metadata.
 * @module
 */

/**
 * Strip system tags, IDE context, and command metadata from user text.
 */
export function cleanSystemTags(text) {
  text = text.replace(
    /<task-notification>\s*<task-id>[^<]*<\/task-id>\s*<output-file>[^<]*<\/output-file>\s*<status>([^<]*)<\/status>\s*<summary>([^<]*)<\/summary>\s*<\/task-notification>/g,
    (_, _status, summary) => `[bg-task: ${summary}]`,
  );
  text = text.replace(
    /\n*Read the output file to retrieve the result:[^\n]*/g,
    "",
  );
  text = text.replace(/<user_query>([\s\S]*?)<\/user_query>\s*/g, (_, inner) =>
    inner.trim(),
  );
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/g, "");
  text = text.replace(/<ide_opened_file>[\s\S]*?<\/ide_opened_file>\s*/g, "");
  text = text.replace(
    /<local-command-caveat>[\s\S]*?<\/local-command-caveat>\s*/g,
    "",
  );
  text = text.replace(
    /<command-name>([\s\S]*?)<\/command-name>\s*/g,
    (_, name) => name.trim() + "\n",
  );
  text = text.replace(/<command-message>[\s\S]*?<\/command-message>\s*/g, "");
  text = text.replace(/<command-args>\s*<\/command-args>\s*/g, "");
  text = text.replace(
    /<command-args>([\s\S]*?)<\/command-args>\s*/g,
    (_, args) => {
      const trimmed = args.trim();
      return trimmed ? trimmed + "\n" : "";
    },
  );
  text = text.replace(
    /<local-command-stdout>[\s\S]*?<\/local-command-stdout>\s*/g,
    "",
  );
  return text.trim();
}

/**
 * Extract plain text from user message content (string or block array).
 */
export function extractText(content) {
  if (typeof content === "string") return cleanSystemTags(content);
  const parts = [];
  for (const block of content) {
    if (block.type === "text") parts.push(block.text);
  }
  return cleanSystemTags(parts.join("\n"));
}

/**
 * Check if a user message contains only tool_result blocks.
 */
export function isToolResultOnly(content) {
  if (typeof content === "string") return false;
  return content.every((block) => block.type === "tool_result");
}
