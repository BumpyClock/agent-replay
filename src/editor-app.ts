import {
  bookmarkEntries,
  escapeHtml,
  renderBrowseResults,
  renderSearchResults,
  renderSessions,
  renderTurns,
} from "./editor-app-render.js";
import type {
  BrowseDirectoryResponse,
  EditorTurnSummary,
  EditResponse,
  ExportOptions,
  PreviewResponse,
  RedactRule,
  SearchResponse,
  SessionPayload,
  SessionsResponse,
} from "./editor-app-types.js";

interface AppState {
  currentSessionId: string | null;
  currentTurns: EditorTurnSummary[];
  excludedTurns: Set<number>;
  bookmarks: Map<number, string>;
  previewBlobUrl: string | null;
  dragging: boolean;
  hasTextEdits: boolean;
  lastToggleIndex: number | null;
  lastClickShift: boolean;
  contentSearchDebounce: ReturnType<typeof setTimeout> | null;
}

interface AppElements {
  appEl: HTMLElement;
  sidebarToggleBtn: HTMLButtonElement;
  titleInput: HTMLInputElement;
  resetBtn: HTMLButtonElement;
  exportBtn: HTMLButtonElement;
  exportDataBtn: HTMLButtonElement;
  importHtmlBtn: HTMLButtonElement;
  importHtmlFile: HTMLInputElement;
  themeModeBtn: HTMLButtonElement;
  helpBtn: HTMLButtonElement;
  confirmModal: HTMLElement;
  confirmTitle: HTMLElement;
  confirmMessage: HTMLElement;
  confirmOk: HTMLButtonElement;
  confirmCancel: HTMLButtonElement;
  helpModal: HTMLElement;
  helpModalClose: HTMLButtonElement;
  sessionsToggle: HTMLElement;
  sessionsSection: HTMLElement;
  optionsToggle: HTMLElement;
  optionsSection: HTMLElement;
  sessionsTree: HTMLElement;
  sessionsSearch: HTMLInputElement;
  searchResults: HTMLElement;
  browseToggle: HTMLElement;
  browseBody: HTMLElement;
  browsePathInput: HTMLInputElement;
  browseList: HTMLElement;
  turnsToolbar: HTMLElement;
  selectAllBtn: HTMLButtonElement;
  selectNoneBtn: HTMLButtonElement;
  expandAllBtn: HTMLButtonElement;
  collapseAllBtn: HTMLButtonElement;
  turnsList: HTMLElement;
  previewIframe: HTMLIFrameElement;
  refreshIndicator: HTMLElement;
  resizeHandle: HTMLElement;
  redactRulesContainer: HTMLElement;
  addRuleBtn: HTMLButtonElement;
  helpVersion: HTMLElement;
}

interface OptionElements {
  theme: HTMLSelectElement;
  speed: HTMLInputElement;
  thinking: HTMLInputElement;
  toolCalls: HTMLInputElement;
  fontSize: HTMLSelectElement;
  redact: HTMLInputElement;
  userLabel: HTMLInputElement;
  asstLabel: HTMLInputElement;
  desc: HTMLTextAreaElement;
  ogImage: HTMLInputElement;
  timing: HTMLSelectElement;
  minify: HTMLInputElement;
  compress: HTMLInputElement;
}

const state: AppState = {
  currentSessionId: null,
  currentTurns: [],
  excludedTurns: new Set(),
  bookmarks: new Map(),
  previewBlobUrl: null,
  dragging: false,
  hasTextEdits: false,
  lastToggleIndex: null,
  lastClickShift: false,
  contentSearchDebounce: null,
};

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

function requiredQuery<T extends Element>(selector: string): T {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
}

function queryAll<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll(selector)) as T[];
}

function isElement(target: EventTarget | null): target is Element {
  return target instanceof Element;
}

function isInputLike(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function isCheckboxInput(
  target: EventTarget | null,
): target is HTMLInputElement {
  return target instanceof HTMLInputElement;
}

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const options: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}) as { error?: string });
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return response;
}

async function apiJson<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  return (await api(method, path, body)).json() as Promise<T>;
}

