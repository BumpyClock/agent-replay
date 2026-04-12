import { homedir } from "node:os";
import * as claudeCode from "./formats/claude-code.js";
import * as codex from "./formats/codex.js";
import * as copilot from "./formats/copilot.js";
import * as cursor from "./formats/cursor.js";
import * as gemini from "./formats/gemini.js";
import * as opencode from "./formats/opencode.js";
import * as replay from "./formats/replay.js";
import {
  discoverClaudeSessions,
  resolveClaudeSessionId,
} from "./source-providers/claude.js";
import {
  discoverCodexSessions,
  resolveCodexSessionId,
} from "./source-providers/codex.js";
import {
  discoverCopilotSessions,
  resolveCopilotSessionId,
} from "./source-providers/copilot.js";
import {
  discoverCursorSessions,
  resolveCursorSessionId,
} from "./source-providers/cursor.js";
import {
  discoverGeminiSessions,
  resolveGeminiSessionId,
} from "./source-providers/gemini.js";
import {
  createJsonlProvider,
  createTextProvider,
} from "./source-providers/provider-factory.js";
import { compareSessionEntriesByDate as compareSessionFilesByDate } from "./source-providers/session-fs.js";
import type {
  ResolvedSessionMatch,
  SessionFileEntry,
  SessionGroup,
  SourceProvider,
  Turn,
} from "./types.js";

const sourceProviders: SourceProvider[] = [
  createTextProvider(gemini, {
    groupName: "Gemini",
    assistantLabel: "Gemini",
    discoverSessions: discoverGeminiSessions,
    resolveSessionId: resolveGeminiSessionId,
  }),
  createJsonlProvider(replay, {
    groupName: "Replay JSONL",
    assistantLabel: "Claude",
  }),
  createJsonlProvider(copilot, {
    groupName: "Copilot",
    assistantLabel: "Claude",
    discoverSessions: discoverCopilotSessions,
    resolveSessionId: resolveCopilotSessionId,
  }),
  createJsonlProvider(codex, {
    groupName: "Codex",
    assistantLabel: "Codex",
    discoverSessions: discoverCodexSessions,
    resolveSessionId: resolveCodexSessionId,
  }),
  createJsonlProvider(opencode, {
    groupName: "OpenCode",
    assistantLabel: "OpenCode",
  }),
  createJsonlProvider(claudeCode, {
    groupName: "Claude Code",
    assistantLabel: "Claude",
    discoverSessions: discoverClaudeSessions,
    resolveSessionId: resolveClaudeSessionId,
  }),
  createJsonlProvider(cursor, {
    groupName: "Cursor",
    assistantLabel: "Assistant",
    discoverSessions: discoverCursorSessions,
    resolveSessionId: resolveCursorSessionId,
  }),
];

export function listSourceProviders(): SourceProvider[] {
  return sourceProviders;
}

export function getSourceProvider(id: string): SourceProvider | undefined {
  return sourceProviders.find((provider) => provider.id === id);
}

export function detectSourceProviderFromText(
  text: string,
): SourceProvider | undefined {
  return sourceProviders.find((provider) => provider.detectFromText(text));
}

export function detectSourceFormatFromText(text: string): string {
  return detectSourceProviderFromText(text)?.id ?? "unknown";
}

export function parseSourceTranscriptFromText(text: string): Turn[] {
  return detectSourceProviderFromText(text)?.parse(text) ?? [];
}

export function discoverProviderSessions({
  home = homedir(),
}: {
  home?: string;
} = {}): SessionGroup[] {
  const projectMap = new Map<string, SessionFileEntry[]>();

  for (const provider of sourceProviders) {
    if (!provider.discoverSessions) continue;

    for (const project of provider.discoverSessions(home)) {
      const existing = projectMap.get(project.name) ?? [];
      existing.push(...project.sessions);
      projectMap.set(project.name, existing);
    }
  }

  return [...projectMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, sessions]) => ({
      name,
      projects: [
        {
          name,
          dirName: name,
          sessions: [...sessions].sort(compareSessionFilesByDate),
        },
      ],
    }));
}

export function resolveProviderSessionId(
  sessionId: string,
  { home = homedir() }: { home?: string } = {},
): ResolvedSessionMatch[] {
  return sourceProviders.flatMap((provider) =>
    provider.resolveSessionId ? provider.resolveSessionId(sessionId, home) : [],
  );
}

export function resolveAssistantLabel(format: string): string {
  return getSourceProvider(format)?.assistantLabel ?? "Claude";
}
