import type { SerializedTurn } from "./types.js";

export interface ReplayFileData {
  /** Original absolute file path for referenced tool-call file argument. */
  path: string;
  /** Base file name derived from `path`. */
  name: string;
  /** References from turns/blocks that referenced this file. */
  refs: Array<{ turn: number; block: number; tool: string }>;
  /** Path rendered relative to common directory prefix for UI readability. */
  relPath?: string;
}

function addRelativePaths(files: ReplayFileData[]): void {
  const paths = files
    .map((file) => file.path)
    .filter((path) => path.includes("/"));
  if (paths.length === 0) {
    return;
  }

  const parts = paths[0].split("/");
  let common = "";
  for (let index = 0; index < parts.length - 1; index++) {
    const prefix = parts.slice(0, index + 1).join("/") + "/";
    if (paths.every((path) => path.startsWith(prefix))) {
      common = prefix;
    } else {
      break;
    }
  }

  if (!common) {
    return;
  }

  for (const file of files) {
    file.relPath = file.path.startsWith(common)
      ? file.path.slice(common.length)
      : file.path;
  }
}

/** Extract referenced session files from serialized turns for file sidebar payload. */
export function extractReplayFileData(
  turns: SerializedTurn[],
): ReplayFileData[] {
  const fileMap = new Map<string, ReplayFileData>();
  for (const turn of turns) {
    for (
      let blockIndex = 0;
      blockIndex < (turn.blocks || []).length;
      blockIndex++
    ) {
      const block = turn.blocks[blockIndex];
      const filePath =
        typeof block.tool_call?.input?.file_path === "string"
          ? block.tool_call.input.file_path
          : null;
      if (!filePath) {
        continue;
      }

      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, {
          path: filePath,
          name: filePath.split("/").pop() || filePath,
          refs: [],
        });
      }

      fileMap.get(filePath)?.refs.push({
        turn: turn.index,
        block: blockIndex,
        tool: block.tool_call?.name ?? "",
      });
    }
  }

  const files = [...fileMap.values()];
  addRelativePaths(files);
  return files;
}
