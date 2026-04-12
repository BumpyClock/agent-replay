/**
 * Turn builder for Claude-like user -> assistant -> tool_result transcripts.
 * @module
 */

import type { Turn } from "../types.js";
import {
  attachToolResults,
  collectAssistantBlocks,
} from "./assistant-blocks.js";
import { extractText, isToolResultOnly } from "./system-tags.js";
import { filterEmptyTurns } from "./turn-filter.js";

function extractSystemEvents(userText) {
  const systemEvents = [];
  const cleanedText = userText
    .replace(/\[bg-task:\s*(.+)\]/g, (_, summary) => {
      systemEvents.push(summary);
      return "";
    })
    .trim();
  return { systemEvents, cleanedText };
}

/**
 * Build turns from normalized JSONL entries (Claude Code shape).
 */
export function buildTurnsFromEntries(entries) {
  const turns = [];
  let entryIndex = 0;
  let turnIndex = 0;

  while (entryIndex < entries.length) {
    const entry = entries[entryIndex];
    const role = entry.message?.role ?? entry.type;

    if (role === "user") {
      const content = entry.message?.content ?? "";
      if (isToolResultOnly(content)) {
        entryIndex++;
        continue;
      }

      let userText = extractText(content);
      const timestamp = entry.timestamp ?? "";
      entryIndex++;

      while (entryIndex < entries.length) {
        const nextEntry = entries[entryIndex];
        const nextRole = nextEntry.message?.role ?? nextEntry.type;
        if (nextRole !== "user") break;
        const nextContent = nextEntry.message?.content ?? "";
        if (isToolResultOnly(nextContent)) break;
        const nextText = extractText(nextContent);
        if (nextText) {
          userText = userText ? `${userText}\n${nextText}` : nextText;
        }
        entryIndex++;
      }

      const { systemEvents, cleanedText } = extractSystemEvents(userText);
      const [assistantBlocks, nextEntryIndex] = collectAssistantBlocks(
        entries,
        entryIndex,
      );
      entryIndex = attachToolResults(assistantBlocks, entries, nextEntryIndex);

      turnIndex++;
      const turn: Turn = {
        index: turnIndex,
        user_text: cleanedText,
        blocks: assistantBlocks,
        timestamp,
      };
      if (systemEvents.length) turn.system_events = systemEvents;
      turns.push(turn);
      continue;
    }

    if (role === "assistant") {
      const [assistantBlocks, nextEntryIndex] = collectAssistantBlocks(
        entries,
        entryIndex,
      );
      entryIndex = attachToolResults(assistantBlocks, entries, nextEntryIndex);

      if (turns.length > 0) {
        turns[turns.length - 1].blocks.push(...assistantBlocks);
      } else {
        turnIndex++;
        turns.push({
          index: turnIndex,
          user_text: "",
          blocks: assistantBlocks,
          timestamp: entry.timestamp ?? "",
        });
      }
      continue;
    }

    entryIndex++;
  }

  return filterEmptyTurns(turns);
}
