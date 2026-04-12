/**
 * Format registry facade backed by source providers.
 *
 * Detection and parsing now delegate to the canonical provider registry so
 * source-specific metadata lives in one place.
 */

import {
  detectSourceFormatFromText,
  parseSourceTranscriptFromText,
} from "../source-providers.js";

export function detectFormatFromText(text: string): string {
  return detectSourceFormatFromText(text);
}

export function parseFromText(text: string) {
  return parseSourceTranscriptFromText(text);
}
