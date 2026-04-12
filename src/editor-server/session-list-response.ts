import type { SessionsResponse } from "../editor-app-types.js";
import { cloneSessionGroups } from "./session-group-tree.js";
import type { ReadonlySessionGroup } from "./types.js";

interface CreateSessionsResponseOptions {
  groups: readonly ReadonlySessionGroup[];
  homedir: string;
  appVersion: string;
}

export function createSessionsResponse({
  groups,
  homedir,
  appVersion,
}: CreateSessionsResponseOptions): SessionsResponse {
  return {
    groups: cloneSessionGroups(groups),
    homedir,
    version: appVersion,
  };
}
