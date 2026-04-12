import { statSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedSessionMatch, SessionProject } from "../types.js";
import {
  projectDisplayName,
  readDirectories,
  readSessionFileEntries,
  withSource,
} from "./session-fs.js";

export function discoverClaudeSessions(homeDir: string): SessionProject[] {
  const basePath = join(homeDir, ".claude", "projects");
  return readDirectories(basePath)
    .sort()
    .map((dirName) => {
      const sessions = readSessionFileEntries(join(basePath, dirName), (name) =>
        name.endsWith(".jsonl"),
      );
      return {
        name: projectDisplayName(dirName),
        dirName,
        sessions: withSource("Claude Code", sessions),
      };
    })
    .filter((project) => project.sessions.length > 0);
}

export function resolveClaudeSessionId(
  sessionId: string,
  homeDir: string,
): ResolvedSessionMatch[] {
  const target = sessionId.endsWith(".jsonl")
    ? sessionId
    : `${sessionId}.jsonl`;
  const basePath = join(homeDir, ".claude", "projects");
  const matches: ResolvedSessionMatch[] = [];

  for (const dirName of readDirectories(basePath)) {
    const path = join(basePath, dirName, target);
    try {
      statSync(path);
      matches.push({
        path,
        project: projectDisplayName(dirName),
        group: "Claude Code",
      });
    } catch {}
  }

  return matches;
}
