/**
 * Shared TypeScript model types used across parser, renderer, and browser entry points.
 */

/**
 * Standardized tool call attached to a replay block.
 */
export interface ToolCall {
  tool_use_id?: string;
  name: string;
  input: Record<string, unknown>;
  result?: string | null;
  resultTimestamp?: string | null;
  is_error?: boolean;
}

/**
 * Assistant-authored block rendered inside a replay turn.
 */
export interface AssistantBlock {
  kind: string;
  text: string;
  tool_call: ToolCall | null;
  timestamp?: string | null;
}

/**
 * Canonical replay turn produced by every parser.
 */
export interface Turn {
  index: number;
  user_text: string;
  blocks: AssistantBlock[];
  timestamp?: string;
  system_events?: string[];
  bookmark?: string;
}

/**
 * Named bookmark anchored to a turn index.
 */
export interface Bookmark {
  turn: number;
  label: string;
}

/**
 * User-supplied redaction rule applied during rendering.
 */
export interface RedactRule {
  search: string;
  replacement: string;
}

export type Theme = Record<string, string>;

/**
 * Turn filters accepted by replay preparation.
 */
export interface FilterTurnsOptions {
  turnRange?: [number, number];
  excludeTurns?: number[];
  timeFrom?: string;
  timeTo?: string;
}

/**
 * Renderer options consumed by HTML replay generation.
 */
export interface RenderOptions {
  speed?: number;
  showThinking?: boolean;
  showToolCalls?: boolean;
  theme?: Theme;
  userLabel?: string;
  assistantLabel?: string;
  title?: string;
  description?: string;
  ogImage?: string;
  redactSecrets?: boolean;
  redactRules?: RedactRule[];
  bookmarks?: Bookmark[];
  hasRealTimestamps?: boolean;
  minified?: boolean;
  compress?: boolean;
  fontSize?: string;
}

/**
 * Serialized tool call shape embedded in replay HTML.
 */
export interface SerializedToolCall {
  name: string;
  input: Record<string, unknown>;
  result: string | null;
  is_error?: boolean;
  resultTimestamp?: string | null;
}

/**
 * Serialized replay block embedded in replay HTML.
 */
export interface SerializedBlock {
  kind: string;
  text: string;
  timestamp?: string | null;
  tool_call?: SerializedToolCall;
}

/**
 * Serialized replay turn embedded in replay HTML.
 */
export interface SerializedTurn {
  index: number;
  user_text: string;
  blocks: SerializedBlock[];
  timestamp?: string;
  system_events?: string[];
}

/**
 * Session file shown in discovery UIs.
 */
export interface SessionFileEntry {
  file: string;
  path: string;
  date: string | null;
  source?: string;
}

/**
 * Group of sessions belonging to one project/workspace.
 */
export interface SessionProject {
  name: string;
  dirName: string;
  sessions: SessionFileEntry[];
}

/**
 * Session discovery group shown in the editor.
 */
export interface SessionGroup {
  name: string;
  projects: SessionProject[];
}

/**
 * Match returned when resolving a session id to a transcript file.
 */
export interface ResolvedSessionMatch {
  path: string;
  project: string;
  group: string;
}

/**
 * Source provider contract for transcript detection, parsing, discovery, and resolution.
 */
export interface SourceProvider {
  id: string;
  groupName: string;
  assistantLabel: string;
  detectFromText(text: string): boolean;
  parse(text: string): Turn[];
  discoverSessions?(homeDir: string): SessionProject[];
  resolveSessionId?(sessionId: string, homeDir: string): ResolvedSessionMatch[];
}
