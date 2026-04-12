/**
 * Resolve a session ID to transcript file paths by scanning known provider locations.
 */

import { resolveProviderSessionId } from "./source-providers.js";

/**
 * Find session files matching the given ID.
 */
export function resolveSessionId(
  sessionId: string,
  { home }: { home?: string } = {},
) {
  return resolveProviderSessionId(sessionId, { home });
}
