/**
 * Local HTTP server for the web-based replay editor.
 */

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import {
  bundleEditorApp,
  editorDevVersion,
  readBuiltEditorApp,
  readEditorShell,
} from "./editor-assets.js";
import {
  deleteAutosave,
  loadAutosave,
  scheduleAutosave,
} from "./editor-autosave.js";
import {
  assertUnderHome,
  browseDirectory,
  discoverSessions,
} from "./editor-discovery.js";
import { error, json, readBody } from "./editor-http.js";
import { extractData } from "./extract.js";
import {
  applyPacedTiming,
  detectFormat,
  filterTurns,
  parseTranscript,
} from "./parser.js";
import { render } from "./renderer.js";
import { getTheme, listThemes } from "./themes.js";

const PKG = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

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

// ---------------------------------------------------------------------------
// In-memory session store
// ---------------------------------------------------------------------------

const sessions = new Map();
let sessionCounter = 0;

/**
 * Create a new session, restoring from autosave if available.
 * @param {object[]} turns - parsed turns from the source file
 * @param {string} sourcePath - path or name identifying the source
 * @param {string} format - "claude" | "cursor" | "codex" | "extracted"
 * @param {object[]} [sourceBookmarks] - bookmarks from the source (e.g. extracted HTML)
 * @returns {{ id: string, session: object, hasEdits: boolean }}
 */
function createSession(turns, sourcePath, format, sourceBookmarks = []) {
  const saved = loadAutosave(sourcePath);
  const id = "s" + ++sessionCounter;
  const session = {
    originalTurns: JSON.parse(JSON.stringify(turns)),
    workingTurns: saved ? saved.workingTurns : turns,
    sourcePath,
    format,
    originalBookmarks: sourceBookmarks,
    excludedTurns: saved ? saved.excludedTurns || [] : [],
    bookmarks: saved ? saved.bookmarks || [] : sourceBookmarks.slice(),
  };
  const hasEdits = saved
    ? JSON.stringify(session.workingTurns) !==
      JSON.stringify(session.originalTurns)
    : false;
  sessions.set(id, session);
  return { id, session, hasEdits };
}

