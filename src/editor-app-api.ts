import type {
  BrowseDirectoryResponse,
  EditResponse,
  ExportOptions,
  PreviewResponse,
  SearchResponse,
  SessionPayload,
  SessionsResponse,
} from "./editor-app-types.js";

/**
 * Typed client for editor HTTP endpoints.
 */
export interface EditorApiClient {
  listSessions(): Promise<SessionsResponse>;
  searchSessions(query: string): Promise<SearchResponse>;
  browseDirectory(path: string): Promise<BrowseDirectoryResponse>;
  loadSession(path: string): Promise<SessionPayload>;
  editTurn(
    sessionId: string,
    turnIndex: number,
    userText: string,
  ): Promise<EditResponse>;
  listThemes(): Promise<string[]>;
  renderPreview(
    sessionId: string,
    options: ExportOptions,
  ): Promise<PreviewResponse>;
  resetSession(sessionId: string): Promise<SessionPayload>;
  exportReplay(sessionId: string, options: ExportOptions): Promise<Response>;
  exportReplayData(
    sessionId: string,
    options: ExportOptions,
  ): Promise<Response>;
  importReplayHtml(html: string, filename: string): Promise<SessionPayload>;
}

async function api(
  fetchImpl: typeof fetch,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const options: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const response = await fetchImpl(path, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}) as { error?: string });
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return response;
}

async function apiJson<T>(
  fetchImpl: typeof fetch,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  return (await api(fetchImpl, method, path, body)).json() as Promise<T>;
}

export function createEditorApiClient(
  fetchImpl: typeof fetch = fetch,
): EditorApiClient {
  return {
    listSessions() {
      return apiJson<SessionsResponse>(fetchImpl, "GET", "/api/sessions");
    },
    searchSessions(query) {
      return apiJson<SearchResponse>(fetchImpl, "POST", "/api/search", {
        query,
      });
    },
    browseDirectory(path) {
      return apiJson<BrowseDirectoryResponse>(
        fetchImpl,
        "POST",
        "/api/browse",
        { path },
      );
    },
    loadSession(path) {
      return apiJson<SessionPayload>(fetchImpl, "POST", "/api/load", {
        path,
      });
    },
    editTurn(sessionId, turnIndex, userText) {
      return apiJson<EditResponse>(fetchImpl, "POST", "/api/edit", {
        sessionId,
        turnIndex,
        user_text: userText,
      });
    },
    listThemes() {
      return apiJson<string[]>(fetchImpl, "GET", "/api/themes");
    },
    renderPreview(sessionId, options) {
      return apiJson<PreviewResponse>(fetchImpl, "POST", "/api/preview", {
        sessionId,
        options,
      });
    },
    resetSession(sessionId) {
      return apiJson<SessionPayload>(fetchImpl, "POST", "/api/reset", {
        sessionId,
      });
    },
    exportReplay(sessionId, options) {
      return api(fetchImpl, "POST", "/api/export", {
        sessionId,
        options,
      });
    },
    exportReplayData(sessionId, options) {
      return api(fetchImpl, "POST", "/api/export-data", {
        sessionId,
        options,
      });
    },
    importReplayHtml(html, filename) {
      return apiJson<SessionPayload>(fetchImpl, "POST", "/api/import", {
        html,
        filename,
      });
    },
  };
}
