/**
 * Parsed Codex apply_patch payload mapped to replay tool input shape.
 */
export interface CodexPatchInput extends Record<string, unknown> {
  file_path: string;
  isNew: boolean;
  content?: string;
  old_string?: string;
  new_string?: string;
}

/**
 * Parse a Codex apply_patch string into Edit/Write-compatible input.
 */
export function parseCodexPatch(patchText): CodexPatchInput {
  const lines = patchText.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  let filePath = "";
  let isNew = false;
  const oldLines = [];
  const newLines = [];

  for (const line of lines) {
    if (
      line.startsWith("*** Begin Patch") ||
      line.startsWith("*** End Patch")
    ) {
      continue;
    }
    if (line.startsWith("*** Add File:")) {
      filePath = line.replace("*** Add File:", "").trim();
      isNew = true;
      continue;
    }
    if (line.startsWith("*** Update File:")) {
      filePath = line.replace("*** Update File:", "").trim();
      isNew = false;
      continue;
    }
    if (line.startsWith("@@")) {
      continue;
    }
    if (line.startsWith("+")) {
      newLines.push(line.slice(1));
      continue;
    }
    if (line.startsWith("-")) {
      oldLines.push(line.slice(1));
      continue;
    }
    oldLines.push(line);
    newLines.push(line);
  }

  if (isNew) {
    return {
      file_path: filePath,
      content: newLines.join("\n"),
      isNew: true,
    };
  }

  return {
    file_path: filePath,
    old_string: oldLines.join("\n"),
    new_string: newLines.join("\n"),
    isNew: false,
  };
}
