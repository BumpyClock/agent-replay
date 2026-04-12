import { statSync } from "node:fs";
import { join } from "node:path";
import type {
  ResolvedSessionMatch,
  SessionFileEntry,
  SessionProject,
} from "../types.js";
import {
  compareSessionEntriesByDate,
  projectDisplayName,
  readDirectories,
  withSource,
} from "./session-fs.js";

export function discoverCursorSessions(homeDir: string): SessionProject[] {
  const basePath = join(homeDir, ".cursor", "projects");
  return readDirectories(basePath)
    .sort()
    .map((dirName) => {
      const transcriptBase = join(basePath, dirName, "agent-transcripts");
      const sessions: SessionFileEntry[] = [];

      for (const id of readDirectories(transcriptBase)) {
        const transcriptDir = join(transcriptBase, id);
        let path = join(transcriptDir, "transcript.jsonl");
        try {
          statSync(path);
        } catch {
          path = join(transcriptDir, `${id}.jsonl`);
          try {
            statSync(path);
          } catch {
            continue;
          }
        }

        let date: string | null = null;
        try {
          date = statSync(path).mtime.toISOString();
        } catch {
          date = null;
        }
        sessions.push({ file: id, path, date });
      }

      sessions.sort(compareSessionEntriesByDate);
      return {
        name: projectDisplayName(dirName),
        dirName,
        sessions: withSource("Cursor", sessions),
      };
    })
    .filter((project) => project.sessions.length > 0);
}

export function resolveCursorSessionId(
  sessionId: string,
  homeDir: string,
): ResolvedSessionMatch[] {
  const basePath = join(homeDir, ".cursor", "projects");
  const matches: ResolvedSessionMatch[] = [];

  for (const dirName of readDirectories(basePath)) {
    const transcriptBase = join(basePath, dirName, "agent-transcripts");
    let path = join(transcriptBase, sessionId, "transcript.jsonl");
    try {
      statSync(path);
    } catch {
      path = join(transcriptBase, sessionId, `${sessionId}.jsonl`);
      try {
        statSync(path);
      } catch {
        continue;
      }
    }

    matches.push({
      path,
      project: projectDisplayName(dirName),
      group: "Cursor",
    });
  }

  return matches;
}