const elements: AppElements = {
  appEl: requiredQuery<HTMLElement>(".app"),
  sidebarToggleBtn: requiredElement<HTMLButtonElement>("sidebarToggleBtn"),
  titleInput: requiredElement<HTMLInputElement>("titleInput"),
  resetBtn: requiredElement<HTMLButtonElement>("resetBtn"),
  exportBtn: requiredElement<HTMLButtonElement>("exportBtn"),
  exportDataBtn: requiredElement<HTMLButtonElement>("exportDataBtn"),
  importHtmlBtn: requiredElement<HTMLButtonElement>("importHtmlBtn"),
  importHtmlFile: requiredElement<HTMLInputElement>("importHtmlFile"),
  themeModeBtn: requiredElement<HTMLButtonElement>("themeModeBtn"),
  helpBtn: requiredElement<HTMLButtonElement>("helpBtn"),
  confirmModal: requiredElement<HTMLElement>("confirmModal"),
  confirmTitle: requiredElement<HTMLElement>("confirmTitle"),
  confirmMessage: requiredElement<HTMLElement>("confirmMessage"),
  confirmOk: requiredElement<HTMLButtonElement>("confirmOk"),
  confirmCancel: requiredElement<HTMLButtonElement>("confirmCancel"),
  helpModal: requiredElement<HTMLElement>("helpModal"),
  helpModalClose: requiredElement<HTMLButtonElement>("helpModalClose"),
  sessionsToggle: requiredElement<HTMLElement>("sessionsToggle"),
  sessionsSection: requiredElement<HTMLElement>("sessionsSection"),
  optionsToggle: requiredElement<HTMLElement>("optionsToggle"),
  optionsSection: requiredElement<HTMLElement>("optionsSection"),
  sessionsTree: requiredElement<HTMLElement>("sessionsTree"),
  sessionsSearch: requiredElement<HTMLInputElement>("sessionsSearch"),
  searchResults: requiredElement<HTMLElement>("searchResults"),
  browseToggle: requiredElement<HTMLElement>("browseToggle"),
  browseBody: requiredElement<HTMLElement>("browseBody"),
  browsePathInput: requiredElement<HTMLInputElement>("browsePathInput"),
  browseList: requiredElement<HTMLElement>("browseList"),
  turnsToolbar: requiredElement<HTMLElement>("turnsToolbar"),
  selectAllBtn: requiredElement<HTMLButtonElement>("selectAllBtn"),
  selectNoneBtn: requiredElement<HTMLButtonElement>("selectNoneBtn"),
  expandAllBtn: requiredElement<HTMLButtonElement>("expandAllBtn"),
  collapseAllBtn: requiredElement<HTMLButtonElement>("collapseAllBtn"),
  turnsList: requiredElement<HTMLElement>("turnsList"),
  previewIframe: requiredElement<HTMLIFrameElement>("previewIframe"),
  refreshIndicator: requiredElement<HTMLElement>("refreshIndicator"),
  resizeHandle: requiredElement<HTMLElement>("resizeHandle"),
  redactRulesContainer: requiredElement<HTMLElement>("redactRules"),
  addRuleBtn: requiredElement<HTMLButtonElement>("addRuleBtn"),
  helpVersion: requiredElement<HTMLElement>("helpVersion"),
};

const opt: OptionElements = {
  theme: requiredElement<HTMLSelectElement>("optTheme"),
  speed: requiredElement<HTMLInputElement>("optSpeed"),
  thinking: requiredElement<HTMLInputElement>("optThinking"),
  toolCalls: requiredElement<HTMLInputElement>("optToolCalls"),
  fontSize: requiredElement<HTMLSelectElement>("optFontSize"),
  redact: requiredElement<HTMLInputElement>("optRedact"),
  userLabel: requiredElement<HTMLInputElement>("optUserLabel"),
  asstLabel: requiredElement<HTMLInputElement>("optAssistantLabel"),
  desc: requiredElement<HTMLTextAreaElement>("optDescription"),
  ogImage: requiredElement<HTMLInputElement>("optOgImage"),
  timing: requiredElement<HTMLSelectElement>("optTiming"),
  minify: requiredElement<HTMLInputElement>("optMinify"),
  compress: requiredElement<HTMLInputElement>("optCompress"),
};

function toggleSidebarSection(toggle: HTMLElement, section: HTMLElement): void {
  toggle.classList.toggle("open");
  section.classList.toggle("open");
}

function showOptionsPanel(): void {
  elements.optionsToggle.classList.add("open");
  elements.optionsSection.classList.add("open");
}

