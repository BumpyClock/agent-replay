/**
 * Shared TypeScript model types used across parser, renderer, and browser entry points.
 */

export interface ToolCall {
  tool_use_id?: string;
  name: string;
  input: Record<string, unknown>;
  result?: string | null;
  resultTimestamp?: string | null;
  is_error?: boolean;
}

export interface AssistantBlock {
  kind: string;
  text: string;
  tool_call: ToolCall | null;
  timestamp?: string | null;
}

export interface Turn {
  index: number;
  user_text: string;
  blocks: AssistantBlock[];
  timestamp?: string;
  system_events?: string[];
  bookmark?: string;
}

export interface Bookmark {
  turn: number;
  label: string;
}

export interface RedactRule {
  search: string;
  replacement: string;
}

export type Theme = Record<string, string>;

export interface FilterTurnsOptions {
  turnRange?: [number, number];
  excludeTurns?: number[];
  timeFrom?: string;
  timeTo?: string;
}

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

export interface SerializedToolCall {
  name: string;
  input: Record<string, any>;
  result: string | null;
  is_error?: boolean;
  resultTimestamp?: string | null;
}

export interface SerializedBlock {
  kind: string;
  text: string;
  timestamp?: string | null;
  tool_call?: SerializedToolCall;
}

export interface SerializedTurn {
  index: number;
  user_text: string;
  blocks: SerializedBlock[];
  timestamp?: string;
  system_events?: string[];
}
