/**
 * Theme CSS serialization helpers.
 */

import { THEME_VARS } from "./theme-presets.js";

/**
 * Convert a theme dict to a CSS :root block.
 * @param {import("./theme-types.js").ThemeDefinition} theme
 * @returns {string}
 */
export function serializeThemeCss(theme) {
  const lines = [];
  for (const variableName of THEME_VARS) {
    if (variableName in theme) {
      lines.push(`  --${variableName}: ${theme[variableName]};`);
    }
  }
  let css = ":root {\n" + lines.join("\n") + "\n}";
  if (theme.extraCss) {
    css += "\n" + theme.extraCss;
  }
  return css;
}
