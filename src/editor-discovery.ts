/**
 * Filesystem and session discovery helpers for the replay editor.
 *
 * Provides path-safety enforcement and directory scanning used by the
 * browse and sessions API routes.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";

/** Ensure a path is under $HOME to prevent filesystem traversal. */
export function assertUnderHome(targetPath: string): string {
  const resolved = resolve(targetPath);
  const home = homedir();
  if (!resolved.startsWith(home + sep) && resolved !== home) {
    const err = new Error(
      "Access denied: path must be under your home directory",
    ) as NodeJS.ErrnoException;
    err.code = "EACCES";
    throw err;
  }
  return resolved;
}

/** Browse a directory — returns dirs + .jsonl/.html files. */
export function browseDirectory(dirPath: string) {
  const resolved = assertUnderHome(dirPath);
  const entries = readdirSync(resolved);
  const dirs = [];
  const files = [];

  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const fullPath = join(resolved, name);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        dirs.push({ name, path: fullPath });
      } else if (name.endsWith(".jsonl") || name.endsWith(".html")) {
        files.push({ name, path: fullPath, date: stat.mtime.toISOString() });
      }
    } catch {
      /* skip inaccessible entries */
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => b.date.localeCompare(a.date));

  const parent = dirname(resolved);
  return {
    path: resolved,
    parent: parent !== resolved ? parent : null,
    dirs,
    files,
  };
}

/** Session entry with agent source tag. */
interface DiscoveredSession {
  file: string;
  path: string;
  date: string | null;
  source: string;
}

