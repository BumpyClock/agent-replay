import type { EditorSession, EditorSessionStore } from "./types.js";

/**
 * Create in-memory store for editor sessions.
 */
export function createEditorSessionStore(): EditorSessionStore {
  const sessions = new Map<string, EditorSession>();
  const sourcePaths = new Map<string, string>();
  let sessionCounter = 0;

  return {
    create(session) {
      const id = `s${++sessionCounter}`;
      sessions.set(id, session);
      sourcePaths.set(session.sourcePath, id);
      return id;
    },
    get(id) {
      return sessions.get(id);
    },
    findBySourcePath(path) {
      const sessionId = sourcePaths.get(path);
      if (!sessionId) {
        return undefined;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        return undefined;
      }

      return { sessionId, session };
    },
    entries() {
      return sessions.entries();
    },
  };
}
