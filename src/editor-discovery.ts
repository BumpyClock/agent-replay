/**
 * Filesystem and session discovery helpers for the replay editor.
 */

import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { discoverProviderSessions } from "./source-providers.js";

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

/** Browse a directory and return subdirectories plus replay-compatible files. */
export function browseDirectory(dirPath: string) {
  const resolved = assertUnderHome(dirPath);
  const dirs: Array<{ name: string; path: string }> = [];
  const files: Array<{ name: string; path: string; date: string }> = [];

  for (const name of readdirSync(resolved)) {
    if (name.startsWith(".")) continue;
    const path = join(resolved, name);
    try {
      const stat = statSync(path);
      if (stat.isDirectory()) {
        dirs.push({ name, path });
      } else if (name.endsWith(".jsonl") || name.endsWith(".html")) {
        files.push({ name, path, date: stat.mtime.toISOString() });
      }
    } catch {}
  }

  dirs.sort((left, right) => left.name.localeCompare(right.name));
  files.sort((left, right) => right.date.localeCompare(left.date));

  const parent = dirname(resolved);
  return {
    path: resolved,
    parent: parent !== resolved ? parent : null,
    dirs,
    files,
  };
}

/** Discover session folders under all supported local providers. */
export function discoverSessions() {
  return discoverProviderSessions();
}
