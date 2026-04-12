import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  BrowseDirectoryResponse,
  EditorTurnSummary,
  EditResponse,
  ExportOptions,
  PreviewResponse,
  SearchResponse,
  SessionPayload,
  SessionsResponse,
} from "../editor-app-types.js";
import type {
  Bookmark,
  SessionFileEntry,
  SessionGroup,
  SessionProject,
  Turn,
} from "../types.js";

/**
 * Editor server startup options.
 */
export interface StartEditorOptions {
  open?: boolean;
  host?: string;
  initialFile?: string;
  noOriginCheck?: boolean;
  allowedOrigins?: string[];
  devMode?: boolean;
}

/**
 * In-memory editor session state.
 */
export interface EditorSession {
  originalTurns: Turn[];
  workingTurns: Turn[];
  sourcePath: string;
  format: string;
  originalBookmarks: Bookmark[];
  excludedTurns: number[];
  bookmarks: Bookmark[];
}

/**
 * Session repository abstraction used by the editor service.
 */
export interface EditorSessionStore {
  create(session: EditorSession): string;
  get(id: string): EditorSession | undefined;
  findBySourcePath(path: string): EditorSessionRecord | undefined;
  entries(): IterableIterator<[string, EditorSession]>;
}

/**
 * Session + id pair returned from store helpers.
 */
export interface EditorSessionRecord {
  sessionId: string;
  session: EditorSession;
}

/**
 * Discovery catalog reused across list/search requests.
 */
export type ReadonlySessionFile = Readonly<SessionFileEntry>;

/**
 * Immutable project entry within a cached session discovery snapshot.
 */
export interface ReadonlySessionProject
  extends Omit<SessionProject, "sessions"> {
  readonly sessions: readonly ReadonlySessionFile[];
}

/**
 * Immutable group entry within a cached session discovery snapshot.
 */
export interface ReadonlySessionGroup extends Omit<SessionGroup, "projects"> {
  readonly projects: readonly ReadonlySessionProject[];
}

/**
 * Discovery catalog reused across list/search requests.
 */
export interface EditorSessionCatalogSnapshot {
  readonly version: number;
  readonly groups: readonly ReadonlySessionGroup[];
}

/**
 * Discovery catalog reused across list/search requests.
 */
export interface EditorSessionCatalog {
  getSnapshot(): EditorSessionCatalogSnapshot;
  listSessions(version: string): SessionsResponse;
  invalidate(): void;
}

/**
 * Loader for transcript paths and imported HTML replays.
 */
export interface EditorSessionLoader {
  load(path: string): SessionPayload;
  importHtml(html: string, filename?: string): SessionPayload;
  requireSession(sessionId: string): EditorSession;
}

/**
 * Indexed search service reused across editor transcript queries.
 */
export interface EditorSessionSearch {
  search(
    groups: readonly ReadonlySessionGroup[],
    query: string,
  ): SearchResponse;
}

/**
 * Download response returned by export endpoints.
 */
export interface EditorExportPayload {
  body: string;
  filename: string;
}

/**
 * API request handler used by the bootstrap server.
 */
export interface EditorApiHandler {
  handle(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
  ): Promise<void>;
}

/**
 * Application service backing editor routes.
 */
export interface EditorSessionService {
  getVersion(): string;
  listSessions(): SessionsResponse;
  search(query: string): SearchResponse;
  listThemes(): string[];
  browse(path: string): BrowseDirectoryResponse;
  load(path: string): SessionPayload;
  importHtml(html: string, filename?: string): SessionPayload;
  editTurn(
    sessionId: string,
    turnIndex: number,
    userText: string,
  ): EditResponse;
  exportData(
    sessionId: string,
    options?: Partial<ExportOptions>,
  ): EditorExportPayload;
  preview(sessionId: string, options?: Partial<ExportOptions>): PreviewResponse;
  exportHtml(
    sessionId: string,
    options?: Partial<ExportOptions>,
  ): EditorExportPayload;
  reset(sessionId: string): { turns: EditorTurnSummary[] };
}
