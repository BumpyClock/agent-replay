import { existsSync, readFileSync } from "node:fs";
import type { BuildReplayOptions } from "../../src/build-replay.js";
import { getTheme, loadThemeFile } from "../../src/themes.js";
import type { Bookmark, RedactRule } from "../../src/types.js";
import type { CliValues } from "./context.js";
import { exitWithError, getErrorMessage } from "./utils.js";

function resolveTheme(values: CliValues) {
  if (values["theme-file"]) {
    if (!existsSync(values["theme-file"])) {
      exitWithError(`Error: theme file not found: ${values["theme-file"]}`);
    }
    try {
      return loadThemeFile(values["theme-file"]);
    } catch (error) {
      exitWithError(`Error loading theme file: ${getErrorMessage(error)}`);
    }
  }

  try {
    return getTheme(values.theme);
  } catch (error) {
    exitWithError(`Error: ${getErrorMessage(error)}`);
  }
}

function parseTurnRange(turns?: string): [number, number] | undefined {
  if (!turns) {
    return undefined;
  }
  const parts = turns.split("-");
  if (parts.length !== 2) {
    exitWithError(`Error: invalid turn range '${turns}' (expected N-M)`);
  }
  const start = Number.parseInt(parts[0], 10);
  const end = Number.parseInt(parts[1], 10);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    exitWithError(`Error: invalid turn range '${turns}' (expected integers)`);
  }
  return [start, end];
}

function parseExcludeTurns(raw?: string): number[] | undefined {
  if (!raw) {
    return undefined;
  }
  return raw.split(",").map((value) => {
    const turn = Number.parseInt(value.trim(), 10);
    if (Number.isNaN(turn)) {
      exitWithError(
        `Error: invalid turn number '${value.trim()}' in --exclude-turns`,
      );
    }
    return turn;
  });
}

function parseTiming(raw?: string): "auto" | "real" | "paced" {
  const timing = raw || "auto";
  if (timing !== "auto" && timing !== "real" && timing !== "paced") {
    exitWithError(
      `Error: unknown --timing mode "${timing}". Use auto, real, or paced.`,
    );
  }
  return timing;
}

function deriveTitle(inputFiles: string[], explicitTitle?: string): string {
  if (explicitTitle) {
    return explicitTitle;
  }

  const path = inputFiles[0];
  const parts = path.replace(/\\/g, "/").split("/");
  const parent = parts.at(-2) ?? "";
  const filename = parts.at(-1) ?? "replay.jsonl";
  const projectParts = parent.replace(/^-+/, "").split("-");
  const projectName =
    projectParts.length > 1
      ? projectParts.slice(-2).join("-")
      : projectParts[0];
  if (projectName && projectName !== "." && projectName !== "/") {
    return `Replay — ${projectName}`;
  }
  return `Replay — ${filename.replace(/\.jsonl$/, "")}`;
}

function parseBookmarks(values: CliValues): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  if (values.mark) {
    for (const mark of values.mark) {
      const separator = mark.indexOf(":");
      if (separator === -1) {
        exitWithError(
          `Error: invalid --mark format '${mark}' (expected N:Label)`,
        );
      }
      const turn = Number.parseInt(mark.slice(0, separator), 10);
      if (Number.isNaN(turn)) {
        exitWithError(`Error: invalid turn number in --mark '${mark}'`);
      }
      bookmarks.push({ turn, label: mark.slice(separator + 1) });
    }
  }

  if (!values.bookmarks) {
    return bookmarks;
  }

  if (!existsSync(values.bookmarks)) {
    exitWithError(`Error: bookmarks file not found: ${values.bookmarks}`);
  }

  try {
    const data = JSON.parse(readFileSync(values.bookmarks, "utf-8"));
    if (!Array.isArray(data)) {
      exitWithError("Error: bookmarks file must contain a JSON array");
    }
    for (const item of data) {
      if (typeof item.turn !== "number" || typeof item.label !== "string") {
        exitWithError(
          "Error: each bookmark must have numeric 'turn' and string 'label'",
        );
      }
      bookmarks.push({ turn: item.turn, label: item.label });
    }
  } catch (error) {
    exitWithError(
      `Error: failed to parse bookmarks file: ${getErrorMessage(error)}`,
    );
  }

  return bookmarks;
}

function parseRedactRules(raw?: string[]): RedactRule[] | undefined {
  if (!raw) {
    return undefined;
  }
  return raw.map((rule) => {
    const separator = rule.indexOf("=");
    if (separator === -1) {
      return { search: rule, replacement: "[REDACTED]" };
    }
    return {
      search: rule.slice(0, separator),
      replacement: rule.slice(separator + 1),
    };
  });
}

export function createBuildOptions(
  values: CliValues,
  inputFiles: string[],
): BuildReplayOptions {
  return {
    turnRange: parseTurnRange(values.turns),
    excludeTurns: parseExcludeTurns(values["exclude-turns"]),
    timeFrom: values.from,
    timeTo: values.to,
    timing: parseTiming(values.timing),
    speed: Number.parseFloat(values.speed) || 1,
    theme: resolveTheme(values),
    fontSize: values["font-size"] || "normal",
    title: deriveTitle(inputFiles, values.title),
    userLabel: values["user-label"],
    assistantLabelOverride: values["assistant-label"] || undefined,
    description: values.description,
    ogImage: values["og-image"],
    redactSecrets: !values["no-auto-redact"],
    redactRules: parseRedactRules(values.redact),
    showThinking: !values["no-thinking"],
    showToolCalls: !values["no-tool-calls"],
    cliBookmarks: parseBookmarks(values),
    minified: !values["no-minify"],
    compress: !values["no-compress"],
  };
}
