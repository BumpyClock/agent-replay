/**
 * Autosave subsystem for the replay editor.
 *
 * Persists working session state to disk at ~/.claude-replay/autosave/
 * so edits survive browser refreshes.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const AUTOSAVE_DIR = join(homedir(), ".claude-replay", "autosave");

/** Timer handles keyed by sourcePath — at most one pending save per file. */
const autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function autosaveKey(sourcePath: string): string {
  return (
    createHash("sha256").update(sourcePath).digest("hex").slice(0, 16) + ".json"
  );
}

function autosavePath(sourcePath: string): string {
  return join(AUTOSAVE_DIR, autosaveKey(sourcePath));
}

interface AutosaveSession {
  sourcePath: string;
  workingTurns: unknown[];
  excludedTurns?: unknown[];
  bookmarks?: unknown[];
}

/** Schedule an autosave (throttled: at most once per 2 seconds per session). */
export function scheduleAutosave(session: AutosaveSession): void {
  const id = session.sourcePath;
  if (autosaveTimers.has(id)) return; // already scheduled
  autosaveTimers.set(
    id,
    setTimeout(() => {
      autosaveTimers.delete(id);
      try {
        mkdirSync(AUTOSAVE_DIR, { recursive: true });
        const data = {
          sourcePath: session.sourcePath,
          workingTurns: session.workingTurns,
          excludedTurns: session.excludedTurns || [],
          bookmarks: session.bookmarks || [],
        };
        writeFileSync(autosavePath(session.sourcePath), JSON.stringify(data));
      } catch {
        /* ignore write errors */
      }
    }, 2000),
  );
}

/** Load autosave data for a source path, if it exists. Returns null if none. */
export function loadAutosave(sourcePath: string): any {
  try {
    const p = autosavePath(sourcePath);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

/** Delete the autosave file for a source path, if it exists. */
export function deleteAutosave(sourcePath: string): void {
  try {
    const p = autosavePath(sourcePath);
    if (existsSync(p)) unlinkSync(p);
  } catch {
    /* ignore */
  }
}
