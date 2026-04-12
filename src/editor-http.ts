/**
 * Pure HTTP helpers for the editor server.
 * Depends only on Node built-ins.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

export const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB

export type RequestBody = Record<string, unknown>;

/**
 * Read and JSON-parse the request body.
 * Rejects if the body exceeds MAX_BODY_SIZE or is not valid JSON.
 */
export function readBody<T = RequestBody>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    req.on("data", (c: Buffer) => {
      if (settled) return;
      size += c.length;
      if (size > MAX_BODY_SIZE) {
        settled = true;
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(c);
    });

    req.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()) as T);
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

/** Write a JSON response. */
export function json(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

/** Write a JSON error response. */
export function error(
  res: ServerResponse,
  message: string,
  status = 400,
): void {
  json(res, { error: message }, status);
}
