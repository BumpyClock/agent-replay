/**
 * Core replay-building pipeline.
 *
 * Parses one or more input files, applies filtering and timing, merges
 * bookmarks, and renders to HTML. Extracted from bin/claude-replay.ts so that
 * CLI, serve, and watch modes can share the same logic without closure capture.
 */

import { render } from "./renderer.js";
import { parseReplayInputs } from "./replay-inputs.js";
import { prepareReplayData } from "./replay-projector.js";
import type { Bookmark, RedactRule, Theme } from "./types.js";

export interface BuildReplayOptions {
  /** Turn range filter [start, end] (inclusive). */
  turnRange?: [number, number];
  /** Turn indices to exclude. */
  excludeTurns?: number[];
  /** ISO 8601 timestamp — only include turns at or after this time. */
  timeFrom?: string;
  /** ISO 8601 timestamp — only include turns at or before this time. */
  timeTo?: string;
  /** Timestamp mode: "auto" applies pacing when real timestamps are absent. */
  timing: "auto" | "real" | "paced";
  /** Initial playback speed multiplier. */
  speed: number;
  /** Resolved theme object. */
  theme: Theme;
  /** Font size: "small" | "normal" | "large". */
  fontSize: string;
  /** Page title embedded in the HTML. */
  title: string;
  /** Label for user messages. */
  userLabel?: string;
  /**
   * Explicit assistant label. When omitted, auto-detected from the transcript
   * format (Claude, Gemini, Codex, etc.).
   */
  assistantLabelOverride?: string;
  /** Meta description for link previews. */
  description?: string;
  /** OG image URL for link previews. */
  ogImage?: string;
  /** Whether to auto-redact secrets. */
  redactSecrets: boolean;
  /** Custom redact rules. */
  redactRules?: RedactRule[];
  /** Whether to show thinking blocks by default. */
  showThinking: boolean;
  /** Whether to show tool call blocks by default. */
  showToolCalls: boolean;
  /** Bookmarks parsed from --mark / --bookmarks flags. */
  cliBookmarks: Bookmark[];
  /** Whether to use the minified template. */
  minified: boolean;
  /** Whether to deflate-compress the embedded JSON data. */
  compress: boolean;
}

export interface BuildReplayResult {
  /** Rendered HTML string. */
  html: string;
  /** Number of turns after filtering. */
  turnCount: number;
}

/**
 * Parse `inputFiles`, apply all filtering / timing / bookmark logic, and
 * render the result to an HTML string.
 *
 * This function is pure with respect to the file system: it reads the input
 * files but does not write any output. Side effects are limited to
 * `console.error` progress messages, matching the original CLI behaviour.
 */
export function buildReplay(
  inputFiles: string[],
  opts: BuildReplayOptions,
): BuildReplayResult {
  const {
    turnRange,
    excludeTurns,
    timeFrom,
    timeTo,
    timing,
    speed,
    theme,
    fontSize,
    title,
    userLabel,
    assistantLabelOverride,
    description,
    ogImage,
    redactSecrets,
    redactRules,
    showThinking,
    showToolCalls,
    cliBookmarks,
    minified,
    compress,
  } = opts;

  const { turns: allTurns, format } = parseReplayInputs(inputFiles);

  if (inputFiles.length > 1) {
    console.error(
      `Merged ${inputFiles.length} sessions (${allTurns.length} turns total)`,
    );
  }

  const prepared = prepareReplayData(allTurns, {
    turnRange,
    excludeTurns,
    timeFrom,
    timeTo,
    timing,
    bookmarks: cliBookmarks,
    format,
    assistantLabelOverride,
    consumeInlineTurnBookmarks: true,
  });
  const turns = prepared.turns;

  if (turns.length === 0) {
    console.error("Warning: no turns found after filtering.");
  }

  const html = render(turns, {
    speed,
    showThinking,
    showToolCalls,
    fontSize,
    theme,
    redactSecrets,
    redactRules,
    userLabel,
    assistantLabel: prepared.assistantLabel,
    title,
    description,
    ogImage,
    bookmarks: prepared.bookmarks,
    hasRealTimestamps: prepared.hasRealTimestamps,
    minified,
    compress,
  });

  return { html, turnCount: turns.length };
}
