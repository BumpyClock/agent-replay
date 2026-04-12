import type { EditorApiClient } from "./editor-app-api.js";
import { queryAll } from "./editor-app-dom.js";
import {
  escapeHtml,
  renderBrowseResults,
  renderSearchResults,
  renderSessions,
} from "./editor-app-render.js";
import { applySessionPayload } from "./editor-app-store.js";
import type {
  AppElements,
  AppState,
  SessionPayload,
} from "./editor-app-types.js";
import type { EditorUiActions } from "./editor-app-ui.js";

/**
 * Session tree, search, browse, and session-loading controller.
 */
export interface SessionController {
  loadSessions(): Promise<void>;
  filterSessionsByName(query: string): void;
  searchContent(query: string): Promise<void>;
  browseTo(path: string): Promise<void>;
  loadSession(path: string, itemEl: HTMLElement | null): Promise<void>;
  applyLoadedSession(
    path: string,
    payload: SessionPayload,
    itemEl: HTMLElement | null,
  ): void;
  autoLoadFromQuery(): void;
}

interface SessionControllerDeps {
  api: EditorApiClient;
  state: AppState;
  elements: AppElements;
  ui: Pick<EditorUiActions, "showOptionsPanel" | "updateEditState">;
  renderTurnsView(): void;
  schedulePreview(): void;
}

export function createSessionController({
  api,
  state,
  elements,
  ui,
  renderTurnsView,
  schedulePreview,
}: SessionControllerDeps): SessionController {
  function bindRenderedSessionTree(): void {
    queryAll<HTMLElement>(
      elements.sessionsTree,
      ".session-project-name",
    ).forEach((element) => {
      element.addEventListener("click", () => {
        element.classList.toggle("open");
        const listId = element.dataset.target;
        if (!listId) {
          return;
        }
        document.getElementById(listId)?.classList.toggle("open");
      });
    });

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

  function applyLoadedSession(
    path: string,
    payload: SessionPayload,
    itemEl: HTMLElement | null,
  ): void {
    queryAll<HTMLElement>(document, ".session-item.active").forEach(
      (element) => {
        element.classList.remove("active");
      },
    );
    if (itemEl) {
      itemEl.classList.add("active");
    }

    applySessionPayload(state, payload);

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

    ui.updateEditState(payload.hasEdits || false);
    ui.showOptionsPanel();
    elements.turnsToolbar.classList.add("visible");
    renderTurnsView();
    schedulePreview();
  }

  async function loadSessions(): Promise<void> {
    try {
      const data = await api.listSessions();
      if (data.homedir) {
        elements.browsePathInput.value = data.homedir;
      }
      if (data.version) {
        elements.helpVersion.textContent = `v${data.version}`;
      }

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
          if (match) {
            anyVisible = true;
          }
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
      const data = await api.searchSessions(query);
      elements.searchResults.innerHTML = renderSearchResults(
        data.results,
        query,
      );
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

  async function browseTo(path: string): Promise<void> {
    try {
      const data = await api.browseDirectory(path);
      elements.browsePathInput.value = data.path;
      elements.browseList.innerHTML = renderBrowseResults(data);
      bindBrowseList();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      elements.browseList.innerHTML = `<div class="browse-item browse-error">${escapeHtml(message)}</div>`;
    }
  }

  async function loadSession(
    path: string,
    itemEl: HTMLElement | null,
  ): Promise<void> {
    try {
      const data = await api.loadSession(path);
      applyLoadedSession(path, data, itemEl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Failed to load session: ${message}`);
    }
  }

  function autoLoadFromQuery(): void {
    const loadParam = new URLSearchParams(window.location.search).get("load");
    if (!loadParam) {
      return;
    }

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
      project
        .querySelector<HTMLElement>(".session-list")
        ?.classList.add("open");
    }

    void loadSession(loadParam, item);
    history.replaceState(null, "", window.location.pathname);
  }

  return {
    loadSessions,
    filterSessionsByName,
    searchContent,
    browseTo,
    loadSession,
    applyLoadedSession,
    autoLoadFromQuery,
  };
}
