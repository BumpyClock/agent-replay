import { fileURLToPath } from "node:url";

export function resolveFileUrlPath(relativePath, baseUrl) {
  return fileURLToPath(new URL(relativePath, baseUrl));
}