function showConfirm(title: string, message: string): Promise<boolean> {
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmModal.classList.add("open");

  return new Promise((resolve) => {
    function cleanup(): void {
      elements.confirmModal.classList.remove("open");
      elements.confirmOk.removeEventListener("click", onOk);
      elements.confirmCancel.removeEventListener("click", onCancel);
    }

    function onOk(): void {
      cleanup();
      resolve(true);
    }

    function onCancel(): void {
      cleanup();
      resolve(false);
    }

    elements.confirmOk.addEventListener("click", onOk);
    elements.confirmCancel.addEventListener("click", onCancel);
  });
}

function updateEditState(textEdits?: boolean): void {
  if (textEdits !== undefined) {
    state.hasTextEdits = textEdits;
  }
  const hasChanges =
    state.hasTextEdits ||
    state.excludedTurns.size > 0 ||
    state.bookmarks.size > 0;
  elements.resetBtn.classList.toggle("btn-warn", hasChanges);
  const activeItem = document.querySelector<HTMLElement>(
    ".session-item.active",
  );
  if (activeItem) {
    activeItem.classList.toggle("edited", hasChanges);
  }
}

function bindRenderedSessionTree(): void {
  queryAll<HTMLElement>(elements.sessionsTree, ".session-project-name").forEach(
    (element) => {
      element.addEventListener("click", () => {
        element.classList.toggle("open");
        const listId = element.dataset.target;
        if (!listId) return;
        document.getElementById(listId)?.classList.toggle("open");
      });
    },
  );

  queryAll<HTMLElement>(elements.sessionsTree, ".session-item").forEach(
    (element) => {
      element.addEventListener("click", () => {
        const path = element.dataset.path;
        if (path) {
          void loadSession(path, element);
        }
      });
    },
  );
}

async function loadSessions(): Promise<void> {
  try {
    const data = await apiJson<SessionsResponse>("GET", "/api/sessions");
    if (data.homedir) elements.browsePathInput.value = data.homedir;
    if (data.version) elements.helpVersion.textContent = `v${data.version}`;

    if (data.groups.length === 0) {
      elements.sessionsTree.innerHTML =
        '<div class="empty-state empty-state-hint">No sessions found in default locations.</div>';
      return;
    }

    elements.sessionsTree.innerHTML = renderSessions(data.groups);
    bindRenderedSessionTree();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elements.sessionsTree.innerHTML = `<div class="empty-state empty-state-error">Failed to load sessions: ${escapeHtml(message)}</div>`;
  }
}

function filterSessionsByName(query: string): void {
  elements.searchResults.style.display = "none";
  elements.sessionsTree.style.display = "";

  queryAll<HTMLElement>(elements.sessionsTree, ".session-project").forEach(
    (project) => {
      const projectName =
        project
          .querySelector<HTMLElement>(".session-project-name")
          ?.textContent?.toLowerCase() || "";
      const items = queryAll<HTMLElement>(project, ".session-item");
      let anyVisible = false;

      items.forEach((item) => {
        const text = item.textContent?.toLowerCase() || "";
        const match =
          query.length === 0 ||
          text.includes(query) ||
          projectName.includes(query);
        item.style.display = match ? "" : "none";
        if (match) anyVisible = true;
      });

      project.style.display = anyVisible ? "" : "none";
      if (anyVisible && query.length > 0) {
        project
          .querySelector<HTMLElement>(".session-project-name")
          ?.classList.add("open");
        project
          .querySelector<HTMLElement>(".session-list")
          ?.classList.add("open");
      }
    },
  );
}

