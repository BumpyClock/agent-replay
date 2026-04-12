import type { SearchResponse } from "../editor-app-types.js";
import { createSessionSearchIndex } from "./session-search-index.js";
import type { EditorSessionSearch, ReadonlySessionGroup } from "./types.js";

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 30;
const CONTEXT_BEFORE = 40;
const CONTEXT_AFTER = 60;

interface CreateEditorSessionSearchOptions {
  /** Search index implementation, injected for tests. */
  index?: {
    sync(groups: readonly ReadonlySessionGroup[]): void;
    get(path: string):
      | {
          text: string;
          normalizedText: string;
        }
      | undefined;
  };
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

/** Build a search snippet with fixed pre/post context around the first match. */
function buildSnippet(
  text: string,
  index: number,
  queryLength: number,
): string {
  const start = Math.max(0, index - CONTEXT_BEFORE);
  const end = Math.min(text.length, index + queryLength + CONTEXT_AFTER);
  return (
    `${start > 0 ? "..." : ""}${text.slice(start, end).replace(/\n/g, " ")}` +
    `${end < text.length ? "..." : ""}`
  );
}

export function createEditorSessionSearch({
  index = createSessionSearchIndex(),
}: CreateEditorSessionSearchOptions = {}): EditorSessionSearch {
  return {
    search(
      groups: readonly ReadonlySessionGroup[],
      query: string,
    ): SearchResponse {
      index.sync(groups);
      const normalizedQuery = normalizeQuery(query);
      if (!normalizedQuery || normalizedQuery.length < MIN_QUERY_LENGTH) {
        return { results: [] };
      }

      const results: SearchResponse["results"] = [];

      for (const group of groups) {
        for (const project of group.projects) {
          for (const session of project.sessions) {
            if (results.length >= MAX_RESULTS) {
              return { results };
            }

            const document = index.get(session.path);
            if (!document) {
              continue;
            }

            const matchIndex = document.normalizedText.indexOf(normalizedQuery);
            if (matchIndex === -1) {
              continue;
            }

            results.push({
              group: group.name,
              project: project.name,
              file: session.file,
              path: session.path,
              date: session.date,
              snippet: buildSnippet(
                document.text,
                matchIndex,
                normalizedQuery.length,
              ),
              source: session.source,
            });
          }
        }
      }

      return { results };
    },
  };
}
