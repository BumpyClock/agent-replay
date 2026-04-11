export interface Bookmark {
  turn: number;
  label: string;
}

export interface SessionFileEntry {
  path: string;
  file: string;
  date?: string;
  source?: string;
}

export interface SessionProject {
  name: string;
  dirName: string;
  sessions: SessionFileEntry[];
}

export interface SessionGroup {
  name: string;
  projects: SessionProject[];
}

export interface SessionsResponse {
  groups: SessionGroup[];
  homedir?: string;
  version?: string;
}

export interface SearchResult {
  group: string;
  project: string;
  file: string;
  path: string;
  date?: string;
  snippet: string;
  source?: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface BrowseDirectoryEntry {
  path: string;
  name: string;
  date?: string;
}

export interface BrowseDirectoryResponse {
  path: string;
  parent?: string;
  dirs: BrowseDirectoryEntry[];
  files: BrowseDirectoryEntry[];
}

export interface ToolUseSummaryBlock {
  kind: "tool_use";
  name: string;
  input: string;
  result: string;
}

export interface TextSummaryBlock {
  kind: string;
  text: string;
}

export type EditorBlockSummary = ToolUseSummaryBlock | TextSummaryBlock;

export interface EditorTurnSummary {
  index: number;
  user_text: string;
  blockSummary: string;
  blocks: EditorBlockSummary[];
  timestamp?: string | null;
  system_events: unknown[];
}

export interface SessionPayload {
  sessionId: string;
  format: string;
  hasEdits: boolean;
  turns: EditorTurnSummary[];
  excludedTurns: number[];
  bookmarks: Bookmark[];
}

export interface EditResponse {
  ok: boolean;
  hasEdits: boolean;
}

export interface PreviewResponse {
  html: string;
}

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

export interface RedactRule {
  search: string;
  replacement: string;
}
