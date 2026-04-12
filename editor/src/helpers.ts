import type {
  Bookmark,
  EditorTurnSummary,
  RedactRule,
  SessionGroup,
} from "../../src/editor-app-types.js";

export function titleFromPath(path: string): string {
  const filename =
    path
      .split(/[/\\]/)
      .pop()
      ?.replace(/\.(jsonl|json|html)$/i, "") || "replay";
  return `Replay - ${filename}`;
}

export function bookmarksToMap(bookmarks: Bookmark[]): Map<number, string> {
  return new Map(bookmarks.map((bookmark) => [bookmark.turn, bookmark.label]));
}

export function mapToBookmarks(bookmarks: Map<number, string>): Bookmark[] {
  return Array.from(bookmarks.entries()).map(([turn, label]) => ({
    turn,
    label,
  }));
}

export function filterSessionGroups(
  groups: SessionGroup[],
  query: string,
): SessionGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return groups;
  }

  const filteredGroups: SessionGroup[] = [];
  for (const group of groups) {
    const filteredProjects = [];
    for (const project of group.projects) {
      const projectName = project.name.toLowerCase();
      const sessions = project.sessions.filter((session) => {
        const sessionName = session.file.toLowerCase();
        return (
          sessionName.includes(normalizedQuery) ||
          projectName.includes(normalizedQuery)
        );
      });

      if (sessions.length > 0) {
        filteredProjects.push({
          ...project,
          sessions,
        });
      }
    }

    if (filteredProjects.length > 0) {
      filteredGroups.push({
        ...group,
        projects: filteredProjects,
      });
    }
  }

  return filteredGroups;
}

export function countRows(text: string): number {
  return Math.max(2, Math.min(8, text.split("\n").length));
}

export function blockKey(turnIndex: number, blockIndex: number): string {
  return `${turnIndex}:${blockIndex}`;
}

export function allBlockKeys(turns: EditorTurnSummary[]): Set<string> {
  const keys = new Set<string>();
  for (const turn of turns) {
    turn.blocks.forEach((_block, blockIndex) => {
      keys.add(blockKey(turn.index, blockIndex));
    });
  }
  return keys;
}

export function replaceTurnText(
  turns: EditorTurnSummary[],
  turnIndex: number,
  userText: string,
): EditorTurnSummary[] {
  return turns.map((turn) =>
    turn.index === turnIndex ? { ...turn, user_text: userText } : turn,
  );
}

export function removeEmptyRedactRules(rules: RedactRule[]): RedactRule[] {
  return rules.filter((rule) => rule.search.trim().length > 0);
}
