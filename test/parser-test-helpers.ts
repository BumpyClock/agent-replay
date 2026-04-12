import { resolveFileUrlPath } from "./helpers/file-url-path.js";

export const CLAUDE_FIXTURE = resolveFileUrlPath(
  "./fixture.jsonl",
  import.meta.url,
);
export const CURSOR_FIXTURE = resolveFileUrlPath(
  "./fixture-cursor.jsonl",
  import.meta.url,
);
export const CODEX_FIXTURE = resolveFileUrlPath(
  "./fixture-codex.jsonl",
  import.meta.url,
);
export const PACED_FIXTURE = resolveFileUrlPath(
  "./fixture-paced.jsonl",
  import.meta.url,
);
export const SYSTEM_TAGS_FIXTURE = resolveFileUrlPath(
  "./fixture-system-tags.jsonl",
  import.meta.url,
);
export const CODEX_PATCH_FIXTURE = resolveFileUrlPath(
  "./fixture-codex-patch.jsonl",
  import.meta.url,
);
export const CODEX_EDGES_FIXTURE = resolveFileUrlPath(
  "./fixture-codex-edges.jsonl",
  import.meta.url,
);
export const GEMINI_FIXTURE = resolveFileUrlPath(
  "./fixture-gemini.json",
  import.meta.url,
);
export const OPENCODE_FIXTURE = resolveFileUrlPath(
  "./fixture-opencode.jsonl",
  import.meta.url,
);
export const COPILOT_FIXTURE = resolveFileUrlPath(
  "./fixture-copilot.jsonl",
  import.meta.url,
);

export const CONTRACT_FIXTURES = [
  { name: "claude-code", path: CLAUDE_FIXTURE },
  { name: "cursor", path: CURSOR_FIXTURE },
  { name: "codex", path: CODEX_FIXTURE },
  { name: "gemini", path: GEMINI_FIXTURE },
  { name: "opencode", path: OPENCODE_FIXTURE },
  { name: "copilot", path: COPILOT_FIXTURE },
];
