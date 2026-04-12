/**
 * Local HTTP server for the web-based replay editor.
 */

import { readFileSync } from "node:fs";
import { createEditorApiHandler } from "./editor-server/api.js";
import { startEditorServer } from "./editor-server/bootstrap.js";
import { createEditorSessionService } from "./editor-server/session-service.js";
import { createEditorSessionStore } from "./editor-server/session-store.js";
import type { StartEditorOptions } from "./editor-server/types.js";

const PKG = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
) as { version: string };

/**
 * Start the editor HTTP server.
 * Returns a promise that never resolves.
 */
export function startEditor(
  port: number,
  {
    open = true,
    host = "127.0.0.1",
    initialFile,
    noOriginCheck = false,
    allowedOrigins,
    devMode = false,
  }: StartEditorOptions = {},
): Promise<void> {
  const envOrigins = process.env.CLAUDE_REPLAY_ALLOWED_ORIGINS;
  const resolvedAllowedOrigins = new Set([
    ...(allowedOrigins || []),
    ...(envOrigins
      ? envOrigins
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : []),
  ]);

  const sessionStore = createEditorSessionStore();
  const sessionService = createEditorSessionService({
    sessionStore,
    version: PKG.version,
  });
  const apiHandler = createEditorApiHandler({
    allowedOrigins: resolvedAllowedOrigins,
    noOriginCheck,
    sessionService,
  });

  return startEditorServer(port, {
    apiHandler,
    devMode,
    host,
    initialFile,
    open,
  });
}
