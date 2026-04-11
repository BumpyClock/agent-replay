/**
 * HTTP serve and file-watch modes for the replay CLI.
 *
 * Extracted from bin/claude-replay.ts so that the entry point only handles
 * argument parsing and option wiring. All server lifecycle, rebuild, debounce,
 * and browser-open logic lives here.
 */

import { execFile } from "node:child_process";
import { watch as fsWatch, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { type BuildReplayOptions, buildReplay } from "./build-replay.js";

/** Options for {@link serveReplay}. */
export interface ServeOptions {
  /** Port to listen on. */
  port: number;
  /** When true, watch input files and rebuild on change. */
  watch?: boolean;
  /** When true, open the URL in the default browser after startup. */
  open?: boolean;
}

/** Options for {@link watchAndWrite}. */
export interface WatchOptions {
  /** Output file path to write (and rewrite on change). */
  outputFile: string;
}

/**
 * Start an HTTP server that serves the replay and optionally watches input
 * files for changes, injecting a live-reload script so open browser tabs
 * refresh automatically.
 */
export function serveReplay(
  inputFiles: string[],
  buildOpts: BuildReplayOptions,
  opts: ServeOptions,
): void {
  const { port, watch = false, open = false } = opts;

  let currentHtml = "";
  let currentTurnCount = 0;
  let buildVersion = 0;

  function rebuild() {
    try {
      const { html, turnCount } = buildReplay(inputFiles, buildOpts);
      currentHtml = html;
      currentTurnCount = turnCount;
      buildVersion++;
      console.error(
        `[${new Date().toLocaleTimeString()}] Built replay (${turnCount} turns, v${buildVersion})`,
      );
    } catch (e) {
      console.error(
        `[${new Date().toLocaleTimeString()}] Build error: ${(e as Error).message}`,
      );
    }
  }

  // Injected into every served page so the browser polls for version bumps.
  const reloadScript = `<script>
(function() {
  var v = /*BUILD_VERSION*/;
  setInterval(function() {
    fetch("/__reload").then(function(r) { return r.json(); }).then(function(d) {
      if (d.version > v) {
        v = d.version;
        var turns = document.querySelectorAll(".turn");
        var totalOld = turns.length;
        var pos = 0;
        for (var i = turns.length - 1; i >= 0; i--) {
          if (turns[i].classList.contains("visible")) { pos = i + 1; break; }
        }
        var atEnd = pos >= totalOld && totalOld > 0;
        var target = atEnd ? d.turns : pos;
        location.hash = "turn=" + target + (atEnd ? "r" : "");
        location.reload();
      }
    }).catch(function() {});
  }, 1000);
})();
</script>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname === "/__reload") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ version: buildVersion, turns: currentTurnCount }),
      );
    }
    const antiFlash =
      '<script>if(location.hash)document.write("<style>#splash{display:none!important}</style>")<' +
      "/script>";
    const html = currentHtml
      .replace("</head>", antiFlash + "</head>")
      .replace(
        "</body>",
        reloadScript.replace("/*BUILD_VERSION*/", String(buildVersion)) +
          "</body>",
      );
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });

  rebuild();

  if (watch) {
    let debounce: ReturnType<typeof setTimeout>;
    for (const file of inputFiles) {
      fsWatch(file, () => {
        clearTimeout(debounce);
        debounce = setTimeout(rebuild, 300);
      });
    }
    console.error(`Watching ${inputFiles.length} file(s) for changes...`);
  }

  server.listen(port, () => {
    const url = `http://127.0.0.1:${port}`;
    console.error(`Serving replay at ${url}`);
    if (open) {
      openInBrowser(url);
    }
  });
}

/**
 * Build the replay once immediately, write to `outputFile`, then watch input
 * files and rewrite on each change.
 *
 * Requires `--serve` to be absent — when both flags are present the HTTP
 * server in {@link serveReplay} handles watching instead.
 */
export function watchAndWrite(
  inputFiles: string[],
  buildOpts: BuildReplayOptions,
  opts: WatchOptions,
): void {
  const { outputFile } = opts;

  function rebuild() {
    try {
      const { html, turnCount } = buildReplay(inputFiles, buildOpts);
      writeFileSync(outputFile, html);
      console.error(
        `[${new Date().toLocaleTimeString()}] Wrote ${outputFile} (${turnCount} turns)`,
      );
    } catch (e) {
      console.error(
        `[${new Date().toLocaleTimeString()}] Build error: ${(e as Error).message}`,
      );
    }
  }

  rebuild();

  let debounce: ReturnType<typeof setTimeout>;
  for (const file of inputFiles) {
    fsWatch(file, () => {
      clearTimeout(debounce);
      debounce = setTimeout(rebuild, 300);
    });
  }
  console.error(`Watching ${inputFiles.length} file(s) for changes...`);
}

/** Open `target` in the platform default browser. */
function openInBrowser(target: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  execFile(cmd, [target], () => {});
}
