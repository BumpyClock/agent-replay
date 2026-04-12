import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withTsx } from "./run-typescript.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const EDITOR_FIXTURE_DIR = resolve(__dirname, "..", "e2e");
export const EDITOR_FIXTURE_PATH = resolve(EDITOR_FIXTURE_DIR, "fixture.jsonl");

/**
 * Minimal editor server harness for HTTP integration tests.
 */
export interface EditorServerHarness {
  getBaseUrl(): string;
  start(): Promise<void>;
  stop(): void;
  get(pathname: string, init?: RequestInit): Promise<Response>;
  postJson(pathname: string, body: unknown): Promise<Response>;
  load(path?: string): Promise<{ res: Response; data: any }>;
}

export function createEditorServerHarness(): EditorServerHarness {
  let baseUrl = "";
  let child: ChildProcess | undefined;
  let helperPath = "";

  function getBaseUrl(): string {
    if (!baseUrl) {
      throw new Error("Editor server not started");
    }
    return baseUrl;
  }

  async function start(): Promise<void> {
    const port = 10000 + Math.floor(Math.random() * 50000);
    baseUrl = `http://127.0.0.1:${port}`;
    helperPath = join(
      tmpdir(),
      `editor-test-helper-${process.pid}-${Math.random().toString(16).slice(2)}.ts`,
    );

    const srcUrl = pathToFileURL(
      resolve(__dirname, "..", "..", "src", "editor-server.js"),
    ).href;
    writeFileSync(
      helperPath,
      `import { startEditor } from "${srcUrl}";\nstartEditor(${port}, { open: false });\n`,
    );

    child = spawn("node", withTsx([helperPath]), {
      stdio: ["ignore", "pipe", "pipe"],
    });

    await new Promise<void>((resolveStart, rejectStart) => {
      let output = "";
      const timeout = setTimeout(() => {
        rejectStart(new Error("Server did not start in time"));
      }, 20000);
      child?.stdout?.on("data", (data) => {
        output += data.toString();
        if (output.includes("running at")) {
          clearTimeout(timeout);
          resolveStart();
        }
      });
      child?.stderr?.on("data", (data) => {
        output += data.toString();
      });
      child?.on("exit", (code) => {
        clearTimeout(timeout);
        rejectStart(new Error(`Server exited with code ${code}: ${output}`));
      });
    });
  }

  function stop(): void {
    child?.kill();
    child = undefined;
    if (!helperPath) {
      return;
    }
    try {
      unlinkSync(helperPath);
    } catch {}
    helperPath = "";
  }

  function get(pathname: string, init?: RequestInit): Promise<Response> {
    return fetch(`${getBaseUrl()}${pathname}`, init);
  }

  function postJson(pathname: string, body: unknown): Promise<Response> {
    return get(pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function load(path = EDITOR_FIXTURE_PATH): Promise<{
    res: Response;
    data: any;
  }> {
    const res = await postJson("/api/load", { path });
    return { res, data: await res.clone().json() };
  }

  return {
    getBaseUrl,
    start,
    stop,
    get,
    postJson,
    load,
  };
}

export function getAutosavePath(sourcePath: string): string {
  const hash = createHash("sha256")
    .update(sourcePath)
    .digest("hex")
    .slice(0, 16);
  return join(homedir(), ".claude-replay", "autosave", `${hash}.json`);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
