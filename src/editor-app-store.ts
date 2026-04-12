import type { AppState, SessionPayload } from "./editor-app-types.js";

export function createAppState(): AppState {
  return {
    currentSessionId: null,
    currentTurns: [],
    excludedTurns: new Set(),
    bookmarks: new Map(),
    previewBlobUrl: null,
    dragging: false,
    hasTextEdits: false,
    lastToggleIndex: null,
    lastClickShift: false,
    contentSearchDebounce: null,
  };
}

export function applySessionPayload(
  state: AppState,
  payload: SessionPayload,
): void {
  state.currentSessionId = payload.sessionId;
  state.currentTurns = payload.turns;
  state.excludedTurns = new Set(payload.excludedTurns || []);
  state.bookmarks = new Map(
    (payload.bookmarks || []).map((bookmark) => [
      bookmark.turn,
      bookmark.label,
    ]),
  );
  state.hasTextEdits = payload.hasEdits || false;
  state.lastToggleIndex = null;
}

export function hasSessionChanges(state: AppState): boolean {
  return (
    state.hasTextEdits ||
    state.excludedTurns.size > 0 ||
    state.bookmarks.size > 0
  );
}
