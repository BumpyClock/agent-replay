import type { SourceProvider, Turn } from "../types.js";

export type JsonlFormatModule = {
  name: string;
  detect(firstObj: Record<string, unknown>): boolean;
  parse(text: string): Turn[];
};

export type TextFormatModule = {
  name: string;
  detectFromText(text: string): boolean;
  parse(text: string): Turn[];
};

export function detectJsonlFormat(
  text: string,
  format: JsonlFormatModule,
): boolean {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (format.detect(obj)) {
      return true;
    }
  }
  return false;
}

export function createJsonlProvider(
  format: JsonlFormatModule,
  {
    groupName,
    assistantLabel,
    discoverSessions,
    resolveSessionId,
  }: Pick<SourceProvider, "groupName" | "assistantLabel"> & {
    discoverSessions?: SourceProvider["discoverSessions"];
    resolveSessionId?: SourceProvider["resolveSessionId"];
  },
): SourceProvider {
  return {
    id: format.name,
    groupName,
    assistantLabel,
    detectFromText(text) {
      return detectJsonlFormat(text, format);
    },
    parse(text) {
      return format.parse(text);
    },
    discoverSessions,
    resolveSessionId,
  };
}

export function createTextProvider(
  format: TextFormatModule,
  {
    groupName,
    assistantLabel,
    discoverSessions,
    resolveSessionId,
  }: Pick<SourceProvider, "groupName" | "assistantLabel"> & {
    discoverSessions?: SourceProvider["discoverSessions"];
    resolveSessionId?: SourceProvider["resolveSessionId"];
  },
): SourceProvider {
  return {
    id: format.name,
    groupName,
    assistantLabel,
    detectFromText(text) {
      return format.detectFromText(text);
    },
    parse(text) {
      return format.parse(text);
    },
    discoverSessions,
    resolveSessionId,
  };
}
