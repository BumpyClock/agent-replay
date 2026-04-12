/**
 * Browser-compatible entry point for claude-replay.
 * Re-exports parser, renderer, themes, and secrets for use in the website.
 * The player template must be injected at build time via PLAYER_TEMPLATE global.
 */

export {
  applyPacedTiming,
  detectFormatFromText,
  parseTranscriptFromText,
} from "./parser.js";
export { redactObject, redactSecrets } from "./secrets.js";
export { getTheme, listThemes, themeToCss } from "./themes.js";

import {
  buildReplayEmbedPayload,
  encodeReplayEmbedPayload,
  injectReplayEmbedPayload,
} from "./replay-embed-payload.js";
import { resolveReplayRenderState } from "./replay-render-state.js";
import { applyReplayTemplateOptions } from "./replay-template.js";
import { serializeBrowserTurns } from "./replay-turn-serialization.js";
import { escapeJsonForScript } from "./script-embed.js";
import type { RenderOptions, Turn } from "./types.js";

/**
 * Render turns into HTML using the player template.
 * Browser-compatible — no filesystem or zlib needed.
 * @param {string} template - The player HTML template string
 * @param {object[]} turns - Parsed turns
 * @param {object} opts - Render options
 * @returns {string} Complete HTML replay
 */
export function renderFromTemplate(
  template: string,
  turns: Turn[],
  opts: RenderOptions = {},
): string {
  const state = resolveReplayRenderState(opts);
  const html = applyReplayTemplateOptions(template, state);
  const payload = buildReplayEmbedPayload({
    turns,
    bookmarks: state.bookmarks,
    serializeTurns: (input) =>
      serializeBrowserTurns(input, {
        redact: state.redact,
        redactRules: state.redactRules,
      }),
  });

  return injectReplayEmbedPayload(
    html,
    encodeReplayEmbedPayload(payload, escapeJsonForScript),
  );
}
