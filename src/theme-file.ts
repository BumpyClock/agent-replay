/**
 * Theme file loading helpers.
 */

import { readFileSync } from "node:fs";
import { getBuiltinTheme } from "./theme-presets.js";

/**
 * Load a custom theme from a JSON file.
 * Missing keys are filled from tokyo-night defaults.
 * @param {string} filePath
 * @returns {import("./theme-types.js").ThemeDefinition}
 */
export function loadThemeFromFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  /** @type {Record<string, string>} */
  const custom = JSON.parse(raw);
  if (typeof custom !== "object" || custom === null || Array.isArray(custom)) {
    throw new Error(`Theme file must be a JSON object`);
  }
  return { ...getBuiltinTheme("tokyo-night"), ...custom };
}
