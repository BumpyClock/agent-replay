import { createEditorApiClient } from "./editor-app-api.js";
import {
  collectAppElements,
  collectOptionElements,
  debounce,
  requiredQuery,
} from "./editor-app-dom.js";
import { createPreviewController } from "./editor-app-preview.js";
import { createSessionController } from "./editor-app-sessions.js";
import { createAppState } from "./editor-app-store.js";
import { createTurnController } from "./editor-app-turns.js";
import type { AppElements, AppState } from "./editor-app-types.js";
import { createEditorUiActions } from "./editor-app-ui.js";

function stopDrag(state: AppState, elements: AppElements): void {
  if (!state.dragging) {
    return;
  }
  state.dragging = false;
  elements.resizeHandle.classList.remove("active");
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  elements.previewIframe.style.pointerEvents = "";
}

export async function bootstrapEditorApp(): Promise<void> {
  const state = createAppState();
  const elements = collectAppElements();
  const options = collectOptionElements();
  const api = createEditorApiClient();
  const ui = createEditorUiActions(state, elements);

  let schedulePreview = (): void => {};

  const turnController = createTurnController({
    api,
    state,
    elements,
    ui,
    schedulePreview: () => {
      schedulePreview();
    },
  });

  const sessionController = createSessionController({
    api,
    state,
    elements,
    ui,
    renderTurnsView: () => {
      turnController.renderTurnsView();
    },
    schedulePreview: () => {
      schedulePreview();
    },
  });

  const previewController = createPreviewController({
    api,
    state,
    elements,
    options,
    ui,
    renderTurnsView: () => {
      turnController.renderTurnsView();
    },
    applyLoadedSession: (path, payload, itemEl) => {
      sessionController.applyLoadedSession(path, payload, itemEl);
    },
  });

  schedulePreview = () => {
    previewController.schedulePreview();
  };

  const debouncedTextPreview = debounce(() => {
    schedulePreview();
  }, 300);

  elements.sidebarToggleBtn.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    elements.sidebarToggleBtn.innerHTML = collapsed ? "&#8250;" : "&#8249;";
    elements.appEl.style.gridTemplateColumns = "";
  });

  elements.sessionsToggle.addEventListener("click", () => {
    ui.toggleSidebarSection(elements.sessionsToggle, elements.sessionsSection);
  });

  elements.optionsToggle.addEventListener("click", () => {
    ui.toggleSidebarSection(elements.optionsToggle, elements.optionsSection);
  });

  elements.browseToggle.addEventListener("click", () => {
    elements.browseToggle.classList.toggle("open");
    elements.browseBody.style.display =
      elements.browseToggle.classList.contains("open") ? "block" : "none";
  });

  elements.browsePathInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    const path = elements.browsePathInput.value.trim();
    if (path) {
      void sessionController.browseTo(path);
    }
  });

  Object.values(options).forEach((element) => {
    element.addEventListener("change", () => {
      schedulePreview();
    });
  });

  [options.userLabel, options.asstLabel, options.desc, options.ogImage].forEach(
    (element) => {
      element.addEventListener("input", debouncedTextPreview);
    },
  );

  elements.addRuleBtn.addEventListener("click", () => {
    previewController.addRedactRule("", "[REDACTED]");
    schedulePreview();
  });

  elements.titleInput.addEventListener("input", debouncedTextPreview);

  elements.resetBtn.addEventListener("click", () => {
    void previewController.doReset();
  });
  elements.exportBtn.addEventListener("click", () => {
    void previewController.doExport();
  });
  elements.exportDataBtn.addEventListener("click", () => {
    void previewController.doExportData();
  });

  elements.importHtmlBtn.addEventListener("click", () => {
    elements.importHtmlFile.click();
  });
  elements.importHtmlFile.addEventListener("change", () => {
    void previewController.importHtmlReplay();
  });

  elements.selectAllBtn.addEventListener("click", () => {
    turnController.selectAllTurns();
  });

  elements.selectNoneBtn.addEventListener("click", () => {
    turnController.selectNoTurns();
  });

  elements.expandAllBtn.addEventListener("click", () => {
    turnController.expandAllTurnBlocks();
  });

  elements.collapseAllBtn.addEventListener("click", () => {
    turnController.collapseAllTurnBlocks();
  });

  elements.themeModeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.classList.toggle("light");
    document.documentElement.classList.toggle("dark", !isLight);
    const moon = elements.themeModeBtn.querySelector<SVGElement>(".icon-moon");
    const sun = elements.themeModeBtn.querySelector<SVGElement>(".icon-sun");
    if (moon) {
      moon.style.display = isLight ? "none" : "block";
    }
    if (sun) {
      sun.style.display = isLight ? "block" : "none";
    }
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
      turnController.expandAllTurnBlocks(true);
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
    if (!state.dragging) {
      return;
    }
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

  document.addEventListener("mouseup", () => {
    stopDrag(state, elements);
  });
  window.addEventListener("blur", () => {
    stopDrag(state, elements);
  });

  document.addEventListener(
    "click",
    (event) => {
      state.lastClickShift = event.shiftKey;
    },
    true,
  );

  elements.turnsList.addEventListener("click", (event) => {
    turnController.handleTurnClick(event);
  });
  elements.turnsList.addEventListener("change", (event) => {
    turnController.handleTurnChange(event);
  });
  elements.turnsList.addEventListener("input", (event) => {
    turnController.handleTurnInput(event);
  });

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
        void sessionController.searchContent(query);
      }, 400);
      return;
    }

    sessionController.filterSessionsByName(raw.toLowerCase().trim());
  });

  await previewController.loadThemes();
  await sessionController.loadSessions();
  sessionController.autoLoadFromQuery();
}
