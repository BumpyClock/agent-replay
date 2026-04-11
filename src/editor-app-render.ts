import type {
  Bookmark,
  BrowseDirectoryResponse,
  EditorBlockSummary,
  EditorTurnSummary,
  SearchResult,
  SessionGroup,
} from "./editor-app-types.js";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightSnippet(snippet: string, query: string): string {
  const lower = snippet.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(snippet);
  return (
    escapeHtml(snippet.slice(0, idx)) +
    "<mark>" +
    escapeHtml(snippet.slice(idx, idx + query.length)) +
    "</mark>" +
    escapeHtml(snippet.slice(idx + query.length))
  );
}

export function renderSessions(groups: SessionGroup[]): string {
  let html = "";
  for (const group of groups) {
    html += `<div class="session-group-label open"><span class="arrow">&#9654;</span> ${escapeHtml(group.name)}</div>`;
    html += `<div class="session-group-content">`;
    for (const project of group.projects) {
      const projectId = `proj-${escapeHtml(group.name)}-${escapeHtml(project.dirName)}`;
      html += `<div class="session-project">`;
      html += `<div class="session-project-name" data-target="${projectId}" title="${escapeHtml(project.dirName.replace(/^-+/, ""))}"><span class="arrow">&#9654;</span> ${escapeHtml(project.name)}</div>`;
      html += `<div class="session-list" id="${projectId}">`;
      for (const session of project.sessions) {
        const dateStr = session.date
          ? new Date(session.date).toLocaleDateString()
          : "";
        html += `<div class="session-item" data-path="${escapeHtml(session.path)}">${escapeHtml(session.file.replace(".jsonl", ""))} <span class="badge">${dateStr}</span></div>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
  }
  return html;
}

export function renderSearchResults(
  results: SearchResult[],
  query: string,
): string {
  if (results.length === 0) {
    return '<div class="search-status">No matches found</div>';
  }

  let html = "";
  for (const result of results) {
    html += `<div class="search-result-item" data-path="${escapeHtml(result.path)}">`;
    html += `<div class="search-result-meta">${escapeHtml(result.group)} / ${escapeHtml(result.project)} / ${escapeHtml(result.file)}</div>`;
    html += `<div class="search-result-snippet">${highlightSnippet(result.snippet, query)}</div>`;
    html += `</div>`;
  }
  return html;
}

export function renderBrowseResults(data: BrowseDirectoryResponse): string {
  let html = "";
  if (data.parent) {
    html += `<div class="browse-item" data-browse="${escapeHtml(data.parent)}"><span class="icon">..</span> <span class="browse-parent">(parent)</span></div>`;
  }
  for (const dir of data.dirs) {
    html += `<div class="browse-item" data-browse="${escapeHtml(dir.path)}"><span class="icon icon-folder">&#128193;</span> ${escapeHtml(dir.name)}</div>`;
  }
  for (const file of data.files) {
    const dateStr = file.date ? new Date(file.date).toLocaleDateString() : "";
    html += `<div class="browse-item" data-path="${escapeHtml(file.path)}"><span class="icon icon-file">&#128196;</span> ${escapeHtml(file.name)} <span class="browse-date">${dateStr}</span></div>`;
  }
  if (data.dirs.length === 0 && data.files.length === 0) {
    html += `<div class="browse-item browse-empty">No folders or .jsonl files</div>`;
  }
  return html;
}

function isToolUseSummaryBlock(
  block: EditorBlockSummary,
): block is Extract<EditorBlockSummary, { kind: "tool_use" }> {
  return block.kind === "tool_use";
}

function renderBlocks(blocks: EditorBlockSummary[]): string {
  if (blocks.length === 0) {
    return `<div class="block-item"><div class="block-item-body">No blocks</div></div>`;
  }

  let html = "";
  for (const block of blocks) {
    if (isToolUseSummaryBlock(block)) {
      html += `<div class="block-item">`;
      html += `<div class="block-item-header block-tool"><span class="block-chevron">&#9654;</span>Tool: ${escapeHtml(block.name)}</div>`;
      html += `<div class="block-item-body"><span class="block-tool-name">${escapeHtml(block.name)}</span>`;
      html += `<div class="block-tool-section">Input</div>${escapeHtml(block.input)}`;
      html += `<div class="block-tool-section">Result</div>${escapeHtml(block.result)}</div>`;
      html += `</div>`;
      continue;
    }

    if (block.kind === "thinking") {
      html += `<div class="block-item">`;
      html += `<div class="block-item-header block-thinking"><span class="block-chevron">&#9654;</span>Thinking</div>`;
      html += `<div class="block-item-body">${escapeHtml(block.text)}</div>`;
      html += `</div>`;
      continue;
    }

    html += `<div class="block-item">`;
    html += `<div class="block-item-header block-text open"><span class="block-chevron">&#9654;</span>Text</div>`;
    html += `<div class="block-item-body">${escapeHtml(block.text)}</div>`;
    html += `</div>`;
  }
  return html;
}

export function renderTurns(
  turns: EditorTurnSummary[],
  excludedTurns: Set<number>,
  bookmarks: Map<number, string>,
): string {
  if (turns.length === 0) {
    return `<div class="empty-state">No turns in this session</div>`;
  }

  let html = "";
  for (const turn of turns) {
    const excluded = excludedTurns.has(turn.index);
    const checked = excluded ? "" : "checked";
    const bookmarkChecked = bookmarks.has(turn.index) ? "checked" : "";
    const bookmarkLabel = bookmarks.get(turn.index) || "";
    const userText = turn.user_text || "";
    const rows = Math.max(2, Math.min(8, userText.split("\n").length));

    html += `<div class="turn-card ${excluded ? "excluded" : ""}" data-index="${turn.index}">`;
    html += `<div class="turn-card-header">`;
    html += `<input type="checkbox" ${checked} data-action="toggle" data-index="${turn.index}">`;
    html += `<span class="turn-label">Turn ${turn.index}</span>`;
    html += `<span class="turn-summary">${escapeHtml(turn.blockSummary)}</span>`;
    html += `</div>`;
    html += `<div class="turn-card-body">`;
    html += `<textarea class="turn-textarea" data-action="edit" data-index="${turn.index}" rows="${rows}">${escapeHtml(userText)}</textarea>`;
    html += `<div class="turn-blocks-summary" data-action="expand" data-index="${turn.index}"><span class="arrow">&#9654;</span> ${escapeHtml(turn.blockSummary)}</div>`;
    html += `<div class="turn-blocks-detail" id="blocks-${turn.index}">${renderBlocks(turn.blocks)}</div>`;
    html += `<div class="turn-bookmark-row">`;
    html += `<label><input type="checkbox" ${bookmarkChecked} data-action="bookmark" data-index="${turn.index}"> Bookmark</label>`;
    html += `<input type="text" class="bookmark-label-input" data-action="bookmark-label" data-index="${turn.index}" placeholder="Chapter label..." value="${escapeHtml(bookmarkLabel)}" ${bookmarkChecked ? "" : "disabled"}>`;
    html += `</div></div></div>`;
  }
  return html;
}

export function bookmarkEntries(bookmarks: Map<number, string>): Bookmark[] {
  return Array.from(bookmarks.entries()).map(([turn, label]) => ({
    turn,
    label,
  }));
}
