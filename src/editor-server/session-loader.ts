import { readFileSync } from "node:fs";
import { loadAutosave } from "../editor-autosave.js";
import { assertUnderHome } from "../editor-discovery.js";
import { extractData } from "../extract.js";
import { detectFormat, parseTranscript } from "../parser.js";
import { cloneTurns } from "../replay-prepare.js";
import type { Bookmark, Turn } from "../types.js";
import { createHttpError } from "./http-error.js";
import {
  coerceBookmarks,
  coerceNumberArray,
  coerceTurns,
} from "./render-options.js";
import { createSessionPayload } from "./session-payload.js";
import type {
  EditorSession,
  EditorSessionLoader,
  EditorSessionStore,
} from "./types.js";

interface CreateEditorSessionLoaderOptions {
  sessionStore: EditorSessionStore;
}

function createSession(
  turns: Turn[],
  sourcePath: string,
  format: string,
  sourceBookmarks: Bookmark[] = [],
): EditorSession {
  const saved = loadAutosave(sourcePath);
  const savedTurns = coerceTurns(saved?.workingTurns);

  return {
    originalTurns: cloneTurns(turns),
    workingTurns: savedTurns ? cloneTurns(savedTurns) : cloneTurns(turns),
    sourcePath,
    format,
    originalBookmarks: sourceBookmarks.slice(),
    excludedTurns: coerceNumberArray(saved?.excludedTurns),
    bookmarks:
      saved && Array.isArray(saved.bookmarks)
        ? coerceBookmarks(saved.bookmarks)
        : sourceBookmarks.slice(),
  };
}

function loadHtmlReplay(path: string): {
  turns: Turn[];
  format: string;
  bookmarks: Bookmark[];
} {
  try {
    const data = extractData(readFileSync(path, "utf-8"));
    return {
      turns: data.turns as Turn[],
      format: "extracted",
      bookmarks: coerceBookmarks(data.bookmarks),
    };
  } catch {
    throw createHttpError(400, "Not a valid claude-replay HTML file");
  }
}

function loadTranscript(path: string): {
  turns: Turn[];
  format: string;
  bookmarks: Bookmark[];
} {
  return {
    turns: parseTranscript(path),
    format: detectFormat(path),
    bookmarks: [],
  };
}

export function createEditorSessionLoader({
  sessionStore,
}: CreateEditorSessionLoaderOptions): EditorSessionLoader {
  return {
    load(path) {
      assertUnderHome(path);

      const existing = sessionStore.findBySourcePath(path);
      if (existing) {
        return createSessionPayload(existing.sessionId, existing.session);
      }

      const sourceData = path.endsWith(".html")
        ? loadHtmlReplay(path)
        : loadTranscript(path);
      const session = createSession(
        sourceData.turns,
        path,
        sourceData.format,
        sourceData.bookmarks,
      );
      const sessionId = sessionStore.create(session);
      return createSessionPayload(sessionId, session);
    },

    importHtml(html, filename) {
      try {
        const data = extractData(html);
        const session = createSession(
          data.turns as Turn[],
          filename || "imported.html",
          "extracted",
          coerceBookmarks(data.bookmarks),
        );
        const sessionId = sessionStore.create(session);
        return createSessionPayload(sessionId, session);
      } catch {
        throw createHttpError(400, "Not a valid claude-replay HTML file");
      }
    },

    requireSession(sessionId) {
      const session = sessionStore.get(sessionId);
      if (!session) {
        throw createHttpError(404, "Unknown session");
      }
      return session;
    },
  };
}
