import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolveSessionId } from "../../src/resolve-session.js";
import { MAX_INPUTS, SESSION_SEARCH_LOCATIONS } from "./constants.js";
import { exitWithError, isSessionLookupTarget } from "./utils.js";

function printMatch(match: {
  group: string;
  project: string;
  path: string;
}): void {
  console.error(`Found: ${match.group} / ${match.project} → ${match.path}`);
}

function exitForMultipleMatches(
  sessionId: string,
  matches: ReturnType<typeof resolveSessionId>,
): never {
  console.error(`Multiple sessions match "${sessionId}":`);
  for (let i = 0; i < matches.length; i++) {
    console.error(
      `  ${i + 1}) ${matches[i].group} / ${matches[i].project} — ${matches[i].path}`,
    );
  }
  process.exit(1);
}

export function resolveEditorInitialFile(
  editorArg?: string,
): string | undefined {
  if (!editorArg) {
    return undefined;
  }
  if (existsSync(editorArg)) {
    return resolve(editorArg);
  }
  if (!isSessionLookupTarget(editorArg)) {
    exitWithError(`Error: file not found: ${editorArg}`);
  }
  const matches = resolveSessionId(editorArg);
  if (matches.length === 1) {
    printMatch(matches[0]);
    return matches[0].path;
  }
  if (matches.length > 1) {
    exitForMultipleMatches(editorArg, matches);
  }
  console.error(
    `Warning: no session found matching "${editorArg}", opening editor without auto-load`,
  );
  return undefined;
}

export function resolveInputFiles(positionals: string[]): string[] {
  if (positionals.length > MAX_INPUTS) {
    exitWithError(`Error: too many input files (max ${MAX_INPUTS})`);
  }

  const inputFiles: string[] = [];
  for (const arg of positionals) {
    if (existsSync(arg)) {
      inputFiles.push(arg);
      continue;
    }
    if (!isSessionLookupTarget(arg)) {
      exitWithError(`Error: file not found: ${arg}`);
    }

    const matches = resolveSessionId(arg);
    if (matches.length === 0) {
      console.error(`Error: no session found matching "${arg}"`);
      console.error(`Searched ${SESSION_SEARCH_LOCATIONS}`);
      process.exit(1);
    }
    if (matches.length === 1) {
      printMatch(matches[0]);
      inputFiles.push(matches[0].path);
      continue;
    }
    exitForMultipleMatches(arg, matches);
  }

  return inputFiles;
}
