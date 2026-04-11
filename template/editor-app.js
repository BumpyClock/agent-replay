(() => {
  // src/editor-app-render.ts
  function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function highlightSnippet(snippet, query) {
    const lower = snippet.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(snippet);
    return escapeHtml(snippet.slice(0, idx)) + "<mark>" + escapeHtml(snippet.slice(idx, idx + query.length)) + "</mark>" + escapeHtml(snippet.slice(idx + query.length));
  }
  function renderSessions(groups) {
    let html = "";
    for (const group of groups) {
      for (const project of group.projects) {
        const projectId = `proj-${escapeHtml(project.dirName)}`;
        html += `<div class="session-project">`;
        html += `<div class="session-project-name" data-target="${projectId}" title="${escapeHtml(project.dirName.replace(/^-+/, ""))}"><span class="arrow">&#9654;</span> ${escapeHtml(project.name)}</div>`;
        html += `<div class="session-list" id="${projectId}">`;
        for (const session of project.sessions) {
          const dateStr = session.date ? new Date(session.date).toLocaleDateString() : "";
          const sourceBadge = session.source ? `<span class="badge agent-badge agent-${escapeHtml(session.source.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(session.source)}</span>` : "";
          html += `<div class="session-item" data-path="${escapeHtml(session.path)}">${escapeHtml(session.file.replace(".jsonl", ""))} ${sourceBadge}<span class="badge">${dateStr}</span></div>`;
        }
        html += `</div></div>`;
      }
    }
    return html;
  }
  function renderSearchResults(results, query) {
    if (results.length === 0) {
      return '<div class="search-status">No matches found</div>';
    }
    let html = "";
    for (const result of results) {
      html += `<div class="search-result-item" data-path="${escapeHtml(result.path)}">`;
      const sourceBadge = result.source ? `<span class="badge agent-badge agent-${escapeHtml(result.source.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(result.source)}</span> ` : "";
      html += `<div class="search-result-meta">${sourceBadge}${escapeHtml(result.group)} / ${escapeHtml(result.file)}</div>`;
      html += `<div class="search-result-snippet">${highlightSnippet(result.snippet, query)}</div>`;
      html += `</div>`;
    }
    return html;
  }
  function renderBrowseResults(data) {
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
  function isToolUseSummaryBlock(block) {
    return block.kind === "tool_use";
  }
  function renderBlocks(blocks) {
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
  function renderTurns(turns, excludedTurns, bookmarks) {
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
  function bookmarkEntries(bookmarks) {
    return Array.from(bookmarks.entries()).map(([turn, label]) => ({
      turn,
      label
    }));
  }

  // src/editor-app.ts
  var state = {
    currentSessionId: null,
    currentTurns: [],
    excludedTurns: /* @__PURE__ */ new Set(),
    bookmarks: /* @__PURE__ */ new Map(),
    previewBlobUrl: null,
    dragging: false,
    hasTextEdits: false,
    lastToggleIndex: null,
    lastClickShift: false,
    contentSearchDebounce: null
  };
  function requiredElement(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing required element: ${id}`);
    }
    return element;
  }
  function requiredQuery(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Missing required element: ${selector}`);
    }
    return element;
  }
  function queryAll(root, selector) {
    return Array.from(root.querySelectorAll(selector));
  }
  function isElement(target) {
    return target instanceof Element;
  }
  function isInputLike(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  }
  function isCheckboxInput(target) {
    return target instanceof HTMLInputElement;
  }
  function debounce(fn, ms) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }
  async function api(method, path, body) {
    const options = { method, headers: {} };
    if (body !== void 0) {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(body);
    }
    const response = await fetch(path, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return response;
  }
  async function apiJson(method, path, body) {
    return (await api(method, path, body)).json();
  }
  var elements = {
    appEl: requiredQuery(".app"),
    sidebarToggleBtn: requiredElement("sidebarToggleBtn"),
    titleInput: requiredElement("titleInput"),
    resetBtn: requiredElement("resetBtn"),
    exportBtn: requiredElement("exportBtn"),
    exportDataBtn: requiredElement("exportDataBtn"),
    importHtmlBtn: requiredElement("importHtmlBtn"),
    importHtmlFile: requiredElement("importHtmlFile"),
    themeModeBtn: requiredElement("themeModeBtn"),
    helpBtn: requiredElement("helpBtn"),
    confirmModal: requiredElement("confirmModal"),
    confirmTitle: requiredElement("confirmTitle"),
    confirmMessage: requiredElement("confirmMessage"),
    confirmOk: requiredElement("confirmOk"),
    confirmCancel: requiredElement("confirmCancel"),
    helpModal: requiredElement("helpModal"),
    helpModalClose: requiredElement("helpModalClose"),
    sessionsToggle: requiredElement("sessionsToggle"),
    sessionsSection: requiredElement("sessionsSection"),
    optionsToggle: requiredElement("optionsToggle"),
    optionsSection: requiredElement("optionsSection"),
    sessionsTree: requiredElement("sessionsTree"),
    sessionsSearch: requiredElement("sessionsSearch"),
    searchResults: requiredElement("searchResults"),
    browseToggle: requiredElement("browseToggle"),
    browseBody: requiredElement("browseBody"),
    browsePathInput: requiredElement("browsePathInput"),
    browseList: requiredElement("browseList"),
    turnsToolbar: requiredElement("turnsToolbar"),
    selectAllBtn: requiredElement("selectAllBtn"),
    selectNoneBtn: requiredElement("selectNoneBtn"),
    expandAllBtn: requiredElement("expandAllBtn"),
    collapseAllBtn: requiredElement("collapseAllBtn"),
    turnsList: requiredElement("turnsList"),
    previewIframe: requiredElement("previewIframe"),
    refreshIndicator: requiredElement("refreshIndicator"),
    resizeHandle: requiredElement("resizeHandle"),
    redactRulesContainer: requiredElement("redactRules"),
    addRuleBtn: requiredElement("addRuleBtn"),
    helpVersion: requiredElement("helpVersion")
  };
  var opt = {
    theme: requiredElement("optTheme"),
    speed: requiredElement("optSpeed"),
    thinking: requiredElement("optThinking"),
    toolCalls: requiredElement("optToolCalls"),
    fontSize: requiredElement("optFontSize"),
    redact: requiredElement("optRedact"),
    userLabel: requiredElement("optUserLabel"),
    asstLabel: requiredElement("optAssistantLabel"),
    desc: requiredElement("optDescription"),
    ogImage: requiredElement("optOgImage"),
    timing: requiredElement("optTiming"),
    minify: requiredElement("optMinify"),
    compress: requiredElement("optCompress")
  };
  function toggleSidebarSection(toggle, section) {
    toggle.classList.toggle("open");
    section.classList.toggle("open");
  }
  function showOptionsPanel() {
    elements.optionsToggle.classList.add("open");
    elements.optionsSection.classList.add("open");
  }
  function showConfirm(title, message) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmModal.classList.add("open");
    return new Promise((resolve) => {
      function cleanup() {
        elements.confirmModal.classList.remove("open");
        elements.confirmOk.removeEventListener("click", onOk);
        elements.confirmCancel.removeEventListener("click", onCancel);
      }
      function onOk() {
        cleanup();
        resolve(true);
      }
      function onCancel() {
        cleanup();
        resolve(false);
      }
      elements.confirmOk.addEventListener("click", onOk);
      elements.confirmCancel.addEventListener("click", onCancel);
    });
  }
  function updateEditState(textEdits) {
    if (textEdits !== void 0) {
      state.hasTextEdits = textEdits;
    }
    const hasChanges = state.hasTextEdits || state.excludedTurns.size > 0 || state.bookmarks.size > 0;
    elements.resetBtn.classList.toggle("btn-warn", hasChanges);
    const activeItem = document.querySelector(
      ".session-item.active"
    );
    if (activeItem) {
      activeItem.classList.toggle("edited", hasChanges);
    }
  }
  function bindRenderedSessionTree() {
    queryAll(elements.sessionsTree, ".session-project-name").forEach(
      (element) => {
        element.addEventListener("click", () => {
          element.classList.toggle("open");
          const listId = element.dataset.target;
          if (!listId) return;
          document.getElementById(listId)?.classList.toggle("open");
        });
      }
    );
    queryAll(elements.sessionsTree, ".session-item").forEach(
      (element) => {
        element.addEventListener("click", () => {
          const path = element.dataset.path;
          if (path) {
            void loadSession(path, element);
          }
        });
      }
    );
  }
  async function loadSessions() {
    try {
      const data = await apiJson("GET", "/api/sessions");
      if (data.homedir) elements.browsePathInput.value = data.homedir;
      if (data.version) elements.helpVersion.textContent = `v${data.version}`;
      if (data.groups.length === 0) {
        elements.sessionsTree.innerHTML = '<div class="empty-state empty-state-hint">No sessions found in default locations.</div>';
        return;
      }
      elements.sessionsTree.innerHTML = renderSessions(data.groups);
      bindRenderedSessionTree();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      elements.sessionsTree.innerHTML = `<div class="empty-state empty-state-error">Failed to load sessions: ${escapeHtml(message)}</div>`;
    }
  }
  function filterSessionsByName(query) {
    elements.searchResults.style.display = "none";
    elements.sessionsTree.style.display = "";
    queryAll(elements.sessionsTree, ".session-project").forEach(
      (project) => {
        const projectName = project.querySelector(".session-project-name")?.textContent?.toLowerCase() || "";
        const items = queryAll(project, ".session-item");
        let anyVisible = false;
        items.forEach((item) => {
          const text = item.textContent?.toLowerCase() || "";
          const match = query.length === 0 || text.includes(query) || projectName.includes(query);
          item.style.display = match ? "" : "none";
          if (match) anyVisible = true;
        });
        project.style.display = anyVisible ? "" : "none";
        if (anyVisible && query.length > 0) {
          project.querySelector(".session-project-name")?.classList.add("open");
          project.querySelector(".session-list")?.classList.add("open");
        }
      }
    );
  }
  async function searchContent(query) {
    elements.sessionsTree.style.display = "none";
    elements.searchResults.style.display = "";
    elements.searchResults.innerHTML = '<div class="search-status">Searching...</div>';
    try {
      const data = await apiJson("POST", "/api/search", {
        query
      });
      elements.searchResults.innerHTML = renderSearchResults(data.results, query);
      queryAll(
        elements.searchResults,
        ".search-result-item"
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
  function bindBrowseList() {
    queryAll(elements.browseList, "[data-browse]").forEach(
      (element) => {
        element.addEventListener("click", () => {
          const browsePath = element.dataset.browse;
          if (browsePath) {
            void browseTo(browsePath);
          }
        });
      }
    );
    queryAll(elements.browseList, "[data-path]").forEach(
      (element) => {
        element.addEventListener("click", () => {
          queryAll(document, ".session-item.active").forEach(
            (item) => {
              item.classList.remove("active");
            }
          );
          element.classList.add("selected");
          const path = element.dataset.path;
          if (path) {
            void loadSession(path, null);
          }
        });
      }
    );
  }
  async function browseTo(path) {
    try {
      const data = await apiJson("POST", "/api/browse", {
        path
      });
      elements.browsePathInput.value = data.path;
      elements.browseList.innerHTML = renderBrowseResults(data);
      bindBrowseList();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      elements.browseList.innerHTML = `<div class="browse-item browse-error">${escapeHtml(message)}</div>`;
    }
  }
  function renderTurnsView() {
    elements.turnsList.innerHTML = renderTurns(
      state.currentTurns,
      state.excludedTurns,
      state.bookmarks
    );
  }
  async function loadSession(path, itemEl) {
    queryAll(document, ".session-item.active").forEach((element) => {
      element.classList.remove("active");
    });
    if (itemEl) {
      itemEl.classList.add("active");
    }
    try {
      const data = await apiJson("POST", "/api/load", { path });
      state.currentSessionId = data.sessionId;
      state.currentTurns = data.turns;
      state.excludedTurns = new Set(data.excludedTurns || []);
      state.bookmarks = new Map(
        (data.bookmarks || []).map((bookmark) => [bookmark.turn, bookmark.label])
      );
      state.lastToggleIndex = null;
      const filename = path.split(/[/\\]/).pop()?.replace(/\.(jsonl|html)$/, "") || "replay";
      elements.titleInput.value = `Replay \u2014 ${filename}`;
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
  function setTurnChecked(index, checked) {
    const checkbox = elements.turnsList.querySelector(
      `input[data-action="toggle"][data-index="${index}"]`
    );
    if (!checkbox) return;
    checkbox.checked = checked;
    if (checked) {
      state.excludedTurns.delete(index);
    } else {
      state.excludedTurns.add(index);
    }
    const card = checkbox.closest(".turn-card");
    card?.classList.toggle("excluded", !checked);
    if (!checked) {
      card?.querySelector("[data-action='expand']")?.classList.remove("open");
      card?.querySelector(".turn-blocks-detail")?.classList.remove("open");
    }
  }
  function handleTurnClick(event) {
    if (!isElement(event.target)) return;
    const blockHeader = event.target.closest(".block-item-header");
    if (blockHeader) {
      blockHeader.classList.toggle("open");
      return;
    }
    const summary = event.target.closest("[data-action='expand']");
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
    const header = event.target.closest(".turn-card-header");
    if (header && !event.target.closest("input")) {
      const card = header.closest(".turn-card");
      const index = Number.parseInt(card?.dataset.index || "", 10);
      if (!index || !elements.previewIframe.contentWindow) return;
      const included = state.currentTurns.filter(
        (turn) => !state.excludedTurns.has(turn.index)
      );
      const position = included.findIndex((turn) => turn.index === index);
      if (position >= 0) {
        try {
          elements.previewIframe.contentWindow.location.hash = `#turn=${position + 1}`;
        } catch {
        }
      }
    }
  }
  function handleTurnChange(event) {
    if (!isInputLike(event.target)) return;
    const action = event.target.dataset.action;
    const index = Number.parseInt(event.target.dataset.index || "", 10);
    if (!action || Number.isNaN(index)) return;
    if (action === "toggle") {
      if (!isCheckboxInput(event.target)) return;
      const checked = event.target.checked;
      if (state.lastClickShift && state.lastToggleIndex !== null && state.lastToggleIndex !== index) {
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
        const card = event.target.closest(".turn-card");
        card?.classList.toggle("excluded", !checked);
        if (!checked) {
          card?.querySelector("[data-action='expand']")?.classList.remove("open");
          card?.querySelector(".turn-blocks-detail")?.classList.remove("open");
        }
      }
      state.lastToggleIndex = index;
      updateEditState();
      schedulePreview();
      return;
    }
    if (action === "bookmark") {
      if (!isCheckboxInput(event.target)) return;
      const labelInput = elements.turnsList.querySelector(
        `input[data-action="bookmark-label"][data-index="${index}"]`
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
  var debouncedEdit = debounce(
    (sessionId, turnIndex, userText) => {
      if (sessionId !== state.currentSessionId) return;
      void apiJson("POST", "/api/edit", {
        sessionId,
        turnIndex,
        user_text: userText
      }).then((data) => {
        updateEditState(data.hasEdits);
        schedulePreview();
      }).catch((error) => {
        console.error("Edit failed:", error);
      });
    },
    300
  );
  function handleTurnInput(event) {
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
  async function loadThemes() {
    try {
      const themes = await apiJson("GET", "/api/themes");
      opt.theme.innerHTML = themes.map(
        (themeName) => `<option value="${escapeHtml(themeName)}" ${themeName === "workstreams" ? "selected" : ""}>${escapeHtml(themeName)}</option>`
      ).join("");
    } catch {
    }
  }
  function addRedactRule(search, replacement) {
    const row = document.createElement("div");
    row.className = "redact-rule";
    row.innerHTML = `<input type="text" placeholder="Search text" value="${escapeHtml(search)}">
      <span class="arrow">&rarr;</span>
      <input type="text" placeholder="Replacement" value="${escapeHtml(replacement)}">
      <button type="button" class="remove-rule">&times;</button>`;
    elements.redactRulesContainer.appendChild(row);
    row.querySelector(".remove-rule")?.addEventListener("click", () => {
      row.remove();
      schedulePreview();
    });
    queryAll(row, "input").forEach((input) => {
      input.addEventListener(
        "input",
        debounce(() => {
          schedulePreview();
        }, 300)
      );
    });
  }
  function getRedactRules() {
    const rules = [];
    queryAll(elements.redactRulesContainer, ".redact-rule").forEach(
      (row) => {
        const inputs = queryAll(row, "input");
        if (inputs[0]?.value) {
          rules.push({
            search: inputs[0].value,
            replacement: inputs[1]?.value || ""
          });
        }
      }
    );
    return rules;
  }
  function gatherOptions() {
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
      bookmarks: bookmarkEntries(state.bookmarks)
    };
  }
  var debouncedPreview = debounce(() => {
    void refreshPreview();
  }, 150);
  function schedulePreview() {
    if (state.currentSessionId) {
      debouncedPreview();
    }
  }
  async function refreshPreview() {
    if (!state.currentSessionId) return;
    elements.refreshIndicator.classList.add("active");
    try {
      const data = await apiJson("POST", "/api/preview", {
        sessionId: state.currentSessionId,
        options: gatherOptions()
      });
      if (state.previewBlobUrl) {
        URL.revokeObjectURL(state.previewBlobUrl);
      }
      state.previewBlobUrl = URL.createObjectURL(
        new Blob([data.html], { type: "text/html" })
      );
      elements.previewIframe.src = state.previewBlobUrl;
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      elements.refreshIndicator.classList.remove("active");
    }
  }
  async function doReset() {
    if (!state.currentSessionId) return;
    const hasChanges = state.hasTextEdits || state.excludedTurns.size > 0 || state.bookmarks.size > 0;
    if (hasChanges) {
      const ok = await showConfirm(
        "Reset Session",
        "Reset all edits, excluded turns, and bookmarks to the original session?"
      );
      if (!ok) return;
    }
    try {
      const data = await apiJson("POST", "/api/reset", {
        sessionId: state.currentSessionId
      });
      state.currentTurns = data.turns;
      state.excludedTurns = /* @__PURE__ */ new Set();
      state.bookmarks = /* @__PURE__ */ new Map();
      updateEditState(false);
      renderTurnsView();
      schedulePreview();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Reset failed: ${message}`);
    }
  }
  async function doExport() {
    if (!state.currentSessionId) return;
    try {
      const response = await api("POST", "/api/export", {
        sessionId: state.currentSessionId,
        options: gatherOptions()
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = (elements.titleInput.value || "replay").replace(/[^a-zA-Z0-9_-]/g, "_") + ".html";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Export failed: ${message}`);
    }
  }
  async function doExportData() {
    if (!state.currentSessionId) return;
    try {
      const response = await api("POST", "/api/export-data", {
        sessionId: state.currentSessionId,
        options: gatherOptions()
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = (elements.titleInput.value || "replay").replace(/[^a-zA-Z0-9_-]/g, "_") + ".json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Export failed: ${message}`);
    }
  }
  function stopDrag() {
    if (!state.dragging) return;
    state.dragging = false;
    elements.resizeHandle.classList.remove("active");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    elements.previewIframe.style.pointerEvents = "";
  }
  async function importHtmlReplay() {
    const file = elements.importHtmlFile.files?.[0];
    if (!file) return;
    elements.importHtmlFile.value = "";
    try {
      const html = await file.text();
      const data = await apiJson("POST", "/api/import", {
        html,
        filename: file.name
      });
      state.currentSessionId = data.sessionId;
      state.currentTurns = data.turns;
      state.excludedTurns = new Set(data.excludedTurns || []);
      state.bookmarks = new Map(
        (data.bookmarks || []).map((bookmark) => [bookmark.turn, bookmark.label])
      );
      const filename = file.name.replace(/\.html$/, "");
      elements.titleInput.value = `Replay \u2014 ${filename}`;
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
  function autoLoadFromQuery() {
    const loadParam = new URLSearchParams(window.location.search).get("load");
    if (!loadParam) return;
    let item = elements.sessionsTree.querySelector(
      `.session-item[data-path="${CSS.escape(loadParam)}"]`
    );
    if (!item) {
      const filename = loadParam.split(/[/\\]/).pop();
      for (const element of queryAll(
        elements.sessionsTree,
        ".session-item"
      )) {
        if (filename && element.dataset.path?.endsWith(filename)) {
          item = element;
          break;
        }
      }
    }
    if (item) {
      const project = item.closest(".session-project");
      project?.querySelector(".session-project-name")?.classList.add("open");
      project?.querySelector(".session-list")?.classList.add("open");
    }
    void loadSession(loadParam, item);
    history.replaceState(null, "", window.location.pathname);
  }
  function registerEventListeners() {
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
      elements.browseBody.style.display = elements.browseToggle.classList.contains("open") ? "block" : "none";
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
        }, 300)
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
      }, 300)
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
      queryAll(
        elements.turnsList,
        "[data-action='toggle']"
      ).forEach((checkbox) => {
        checkbox.checked = true;
      });
      queryAll(elements.turnsList, ".turn-card").forEach((card) => {
        card.classList.remove("excluded");
      });
      updateEditState();
      schedulePreview();
    });
    elements.selectNoneBtn.addEventListener("click", () => {
      state.currentTurns.forEach((turn) => {
        state.excludedTurns.add(turn.index);
      });
      queryAll(
        elements.turnsList,
        "[data-action='toggle']"
      ).forEach((checkbox) => {
        checkbox.checked = false;
      });
      queryAll(elements.turnsList, ".turn-card").forEach((card) => {
        card.classList.add("excluded");
      });
      queryAll(elements.turnsList, "[data-action='expand']").forEach(
        (summary) => {
          summary.classList.remove("open");
        }
      );
      queryAll(elements.turnsList, ".turn-blocks-detail").forEach(
        (detail) => {
          detail.classList.remove("open");
        }
      );
      updateEditState();
      schedulePreview();
    });
    elements.expandAllBtn.addEventListener("click", () => {
      queryAll(elements.turnsList, "[data-action='expand']").forEach(
        (summary) => {
          summary.classList.add("open");
        }
      );
      queryAll(elements.turnsList, ".turn-blocks-detail").forEach(
        (detail) => {
          detail.classList.add("open");
        }
      );
    });
    elements.collapseAllBtn.addEventListener("click", () => {
      queryAll(elements.turnsList, "[data-action='expand']").forEach(
        (summary) => {
          summary.classList.remove("open");
        }
      );
      queryAll(elements.turnsList, ".turn-blocks-detail").forEach(
        (detail) => {
          detail.classList.remove("open");
        }
      );
    });
    elements.themeModeBtn.addEventListener("click", () => {
      const isLight = document.documentElement.classList.toggle("light");
      document.documentElement.classList.toggle("dark", !isLight);
      const moon = elements.themeModeBtn.querySelector(".icon-moon");
      const sun = elements.themeModeBtn.querySelector(".icon-sun");
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
      if (event.key === "Escape" && elements.helpModal.classList.contains("open")) {
        elements.helpModal.classList.remove("open");
      }
      if (event.key === "Escape" && elements.confirmModal.classList.contains("open")) {
        elements.confirmCancel.click();
      }
      if (event.key === "f" && (event.ctrlKey || event.metaKey) && state.currentSessionId) {
        queryAll(
          elements.turnsList,
          "[data-action='expand']"
        ).forEach((summary) => {
          summary.classList.add("open");
        });
        queryAll(elements.turnsList, ".turn-blocks-detail").forEach(
          (detail) => {
            detail.classList.add("open");
          }
        );
        queryAll(elements.turnsList, ".block-item-header").forEach(
          (header) => {
            header.classList.add("open");
          }
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
      const sidebarWidth = requiredQuery(".sidebar").getBoundingClientRect().width;
      const available = appRect.width - sidebarWidth - 4;
      const editorWidth = Math.max(
        100,
        Math.min(available - 100, event.clientX - appRect.left - sidebarWidth)
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
      true
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
          elements.searchResults.innerHTML = '<div class="search-status">Type at least 3 characters to search content...</div>';
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
  async function bootstrap() {
    registerEventListeners();
    await loadThemes();
    await loadSessions();
    autoLoadFromQuery();
  }
  void bootstrap();
})();
