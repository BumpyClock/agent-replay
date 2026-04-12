/**
 * Serialized bookmark entry exchanged with editor APIs.
 */
export interface Bookmark {
  turn: number;
  label: string;
}

/**
 * Session file discovered for sidebar session tree.
 */
export interface SessionFileEntry {
  path: string;
  file: string;
  date?: string;
  source?: string;
  summary?: string;
}

/**
 * Project grouping shown within session source group.
 */
export interface SessionProject {
  name: string;
  dirName: string;
  sessions: SessionFileEntry[];
}

/**
 * Top-level sidebar grouping for discovered sessions.
 */
export interface SessionGroup {
  name: string;
  projects: SessionProject[];
}

/**
 * Response payload for available editor sessions.
 */
export interface SessionsResponse {
  groups: SessionGroup[];
  homedir?: string;
  version?: string;
}

/**
 * Sidebar content-search hit returned from editor server.
 */
export interface SearchResult {
  group: string;
  project: string;
  file: string;
  path: string;
  date?: string;
  snippet: string;
  source?: string;
}

/**
 * Response payload for content-search requests.
 */
export interface SearchResponse {
  results: SearchResult[];
}

/**
 * Directory entry returned from manual filesystem browse.
 */
export interface BrowseDirectoryEntry {
  path: string;
  name: string;
  date?: string;
}

/**
 * Response payload for directory browse requests.
 */
export interface BrowseDirectoryResponse {
  path: string;
  parent?: string;
  dirs: BrowseDirectoryEntry[];
  files: BrowseDirectoryEntry[];
}

/**
 * Tool-use block summary shown inside turn details.
 */
export interface ToolUseSummaryBlock {
  kind: "tool_use";
  name: string;
  input: string;
  result: string;
}

/**
 * Text-like block summary shown inside turn details.
 */
export interface TextSummaryBlock {
  kind: string;
  text: string;
}

/**
 * Union of block summaries rendered in turn details.
 */
export type EditorBlockSummary = ToolUseSummaryBlock | TextSummaryBlock;

/**
 * Client-facing turn summary for editor list rendering.
 */
export interface EditorTurnSummary {
  index: number;
  user_text: string;
  blockSummary: string;
  blocks: EditorBlockSummary[];
  timestamp?: string | null;
  system_events: unknown[];
}

/**
 * Session payload loaded into browser editor state.
 */
export interface SessionPayload {
  sessionId: string;
  format: string;
  hasEdits: boolean;
  turns: EditorTurnSummary[];
  excludedTurns: number[];
  bookmarks: Bookmark[];
}

/**
 * Result payload for turn text edits.
 */
export interface EditResponse {
  ok: boolean;
  hasEdits: boolean;
}

/**
 * Result payload for HTML preview requests.
 */
export interface PreviewResponse {
  html: string;
}

/**
 * Export and preview options collected from editor controls.
 */
export interface ExportOptions {
  theme: string;
  speed: number;
  showThinking: boolean;
  showToolCalls: boolean;
  fontSize: string;
  redactSecrets: boolean;
  redactRules: RedactRule[];
  userLabel: string;
  assistantLabel: string;
  title: string;
  description: string;
  ogImage: string;
  timing: string;
  minified: boolean;
  compress: boolean;
  excludeTurns: number[];
  bookmarks: Bookmark[];
}

/**
 * Text replacement rule for client-side redaction options.
 */
export interface RedactRule {
  search: string;
  replacement: string;
}
