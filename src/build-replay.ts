/**
 * Core replay-building pipeline.
 *
 * Parses one or more input files, applies filtering and timing, merges
 * bookmarks, and renders to HTML. Extracted from bin/claude-replay.ts so that
 * CLI, serve, and watch modes can share the same logic without closure capture.
 */

import {
  applyPacedTiming,
  detectFormat,
  filterTurns,
  parseTranscript,
} from "./parser.js";
import { render } from "./renderer.js";
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

  // Parse and concatenate all input files.
  let format = detectFormat(inputFiles[0]);
  const allTurns = [];

  for (const file of inputFiles) {
    const fileTurns = parseTranscript(file);
    if (inputFiles.length > 1) {
      const f = detectFormat(file);
      if (f === "cursor") format = "cursor";
    }
    allTurns.push(...fileTurns);
  }

  // When multiple files are given: sort chronologically if all turns have
  // timestamps, then re-index sequentially.
  if (inputFiles.length > 1) {
    const allHaveTimestamps =
      allTurns.length > 0 && allTurns.every((t) => t.timestamp);
    if (allHaveTimestamps) {
      allTurns.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    }
    for (let i = 0; i < allTurns.length; i++) {
      allTurns[i].index = i + 1;
    }
    console.error(
      `Merged ${inputFiles.length} sessions (${allTurns.length} turns total)`,
    );
  }

  const turns = filterTurns(allTurns, {
    turnRange,
    excludeTurns,
    timeFrom,
    timeTo,
  });

  // Re-index filtered turns and build a map for remapping bookmark indices.
  const indexMap = new Map<number, number>();
  for (let i = 0; i < turns.length; i++) {
    indexMap.set(turns[i].index, i + 1);
    turns[i].index = i + 1;
  }

  if (turns.length === 0) {
    console.error("Warning: no turns found after filtering.");
  }

  // Apply paced timing when real timestamps are absent or explicitly requested.
  const hasTimestamps = turns.some((t) => t.timestamp);
  const usedPacing =
    timing === "paced" || (timing === "auto" && !hasTimestamps);
  if (usedPacing) {
    applyPacedTiming(turns);
  }
  const hasRealTimestamps = hasTimestamps && !usedPacing;

  // Merge CLI bookmarks (remapped through filtering) and inline turn bookmarks.
  const bookmarks: Bookmark[] = cliBookmarks
    .map((bm) => ({ turn: indexMap.get(bm.turn), label: bm.label }))
    .filter((bm): bm is Bookmark => bm.turn != null);

  for (const t of turns) {
    if (t.bookmark) {
      bookmarks.push({ turn: t.index, label: t.bookmark });
      delete t.bookmark;
    }
  }
  bookmarks.sort((a, b) => a.turn - b.turn);

  // Auto-detect the assistant label when no explicit override is given.
  const assistantLabel =
    assistantLabelOverride ??
    (format === "gemini"
      ? "Gemini"
      : format === "codex"
        ? "Codex"
        : format === "cursor"
          ? "Assistant"
          : format === "opencode"
            ? "OpenCode"
            : "Claude");

  const html = render(turns, {
    speed,
    showThinking,
    showToolCalls,
    fontSize,
    theme,
    redactSecrets,
    redactRules,
    userLabel,
    assistantLabel,
    title,
    description,
    ogImage,
    bookmarks,
    hasRealTimestamps,
    minified,
    compress,
  });

  return { html, turnCount: turns.length };
}
