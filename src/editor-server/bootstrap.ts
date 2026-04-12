import { execFile } from "node:child_process";
import { createServer } from "node:http";
import {
  bundleEditorApp,
  editorDevVersion,
  readBuiltEditorApp,
  readEditorShell,
} from "../editor-assets.js";
import { error, json } from "../editor-http.js";
import type { EditorApiHandler, StartEditorOptions } from "./types.js";

const DEV_RELOAD_SCRIPT = `<script>
(function() {
  var currentVersion = null;
  async function poll() {
    try {
      var response = await fetch('/__editor-dev-version', { cache: 'no-store' });
      var data = await response.json();
      if (currentVersion && currentVersion !== data.version) {
        location.reload();
        return;
      }
      currentVersion = data.version;
    } catch {}
    setTimeout(poll, 1000);
  }
  poll();
})();
</script>`;

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
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
      if (pathname === "/" && req.method === "GET") {
        const editorHtml = devMode
          ? readEditorShell().replace("</body>", `${DEV_RELOAD_SCRIPT}</body>`)
          : readEditorShell();
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": Buffer.byteLength(editorHtml),
          "Cache-Control": devMode ? "no-store" : "public, max-age=0",
        });
        return res.end(editorHtml);
      }

      if (pathname === "/editor-app.js" && req.method === "GET") {
        const editorApp = devMode
          ? await bundleEditorApp()
          : readBuiltEditorApp();
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Content-Length": Buffer.byteLength(editorApp),
          "Cache-Control": devMode ? "no-store" : "public, max-age=0",
        });
        return res.end(editorApp);
      }

      if (pathname === "/__editor-dev-version" && req.method === "GET") {
        if (!devMode) {
          return error(res, "Not found", 404);
        }
        return json(res, { version: editorDevVersion() });
      }

      if (pathname.startsWith("/api/")) {
        return apiHandler.handle(req, res, pathname);
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
      if (devMode) console.log("Editor dev mode enabled with live reload");
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
