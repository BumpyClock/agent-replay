/**
 * Render parsed turns into a self-contained HTML replay file.
 */

import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import {
  buildReplayEmbedPayload,
  encodeReplayEmbedPayload,
  injectReplayEmbedPayload,
} from "./replay-embed-payload.js";
import { resolveReplayRenderState } from "./replay-render-state.js";
import { applyReplayTemplateOptions } from "./replay-template.js";
import { serializeRendererTurns } from "./replay-turn-serialization.js";
import { escapeJsonForScript } from "./script-embed.js";
import type { RenderOptions, Turn } from "./types.js";

const TEMPLATE_PATH = new URL("../template/player.html", import.meta.url);
const TEMPLATE_MIN_PATH = new URL(
  "../template/player.min.html",
  import.meta.url,
);

/** Compress a JSON string to base64-encoded deflate for embedding. */
function compressForEmbed(json: string): string {
  return deflateSync(Buffer.from(json)).toString("base64");
}

/**
 * Render turns into a self-contained HTML string.
 * @param {import('./parser.js').Turn[]} turns
 * @param {{ speed?: number, showThinking?: boolean, showToolCalls?: boolean, theme?: Record<string,string>, userLabel?: string, assistantLabel?: string, title?: string, redactSecrets?: boolean }} opts
 * @returns {string}
 */
export function render(turns: Turn[], opts: RenderOptions = {}): string {
  const state = resolveReplayRenderState(opts);

  let html;
  if (!state.minified) {
    html = readFileSync(TEMPLATE_PATH, "utf-8");
  } else {
    try {
      html = readFileSync(TEMPLATE_MIN_PATH, "utf-8");
    } catch {
      html = readFileSync(TEMPLATE_PATH, "utf-8");
    }
  }

  // Replace all template placeholders BEFORE injecting TURNS/BOOKMARKS JSON,
  // because the JSON data can contain arbitrary text (including placeholder strings
  // from session transcripts) which would collide with .replace().
  html = applyReplayTemplateOptions(html, state);

  // Data blobs last — they may contain text matching any of the above placeholders.
  // BOOKMARKS before TURNS, because TURNS data may contain the literal placeholder
  // string in user messages (e.g. from pasted plans).
  const payload = buildReplayEmbedPayload({
    turns,
    bookmarks: state.bookmarks,
    serializeTurns: (input) =>
      serializeRendererTurns(input, {
        redact: state.redact,
        redactRules: state.redactRules,
      }),
  });

  return injectReplayEmbedPayload(
    html,
    encodeReplayEmbedPayload(payload, (json) =>
      state.compress ? compressForEmbed(json) : escapeJsonForScript(json),
    ),
  );
}
