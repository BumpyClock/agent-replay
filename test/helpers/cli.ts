import { execFile, spawn } from "node:child_process";
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { withTsx } from "./run-typescript.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CLI = resolve(__dirname, "..", "..", "bin", "claude-replay.ts");
export const FIXTURE = resolve(__dirname, "..", "e2e", "fixture.jsonl");

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runCli(args: string[], timeout = 20000) {
  return new Promise<RunResult>((resolvePromise, reject) => {
    const timer = setTimeout(
      () => reject(new Error("CLI timed out - may have launched server")),
      timeout,
    );
    execFile(
      process.execPath,
      withTsx([CLI, ...args]),
      (err, stdout, stderr) => {
        clearTimeout(timer);
        resolvePromise({ code: Number(err?.code ?? 0), stdout, stderr });
      },
    );
  });
}

export function startCli(args: string[]) {
  return spawn(process.execPath, withTsx([CLI, ...args]), {
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export async function waitForServerReady(child: ReturnType<typeof startCli>) {
  await new Promise<void>((resolvePromise, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Server did not start")),
      8000,
    );
    const handleOutput = (data: Buffer | string) => {
      if (data.toString().includes("Serving replay")) {
        clearTimeout(timeout);
        resolvePromise();
      }
    };
    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error("Server exited before startup"));
    });
  });
}

export async function waitForWatcherReady(child: ReturnType<typeof startCli>) {
  await new Promise<void>((resolvePromise, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Watch did not start")),
      8000,
    );
    const handleOutput = (data: Buffer | string) => {
      if (data.toString().includes("Watching")) {
        clearTimeout(timeout);
        resolvePromise();
      }
    };
    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error("Watcher exited before startup"));
    });
  });
}

export function makeTempFile(name: string) {
  return resolve(__dirname, "..", `${name}-${process.pid}.jsonl`);
}

export function makeTempHtml(name: string) {
  return resolve(__dirname, "..", `${name}-${process.pid}.html`);
}

export function copyFixture(path: string) {
  copyFileSync(FIXTURE, path);
}

export function appendText(path: string, text: string) {
  writeFileSync(path, `${readFileSync(path, "utf-8")}${text}`);
}

export function safeUnlink(path: string) {
  try {
    unlinkSync(path);
  } catch {}
}
