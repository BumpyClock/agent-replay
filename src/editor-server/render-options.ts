import type { ExportOptions } from "../editor-app-types.js";
import { prepareReplayData } from "../replay-prepare.js";
import { getTheme } from "../themes.js";
import type { Bookmark, RenderOptions, Theme, Turn } from "../types.js";
import type { EditorSession } from "./types.js";

export function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function isBookmark(value: unknown): value is Bookmark {
  return (
    typeof value === "object" &&
    value !== null &&
    "turn" in value &&
    typeof value.turn === "number" &&
    "label" in value &&
    typeof value.label === "string"
  );
}

export function coerceBookmarks(value: unknown): Bookmark[] {
  return Array.isArray(value) ? value.filter(isBookmark) : [];
}

export function coerceNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number")
    : [];
}

export function coerceTurns(value: unknown): Turn[] | null {
  return Array.isArray(value) ? (value as Turn[]) : null;
}

function getThemeSafe(name: string): Theme {
  try {
    return getTheme(name);
  } catch {
    return getTheme("tokyo-night");
  }
}

export function createDownloadFilename(
  title: unknown,
  extension: "html" | "json",
): string {
  return `${coerceString(title, "replay").replace(/[^a-zA-Z0-9_-]/g, "_")}.${extension}`;
}

export function buildSessionRenderContext(
  session: EditorSession,
  options: Partial<ExportOptions> = {},
  overrides: Partial<RenderOptions> = {},
) {
  const prepared = prepareReplayData(session.workingTurns, {
    assistantLabelOverride: coerceString(options.assistantLabel),
    bookmarks: coerceBookmarks(options.bookmarks),
    excludeTurns: coerceNumberArray(options.excludeTurns),
    format: session.format,
    timing: coerceString(options.timing, "auto") as "auto" | "real" | "paced",
  });

  return {
    prepared,
    renderOptions: {
      speed: coerceNumber(options.speed, 1),
      showThinking: coerceBoolean(options.showThinking, true),
      showToolCalls: coerceBoolean(options.showToolCalls, true),
      fontSize: coerceString(options.fontSize, "normal"),
      theme: getThemeSafe(coerceString(options.theme, "tokyo-night")),
      redactSecrets: coerceBoolean(options.redactSecrets, true),
      redactRules: Array.isArray(options.redactRules)
        ? options.redactRules
        : [],
      userLabel: coerceString(options.userLabel, "User"),
      assistantLabel: prepared.assistantLabel,
      title: coerceString(options.title, "Replay"),
      description: coerceString(options.description),
      ogImage: coerceString(options.ogImage),
      bookmarks: prepared.bookmarks,
      hasRealTimestamps: prepared.hasRealTimestamps,
      minified: coerceBoolean(options.minified, false),
      compress: coerceBoolean(options.compress, true),
      ...overrides,
    } satisfies RenderOptions,
  };
}
