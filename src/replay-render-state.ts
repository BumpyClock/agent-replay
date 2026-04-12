import { getTheme } from "./themes.js";
import type { Bookmark, RedactRule, RenderOptions, Theme } from "./types.js";

/**
 * Normalized replay render settings shared by browser and static renderer paths.
 */
export interface ReplayRenderState {
  speed: number;
  showThinking: boolean;
  showToolCalls: boolean;
  theme: Theme;
  userLabel: string;
  assistantLabel: string;
  title: string;
  description: string;
  ogImage: string;
  redact: boolean;
  redactRules?: RedactRule[];
  bookmarks: Bookmark[];
  hasRealTimestamps: boolean;
  fontSize: string;
  minified: boolean;
  compress: boolean;
}

/** Normalize shared replay render options into concrete values. */
export function resolveReplayRenderState(
  opts: RenderOptions = {},
): ReplayRenderState {
  const speed = Number.isFinite(opts.speed)
    ? Math.max(0.1, Math.min(opts.speed, 10))
    : 1.0;

  return {
    speed,
    showThinking: opts.showThinking ?? true,
    showToolCalls: opts.showToolCalls ?? true,
    theme: opts.theme ?? getTheme("tokyo-night"),
    userLabel: opts.userLabel ?? "User",
    assistantLabel: opts.assistantLabel ?? "Claude",
    title: opts.title ?? "Claude Code Replay",
    description: opts.description ?? "Interactive AI session replay",
    ogImage: opts.ogImage ?? "https://es617.github.io/claude-replay/og.png",
    redact: opts.redactSecrets ?? true,
    redactRules: opts.redactRules,
    bookmarks: opts.bookmarks ?? [],
    hasRealTimestamps: opts.hasRealTimestamps ?? false,
    fontSize: opts.fontSize ?? "normal",
    minified: opts.minified !== false,
    compress: opts.compress !== false,
  };
}