/** Build the standard session response payload. */
function sessionResponse(id, session, hasEdits, extra = {}) {
  return {
    sessionId: id,
    format: session.format,
    hasEdits,
    turns: summarizeTurns(session.workingTurns),
    excludedTurns: session.excludedTurns,
    bookmarks: session.bookmarks,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Server options
// ---------------------------------------------------------------------------

interface StartEditorOptions {
  open?: boolean;
  host?: string;
  initialFile?: string;
  noOriginCheck?: boolean;
  allowedOrigins?: string[];
  devMode?: boolean;
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/** Summarize a turn's blocks into a human-readable string. */
function summarizeBlocks(blocks) {
  const counts = { text: 0, thinking: 0, tool_use: 0 };
  for (const b of blocks) {
    counts[b.kind] = (counts[b.kind] || 0) + 1;
  }
  const parts = [];
  if (counts.text) parts.push(`${counts.text} text`);
  if (counts.thinking) parts.push(`${counts.thinking} thinking`);
  if (counts.tool_use)
    parts.push(`${counts.tool_use} tool call${counts.tool_use > 1 ? "s" : ""}`);
  return parts.join(", ") || "empty";
}

/** Map a block to a lightweight shape for the client. */
function summarizeBlock(b) {
  if (b.kind === "tool_use" && b.tool_call) {
    return {
      kind: b.kind,
      name: b.tool_call.name,
      input: truncate(JSON.stringify(b.tool_call.input), 200),
      result: truncate(b.tool_call.result || "", 500),
    };
  }
  return { kind: b.kind, text: truncate(b.text || "", 1000) };
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/** Map full turns to the lightweight shape sent to the client. */
function summarizeTurns(turns) {
  return turns.map((t) => ({
    index: t.index,
    user_text: t.user_text,
    blockSummary: summarizeBlocks(t.blocks),
    blocks: t.blocks.map(summarizeBlock),
    timestamp: t.timestamp,
    system_events: t.system_events || [],
  }));
}

/** Resolve a theme name, falling back to tokyo-night. */
function getThemeSafe(name) {
  try {
    return getTheme(name);
  } catch {
    return getTheme("tokyo-night");
  }
}

/**
 * Prepare turns for rendering: clone, filter, re-index, apply timing.
 * Returns ready-to-render turns array.
 */
function prepareTurns(session, options) {
  let turns = session.workingTurns;
  if (options.excludeTurns && options.excludeTurns.length > 0) {
    turns = filterTurns(turns, { excludeTurns: options.excludeTurns });
  }
  const cloned = JSON.parse(JSON.stringify(turns));
  // Re-index sequentially so the player's position-based logic matches turn.index
  for (let i = 0; i < cloned.length; i++) {
    cloned[i].index = i + 1;
  }
  const timing = options.timing || "auto";
  const hasTimestamps = cloned.some((t) => t.timestamp);
  const usedPacing =
    timing === "paced" || (timing === "auto" && !hasTimestamps);
  if (usedPacing) {
    applyPacedTiming(cloned);
  }
  return { turns: cloned, hasRealTimestamps: hasTimestamps && !usedPacing };
}

/**
 * Remap bookmark turn indices from original to new sequential indices.
 * Bookmarks pointing to excluded turns are dropped.
 */
function remapBookmarks(bookmarks, originalTurns, excludedSet) {
  if (!bookmarks || bookmarks.length === 0) return [];
  // Build mapping: original index → new sequential index
  const indexMap = new Map();
  let seq = 1;
  for (const t of originalTurns) {
    if (!excludedSet.has(t.index)) {
      indexMap.set(t.index, seq++);
    }
  }
  return bookmarks
    .map((bm) => ({ turn: indexMap.get(bm.turn), label: bm.label }))
    .filter((bm) => bm.turn != null)
    .sort((a, b) => a.turn - b.turn);
}

/** Build render options from client options + session metadata. */
function buildRenderOpts(options, session, overrides = {}) {
  const excludedSet = new Set(options.excludeTurns || []);
  return {
    speed: parseFloat(options.speed) || 1.0,
    showThinking: options.showThinking !== false,
    showToolCalls: options.showToolCalls !== false,
    fontSize: options.fontSize || "normal",
    theme: getThemeSafe(options.theme || "tokyo-night"),
    redactSecrets: options.redactSecrets !== false,
    redactRules: options.redactRules || [],
    userLabel: options.userLabel || "User",
    assistantLabel:
      options.assistantLabel ||
      (session.format === "gemini"
        ? "Gemini"
        : session.format === "codex"
          ? "Codex"
          : session.format === "cursor"
            ? "Assistant"
            : session.format === "opencode"
              ? "OpenCode"
              : "Claude"),
    title: options.title || "Replay",
    description: options.description || "",
    ogImage: options.ogImage || "",
    bookmarks: remapBookmarks(
      options.bookmarks || [],
      session.workingTurns,
      excludedSet,
    ),
    minified: false,
    compress: options.compress !== false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// API route handler
// ---------------------------------------------------------------------------

// Origin check configuration (set by startEditor)
let _noOriginCheck = false;
let _allowedOrigins = new Set();

async function handleApi(req, res, pathname) {
  // CSRF protection: reject cross-origin requests to the API.
  if (!_noOriginCheck) {
    const origin = req.headers.origin;
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        if (
          originHost !== "127.0.0.1" &&
          originHost !== "localhost" &&
          !_allowedOrigins.has(origin)
        ) {
          return error(res, "Cross-origin requests are not allowed", 403);
        }
      } catch {
        return error(res, "Invalid Origin header", 403);
      }
    }
  }

  // GET /api/sessions — list discovered sessions + home directory
  if (pathname === "/api/sessions" && req.method === "GET") {
    return json(res, {
      groups: discoverSessions(),
      homedir: homedir(),
      version: PKG.version,
    });
  }

  // POST /api/search — search session content across all discovered sessions
  if (pathname === "/api/search" && req.method === "POST") {
    const body = await readBody(req);
    const query = (body.query || "").toLowerCase().trim();
    if (!query || query.length < 3) return json(res, { results: [] });

    const groups = discoverSessions();
    const results = [];
    const MAX_RESULTS = 30;

    for (const group of groups) {
      for (const proj of group.projects) {
        for (const sess of proj.sessions) {
          if (results.length >= MAX_RESULTS) break;
          try {
            const text = readFileSync(sess.path, "utf-8");
            const lower = text.toLowerCase();
            const idx = lower.indexOf(query);
            if (idx === -1) continue;
            // Extract snippet around match
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + query.length + 60);
            const snippet =
              (start > 0 ? "..." : "") +
              text.slice(start, end).replace(/\n/g, " ") +
              (end < text.length ? "..." : "");
            results.push({
              group: group.name,
              project: proj.name,
              file: sess.file,
              path: sess.path,
              date: sess.date,
              snippet,
            });
          } catch {
            /* skip unreadable files */
          }
        }
      }
    }
    return json(res, { results });
  }

  // GET /api/themes — list available themes
  if (pathname === "/api/themes" && req.method === "GET") {
    return json(res, listThemes());
  }

  // POST /api/browse — browse a directory for .jsonl files
  if (pathname === "/api/browse" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.path) return error(res, "Missing 'path' field");
    try {
      return json(res, browseDirectory(body.path));
    } catch (e) {
      const msg =
        e.code === "ENOENT"
          ? "Folder not found"
          : e.code === "EACCES"
            ? "Permission denied"
            : e.message;
      return error(res, msg, 400);
    }
  }

  // POST /api/load — parse a JSONL file (or return cached session)
  if (pathname === "/api/load" && req.method === "POST") {
    const body = await readBody(req);
    const filePath = body.path;
    if (!filePath) return error(res, "Missing 'path' field");
    try {
      assertUnderHome(filePath);
      // Reuse existing session for the same file
      for (const [existingId, s] of sessions) {
        if (s.sourcePath === filePath) {
          const hasEdits =
            JSON.stringify(s.workingTurns) !== JSON.stringify(s.originalTurns);
          return json(res, sessionResponse(existingId, s, hasEdits));
        }
      }
      // New session
      let format,
        turns,
        sourceBookmarks = [];
      if (filePath.endsWith(".html")) {
        let data;
        try {
          data = extractData(readFileSync(filePath, "utf-8"));
        } catch {
          return error(res, "Not a valid claude-replay HTML file", 400);
        }
        turns = data.turns;
        sourceBookmarks = data.bookmarks || [];
        format = "extracted";
      } else {
        format = detectFormat(filePath);
        turns = parseTranscript(filePath);
      }
      const { id, session, hasEdits } = createSession(
        turns,
        filePath,
        format,
        sourceBookmarks,
      );
      return json(res, sessionResponse(id, session, hasEdits));
    } catch (e) {
      return error(res, `Failed to parse: ${e.message}`, 500);
    }
  }

  // POST /api/import — import an HTML replay by content (for file upload)
  if (pathname === "/api/import" && req.method === "POST") {
    const body = await readBody(req);
    const { html: htmlContent, filename } = body;
    if (!htmlContent) return error(res, "Missing 'html' field");
    let data;
    try {
      data = extractData(htmlContent);
    } catch {
      return error(res, "Not a valid claude-replay HTML file", 400);
    }
    const sourcePath = filename || "imported.html";
    const { id, session, hasEdits } = createSession(
      data.turns,
      sourcePath,
      "extracted",
      data.bookmarks || [],
    );
    return json(res, sessionResponse(id, session, hasEdits));
  }

  // POST /api/edit — update a turn's user text
  if (pathname === "/api/edit" && req.method === "POST") {
    const body = await readBody(req);
    const { sessionId, turnIndex, user_text } = body;
    const session = sessions.get(sessionId);
    if (!session) return error(res, "Unknown session", 404);
    const turn = session.workingTurns.find((t) => t.index === turnIndex);
    if (!turn) return error(res, `Turn ${turnIndex} not found`, 404);
    turn.user_text = user_text;
    scheduleAutosave(session);
    const hasEdits =
      JSON.stringify(session.workingTurns) !==
      JSON.stringify(session.originalTurns);
    return json(res, { ok: true, hasEdits });
  }

  // POST /api/export-data — export turns and bookmarks as JSON
  if (pathname === "/api/export-data" && req.method === "POST") {
    const body = await readBody(req);
    const { sessionId, options = {} } = body;
    const session = sessions.get(sessionId);
    if (!session) return error(res, "Unknown session", 404);
    const { turns } = prepareTurns(session, options);
    const excludedSet = new Set(options.excludeTurns || []);
    const bookmarksArr = remapBookmarks(
      options.bookmarks || [],
      session.workingTurns,
      excludedSet,
    );
    const data = JSON.stringify({ turns, bookmarks: bookmarksArr }, null, 2);
    const filename =
      (options.title || "replay").replace(/[^a-zA-Z0-9_-]/g, "_") + ".json";
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": Buffer.byteLength(data),
    });
    return res.end(data);
  }

  // POST /api/preview — render HTML for live preview
  if (pathname === "/api/preview" && req.method === "POST") {
    const body = await readBody(req);
    const { sessionId, options = {} } = body;
    const session = sessions.get(sessionId);
    if (!session) return error(res, "Unknown session", 404);
    // Persist client-side state so it survives session switching
    session.excludedTurns = options.excludeTurns || [];
    session.bookmarks = options.bookmarks || [];
    scheduleAutosave(session);
    const { turns, hasRealTimestamps } = prepareTurns(session, options);
    const html = render(
      turns,
      buildRenderOpts(options, session, { hasRealTimestamps }),
    );
    return json(res, { html });
  }

  // POST /api/export — render HTML and serve as download
  if (pathname === "/api/export" && req.method === "POST") {
    const body = await readBody(req);
    const { sessionId, options = {} } = body;
    const session = sessions.get(sessionId);
    if (!session) return error(res, "Unknown session", 404);
    const { turns, hasRealTimestamps } = prepareTurns(session, options);
    const html = render(
      turns,
      buildRenderOpts(options, session, {
        hasRealTimestamps,
        minified: options.minified !== false,
        compress: options.compress !== false,
      }),
    );
    const filename =
      (options.title || "replay").replace(/[^a-zA-Z0-9_-]/g, "_") + ".html";
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": Buffer.byteLength(html),
    });
    return res.end(html);
  }

  // POST /api/reset — restore working turns from original
  if (pathname === "/api/reset" && req.method === "POST") {
    const body = await readBody(req);
    const { sessionId } = body;
    const session = sessions.get(sessionId);
    if (!session) return error(res, "Unknown session", 404);
    session.workingTurns = JSON.parse(JSON.stringify(session.originalTurns));
    session.excludedTurns = [];
    session.bookmarks = [];
    deleteAutosave(session.sourcePath);
    return json(res, { turns: summarizeTurns(session.workingTurns) });
  }

  return error(res, "Not found", 404);
}

// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------

/**
 * Start the editor HTTP server.
 * Returns a promise that never resolves (keeps the caller waiting).
 * @param {number} port
 * @returns {Promise<void>}
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
  // Configure origin checking
  _noOriginCheck = noOriginCheck;
  const envOrigins = process.env.CLAUDE_REPLAY_ALLOWED_ORIGINS;
  _allowedOrigins = new Set([
    ...(allowedOrigins || []),
    ...(envOrigins
      ? envOrigins
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []),
  ]);

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
        return await handleApi(req, res, pathname);
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (e) {
      console.error("Server error:", e);
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
        const cmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        execFile(cmd, [openUrl], () => {});
      }
    });
  });
}