async function searchContent(query: string): Promise<void> {
  elements.sessionsTree.style.display = "none";
  elements.searchResults.style.display = "";
  elements.searchResults.innerHTML =
    '<div class="search-status">Searching...</div>';

  try {
    const data = await apiJson<SearchResponse>("POST", "/api/search", {
      query,
    });
    elements.searchResults.innerHTML = renderSearchResults(data.results, query);
    queryAll<HTMLElement>(
      elements.searchResults,
      ".search-result-item",
    ).forEach((element) => {
      element.addEventListener("click", () => {
        const path = element.dataset.path;
        if (path) {
          void loadSession(path, null);
        }
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elements.searchResults.innerHTML = `<div class="search-status">Search failed: ${escapeHtml(message)}</div>`;
  }
}

function bindBrowseList(): void {
  queryAll<HTMLElement>(elements.browseList, "[data-browse]").forEach(
    (element) => {
      element.addEventListener("click", () => {
        const browsePath = element.dataset.browse;
        if (browsePath) {
          void browseTo(browsePath);
        }
      });
    },
  );

  queryAll<HTMLElement>(elements.browseList, "[data-path]").forEach(
    (element) => {
      element.addEventListener("click", () => {
        queryAll<HTMLElement>(document, ".session-item.active").forEach(
          (item) => {
            item.classList.remove("active");
          },
        );
        element.classList.add("selected");
        const path = element.dataset.path;
        if (path) {
          void loadSession(path, null);
        }
      });
    },
  );
}

async function browseTo(path: string): Promise<void> {
  try {
    const data = await apiJson<BrowseDirectoryResponse>("POST", "/api/browse", {
      path,
    });
    elements.browsePathInput.value = data.path;
    elements.browseList.innerHTML = renderBrowseResults(data);
    bindBrowseList();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elements.browseList.innerHTML = `<div class="browse-item browse-error">${escapeHtml(message)}</div>`;
  }
}

function renderTurnsView(): void {
  elements.turnsList.innerHTML = renderTurns(
    state.currentTurns,
    state.excludedTurns,
    state.bookmarks,
  );
}

async function loadSession(
  path: string,
  itemEl: HTMLElement | null,
): Promise<void> {
  queryAll<HTMLElement>(document, ".session-item.active").forEach((element) => {
    element.classList.remove("active");
  });
  if (itemEl) {
    itemEl.classList.add("active");
  }

  try {
    const data = await apiJson<SessionPayload>("POST", "/api/load", { path });
    state.currentSessionId = data.sessionId;
    state.currentTurns = data.turns;
    state.excludedTurns = new Set(data.excludedTurns || []);
    state.bookmarks = new Map(
      (data.bookmarks || []).map((bookmark) => [bookmark.turn, bookmark.label]),
    );
    state.lastToggleIndex = null;

    const filename =
      path
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.(jsonl|html)$/, "") || "replay";
    elements.titleInput.value = `Replay — ${filename}`;
    elements.titleInput.disabled = false;
    elements.resetBtn.disabled = false;
    elements.exportBtn.disabled = false;
    elements.exportDataBtn.disabled = false;

    updateEditState(data.hasEdits || false);
    showOptionsPanel();
    elements.turnsToolbar.classList.add("visible");
    renderTurnsView();
    schedulePreview();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert(`Failed to load session: ${message}`);
  }
}

function setTurnChecked(index: number, checked: boolean): void {
  const checkbox = elements.turnsList.querySelector<HTMLInputElement>(
    `input[data-action="toggle"][data-index="${index}"]`,
  );
  if (!checkbox) return;

  checkbox.checked = checked;
  if (checked) {
    state.excludedTurns.delete(index);
  } else {
    state.excludedTurns.add(index);
  }

  const card = checkbox.closest<HTMLElement>(".turn-card");
  card?.classList.toggle("excluded", !checked);
  if (!checked) {
    card
      ?.querySelector<HTMLElement>("[data-action='expand']")
      ?.classList.remove("open");
    card
      ?.querySelector<HTMLElement>(".turn-blocks-detail")
      ?.classList.remove("open");
  }
}

function handleTurnClick(event: Event): void {
  if (!isElement(event.target)) return;

  const blockHeader = event.target.closest<HTMLElement>(".block-item-header");
  if (blockHeader) {
    blockHeader.classList.toggle("open");
    return;
  }

  const summary = event.target.closest<HTMLElement>("[data-action='expand']");
  if (summary) {
    const index = summary.dataset.index;
    if (!index) return;
    const detail = document.getElementById(`blocks-${index}`);
    if (detail) {
      summary.classList.toggle("open");
      detail.classList.toggle("open");
    }
    return;
  }

  const header = event.target.closest<HTMLElement>(".turn-card-header");
  if (header && !event.target.closest("input")) {
    const card = header.closest<HTMLElement>(".turn-card");
    const index = Number.parseInt(card?.dataset.index || "", 10);
    if (!index || !elements.previewIframe.contentWindow) return;

    const included = state.currentTurns.filter(
      (turn) => !state.excludedTurns.has(turn.index),
    );
    const position = included.findIndex((turn) => turn.index === index);
    if (position >= 0) {
      try {
        elements.previewIframe.contentWindow.location.hash = `#turn=${position + 1}`;
      } catch {
        /* ignore cross-document timing issues */
      }
    }
  }
}

function handleTurnChange(event: Event): void {
  if (!isInputLike(event.target)) return;

  const action = event.target.dataset.action;
  const index = Number.parseInt(event.target.dataset.index || "", 10);
  if (!action || Number.isNaN(index)) return;

  if (action === "toggle") {
    if (!isCheckboxInput(event.target)) return;
    const checked = event.target.checked;
    if (
      state.lastClickShift &&
      state.lastToggleIndex !== null &&
      state.lastToggleIndex !== index
    ) {
      const from = Math.min(state.lastToggleIndex, index);
      const to = Math.max(state.lastToggleIndex, index);
      for (const turn of state.currentTurns) {
        if (turn.index >= from && turn.index <= to) {
          setTurnChecked(turn.index, checked);
        }
      }
    } else {
      if (checked) {
        state.excludedTurns.delete(index);
      } else {
        state.excludedTurns.add(index);
      }

      const card = event.target.closest<HTMLElement>(".turn-card");
      card?.classList.toggle("excluded", !checked);
      if (!checked) {
        card
          ?.querySelector<HTMLElement>("[data-action='expand']")
          ?.classList.remove("open");
        card
          ?.querySelector<HTMLElement>(".turn-blocks-detail")
          ?.classList.remove("open");
      }
    }

    state.lastToggleIndex = index;
    updateEditState();
    schedulePreview();
    return;
  }

  if (action === "bookmark") {
    if (!isCheckboxInput(event.target)) return;
    const labelInput = elements.turnsList.querySelector<HTMLInputElement>(
      `input[data-action="bookmark-label"][data-index="${index}"]`,
    );
    if (!labelInput) return;

    if (event.target.checked) {
      state.bookmarks.set(index, labelInput.value || `Turn ${index}`);
      labelInput.disabled = false;
    } else {
      state.bookmarks.delete(index);
      labelInput.disabled = true;
    }
    updateEditState();
    schedulePreview();
  }
}

const debouncedEdit = debounce(
  (sessionId: string, turnIndex: number, userText: string) => {
    if (sessionId !== state.currentSessionId) return;
    void apiJson<EditResponse>("POST", "/api/edit", {
      sessionId,
      turnIndex,
      user_text: userText,
    })
      .then((data) => {
        updateEditState(data.hasEdits);
        schedulePreview();
      })
      .catch((error) => {
        console.error("Edit failed:", error);
      });
  },
  300,
);

function handleTurnInput(event: Event): void {
  if (!isInputLike(event.target)) return;

  const action = event.target.dataset.action;
  const index = Number.parseInt(event.target.dataset.index || "", 10);
  if (!action || Number.isNaN(index)) return;

  if (action === "edit" && state.currentSessionId) {
    debouncedEdit(state.currentSessionId, index, event.target.value);
    return;
  }

  if (action === "bookmark-label" && state.bookmarks.has(index)) {
    state.bookmarks.set(index, event.target.value || `Turn ${index}`);
    debouncedPreview();
  }
}

async function loadThemes(): Promise<void> {
  try {
    const themes = await apiJson<string[]>("GET", "/api/themes");
    opt.theme.innerHTML = themes
      .map(
        (themeName) =>
          `<option value="${escapeHtml(themeName)}" ${themeName === "workstreams" ? "selected" : ""}>${escapeHtml(themeName)}</option>`,
      )
      .join("");
  } catch {
    /* ignore theme load failures */
  }
}

function addRedactRule(search: string, replacement: string): void {
  const row = document.createElement("div");
  row.className = "redact-rule";
  row.innerHTML = `<input type="text" placeholder="Search text" value="${escapeHtml(search)}">
      <span class="arrow">&rarr;</span>
      <input type="text" placeholder="Replacement" value="${escapeHtml(replacement)}">
      <button type="button" class="remove-rule">&times;</button>`;

  elements.redactRulesContainer.appendChild(row);

  row
    .querySelector<HTMLButtonElement>(".remove-rule")
    ?.addEventListener("click", () => {
      row.remove();
      schedulePreview();
    });

  queryAll<HTMLInputElement>(row, "input").forEach((input) => {
    input.addEventListener(
      "input",
      debounce(() => {
        schedulePreview();
      }, 300),
    );
  });
}

function getRedactRules(): RedactRule[] {
  const rules: RedactRule[] = [];
  queryAll<HTMLElement>(elements.redactRulesContainer, ".redact-rule").forEach(
    (row) => {
      const inputs = queryAll<HTMLInputElement>(row, "input");
      if (inputs[0]?.value) {
        rules.push({
          search: inputs[0].value,
          replacement: inputs[1]?.value || "",
        });
      }
    },
  );
  return rules;
}

function gatherOptions(): ExportOptions {
  return {
    theme: opt.theme.value,
    speed: Number.parseFloat(opt.speed.value) || 1,
    showThinking: opt.thinking.checked,
    showToolCalls: opt.toolCalls.checked,
    fontSize: opt.fontSize.value,
    redactSecrets: opt.redact.checked,
    redactRules: getRedactRules(),
    userLabel: opt.userLabel.value || "User",
    assistantLabel: opt.asstLabel.value || "",
    title: elements.titleInput.value || "Replay",
    description: opt.desc.value || "",
    ogImage: opt.ogImage.value || "",
    timing: opt.timing.value,
    minified: opt.minify.checked,
    compress: opt.compress.checked,
    excludeTurns: Array.from(state.excludedTurns),
    bookmarks: bookmarkEntries(state.bookmarks),
  };
}

const debouncedPreview = debounce(() => {
  void refreshPreview();
}, 150);

function schedulePreview(): void {
  if (state.currentSessionId) {
    debouncedPreview();
  }
}

async function refreshPreview(): Promise<void> {
  if (!state.currentSessionId) return;

  elements.refreshIndicator.classList.add("active");
  try {
    const data = await apiJson<PreviewResponse>("POST", "/api/preview", {
      sessionId: state.currentSessionId,
      options: gatherOptions(),
    });
    if (state.previewBlobUrl) {
      URL.revokeObjectURL(state.previewBlobUrl);
    }
    state.previewBlobUrl = URL.createObjectURL(
      new Blob([data.html], { type: "text/html" }),
    );
    elements.previewIframe.src = state.previewBlobUrl;
  } catch (error) {
    console.error("Preview failed:", error);
  } finally {
    elements.refreshIndicator.classList.remove("active");
  }
}

async function doReset(): Promise<void> {
  if (!state.currentSessionId) return;

  const hasChanges =
    state.hasTextEdits ||
    state.excludedTurns.size > 0 ||
    state.bookmarks.size > 0;
  if (hasChanges) {
    const ok = await showConfirm(
      "Reset Session",
      "Reset all edits, excluded turns, and bookmarks to the original session?",
    );
    if (!ok) return;
  }

  try {
    const data = await apiJson<SessionPayload>("POST", "/api/reset", {
      sessionId: state.currentSessionId,
    });
    state.currentTurns = data.turns;
    state.excludedTurns = new Set();
    state.bookmarks = new Map();
    updateEditState(false);
    renderTurnsView();
    schedulePreview();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert(`Reset failed: ${message}`);
  }
}

async function doExport(): Promise<void> {
  if (!state.currentSessionId) return;

  try {
    const response = await api("POST", "/api/export", {
      sessionId: state.currentSessionId,
      options: gatherOptions(),
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      (elements.titleInput.value || "replay").replace(/[^a-zA-Z0-9_-]/g, "_") +
      ".html";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert(`Export failed: ${message}`);
  }
}

async function doExportData(): Promise<void> {
  if (!state.currentSessionId) return;

  try {
    const response = await api("POST", "/api/export-data", {
      sessionId: state.currentSessionId,
      options: gatherOptions(),
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      (elements.titleInput.value || "replay").replace(/[^a-zA-Z0-9_-]/g, "_") +
      ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert(`Export failed: ${message}`);
  }
}

function stopDrag(): void {
  if (!state.dragging) return;
  state.dragging = false;
  elements.resizeHandle.classList.remove("active");
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  elements.previewIframe.style.pointerEvents = "";
}

async function importHtmlReplay(): Promise<void> {
  const file = elements.importHtmlFile.files?.[0];
  if (!file) return;

  elements.importHtmlFile.value = "";

  try {
    const html = await file.text();
    const data = await apiJson<SessionPayload>("POST", "/api/import", {
      html,
      filename: file.name,
    });

    state.currentSessionId = data.sessionId;
    state.currentTurns = data.turns;
    state.excludedTurns = new Set(data.excludedTurns || []);
    state.bookmarks = new Map(
      (data.bookmarks || []).map((bookmark) => [bookmark.turn, bookmark.label]),
    );

    const filename = file.name.replace(/\.html$/, "");
    elements.titleInput.value = `Replay — ${filename}`;
    elements.titleInput.disabled = false;
    elements.resetBtn.disabled = false;
    elements.exportBtn.disabled = false;
    elements.exportDataBtn.disabled = false;

    updateEditState(false);
    showOptionsPanel();
    elements.turnsToolbar.classList.add("visible");
    renderTurnsView();
    schedulePreview();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert(`Import failed: ${message}`);
  }
}

function autoLoadFromQuery(): void {
  const loadParam = new URLSearchParams(window.location.search).get("load");
  if (!loadParam) return;

  let item = elements.sessionsTree.querySelector<HTMLElement>(
    `.session-item[data-path="${CSS.escape(loadParam)}"]`,
  );
  if (!item) {
    const filename = loadParam.split(/[/\\]/).pop();
    for (const element of queryAll<HTMLElement>(
      elements.sessionsTree,
      ".session-item",
    )) {
      if (filename && element.dataset.path?.endsWith(filename)) {
        item = element;
        break;
      }
    }
  }

  if (item) {
    const project = item.closest<HTMLElement>(".session-project");
    project
      ?.querySelector<HTMLElement>(".session-project-name")
      ?.classList.add("open");
    project?.querySelector<HTMLElement>(".session-list")?.classList.add("open");
  }

  void loadSession(loadParam, item);
  history.replaceState(null, "", window.location.pathname);
}

function registerEventListeners(): void {
  elements.sidebarToggleBtn.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    elements.sidebarToggleBtn.innerHTML = collapsed ? "&#8250;" : "&#8249;";
    elements.appEl.style.gridTemplateColumns = "";
  });

  elements.sessionsToggle.addEventListener("click", () => {
    toggleSidebarSection(elements.sessionsToggle, elements.sessionsSection);
  });

  elements.optionsToggle.addEventListener("click", () => {
    toggleSidebarSection(elements.optionsToggle, elements.optionsSection);
  });

  elements.browseToggle.addEventListener("click", () => {
    elements.browseToggle.classList.toggle("open");
    elements.browseBody.style.display =
      elements.browseToggle.classList.contains("open") ? "block" : "none";
  });

  elements.browsePathInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const path = elements.browsePathInput.value.trim();
    if (path) {
      void browseTo(path);
    }
  });

  Object.values(opt).forEach((element) => {
    element.addEventListener("change", () => {
      schedulePreview();
    });
  });

  [opt.userLabel, opt.asstLabel, opt.desc, opt.ogImage].forEach((element) => {
    element.addEventListener(
      "input",
      debounce(() => {
        schedulePreview();
      }, 300),
    );
  });

  elements.addRuleBtn.addEventListener("click", () => {
    addRedactRule("", "[REDACTED]");
    schedulePreview();
  });

  elements.titleInput.addEventListener(
    "input",
    debounce(() => {
      schedulePreview();
    }, 300),
  );

  elements.resetBtn.addEventListener("click", () => {
    void doReset();
  });
  elements.exportBtn.addEventListener("click", () => {
    void doExport();
  });
  elements.exportDataBtn.addEventListener("click", () => {
    void doExportData();
  });

  elements.importHtmlBtn.addEventListener("click", () => {
    elements.importHtmlFile.click();
  });
  elements.importHtmlFile.addEventListener("change", () => {
    void importHtmlReplay();
  });

  elements.selectAllBtn.addEventListener("click", () => {
    state.excludedTurns.clear();
    queryAll<HTMLInputElement>(
      elements.turnsList,
      "[data-action='toggle']",
    ).forEach((checkbox) => {
      checkbox.checked = true;
    });
    queryAll<HTMLElement>(elements.turnsList, ".turn-card").forEach((card) => {
      card.classList.remove("excluded");
    });
    updateEditState();
    schedulePreview();
  });

  elements.selectNoneBtn.addEventListener("click", () => {
    state.currentTurns.forEach((turn) => {
      state.excludedTurns.add(turn.index);
    });
    queryAll<HTMLInputElement>(
      elements.turnsList,
      "[data-action='toggle']",
    ).forEach((checkbox) => {
      checkbox.checked = false;
    });
    queryAll<HTMLElement>(elements.turnsList, ".turn-card").forEach((card) => {
      card.classList.add("excluded");
    });
    queryAll<HTMLElement>(elements.turnsList, "[data-action='expand']").forEach(
      (summary) => {
        summary.classList.remove("open");
      },
    );
    queryAll<HTMLElement>(elements.turnsList, ".turn-blocks-detail").forEach(
      (detail) => {
        detail.classList.remove("open");
      },
    );
    updateEditState();
    schedulePreview();
  });

  elements.expandAllBtn.addEventListener("click", () => {
    queryAll<HTMLElement>(elements.turnsList, "[data-action='expand']").forEach(
      (summary) => {
        summary.classList.add("open");
      },
    );
    queryAll<HTMLElement>(elements.turnsList, ".turn-blocks-detail").forEach(
      (detail) => {
        detail.classList.add("open");
      },
    );
  });

  elements.collapseAllBtn.addEventListener("click", () => {
    queryAll<HTMLElement>(elements.turnsList, "[data-action='expand']").forEach(
      (summary) => {
        summary.classList.remove("open");
      },
    );
    queryAll<HTMLElement>(elements.turnsList, ".turn-blocks-detail").forEach(
      (detail) => {
        detail.classList.remove("open");
      },
    );
  });

  elements.themeModeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.classList.toggle("light");
    document.documentElement.classList.toggle("dark", !isLight);
    const moon = elements.themeModeBtn.querySelector<SVGElement>(".icon-moon");
    const sun = elements.themeModeBtn.querySelector<SVGElement>(".icon-sun");
    if (moon) moon.style.display = isLight ? "none" : "block";
    if (sun) sun.style.display = isLight ? "block" : "none";
  });

  elements.helpBtn.addEventListener("click", () => {
    elements.helpModal.classList.add("open");
  });
  elements.helpModalClose.addEventListener("click", () => {
    elements.helpModal.classList.remove("open");
  });
  elements.helpModal.addEventListener("click", (event) => {
    if (event.target === elements.helpModal) {
      elements.helpModal.classList.remove("open");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      elements.helpModal.classList.contains("open")
    ) {
      elements.helpModal.classList.remove("open");
    }
    if (
      event.key === "Escape" &&
      elements.confirmModal.classList.contains("open")
    ) {
      elements.confirmCancel.click();
    }
    if (
      event.key === "f" &&
      (event.ctrlKey || event.metaKey) &&
      state.currentSessionId
    ) {
      queryAll<HTMLElement>(
        elements.turnsList,
        "[data-action='expand']",
      ).forEach((summary) => {
        summary.classList.add("open");
      });
      queryAll<HTMLElement>(elements.turnsList, ".turn-blocks-detail").forEach(
        (detail) => {
          detail.classList.add("open");
        },
      );
      queryAll<HTMLElement>(elements.turnsList, ".block-item-header").forEach(
        (header) => {
          header.classList.add("open");
        },
      );
    }
  });

  elements.resizeHandle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    state.dragging = true;
    elements.resizeHandle.classList.add("active");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    elements.previewIframe.style.pointerEvents = "none";
  });

  document.addEventListener("mousemove", (event) => {
    if (!state.dragging) return;
    const appRect = elements.appEl.getBoundingClientRect();
    const sidebarWidth =
      requiredQuery<HTMLElement>(".sidebar").getBoundingClientRect().width;
    const available = appRect.width - sidebarWidth - 4;
    const editorWidth = Math.max(
      100,
      Math.min(available - 100, event.clientX - appRect.left - sidebarWidth),
    );
    const previewWidth = available - editorWidth;
    elements.appEl.style.gridTemplateColumns = `${sidebarWidth}px ${editorWidth}px 4px ${previewWidth}px`;
  });

  document.addEventListener("mouseup", stopDrag);
  window.addEventListener("blur", stopDrag);

  document.addEventListener(
    "click",
    (event) => {
      state.lastClickShift = event.shiftKey;
    },
    true,
  );

  elements.turnsList.addEventListener("click", handleTurnClick);
  elements.turnsList.addEventListener("change", handleTurnChange);
  elements.turnsList.addEventListener("input", handleTurnInput);

  elements.sessionsSearch.addEventListener("input", () => {
    const raw = elements.sessionsSearch.value;
    if (state.contentSearchDebounce) {
      clearTimeout(state.contentSearchDebounce);
    }

    if (raw.startsWith("/")) {
      const query = raw.slice(1).trim();
      if (query.length < 3) {
        elements.sessionsTree.style.display = "none";
        elements.searchResults.style.display = "";
        elements.searchResults.innerHTML =
          '<div class="search-status">Type at least 3 characters to search content...</div>';
        return;
      }
      state.contentSearchDebounce = setTimeout(() => {
        void searchContent(query);
      }, 400);
      return;
    }

    filterSessionsByName(raw.toLowerCase().trim());
  });
}

async function bootstrap(): Promise<void> {
  registerEventListeners();
  await loadThemes();
  await loadSessions();
  autoLoadFromQuery();
}

void bootstrap();
