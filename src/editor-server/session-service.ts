import type { ExportOptions } from "../editor-app-types.js";
import { deleteAutosave, scheduleAutosave } from "../editor-autosave.js";
import { browseDirectory } from "../editor-discovery.js";
import { render } from "../renderer.js";
import { cloneTurns } from "../replay-prepare.js";
import { listThemes } from "../themes.js";
import { createHttpError } from "./http-error.js";
import {
  buildSessionRenderContext,
  coerceBookmarks,
  coerceBoolean,
  coerceNumberArray,
  createDownloadFilename,
} from "./render-options.js";
import { createEditorSessionCatalog } from "./session-catalog.js";
import { createEditorSessionLoader } from "./session-loader.js";
import { hasSessionEdits, summarizeTurns } from "./session-payload.js";
import { createEditorSessionSearch } from "./session-search.js";
import type { EditorSessionService, EditorSessionStore } from "./types.js";

interface CreateEditorSessionServiceOptions {
  sessionStore: EditorSessionStore;
  version: string;
}

export function createEditorSessionService({
  sessionStore,
  version,
}: CreateEditorSessionServiceOptions): EditorSessionService {
  const sessionCatalog = createEditorSessionCatalog();
  const sessionLoader = createEditorSessionLoader({ sessionStore });
  const sessionSearch = createEditorSessionSearch();

  return {
    getVersion() {
      return version;
    },

    listSessions() {
      return sessionCatalog.listSessions(version);
    },

    search(query) {
      const snapshot = sessionCatalog.getSnapshot();
      return sessionSearch.search(snapshot.groups, query);
    },

    listThemes() {
      return listThemes();
    },

    browse(path) {
      return browseDirectory(path);
    },

    load(path) {
      return sessionLoader.load(path);
    },

    importHtml(html, filename) {
      return sessionLoader.importHtml(html, filename);
    },

    editTurn(sessionId, turnIndex, userText) {
      const session = sessionLoader.requireSession(sessionId);
      const turn = session.workingTurns.find(
        (entry) => entry.index === turnIndex,
      );
      if (!turn) {
        throw createHttpError(404, `Turn ${turnIndex} not found`);
      }

      turn.user_text = userText;
      scheduleAutosave(session);
      return { ok: true, hasEdits: hasSessionEdits(session) };
    },

    exportData(sessionId, options: Partial<ExportOptions> = {}) {
      const session = sessionLoader.requireSession(sessionId);
      const { prepared } = buildSessionRenderContext(session, options);
      return {
        body: JSON.stringify(
          { turns: prepared.turns, bookmarks: prepared.bookmarks },
          null,
          2,
        ),
        filename: createDownloadFilename(options.title, "json"),
      };
    },

    preview(sessionId, options: Partial<ExportOptions> = {}) {
      const session = sessionLoader.requireSession(sessionId);
      session.excludedTurns = coerceNumberArray(options.excludeTurns);
      session.bookmarks = coerceBookmarks(options.bookmarks);
      scheduleAutosave(session);

      const { prepared, renderOptions } = buildSessionRenderContext(
        session,
        options,
      );
      return { html: render(prepared.turns, renderOptions) };
    },

    exportHtml(sessionId, options: Partial<ExportOptions> = {}) {
      const session = sessionLoader.requireSession(sessionId);
      const { prepared, renderOptions } = buildSessionRenderContext(
        session,
        options,
        {
          minified: coerceBoolean(options.minified, true),
          compress: coerceBoolean(options.compress, true),
        },
      );
      return {
        body: render(prepared.turns, renderOptions),
        filename: createDownloadFilename(options.title, "html"),
      };
    },

    reset(sessionId) {
      const session = sessionLoader.requireSession(sessionId);
      session.workingTurns = cloneTurns(session.originalTurns);
      session.excludedTurns = [];
      session.bookmarks = [];
      deleteAutosave(session.sourcePath);
      return { turns: summarizeTurns(session.workingTurns) };
    },
  };
}