/** Sort sessions newest-first. */
function sortSessions(sessions: DiscoveredSession[]): void {
  sessions.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

/** Add sessions into a project map, merging if the project already exists. */
function addToProjectMap(
  map: Map<string, DiscoveredSession[]>,
  projectName: string,
  sessions: DiscoveredSession[],
): void {
  const existing = map.get(projectName);
  if (existing) {
    existing.push(...sessions);
  } else {
    map.set(projectName, [...sessions]);
  }
}

/** Read the first line of a JSONL file and extract cwd from session_meta. */
function readCodexCwd(filePath: string): string | null {
  try {
    const text = readFileSync(filePath, "utf-8");
    const firstNewline = text.indexOf("\n");
    const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline);
    const obj = JSON.parse(firstLine);
    if (obj.type === "session_meta" && obj.payload?.cwd) {
      return basename(obj.payload.cwd);
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Discover sessions across all supported agents, grouped by project. */
export function discoverSessions() {
  const home = homedir();
  const projectMap = new Map<string, DiscoveredSession[]>();

  // Claude Code: ~/.claude/projects/<project>/*.jsonl
  const claudeBase = join(home, ".claude", "projects");
  try {
    for (const proj of readdirSync(claudeBase).sort()) {
      const projPath = join(claudeBase, proj);
      try {
        if (!statSync(projPath).isDirectory()) continue;
      } catch {
        continue;
      }
      const files = readdirSync(projPath).filter((f) => f.endsWith(".jsonl"));
      if (files.length === 0) continue;
      const parts = proj.replace(/^-+/, "").split("-");
      const displayName =
        parts.length > 1 ? parts.slice(-2).join("-") : parts[0];
      const sessions: DiscoveredSession[] = files.map((f) => {
        const fullPath = join(projPath, f);
        let date: string | null = null;
        try {
          date = statSync(fullPath).mtime.toISOString();
        } catch {
          /* ignore */
        }
        return { file: f, path: fullPath, date, source: "Claude Code" };
      });
      addToProjectMap(projectMap, displayName, sessions);
    }
  } catch {
    /* directory doesn't exist */
  }

  // Cursor: ~/.cursor/projects/<project>/agent-transcripts/<id>/transcript.jsonl
  const cursorBase = join(home, ".cursor", "projects");
  try {
    for (const proj of readdirSync(cursorBase).sort()) {
      const transcriptsDir = join(cursorBase, proj, "agent-transcripts");
      let ids: string[];
      try {
        ids = readdirSync(transcriptsDir);
      } catch {
        continue;
      }
      const sessions: DiscoveredSession[] = [];
      for (const id of ids) {
        const idDir = join(transcriptsDir, id);
        try {
          if (!statSync(idDir).isDirectory()) continue;
        } catch {
          continue;
        }
        let filePath = join(idDir, "transcript.jsonl");
        try {
          statSync(filePath);
        } catch {
          filePath = join(idDir, id + ".jsonl");
          try {
            statSync(filePath);
          } catch {
            continue;
          }
        }
        try {
          const stat = statSync(filePath);
          sessions.push({
            file: id,
            path: filePath,
            date: stat.mtime.toISOString(),
            source: "Cursor",
          });
        } catch {
          /* skip */
        }
      }
      if (sessions.length === 0) continue;
      const parts = proj.replace(/^-+/, "").split("-");
      const displayName =
        parts.length > 1 ? parts.slice(-2).join("-") : parts[0];
      addToProjectMap(projectMap, displayName, sessions);
    }
  } catch {
    /* directory doesn't exist */
  }

  // Gemini CLI: ~/.gemini/tmp/<projectHash>/chats/session-*.json
  const geminiBase = join(home, ".gemini", "tmp");
  try {
    for (const hashDir of readdirSync(geminiBase).sort()) {
      const chatsDir = join(geminiBase, hashDir, "chats");
      try {
        if (!statSync(chatsDir).isDirectory()) continue;
      } catch {
        continue;
      }
      const files = readdirSync(chatsDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse();
      if (files.length === 0) continue;
      const displayName = hashDir.slice(0, 12);
      const sessions: DiscoveredSession[] = files.map((f) => {
        const fullPath = join(chatsDir, f);
        let date: string | null = null;
        try {
          date = statSync(fullPath).mtime.toISOString();
        } catch {
          /* ignore */
        }
        return { file: f, path: fullPath, date, source: "Gemini" };
      });
      addToProjectMap(projectMap, displayName, sessions);
    }
  } catch {
    /* directory doesn't exist */
  }

  // Codex CLI: ~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl
  const codexBase = join(home, ".codex", "sessions");
  try {
    for (const year of readdirSync(codexBase).sort().reverse()) {
      const yearPath = join(codexBase, year);
      try {
        if (!statSync(yearPath).isDirectory()) continue;
      } catch {
        continue;
      }
      for (const month of readdirSync(yearPath).sort().reverse()) {
        const monthPath = join(yearPath, month);
        try {
          if (!statSync(monthPath).isDirectory()) continue;
        } catch {
          continue;
        }
        for (const day of readdirSync(monthPath).sort().reverse()) {
          const dayPath = join(monthPath, day);
          try {
            if (!statSync(dayPath).isDirectory()) continue;
          } catch {
            continue;
          }
          const files = readdirSync(dayPath)
            .filter((f) => f.endsWith(".jsonl"))
            .sort()
            .reverse();
          if (files.length === 0) continue;
          for (const f of files) {
            const fullPath = join(dayPath, f);
            let date: string | null = null;
            try {
              date = statSync(fullPath).mtime.toISOString();
            } catch {
              /* ignore */
            }
            const projectName =
              readCodexCwd(fullPath) || `${year}-${month}-${day}`;
            addToProjectMap(projectMap, projectName, [
              { file: f, path: fullPath, date, source: "Codex" },
            ]);
          }
        }
      }
    }
  } catch {
    /* directory doesn't exist */
  }

  // Copilot: ~/.copilot/session-state/<uuid>/events.jsonl
  const copilotBase = join(home, ".copilot", "session-state");
  try {
    for (const id of readdirSync(copilotBase)) {
      const idDir = join(copilotBase, id);
      try {
        if (!statSync(idDir).isDirectory()) continue;
      } catch {
        continue;
      }
      const eventsPath = join(idDir, "events.jsonl");
      try {
        statSync(eventsPath);
      } catch {
        continue;
      }
      let date: string | null = null;
      try {
        date = statSync(eventsPath).mtime.toISOString();
      } catch {
        /* ignore */
      }
      let projectKey = "Sessions";
      try {
        const yaml = readFileSync(join(idDir, "workspace.yaml"), "utf-8");
        const cwdMatch = yaml.match(/^cwd:\s*(.+)/m);
        if (cwdMatch) {
          projectKey = basename(cwdMatch[1].trim());
        }
      } catch {
        /* no workspace.yaml or unreadable */
      }
      addToProjectMap(projectMap, projectKey, [
        { file: id, path: eventsPath, date, source: "Copilot" },
      ]);
    }
  } catch {
    /* directory doesn't exist */
  }

  // Build final groups sorted by project name
  const groups = [];
  for (const [projName, sessions] of [...projectMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    sortSessions(sessions);
    groups.push({
      name: projName,
      projects: [
        {
          name: projName,
          dirName: projName,
          sessions,
        },
      ],
    });
  }

  return groups;
}
