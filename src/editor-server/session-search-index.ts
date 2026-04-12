import { readFileSync, statSync } from "node:fs";
import type { ReadonlySessionGroup } from "./types.js";

interface SessionSearchDocument {
  /** Raw transcript text loaded from disk for this session path. */
  text: string;
  /** Lowercased transcript text used for case-insensitive search matching. */
  normalizedText: string;
  /** Last modified time snapshot used for cache invalidation. */
  mtimeMs: number;
  /** Last status-change snapshot used for cache invalidation. */
  ctimeMs: number;
  /** File size snapshot used for cache invalidation. */
  size: number;
}

interface SessionSearchIndexStats {
  /** Last modified time snapshot used for cache invalidation. */
  mtimeMs: number;
  /** Last status-change snapshot used for cache invalidation. */
  ctimeMs: number;
  /** Byte size snapshot used for cache invalidation. */
  size: number;
}

interface CreateSessionSearchIndexOptions {
  /** Optional file read override for tests or alternate backends. */
  readText?: (path: string) => string;
  /** Optional metadata reader override for tests or alternate backends. */
  statFile?: (path: string) => SessionSearchIndexStats;
}

interface SessionSearchIndex {
  /** Sync cache with current visible session list (removes stale paths). */
  sync(groups: readonly ReadonlySessionGroup[]): void;
  /** Return cached transcript doc when unchanged; otherwise reload from disk. */
  get(path: string): SessionSearchDocument | undefined;
}

/** Read file stats used as the cache invalidation key. */
function readIndexStats(path: string): SessionSearchIndexStats {
  const stats = statSync(path);
  return {
    mtimeMs: stats.mtimeMs,
    ctimeMs: stats.ctimeMs,
    size: stats.size,
  };
}

function collectSessionPaths(
  groups: readonly ReadonlySessionGroup[],
): Set<string> {
  const paths = new Set<string>();
  for (const group of groups) {
    for (const project of group.projects) {
      for (const session of project.sessions) {
        paths.add(session.path);
      }
    }
  }
  return paths;
}

export function createSessionSearchIndex({
  readText = (path) => readFileSync(path, "utf-8"),
  statFile = readIndexStats,
}: CreateSessionSearchIndexOptions = {}): SessionSearchIndex {
  const documents = new Map<string, SessionSearchDocument>();

  return {
    sync(groups) {
      const activePaths = collectSessionPaths(groups);
      for (const path of documents.keys()) {
        if (!activePaths.has(path)) {
          documents.delete(path);
        }
      }
    },

    get(path) {
      try {
        const stats = statFile(path);
        const cached = documents.get(path);
        if (
          cached &&
          cached.mtimeMs === stats.mtimeMs &&
          cached.ctimeMs === stats.ctimeMs &&
          cached.size === stats.size
        ) {
          return cached;
        }

        const text = readText(path);
        const nextDocument = {
          text,
          normalizedText: text.toLowerCase(),
          mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs,
          size: stats.size,
        };
        documents.set(path, nextDocument);
        return nextDocument;
      } catch {
        documents.delete(path);
        return undefined;
      }
    },
  };
}
