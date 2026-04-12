import type { EditorTurnSummary } from "../../../src/editor-app-types.js";
import { countRows } from "../helpers.js";

interface TurnsPanelProps {
  turns: EditorTurnSummary[];
  excludedTurns: Set<number>;
  bookmarks: Map<number, string>;
  expandedTurns: Set<number>;
  expandedBlocks: Set<string>;
  previewReady: boolean;
  onSelectAll(): void;
  onSelectNone(): void;
  onExpandAll(): void;
  onCollapseAll(): void;
  onToggleTurn(index: number, checked: boolean, shiftKey: boolean): void;
  onToggleTurnExpanded(index: number): void;
  onTurnTextChange(index: number, value: string): void;
  onBookmarkToggle(index: number, checked: boolean): void;
  onBookmarkLabelChange(index: number, value: string): void;
  onToggleBlock(turnIndex: number, blockIndex: number): void;
  onJumpToTurn(index: number): void;
}

export function TurnsPanel({
  turns,
  excludedTurns,
  bookmarks,
  expandedTurns,
  expandedBlocks,
  previewReady,
  onSelectAll,
  onSelectNone,
  onExpandAll,
  onCollapseAll,
  onToggleTurn,
  onToggleTurnExpanded,
  onTurnTextChange,
  onBookmarkToggle,
  onBookmarkLabelChange,
  onToggleBlock,
  onJumpToTurn,
}: TurnsPanelProps) {
  return (
    <div className="editor-panel">
      <div
        className={`turns-toolbar ${turns.length > 0 ? "visible" : ""}`}
        id="turnsToolbar"
      >
        <div className="turns-toolbar-meta">
          <span className="turns-toolbar-eyebrow">editor</span>
          <span className="turns-toolbar-title">
            {turns.length > 0 ? `${turns.length} turns` : "turns"}
          </span>
        </div>
        <div className="turns-toolbar-actions">
          <button
            className="btn btn-small"
            id="selectAllBtn"
            onClick={onSelectAll}
            type="button"
          >
            Include All
          </button>
          <button
            className="btn btn-small"
            id="selectNoneBtn"
            onClick={onSelectNone}
            type="button"
          >
            Exclude All
          </button>
          <button
            className="btn btn-small"
            id="expandAllBtn"
            onClick={onExpandAll}
            type="button"
          >
            Expand All
          </button>
          <button
            className="btn btn-small"
            id="collapseAllBtn"
            onClick={onCollapseAll}
            type="button"
          >
            Collapse All
          </button>
        </div>
        <span className="toolbar-hint">Shift+click for range select</span>
      </div>
      <div className="turns-list" id="turnsList">
        {turns.length === 0 ? (
          <div className="empty-state">Select session to begin editing</div>
        ) : (
          turns.map((turn) => {
            const excluded = excludedTurns.has(turn.index);
            const expanded = expandedTurns.has(turn.index);
            const bookmarkLabel = bookmarks.get(turn.index) || "";
            return (
              <div
                className={`turn-card ${excluded ? "excluded" : ""}`}
                data-index={turn.index}
                key={turn.index}
              >
                <div className="turn-card-header">
                  <input
                    checked={!excluded}
                    data-action="toggle"
                    data-index={turn.index}
                    onChange={(event) =>
                      onToggleTurn(
                        turn.index,
                        event.target.checked,
                        !!(event.nativeEvent as MouseEvent).shiftKey,
                      )
                    }
                    onClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                  <button
                    className="turn-label"
                    onClick={() => {
                      if (previewReady) {
                        onJumpToTurn(turn.index);
                      }
                    }}
                    type="button"
                  >
                    Turn {turn.index}
                  </button>
                  <span className="turn-summary">{turn.blockSummary}</span>
                </div>
                <div className="turn-card-body">
                  <textarea
                    className="turn-textarea"
                    data-action="edit"
                    data-index={turn.index}
                    onChange={(event) =>
                      onTurnTextChange(turn.index, event.target.value)
                    }
                    rows={countRows(turn.user_text || "")}
                    value={turn.user_text || ""}
                  />
                  <button
                    className={`turn-blocks-summary ${expanded ? "open" : ""}`}
                    data-action="expand"
                    data-index={turn.index}
                    onClick={() => onToggleTurnExpanded(turn.index)}
                    type="button"
                  >
                    <span className="arrow">&#9654;</span>
                    {turn.blockSummary}
                  </button>
                  <div
                    className={`turn-blocks-detail ${expanded ? "open" : ""}`}
                    id={`blocks-${turn.index}`}
                  >
                    {turn.blocks.length === 0 ? (
                      <div className="block-item">
                        <div className="block-item-body">No blocks</div>
                      </div>
                    ) : (
                      turn.blocks.map((block, blockIndex) => {
                        const nestedKey = `${turn.index}:${blockIndex}`;
                        const nestedOpen =
                          block.kind === "text" ||
                          expandedBlocks.has(nestedKey);
                        return (
                          <div className="block-item" key={nestedKey}>
                            <button
                              className={`block-item-header ${blockClassName(block.kind)} ${nestedOpen ? "open" : ""}`}
                              onClick={() =>
                                onToggleBlock(turn.index, blockIndex)
                              }
                              type="button"
                            >
                              <span className="block-chevron">&#9654;</span>
                              {isToolBlock(block)
                                ? `Tool: ${block.name}`
                                : block.kind === "thinking"
                                  ? "Thinking"
                                  : "Text"}
                            </button>
                            <div
                              className={`block-item-body ${nestedOpen ? "open" : ""}`}
                            >
                              {isToolBlock(block) ? (
                                <>
                                  <span className="block-tool-name">
                                    {block.name}
                                  </span>
                                  <div className="block-tool-section">
                                    Input
                                  </div>
                                  <pre>{block.input}</pre>
                                  <div className="block-tool-section">
                                    Result
                                  </div>
                                  <pre>{block.result}</pre>
                                </>
                              ) : (
                                <pre>{block.text}</pre>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="turn-bookmark-row">
                    <label>
                      <input
                        checked={bookmarks.has(turn.index)}
                        data-action="bookmark"
                        data-index={turn.index}
                        onChange={(event) =>
                          onBookmarkToggle(turn.index, event.target.checked)
                        }
                        type="checkbox"
                      />
                      Bookmark
                    </label>
                    <input
                      className="bookmark-label-input"
                      data-action="bookmark-label"
                      data-index={turn.index}
                      disabled={!bookmarks.has(turn.index)}
                      onChange={(event) =>
                        onBookmarkLabelChange(turn.index, event.target.value)
                      }
                      placeholder="Chapter label..."
                      type="text"
                      value={bookmarkLabel}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function blockClassName(kind: string): string {
  if (kind === "tool_use") {
    return "block-tool";
  }
  if (kind === "thinking") {
    return "block-thinking";
  }
  return "block-text";
}

function isToolBlock(
  block: EditorTurnSummary["blocks"][number],
): block is Extract<EditorTurnSummary["blocks"][number], { kind: "tool_use" }> {
  return block.kind === "tool_use";
}
