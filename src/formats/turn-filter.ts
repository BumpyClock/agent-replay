/**
 * Replay turn filtering and reindexing shared by format parsers.
 * @module
 */

/**
 * Filter empty turns and re-index sequentially.
 */
export function filterEmptyTurns(turns) {
  const filtered = turns.filter((turn) => {
    if (turn.user_text) return true;
    if (turn.system_events?.length) return true;
    return turn.blocks.some((block) => {
      if (block.kind === "tool_use") return true;
      if (
        block.kind === "text" &&
        block.text &&
        block.text !== "No response requested."
      )
        return true;
      if (block.kind === "thinking" && block.text) return true;
      return false;
    });
  });

  for (let index = 0; index < filtered.length; index++) {
    filtered[index].index = index + 1;
  }

  return filtered;
}
