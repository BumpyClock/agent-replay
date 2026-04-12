import type { ExportOptions } from "../../src/editor-app-types.js";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  theme: "",
  speed: 1,
  showThinking: true,
  showToolCalls: true,
  fontSize: "normal",
  redactSecrets: true,
  redactRules: [],
  userLabel: "User",
  assistantLabel: "",
  title: "Replay",
  description: "",
  ogImage: "",
  timing: "auto",
  minified: true,
  compress: true,
  excludeTurns: [],
  bookmarks: [],
};
