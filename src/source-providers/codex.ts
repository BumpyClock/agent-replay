import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedSessionMatch, SessionProject } from "../types.js";
import {
  readCodexProjectName,
  readDirectories,
  readSessionFileEntries,
  withSource,
} from "./session-fs.js";

export function discoverCodexSessions(homeDir: string): SessionProject[] {
  const basePath = join(homeDir, ".codex", "sessions");
  const projects: SessionProject[] = [];

  for (const year of readDirectories(basePath).sort().reverse()) {
    const yearPath = join(basePath, year);
    for (const month of readDirectories(yearPath).sort().reverse()) {
      const monthPath = join(yearPath, month);
      for (const day of readDirectories(monthPath).sort().reverse()) {
        const dirPath = join(monthPath, day);
        const sessions = readSessionFileEntries(dirPath, (name) =>
          name.endsWith(".jsonl"),
        );
        if (sessions.length === 0) continue;
        const fallbackProject = `${year}-${month}-${day}`;
        for (const session of sessions) {
          projects.push({
            name: readCodexProjectName(session.path, fallbackProject),
            dirName: `${year}/${month}/${day}`,
            sessions: withSource("Codex", [session]),
          });
        }
      }
    }
  }

  return projects;
}

export function resolveCodexSessionId(
  sessionId: string,
  homeDir: string,
): ResolvedSessionMatch[] {
  const target = sessionId.endsWith(".jsonl")
    ? sessionId
    : `${sessionId}.jsonl`;
  const basePath = join(homeDir, ".codex", "sessions");
  const matches: ResolvedSessionMatch[] = [];

  for (const year of readDirectories(basePath)) {
    const yearPath = join(basePath, year);
    for (const month of readDirectories(yearPath)) {
      const monthPath = join(yearPath, month);
      for (const day of readDirectories(monthPath)) {
        const dayPath = join(monthPath, day);
        try {
          for (const file of readdirSync(dayPath)) {
            if (!file.endsWith(".jsonl")) continue;
            if (file === target) {
              matches.push({
                path: join(dayPath, file),
                project: `${year}-${month}-${day}`,
                group: "Codex CLI",
              });
              continue;
            }

            const stem = file.replace(/\.jsonl$/, "");
            const uuidMatch = stem.match(
              /^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-(.+)$/,
            );
            if (uuidMatch?.[1].includes(sessionId)) {
              matches.push({
                path: join(dayPath, file),
                project: `${year}-${month}-${day}`,
                group: "Codex CLI",
              });
            }
          }
        } catch {}
      }
    }
  }

  return matches;
}
