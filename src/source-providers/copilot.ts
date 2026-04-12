import { statSync } from "node:fs";
import { join } from "node:path";
import type {
  ResolvedSessionMatch,
  SessionFileEntry,
  SessionProject,
} from "../types.js";
import {
  compareSessionEntriesByDate,
  readCopilotProjectName,
  readDirectories,
  withSource,
} from "./session-fs.js";

export function discoverCopilotSessions(homeDir: string): SessionProject[] {
  const basePath = join(homeDir, ".copilot", "session-state");
  const projectMap = new Map<string, SessionFileEntry[]>();

  for (const dirName of readDirectories(basePath)) {
    const sessionDir = join(basePath, dirName);
    const eventsPath = join(sessionDir, "events.jsonl");
    try {
      statSync(eventsPath);
    } catch {
      continue;
    }

    let date: string | null = null;
    try {
      date = statSync(eventsPath).mtime.toISOString();
    } catch {
      date = null;
    }

    const projectName = readCopilotProjectName(sessionDir);
    const sessions = projectMap.get(projectName) ?? [];
    sessions.push({ file: dirName, path: eventsPath, date });
    projectMap.set(projectName, sessions);
  }

  return [...projectMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, sessions]) => ({
      name,
      dirName: name,
      sessions: withSource(
        "Copilot",
        sessions.sort(compareSessionEntriesByDate),
      ),
    }));
}

export function resolveCopilotSessionId(
  sessionId: string,
  homeDir: string,
): ResolvedSessionMatch[] {
  const basePath = join(homeDir, ".copilot", "session-state");
  const matches: ResolvedSessionMatch[] = [];

  for (const dirName of readDirectories(basePath)) {
    if (dirName !== sessionId) continue;
    const sessionDir = join(basePath, dirName);
    const eventsPath = join(sessionDir, "events.jsonl");
    try {
      statSync(eventsPath);
    } catch {
      continue;
    }

    matches.push({
      path: eventsPath,
      project: readCopilotProjectName(sessionDir),
      group: "Copilot",
    });
  }

  return matches;
}
