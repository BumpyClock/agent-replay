import type { SessionGroup } from "../types.js";
import { freezeSessionGroups } from "./session-group-tree.js";
import type { EditorSessionCatalogSnapshot } from "./types.js";

interface CreateSessionDiscoveryCacheOptions {
  ttlMs: number;
  now: () => number;
  discover: () => SessionGroup[];
}

interface SessionDiscoveryCacheEntry {
  expiresAt: number;
  snapshot: EditorSessionCatalogSnapshot;
}

export interface SessionDiscoveryCache {
  getSnapshot(): EditorSessionCatalogSnapshot;
  invalidate(): void;
}

export function createSessionDiscoveryCache({
  ttlMs,
  now,
  discover,
}: CreateSessionDiscoveryCacheOptions): SessionDiscoveryCache {
  let cache: SessionDiscoveryCacheEntry | null = null;
  let nextSnapshotVersion = 1;

  function buildSnapshot(): EditorSessionCatalogSnapshot {
    const snapshot: EditorSessionCatalogSnapshot = {
      version: nextSnapshotVersion,
      groups: freezeSessionGroups(discover()),
    };
    nextSnapshotVersion += 1;
    return Object.freeze(snapshot);
  }

  return {
    getSnapshot() {
      const currentTime = now();
      if (cache && cache.expiresAt > currentTime) {
        return cache.snapshot;
      }

      const snapshot = buildSnapshot();
      cache = {
        expiresAt: currentTime + ttlMs,
        snapshot,
      };
      return snapshot;
    },

    invalidate() {
      cache = null;
    },
  };
}
