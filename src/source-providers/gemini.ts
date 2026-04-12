import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedSessionMatch, SessionProject } from "../types.js";
import {
  readDirectories,
  readSessionFileEntries,
  withSource,
} from "./session-fs.js";

export function discoverGeminiSessions(homeDir: string): SessionProject[] {
  const basePath = join(homeDir, ".gemini", "tmp");
  return readDirectories(basePath)
    .sort()
    .map((dirName) => {
      const sessions = readSessionFileEntries(
        join(basePath, dirName, "chats"),
        (name) => name.endsWith(".json"),
      );
      return {
        name: dirName.slice(0, 12),
        dirName,
        sessions: withSource("Gemini", sessions),
      };
    })
    .filter((project) => project.sessions.length > 0);
}

export function resolveGeminiSessionId(
  sessionId: string,
  homeDir: string,
): ResolvedSessionMatch[] {
  const basePath = join(homeDir, ".gemini", "tmp");
  const matches: ResolvedSessionMatch[] = [];

  for (const dirName of readDirectories(basePath)) {
    const chatsDir = join(basePath, dirName, "chats");
    try {
      for (const file of readdirSync(chatsDir)) {
        if (!file.endsWith(".json")) continue;
        const stem = file.replace(/\.json$/, "");
        if (
          file === sessionId ||
          file === `${sessionId}.json` ||
          stem === sessionId ||
          stem.endsWith(`-${sessionId}`)
        ) {
          matches.push({
            path: join(chatsDir, file),
            project: dirName.slice(0, 12),
            group: "Gemini CLI",
          });
        }
      }
    } catch {}
  }

  return matches;
}
