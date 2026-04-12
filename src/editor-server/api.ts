import type { IncomingMessage, ServerResponse } from "node:http";
import type { ExportOptions } from "../editor-app-types.js";
import { error, json, readBody } from "../editor-http.js";
import { getErrorMessage, getHttpErrorStatus } from "./http-error.js";
import type { EditorApiHandler, EditorSessionService } from "./types.js";

/**
 * Dependencies required to construct the API route handler.
 */
interface CreateEditorApiHandlerOptions {
  allowedOrigins: ReadonlySet<string>;
  noOriginCheck: boolean;
  sessionService: EditorSessionService;
}

/**
 * Request body for `/api/search`.
 */
interface SearchRequestBody {
  query?: string;
}

/**
 * Request body for `/api/browse` and `/api/load`.
 */
interface PathRequestBody {
  path?: string;
}

/**
 * Request body for `/api/import`.
 */
interface ImportRequestBody {
  html?: string;
  filename?: string;
}

/**
 * Request body for `/api/edit`.
 */
interface EditRequestBody {
  sessionId?: string;
  turnIndex?: number;
  user_text?: string;
}

/**
 * Request body for preview and export endpoints.
 */
interface SessionOptionsRequestBody {
  sessionId?: string;
  options?: Partial<ExportOptions>;
}

/**
 * Request body for `/api/reset`.
 */
interface SessionRequestBody {
  sessionId?: string;
}

function validateOrigin(
  origin: string,
  allowedOrigins: ReadonlySet<string>,
): { ok: true } | { ok: false; message: string } {
  try {
    const hostname = new URL(origin).hostname;
    if (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      allowedOrigins.has(origin)
    ) {
      return { ok: true };
    }
    return { ok: false, message: "Cross-origin requests are not allowed" };
  } catch {
    return { ok: false, message: "Invalid Origin header" };
  }
}

function sendDownload(
  res: ServerResponse,
  body: string,
  filename: string,
  contentType: string,
): void {
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function createEditorApiHandler({
  allowedOrigins,
  noOriginCheck,
  sessionService,
}: CreateEditorApiHandlerOptions): EditorApiHandler {
  return {
    async handle(req: IncomingMessage, res: ServerResponse, pathname: string) {
      if (!noOriginCheck && req.headers.origin) {
        const originCheck = validateOrigin(req.headers.origin, allowedOrigins);
        if ("message" in originCheck) {
          error(res, originCheck.message, 403);
          return;
        }
      }

      try {
        if (pathname === "/api/sessions" && req.method === "GET") {
          json(res, sessionService.listSessions());
          return;
        }

        if (pathname === "/api/themes" && req.method === "GET") {
          json(res, sessionService.listThemes());
          return;
        }

        if (pathname === "/api/search" && req.method === "POST") {
          const body = await readBody<SearchRequestBody>(req);
          json(res, sessionService.search(body.query || ""));
          return;
        }

        if (pathname === "/api/browse" && req.method === "POST") {
          const body = await readBody<PathRequestBody>(req);
          if (!body.path) {
            error(res, "Missing 'path' field");
            return;
          }
          json(res, sessionService.browse(body.path));
          return;
        }

        if (pathname === "/api/load" && req.method === "POST") {
          const body = await readBody<PathRequestBody>(req);
          if (!body.path) {
            error(res, "Missing 'path' field");
            return;
          }
          json(res, sessionService.load(body.path));
          return;
        }

        if (pathname === "/api/import" && req.method === "POST") {
          const body = await readBody<ImportRequestBody>(req);
          if (!body.html) {
            error(res, "Missing 'html' field");
            return;
          }
          json(res, sessionService.importHtml(body.html, body.filename));
          return;
        }

        if (pathname === "/api/edit" && req.method === "POST") {
          const body = await readBody<EditRequestBody>(req);
          json(
            res,
            sessionService.editTurn(
              String(body.sessionId),
              Number(body.turnIndex),
              String(body.user_text),
            ),
          );
          return;
        }

        if (pathname === "/api/export-data" && req.method === "POST") {
          const body = await readBody<SessionOptionsRequestBody>(req);
          const result = sessionService.exportData(
            String(body.sessionId),
            body.options || {},
          );
          sendDownload(
            res,
            result.body,
            result.filename,
            "application/json; charset=utf-8",
          );
          return;
        }

        if (pathname === "/api/preview" && req.method === "POST") {
          const body = await readBody<SessionOptionsRequestBody>(req);
          json(
            res,
            sessionService.preview(String(body.sessionId), body.options || {}),
          );
          return;
        }

        if (pathname === "/api/export" && req.method === "POST") {
          const body = await readBody<SessionOptionsRequestBody>(req);
          const result = sessionService.exportHtml(
            String(body.sessionId),
            body.options || {},
          );
          sendDownload(
            res,
            result.body,
            result.filename,
            "text/html; charset=utf-8",
          );
          return;
        }

        if (pathname === "/api/reset" && req.method === "POST") {
          const body = await readBody<SessionRequestBody>(req);
          json(res, sessionService.reset(String(body.sessionId)));
          return;
        }
      } catch (caught) {
        const errorValue = caught as NodeJS.ErrnoException & {
          statusCode?: number;
        };
        const statusCode = getHttpErrorStatus(errorValue, 0);
        if (statusCode) {
          error(res, getErrorMessage(errorValue, "Request failed"), statusCode);
          return;
        }
        if (pathname === "/api/load") {
          error(
            res,
            `Failed to parse: ${getErrorMessage(errorValue, "Unknown error")}`,
            500,
          );
          return;
        }
        if (errorValue.code === "ENOENT") {
          error(res, "Folder not found", 400);
          return;
        }
        if (errorValue.code === "EACCES") {
          error(res, "Permission denied", 400);
          return;
        }
        error(res, getErrorMessage(errorValue, "Request failed"), 400);
        return;
      }

      error(res, "Not found", 404);
    },
  };
}
