import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { SessionFileEntry } from "../types.js";

export function withSource(
  source: string,
  sessions: SessionFileEntry[],
): SessionFileEntry[] {
  return sessions.map((session) => ({ ...session, source }));
}

export function readDirectories(path: string): string[] {
  try {
    return readdirSync(path).filter((name) => {
      try {
        return statSync(join(path, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export function readSessionFileEntries(
  dirPath: string,
  predicate: (name: string) => boolean,
): SessionFileEntry[] {
  try {
    return readdirSync(dirPath)
      .filter(predicate)
      .map((file) => {
        const path = join(dirPath, file);
        let date: string | null = null;
        try {
          date = statSync(path).mtime.toISOString();
        } catch {
          date = null;
        }
        return { file, path, date };
      })
      .sort(compareSessionEntriesByDate);
  } catch {
    return [];
  }
}

export function compareSessionEntriesByDate(
  left: SessionFileEntry,
  right: SessionFileEntry,
): number {
  if (!left.date && !right.date) return 0;
  if (!left.date) return 1;
  if (!right.date) return -1;
  return right.date.localeCompare(left.date);
}

export function projectDisplayName(dirName: string): string {
  const parts = dirName.replace(/^-+/, "").split("-");
  return parts.length > 1 ? parts.slice(-2).join("-") : parts[0];
}

export function readCodexProjectName(
  filePath: string,
  fallbackProject: string,
): string {
  try {
    const text = readFileSync(filePath, "utf-8");
    const firstNewline = text.indexOf("\n");
    const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline);
    const firstEntry = JSON.parse(firstLine);
    if (firstEntry.type === "session_meta" && firstEntry.payload?.cwd) {
      return basename(firstEntry.payload.cwd);
    }
  } catch {
    return fallbackProject;
  }

  return fallbackProject;
}

export function readCopilotProjectName(sessionDir: string): string {
  try {
    const workspace = readFileSync(join(sessionDir, "workspace.yaml"), "utf-8");
    const cwdMatch = workspace.match(/^cwd:\s*(.+)/m);
    if (cwdMatch) {
      return basename(cwdMatch[1].trim());
    }
  } catch {
    return "Sessions";
  }

  return "Sessions";
}
