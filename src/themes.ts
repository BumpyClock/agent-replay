/**
 * Built-in theme API.
 */

import { serializeThemeCss } from "./theme-css.js";
import { loadThemeFromFile } from "./theme-file.js";
import { getBuiltinTheme, listBuiltinThemeNames } from "./theme-presets.js";

/**
 * Get a built-in theme by name.
 * @param {string} name
 * @returns {import("./theme-types.js").ThemeDefinition}
 */
export function getTheme(name) {
  return getBuiltinTheme(name);
}

/**
 * Load a custom theme from a JSON file.
 * Missing keys are filled from tokyo-night defaults.
 * @param {string} filePath
 * @returns {import("./theme-types.js").ThemeDefinition}
 */
export function loadThemeFile(filePath) {
  return loadThemeFromFile(filePath);
}

/**
 * Convert a theme dict to a CSS :root block.
 * @param {import("./theme-types.js").ThemeDefinition} theme
 * @returns {string}
 */
export function themeToCss(theme) {
  return serializeThemeCss(theme);
}

/**
 * Return sorted list of built-in theme names.
 * @returns {string[]}
 */
export function listThemes() {
  return listBuiltinThemeNames();
}
