import type { EditorApiClient } from "./editor-app-api.js";
import { debounce, queryAll } from "./editor-app-dom.js";
import { bookmarkEntries, escapeHtml } from "./editor-app-render.js";
import { applySessionPayload, hasSessionChanges } from "./editor-app-store.js";
import type {
  AppElements,
  AppState,
  ExportOptions,
  OptionElements,
  RedactRule,
  SessionPayload,
} from "./editor-app-types.js";
import type { EditorUiActions } from "./editor-app-ui.js";

/**
 * Preview, export, reset, import, and option-gathering controller.
 */
export interface PreviewController {
  loadThemes(): Promise<void>;
  addRedactRule(search: string, replacement: string): void;
  gatherOptions(): ExportOptions;
  schedulePreview(): void;
  refreshPreview(): Promise<void>;
  doReset(): Promise<void>;
  doExport(): Promise<void>;
  doExportData(): Promise<void>;
  importHtmlReplay(): Promise<void>;
}

interface PreviewControllerDeps {
  api: EditorApiClient;
  state: AppState;
  elements: AppElements;
  options: OptionElements;
  ui: Pick<EditorUiActions, "showConfirm" | "updateEditState">;
  renderTurnsView(): void;
  applyLoadedSession(
    path: string,
    payload: SessionPayload,
    itemEl: HTMLElement | null,
  ): void;
}

function downloadFilename(title: string, extension: string): string {
  return `${(title || "replay").replace(/[^a-zA-Z0-9_-]/g, "_")}.${extension}`;
}

async function triggerDownload(
  response: Response,
  filename: string,
): Promise<void> {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function createPreviewController({
  api,
  state,
  elements,
  options,
  ui,
  renderTurnsView,
  applyLoadedSession,
}: PreviewControllerDeps): PreviewController {
  function getRedactRules(): RedactRule[] {
    const rules: RedactRule[] = [];
    queryAll<HTMLElement>(
      elements.redactRulesContainer,
      ".redact-rule",
    ).forEach((row) => {
      const inputs = queryAll<HTMLInputElement>(row, "input");
      if (inputs[0]?.value) {
        rules.push({
          search: inputs[0].value,
          replacement: inputs[1]?.value || "",
        });
      }
    });
    return rules;
  }

  function gatherOptions(): ExportOptions {
    return {
      theme: options.theme.value,
      speed: Number.parseFloat(options.speed.value) || 1,
      showThinking: options.thinking.checked,
      showToolCalls: options.toolCalls.checked,
      fontSize: options.fontSize.value,
      redactSecrets: options.redact.checked,
      redactRules: getRedactRules(),
      userLabel: options.userLabel.value || "User",
      assistantLabel: options.asstLabel.value || "",
      title: elements.titleInput.value || "Replay",
      description: options.desc.value || "",
      ogImage: options.ogImage.value || "",
      timing: options.timing.value,
      minified: options.minify.checked,
      compress: options.compress.checked,
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
    if (!state.currentSessionId) {
      return;
    }

    elements.refreshIndicator.classList.add("active");
    elements.previewIframe.classList.add("refreshing");
    try {
      const data = await api.renderPreview(
        state.currentSessionId,
        gatherOptions(),
      );
      if (state.previewBlobUrl) {
        URL.revokeObjectURL(state.previewBlobUrl);
      }
      state.previewBlobUrl = URL.createObjectURL(
        new Blob([data.html], { type: "text/html" }),
      );
      elements.previewIframe.addEventListener(
        "load",
        () => elements.previewIframe.classList.remove("refreshing"),
        { once: true },
      );
      elements.previewIframe.src = state.previewBlobUrl;
    } catch (error) {
      console.error("Preview failed:", error);
      elements.previewIframe.classList.remove("refreshing");
    } finally {
      elements.refreshIndicator.classList.remove("active");
    }
  }

  async function loadThemes(): Promise<void> {
    try {
      const themes = await api.listThemes();
      options.theme.innerHTML = themes
        .map(
          (themeName) =>
            `<option value="${escapeHtml(themeName)}" ${themeName === "workstreams" ? "selected" : ""}>${escapeHtml(themeName)}</option>`,
        )
        .join("");
    } catch {}
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

  async function doReset(): Promise<void> {
    if (!state.currentSessionId) {
      return;
    }

    if (hasSessionChanges(state)) {
      const ok = await ui.showConfirm(
        "Reset Session",
        "Reset all edits, excluded turns, and bookmarks to the original session?",
      );
      if (!ok) {
        return;
      }
    }

    try {
      const data = await api.resetSession(state.currentSessionId);
      applySessionPayload(state, data);
      ui.updateEditState(false);
      renderTurnsView();
      schedulePreview();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Reset failed: ${message}`);
    }
  }

  async function doExport(): Promise<void> {
    if (!state.currentSessionId) {
      return;
    }

    try {
      const response = await api.exportReplay(
        state.currentSessionId,
        gatherOptions(),
      );
      await triggerDownload(
        response,
        downloadFilename(elements.titleInput.value || "replay", "html"),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Export failed: ${message}`);
    }
  }

  async function doExportData(): Promise<void> {
    if (!state.currentSessionId) {
      return;
    }

    try {
      const response = await api.exportReplayData(
        state.currentSessionId,
        gatherOptions(),
      );
      await triggerDownload(
        response,
        downloadFilename(elements.titleInput.value || "replay", "json"),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Export failed: ${message}`);
    }
  }

  async function importHtmlReplay(): Promise<void> {
    const file = elements.importHtmlFile.files?.[0];
    if (!file) {
      return;
    }

    elements.importHtmlFile.value = "";

    try {
      const html = await file.text();
      const data = await api.importReplayHtml(html, file.name);
      applyLoadedSession(file.name, data, null);
      ui.updateEditState(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Import failed: ${message}`);
    }
  }

  return {
    loadThemes,
    addRedactRule,
    gatherOptions,
    schedulePreview,
    refreshPreview,
    doReset,
    doExport,
    doExportData,
    importHtmlReplay,
  };
}
