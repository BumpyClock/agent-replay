import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import {
  readBuiltEditorApp,
  readBuiltEditorCss,
  readEditorShell,
} from "../editor-assets.js";
import { error } from "../editor-http.js";
import type { EditorApiHandler, StartEditorOptions } from "./types.js";

/**
 * Options required by the HTTP bootstrap wrapper.
 */
interface StartEditorServerOptions
  extends Required<Pick<StartEditorOptions, "devMode" | "host" | "open">> {
  apiHandler: EditorApiHandler;
  initialFile?: string;
}

export function startEditorServer(
  port: number,
  { apiHandler, devMode, host, initialFile, open }: StartEditorServerOptions,
): Promise<void> {
  return createEditorServer();

  async function createEditorServer(): Promise<void> {
    const viteServer = devMode ? await createViteServer() : null;

    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const pathname = url.pathname;

      try {
        if (pathname.startsWith("/api/")) {
          return apiHandler.handle(req, res, pathname);
        }

        if (viteServer) {
          return viteServer.middlewares(req, res, () => {
            error(res, "Not found", 404);
          });
        }

        if (pathname === "/" && req.method === "GET") {
          const editorHtml = readEditorShell();
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Length": Buffer.byteLength(editorHtml),
            "Cache-Control": "public, max-age=0",
          });
          return res.end(editorHtml);
        }

        if (pathname === "/editor-app.js" && req.method === "GET") {
          const editorApp = readBuiltEditorApp();
          res.writeHead(200, {
            "Content-Type": "application/javascript; charset=utf-8",
            "Content-Length": Buffer.byteLength(editorApp),
            "Cache-Control": "public, max-age=0",
          });
          return res.end(editorApp);
        }

        if (pathname === "/editor-app.css" && req.method === "GET") {
          const editorCss = readBuiltEditorCss();
          res.writeHead(200, {
            "Content-Type": "text/css; charset=utf-8",
            "Content-Length": Buffer.byteLength(editorCss),
            "Cache-Control": "public, max-age=0",
          });
          return res.end(editorCss);
        }

        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      } catch (err) {
        console.error("Server error:", err);
        if (!res.headersSent) {
          error(res, "Internal server error", 500);
        }
      }
    });

    return new Promise((_resolve) => {
      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.error(
            `Error: port ${port} is already in use. Stop the other process or use --port to pick a different port.`,
          );
        } else {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      });
      server.listen(port, host, () => {
        const baseUrl = `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
        const openUrl = initialFile
          ? `${baseUrl}?load=${encodeURIComponent(initialFile)}`
          : baseUrl;
        console.log(`claude-replay editor running at ${baseUrl}`);
        if (devMode) {
          console.log("Editor dev mode enabled with Vite middleware");
        }
        if (initialFile) console.log(`Auto-loading: ${initialFile}`);
        console.log("Press Ctrl+C to stop.\n");
        if (open) {
          const command =
            process.platform === "darwin"
              ? "open"
              : process.platform === "win32"
                ? "start"
                : "xdg-open";
          execFile(command, [openUrl], () => {});
        }
      });
    });
  }

  async function createViteServer() {
    const { createServer: createViteDevServer } = await import("vite");
    return createViteDevServer({
      configFile: fileURLToPath(
        new URL("../../vite.editor.config.ts", import.meta.url),
      ),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
  }
}
