/**
 * Filesystem and session discovery helpers for the replay editor.
 *
 * Provides path-safety enforcement and directory scanning used by the
 * browse and sessions API routes.
 */

import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

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

/** Discover session folders under Claude Code and Cursor project dirs. */
export function discoverSessions() {
  const home = homedir();
  const groups = [];

  // Claude Code: ~/.claude/projects/<project>/*.jsonl
  const claudeBase = join(home, ".claude", "projects");
  try {
    const projects = readdirSync(claudeBase).filter((d) => {
      try {
        return statSync(join(claudeBase, d)).isDirectory();
      } catch {
        return false;
      }
    });
    const claudeGroup = { name: "Claude Code", projects: [] };
    for (const proj of projects.sort()) {
      const projPath = join(claudeBase, proj);
      const files = readdirSync(projPath).filter((f) => f.endsWith(".jsonl"));
      if (files.length === 0) continue;
      const parts = proj.replace(/^-+/, "").split("-");
      const displayName =
        parts.length > 1 ? parts.slice(-2).join("-") : parts[0];
      claudeGroup.projects.push({
        name: displayName,
        dirName: proj,
        sessions: files
          .map((f) => {
            const fullPath = join(projPath, f);
            let date = null;
            try {
              date = statSync(fullPath).mtime.toISOString();
            } catch {
              /* ignore */
            }
            return { file: f, path: fullPath, date };
          })
          .sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date.localeCompare(a.date);
          }),
      });
    }
    if (claudeGroup.projects.length > 0) groups.push(claudeGroup);
  } catch {
    /* directory doesn't exist */
  }

  // Cursor: ~/.cursor/projects/<project>/agent-transcripts/<id>/transcript.jsonl
  const cursorBase = join(home, ".cursor", "projects");
  try {
    const projects = readdirSync(cursorBase).filter((d) => {
      try {
        return statSync(join(cursorBase, d)).isDirectory();
      } catch {
        return false;
      }
    });
    const cursorGroup = { name: "Cursor", projects: [] };
    for (const proj of projects.sort()) {
      const transcriptsDir = join(cursorBase, proj, "agent-transcripts");
      let ids;
      try {
        ids = readdirSync(transcriptsDir);
      } catch {
        continue;
      }
      const cursorSessions = [];
      for (const id of ids) {
        const idDir = join(transcriptsDir, id);
        try {
          if (!statSync(idDir).isDirectory()) continue;
        } catch {
          continue;
        }
        // Try transcript.jsonl first, then <uuid>.jsonl
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
          cursorSessions.push({
            file: id,
            path: filePath,
            date: stat.mtime.toISOString(),
          });
        } catch {}
      }
      if (cursorSessions.length === 0) continue;
      cursorSessions.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });
      const parts = proj.replace(/^-+/, "").split("-");
      const displayName =
        parts.length > 1 ? parts.slice(-2).join("-") : parts[0];
      cursorGroup.projects.push({
        name: displayName,
        dirName: proj,
        sessions: cursorSessions,
      });
    }
    if (cursorGroup.projects.length > 0) groups.push(cursorGroup);
  } catch {
    /* directory doesn't exist */
  }

  // Gemini CLI: ~/.gemini/tmp/<projectHash>/chats/session-*.json
  const geminiBase = join(home, ".gemini", "tmp");
  try {
    const geminiGroup = { name: "Gemini", projects: [] };
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
      geminiGroup.projects.push({
        name: hashDir.slice(0, 12),
        dirName: hashDir,
        sessions: files
          .map((f) => {
            const fullPath = join(chatsDir, f);
            let date = null;
            try {
              date = statSync(fullPath).mtime.toISOString();
            } catch {
              /* ignore */
            }
            return { file: f, path: fullPath, date };
          })
          .sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date.localeCompare(a.date);
          }),
      });
    }
    if (geminiGroup.projects.length > 0) groups.push(geminiGroup);
  } catch {
    /* directory doesn't exist */
  }

  // Codex CLI: ~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl
  const codexBase = join(home, ".codex", "sessions");
  try {
    const codexGroup = { name: "Codex", projects: [] };
    // Walk year/month/day directories
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
          codexGroup.projects.push({
            name: `${year}-${month}-${day}`,
            dirName: `${year}/${month}/${day}`,
            sessions: files.map((f) => {
              const fullPath = join(dayPath, f);
              let date = null;
              try {
                date = statSync(fullPath).mtime.toISOString();
              } catch {
                /* ignore */
              }
              return { file: f, path: fullPath, date };
            }),
          });
        }
      }
    }
    if (codexGroup.projects.length > 0) groups.push(codexGroup);
  } catch {
    /* directory doesn't exist */
  }

  return groups;
}
