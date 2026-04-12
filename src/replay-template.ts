import { themeToCss } from "./themes.js";
import type { Theme } from "./types.js";

/**
 * Common replay template placeholders shared by browser and static renderer paths.
 */
export interface ReplayTemplateOptions {
  speed: number;
  showThinking: boolean;
  showToolCalls: boolean;
  theme: Theme;
  userLabel: string;
  assistantLabel: string;
  title: string;
  description: string;
  ogImage: string;
  hasRealTimestamps: boolean;
  fontSize: string;
}

const FONT_SIZE_MAP: Record<string, string> = {
  small: "11px",
  normal: "13px",
  large: "15px",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Apply shared replay template placeholders before payload data injection. */
export function applyReplayTemplateOptions(
  template: string,
  options: ReplayTemplateOptions,
): string {
  let html = template;
  html = html.replace("/*THEME_CSS*/", themeToCss(options.theme));
  html = html.replace(
    "/*THEME_BG*/",
    escapeHtml(options.theme.bg || "#1a1b26"),
  );
  html = html.replace("/*INITIAL_SPEED*/1", String(options.speed));
  html = html.replace(/\/\*INITIAL_SPEED\*\//g, String(options.speed));
  html = html.replaceAll(
    "/*CHECKED_THINKING*/",
    options.showThinking ? "checked" : "",
  );
  html = html.replaceAll(
    "/*CHECKED_TOOLS*/",
    options.showToolCalls ? "checked" : "",
  );
  html = html.replaceAll("/*PAGE_TITLE*/", escapeHtml(options.title));
  html = html.replaceAll(
    "/*PAGE_DESCRIPTION*/",
    escapeHtml(options.description),
  );
  html = html.replaceAll("/*OG_IMAGE*/", escapeHtml(options.ogImage));
  html = html.replace("/*USER_LABEL*/", escapeHtml(options.userLabel));
  html = html.replace(
    "/*ASSISTANT_LABEL*/",
    escapeHtml(options.assistantLabel),
  );
  html = html.replace(
    "/*HAS_REAL_TIMESTAMPS*/false",
    String(options.hasRealTimestamps),
  );
  html = html.replace(
    "/*FONT_SIZE*/13px",
    FONT_SIZE_MAP[options.fontSize] || "13px",
  );
  html = html.replace(
    '/*FONT_SIZE_NAME*/"normal"',
    JSON.stringify(options.fontSize),
  );
  return html;
}
