import {
  extractReplayFileData,
  type ReplayFileData,
} from "./replay-file-data.js";
import type { Bookmark, SerializedTurn, Turn } from "./types.js";

/**
 * Replay payload before JSON encoding and script embedding.
 */
export interface ReplayEmbedPayload {
  bookmarks: Bookmark[];
  files: ReplayFileData[];
  turns: SerializedTurn[];
}

/**
 * Inputs needed to build replay embed payload from canonical turns.
 */
export interface ReplayEmbedPayloadOptions {
  turns: Turn[];
  bookmarks?: Bookmark[];
  serializeTurns(turns: Turn[]): SerializedTurn[];
}

/**
 * Encoded replay payload strings ready for placeholder replacement.
 */
export interface ReplayEmbeddedPayload {
  bookmarks: string;
  files: string;
  turns: string;
}

/** Build replay payload data shared by browser and renderer paths. */
export function buildReplayEmbedPayload({
  turns,
  bookmarks = [],
  serializeTurns,
}: ReplayEmbedPayloadOptions): ReplayEmbedPayload {
  const serializedTurns = serializeTurns(turns);
  return {
    bookmarks,
    files: extractReplayFileData(serializedTurns),
    turns: serializedTurns,
  };
}

/** Encode replay payload JSON strings using caller-specific embed strategy. */
export function encodeReplayEmbedPayload(
  payload: ReplayEmbedPayload,
  encodeJson: (json: string) => string,
): ReplayEmbeddedPayload {
  return {
    bookmarks: encodeJson(JSON.stringify(payload.bookmarks)),
    files: encodeJson(JSON.stringify(payload.files)),
    turns: encodeJson(JSON.stringify(payload.turns)),
  };
}

/** Inject replay payload strings into player template placeholders. */
export function injectReplayEmbedPayload(
  template: string,
  payload: ReplayEmbeddedPayload,
): string {
  return template.replace(
    /\/\*(BOOKMARKS_DATA|FILES_DATA|TURNS_DATA)\*\//g,
    (_match, token: string) => {
      if (token === "BOOKMARKS_DATA") {
        return payload.bookmarks;
      }
      if (token === "FILES_DATA") {
        return payload.files;
      }
      return payload.turns;
    },
  );
}
