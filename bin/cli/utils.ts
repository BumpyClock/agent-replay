import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";

export function exitWithError(message: string): never {
  console.error(message);
  process.exit(1);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isSessionLookupTarget(arg: string): boolean {
  return !arg.endsWith(".jsonl") && !arg.endsWith(".json");
}

export function openInBrowser(target: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  execFile(cmd, [target], () => {});
}

export function readPackageVersion(): string {
  const pkg = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
  ) as { version: string };
  return pkg.version;
}
