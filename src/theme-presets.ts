/**
 * Built-in theme preset catalog.
 */

export const THEME_VARS = [
  "bg",
  "bg-surface",
  "bg-hover",
  "text",
  "text-dim",
  "text-bright",
  "accent",
  "accent-dim",
  "green",
  "blue",
  "orange",
  "red",
  "cyan",
  "border",
  "tool-bg",
  "thinking-bg",
];

/** @type {Record<string, import("./theme-types.js").ThemeDefinition>} */
export const BUILTIN_THEMES = {
  "tokyo-night": {
    bg: "#1a1b26",
    "bg-surface": "#24253a",
    "bg-hover": "#2f3147",
    text: "#c0caf5",
    "text-dim": "#565f89",
    "text-bright": "#e0e6ff",
    accent: "#bb9af7",
    "accent-dim": "#7957a8",
    green: "#9ece6a",
    blue: "#7aa2f7",
    orange: "#ff9e64",
    red: "#f7768e",
    cyan: "#7dcfff",
    border: "#3b3d57",
    "tool-bg": "#1e1f33",
    "thinking-bg": "#1c1d2e",
  },
  monokai: {
    bg: "#272822",
    "bg-surface": "#2d2e27",
    "bg-hover": "#3e3d32",
    text: "#f8f8f2",
    "text-dim": "#75715e",
    "text-bright": "#ffffff",
    accent: "#ae81ff",
    "accent-dim": "#7c5cbf",
    green: "#a6e22e",
    blue: "#66d9ef",
    orange: "#fd971f",
    red: "#f92672",
    cyan: "#66d9ef",
    border: "#49483e",
    "tool-bg": "#1e1f1c",
    "thinking-bg": "#1c1d1a",
  },
  "solarized-dark": {
    bg: "#002b36",
    "bg-surface": "#073642",
    "bg-hover": "#0a4050",
    text: "#839496",
    "text-dim": "#586e75",
    "text-bright": "#fdf6e3",
    accent: "#6c71c4",
    "accent-dim": "#4e5299",
    green: "#859900",
    blue: "#268bd2",
    orange: "#cb4b16",
    red: "#dc322f",
    cyan: "#2aa198",
    border: "#094959",
    "tool-bg": "#012934",
    "thinking-bg": "#012730",
  },
  "github-light": {
    bg: "#ffffff",
    "bg-surface": "#f6f8fa",
    "bg-hover": "#eaeef2",
    text: "#1f2328",
    "text-dim": "#656d76",
    "text-bright": "#000000",
    accent: "#8250df",
    "accent-dim": "#6639ba",
    green: "#1a7f37",
    blue: "#0969da",
    orange: "#bc4c00",
    red: "#cf222e",
    cyan: "#0598bc",
    border: "#d0d7de",
    "tool-bg": "#f6f8fa",
    "thinking-bg": "#f0f3f6",
  },
  dracula: {
    bg: "#282a36",
    "bg-surface": "#2d2f3d",
    "bg-hover": "#383a4a",
    text: "#f8f8f2",
    "text-dim": "#6272a4",
    "text-bright": "#ffffff",
    accent: "#bd93f9",
    "accent-dim": "#9571d1",
    green: "#50fa7b",
    blue: "#8be9fd",
    orange: "#ffb86c",
    red: "#ff5555",
    cyan: "#8be9fd",
    border: "#44475a",
    "tool-bg": "#21222c",
    "thinking-bg": "#1e1f29",
  },
  bubbles: {
    bg: "#f0f2f5",
    "bg-surface": "#ffffff",
    "bg-hover": "#e4e6eb",
    text: "#1c1e21",
    "text-dim": "#65676b",
    "text-bright": "#000000",
    accent: "#0084ff",
    "accent-dim": "#0066cc",
    green: "#31a24c",
    blue: "#0084ff",
    orange: "#f5a623",
    red: "#e4405f",
    cyan: "#0097a7",
    border: "#dddfe2",
    "tool-bg": "#e4e6eb",
    "thinking-bg": "#e8daef",
    extraCss: `
      .turn { margin-bottom: 16px; }
      .user-msg {
        display: flex; align-items: flex-end; justify-content: flex-end; gap: 8px; margin-bottom: 12px;
      }
      .user-msg::after {
        content: "\\1F464"; font-size: 24px; flex-shrink: 0; line-height: 1;
      }
      .user-prompt { display: none; }
      .user-text {
        background: #0084ff; color: #fff; border-radius: 18px 18px 4px 18px;
        padding: 10px 16px; max-width: 75%; display: inline-block; font-weight: normal;
      }
      .turn-header-ts { color: #fff8; }
      .turn > :not(.user-msg):not(.block-wrapper) { padding-left: 40px; }
      .block-wrapper { padding-left: 40px; position: relative; }
      .block-wrapper::before {
        content: "\\1F916"; position: absolute; left: 4px; top: 4px; font-size: 20px; line-height: 1;
      }
      .block-wrapper + .block-wrapper::before { content: none; }
      .assistant-text {
        background: #fff; border-radius: 18px 18px 18px 4px;
        padding: 10px 16px; max-width: 85%; display: inline-block; color: #1c1e21;
        border: 1px solid #dddfe2;
      }
      .thinking-block {
        background: #f3ebfa; border-radius: 18px 18px 18px 4px;
        padding: 10px 16px; max-width: 85%; border: 1px solid #d6c8e4;
      }
      .thinking-header { color: #6b3fa0; }
      .thinking-body { color: #3d2066; }
      .tool-block, .tool-group {
        background: #fff; border-radius: 12px;
        padding: 8px 12px; max-width: 85%; border: 1px solid #dddfe2;
      }
      .tool-header { color: #1c1e21; }
      .tool-name { color: #0066cc; }
      .bookmark-divider { color: #1c1e21; border-color: #dddfe2; }
    `,
  },
  workstreams: {
    bg: "#ede9e2",
    "bg-surface": "rgba(250,249,246,0.72)",
    "bg-hover": "rgba(255,255,255,0.84)",
    text: "#191919",
    "text-dim": "#787774",
    "text-bright": "#111111",
    accent: "#2383e2",
    "accent-dim": "rgba(35,131,226,0.18)",
    green: "#25a244",
    blue: "#2383e2",
    orange: "#e07328",
    red: "#d92d20",
    cyan: "#0f9ca8",
    border: "rgba(0,0,0,0.07)",
    "tool-bg": "rgba(255,245,235,0.9)",
    "thinking-bg": "rgba(245,239,255,0.88)",
    extraCss: `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, "Inter", sans-serif;
        background:
          radial-gradient(circle at 12% 14%, rgba(255,128,45,0.24), transparent 34%),
          radial-gradient(circle at 88% 8%, rgba(170,75,225,0.18), transparent 28%),
          radial-gradient(circle at 52% 108%, rgba(255,185,55,0.18), transparent 32%),
          linear-gradient(180deg, #f2ede6 0%, #e8e1d6 100%);
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
        opacity: 0.05;
        mix-blend-mode: overlay;
        z-index: -1;
      }
      .container {
        max-width: 1040px;
        padding: 0 18px 24px;
        position: relative;
      }
      .transcript {
        padding: 28vh 0 40vh;
      }
      .controls {
        bottom: 16px;
        width: calc(100% - 32px);
        max-width: 980px;
        background: rgba(250,249,246,0.72);
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 24px;
        box-shadow: 0 24px 60px rgba(94,70,32,0.18);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        overflow: hidden;
      }
      .controls-row {
        gap: 8px;
        padding: 10px 12px;
      }
      .controls button,
      .font-size-cycle {
        background: rgba(255,255,255,0.62);
        border-color: rgba(0,0,0,0.07);
        border-radius: 999px;
        color: #2e2c28;
      }
      .controls button:hover,
      .font-size-cycle:hover {
        background: rgba(255,255,255,0.92);
        border-color: rgba(0,0,0,0.12);
      }
      .controls button:active {
        transform: scale(0.93);
        transition: transform 80ms ease;
      }
      .controls button.active {
        background: rgba(35,131,226,0.14);
        color: #165ba1;
      }
      .progress-bar {
        background: rgba(0,0,0,0.08);
        border-radius: 999px;
      }
      .progress-fill {
        border-radius: 999px;
      }
      .turn {
        margin-bottom: 18px;
        opacity: 0.5;
        transform: translateY(4px);
      }
      .turn.visible {
        opacity: 0.78;
        transform: translateY(0);
      }
      .turn.visible.active {
        opacity: 1;
        transform: translateY(0);
      }
      .turn-header,
      .assistant-text,
      .user-text,
      .tool-block,
      .tool-group,
      .thinking-block,
      .bookmark-divider,
      .speed-popover,
      .filter-popover,
      .more-popover,
      .chapter-popover {
        background: rgba(250,249,246,0.62);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 18px;
        box-shadow: 0 18px 40px rgba(94,70,32,0.08);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
      }
      .turn-header {
        padding: 12px 14px;
        transition: background 150ms ease, transform 80ms ease;
      }
      .turn-header:hover {
        background: rgba(255,255,255,0.72);
      }
      .turn-header:active {
        transform: scale(0.995);
      }
      .turn-body {
        padding: 10px 4px 2px;
      }
      .user-msg {
        margin-bottom: 10px;
      }
      .user-prompt,
      .thinking-header,
      .tool-header,
      .tool-group-header,
      .bookmark-divider-label {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, "Inter", sans-serif;
        letter-spacing: 0.04em;
      }
      .user-prompt {
        color: #9d5818;
        font-size: 10px;
        text-transform: uppercase;
      }
      .user-text,
      .assistant-text {
        color: #191919;
        display: block;
        padding: 14px 16px;
      }
      .assistant-text pre,
      .user-text pre,
      .thinking-body pre {
        background: rgba(255,255,255,0.8);
        border-radius: 14px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .tool-block,
      .tool-group,
      .thinking-block {
        padding: 12px 14px;
      }
      .bookmark-divider {
        padding: 10px 14px;
      }
      .bar-title,
      .progress-text,
      .paced-toggle,
      .filter-popover label,
      .more-popover label,
      .font-size-row,
      .chapter-item {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, "Inter", sans-serif;
      }
      @media (max-width: 640px) {
        .controls {
          width: calc(100% - 20px);
          bottom: 10px;
        }
        .transcript {
          padding-top: 24vh;
        }
      }
    `,
  },
};

/**
 * Get sorted built-in theme names.
 * @returns {string[]}
 */
export function listBuiltinThemeNames() {
  return Object.keys(BUILTIN_THEMES).sort();
}

/**
 * Get built-in theme preset by name.
 * @param {string} name
 * @returns {import("./theme-types.js").ThemeDefinition}
 */
export function getBuiltinTheme(name) {
  if (!(name in BUILTIN_THEMES)) {
    const available = listBuiltinThemeNames().join(", ");
    throw new Error(`Unknown theme '${name}'. Available: ${available}`);
  }
  return BUILTIN_THEMES[name];
}
