import { homedir } from "node:os";
import type { SessionsResponse } from "../editor-app-types.js";
import { discoverSessions } from "../editor-discovery.js";
import type { SessionGroup } from "../types.js";
import { createSessionDiscoveryCache } from "./session-discovery-cache.js";
import { createSessionsResponse } from "./session-list-response.js";
import type { EditorSessionCatalog } from "./types.js";

interface CreateEditorSessionCatalogOptions {
  ttlMs?: number;
  now?: () => number;
  getHomedir?: () => string;
  discover?: () => SessionGroup[];
}

export function createEditorSessionCatalog({
  ttlMs = 1000,
  now = Date.now,
  getHomedir = homedir,
  discover = discoverSessions,
}: CreateEditorSessionCatalogOptions = {}): EditorSessionCatalog {
  const discoveryCache = createSessionDiscoveryCache({
    ttlMs,
    now,
    discover,
  });

  return {
    getSnapshot() {
      return discoveryCache.getSnapshot();
    },

    listSessions(appVersion: string): SessionsResponse {
      const snapshot = discoveryCache.getSnapshot();
      return createSessionsResponse({
        groups: snapshot.groups,
        homedir: getHomedir(),
        appVersion,
      });
    },

    invalidate() {
      discoveryCache.invalidate();
    },
  };
}
