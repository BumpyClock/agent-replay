import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { createEditorApiClient } from "../../src/editor-app-api.js";
import type {
  BrowseDirectoryResponse,
  EditorTurnSummary,
  ExportOptions,
  RedactRule,
  SearchResult,
  SessionGroup,
  SessionPayload,
} from "../../src/editor-app-types.js";
import { Modal } from "./components/Modal.js";
import { PreviewPane } from "./components/PreviewPane.js";
import { SessionSidebar } from "./components/SessionSidebar.js";
import { TurnsPanel } from "./components/TurnsPanel.js";
import { DEFAULT_EXPORT_OPTIONS } from "./editor-defaults.js";
import {
  allBlockKeys,
  blockKey,
  bookmarksToMap,
  filterSessionGroups,
  mapToBookmarks,
  removeEmptyRedactRules,
  replaceTurnText,
  titleFromPath,
} from "./helpers.js";

const api = createEditorApiClient();

const EXPANDED_SIDEBAR_WIDTH = 256;
const COLLAPSED_SIDEBAR_WIDTH = 16;
const RESIZE_HANDLE_WIDTH = 12;
const MIN_EDITOR_WIDTH = 320;
const MIN_PREVIEW_WIDTH = 360;

async function triggerDownload(
  response: Response,
  fallbackFilename: string,
): Promise<void> {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    response.headers
      .get("content-disposition")
      ?.match(/filename="([^"]+)"/)?.[1] || fallbackFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function App() {
  const appRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const editTimersRef = useRef(
    new Map<number, ReturnType<typeof setTimeout>>(),
  );
  const dragStateRef = useRef<{
    handle: HTMLButtonElement;
    pointerId: number;
  } | null>(null);
  const lastToggleIndexRef = useRef<number | null>(null);
  const autoloadedRef = useRef(false);

  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [version, setVersion] = useState("");
  const [themeOptions, setThemeOptions] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [browsePath, setBrowsePath] = useState("");
  const [browseResults, setBrowseResults] =
    useState<BrowseDirectoryResponse | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [turns, setTurns] = useState<EditorTurnSummary[]>([]);
  const [excludedTurns, setExcludedTurns] = useState<Set<number>>(new Set());
  const [bookmarks, setBookmarks] = useState<Map<number, string>>(new Map());
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [hasTextEdits, setHasTextEdits] = useState(false);
  const [title, setTitle] = useState(DEFAULT_EXPORT_OPTIONS.title);
  const [exportOptions, setExportOptions] = useState({
    theme: DEFAULT_EXPORT_OPTIONS.theme,
    speed: DEFAULT_EXPORT_OPTIONS.speed,
    showThinking: DEFAULT_EXPORT_OPTIONS.showThinking,
    showToolCalls: DEFAULT_EXPORT_OPTIONS.showToolCalls,
    fontSize: DEFAULT_EXPORT_OPTIONS.fontSize,
    redactSecrets: DEFAULT_EXPORT_OPTIONS.redactSecrets,
    redactRules: DEFAULT_EXPORT_OPTIONS.redactRules,
    userLabel: DEFAULT_EXPORT_OPTIONS.userLabel,
    assistantLabel: DEFAULT_EXPORT_OPTIONS.assistantLabel,
    description: DEFAULT_EXPORT_OPTIONS.description,
    ogImage: DEFAULT_EXPORT_OPTIONS.ogImage,
    timing: DEFAULT_EXPORT_OPTIONS.timing,
    minified: DEFAULT_EXPORT_OPTIONS.minified,
    compress: DEFAULT_EXPORT_OPTIONS.compress,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [colorMode, setColorMode] = useState<"dark" | "light">("light");
  const [editorWidth, setEditorWidth] = useState(520);
  const [isResizing, setIsResizing] = useState(false);

  const deferredSearchValue = useDeferredValue(searchValue);
  const hasChanges =
    hasTextEdits || excludedTurns.size > 0 || bookmarks.size > 0;
  const sidebarWidth = sidebarCollapsed
    ? COLLAPSED_SIDEBAR_WIDTH
    : EXPANDED_SIDEBAR_WIDTH;

  const buildExportOptions = useEffectEvent(
    (): ExportOptions => ({
      ...exportOptions,
      title: title || DEFAULT_EXPORT_OPTIONS.title,
      excludeTurns: Array.from(excludedTurns),
      bookmarks: mapToBookmarks(bookmarks),
      redactRules: removeEmptyRedactRules(exportOptions.redactRules),
    }),
  );

  const refreshPreview = useEffectEvent(async () => {
    if (!currentSessionId) {
      return;
    }

    setRefreshing(true);
    try {
      const data = await api.renderPreview(
        currentSessionId,
        buildExportOptions(),
      );
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const nextUrl = URL.createObjectURL(
        new Blob([data.html], { type: "text/html" }),
      );
      previewUrlRef.current = nextUrl;
      setPreviewUrl(nextUrl);
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      setRefreshing(false);
    }
  });

  const schedulePreview = useEffectEvent((delay = 150) => {
    if (!currentSessionId) {
      return;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = setTimeout(() => {
      void refreshPreview();
    }, delay);
  });

  const applyLoadedSession = useEffectEvent(
    (path: string, payload: SessionPayload) => {
      for (const timer of editTimersRef.current.values()) {
        clearTimeout(timer);
      }
      editTimersRef.current.clear();
      setCurrentSessionId(payload.sessionId);
      setActivePath(path);
      setTurns(payload.turns);
      setExcludedTurns(new Set(payload.excludedTurns));
      setBookmarks(bookmarksToMap(payload.bookmarks));
      setExpandedTurns(new Set());
      setExpandedBlocks(new Set());
      setHasTextEdits(payload.hasEdits);
      setTitle(titleFromPath(path));
      setSessionsOpen(true);
      setOptionsOpen(true);
      setSearchResults(null);
      setSearchStatus(null);
    },
  );

  function getResizeBounds() {
    if (!appRef.current) {
      return null;
    }

    const rect = appRef.current.getBoundingClientRect();
    const maxWidth = Math.max(
      MIN_EDITOR_WIDTH,
      rect.width - sidebarWidth - RESIZE_HANDLE_WIDTH - MIN_PREVIEW_WIDTH,
    );

    return {
      appLeft: rect.left,
      maxWidth,
      minWidth: MIN_EDITOR_WIDTH,
      sidebarWidth,
    };
  }

  function clampEditorWidth(nextWidth: number) {
    const bounds = getResizeBounds();
    if (!bounds) {
      return nextWidth;
    }

    return Math.min(bounds.maxWidth, Math.max(bounds.minWidth, nextWidth));
  }

  function updateEditorWidthFromPointer(clientX: number) {
    const bounds = getResizeBounds();
    if (!bounds) {
      return;
    }

    const nextWidth = clampEditorWidth(
      clientX - bounds.appLeft - bounds.sidebarWidth,
    );
    setEditorWidth(nextWidth);
  }

  const syncEditorWidth = useEffectEvent(() => {
    setEditorWidth((current) => clampEditorWidth(current));
  });

  const stopResize = useEffectEvent(() => {
    const dragState = dragStateRef.current;
    if (
      dragState?.handle.isConnected &&
      dragState.handle.hasPointerCapture(dragState.pointerId)
    ) {
      dragState.handle.releasePointerCapture(dragState.pointerId);
    }

    dragStateRef.current = null;
    setIsResizing(false);
  });

  useEffect(() => {
    async function loadBootData() {
      try {
        const [themes, sessions] = await Promise.all([
          api.listThemes(),
          api.listSessions(),
        ]);
        setThemeOptions(themes);
        setExportOptions((current) => ({
          ...current,
          theme:
            current.theme ||
            (themes.includes("workstreams")
              ? "workstreams"
              : themes[0] || current.theme),
        }));
        setSessionGroups(sessions.groups);
        setBrowsePath(sessions.homedir || "");
        setVersion(sessions.version || "");
      } catch (error) {
        console.error("Failed to load editor boot data:", error);
      }
    }

    void loadBootData();

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
      for (const timer of editTimersRef.current.values()) {
        clearTimeout(timer);
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      schedulePreview(0);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (!deferredSearchValue.startsWith("/")) {
      setSearchResults(null);
      setSearchStatus(null);
      return;
    }

    const query = deferredSearchValue.slice(1).trim();
    if (query.length < 3) {
      setSearchResults([]);
      setSearchStatus("Type at least 3 characters to search content...");
      return;
    }

    let cancelled = false;
    setSearchResults([]);
    setSearchStatus("Searching...");
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchSessions(query);
        if (cancelled) {
          return;
        }
        setSearchResults(data.results);
        setSearchStatus(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setSearchResults([]);
        setSearchStatus(`Search failed: ${message}`);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deferredSearchValue]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHelpOpen(false);
        setResetConfirmOpen(false);
        return;
      }
      if (
        event.key === "f" &&
        (event.ctrlKey || event.metaKey) &&
        currentSessionId
      ) {
        setExpandedTurns(new Set(turns.map((turn) => turn.index)));
        setExpandedBlocks(allBlockKeys(turns));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSessionId, turns]);

  useEffect(() => {
    syncEditorWidth();
    window.addEventListener("resize", syncEditorWidth);
    window.addEventListener("blur", stopResize);
    return () => {
      window.removeEventListener("resize", syncEditorWidth);
      window.removeEventListener("blur", stopResize);
    };
  }, []);

  const browse = useEffectEvent(async (path: string) => {
    try {
      const data = await api.browseDirectory(path);
      setBrowseResults(data);
      setBrowsePath(data.path);
      setBrowseError(null);
      setBrowseOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setBrowseError(message);
    }
  });

  const loadSession = useEffectEvent(async (path: string) => {
    try {
      const payload = await api.loadSession(path);
      applyLoadedSession(path, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Failed to load session: ${message}`);
    }
  });

  useEffect(() => {
    if (autoloadedRef.current || sessionGroups.length === 0) {
      return;
    }
    autoloadedRef.current = true;
    const loadParam = new URLSearchParams(window.location.search).get("load");
    if (!loadParam) {
      return;
    }
    void loadSession(loadParam);
    history.replaceState(null, "", window.location.pathname);
  }, [sessionGroups]);

  function updateOption(
    field: keyof typeof exportOptions,
    value: string | number | boolean,
  ) {
    setExportOptions((current) => ({ ...current, [field]: value }));
    schedulePreview();
  }

  function updateRedactRule(
    index: number,
    field: keyof RedactRule,
    value: string,
  ) {
    setExportOptions((current) => {
      const nextRules = current.redactRules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, [field]: value } : rule,
      );
      return { ...current, redactRules: nextRules };
    });
    schedulePreview();
  }

  function toggleTurn(index: number, checked: boolean, shiftKey: boolean) {
    const nextExcluded = new Set(excludedTurns);
    const lastToggleIndex = lastToggleIndexRef.current;
    const targetIndices =
      shiftKey && lastToggleIndex !== null
        ? turns
            .filter((turn) => {
              const start = Math.min(lastToggleIndex, index);
              const end = Math.max(lastToggleIndex, index);
              return turn.index >= start && turn.index <= end;
            })
            .map((turn) => turn.index)
        : [index];

    for (const turnIndex of targetIndices) {
      if (checked) {
        nextExcluded.delete(turnIndex);
      } else {
        nextExcluded.add(turnIndex);
      }
    }

    lastToggleIndexRef.current = index;
    setExcludedTurns(nextExcluded);
    if (!checked) {
      setExpandedTurns((current) => {
        const next = new Set(current);
        for (const turnIndex of targetIndices) {
          next.delete(turnIndex);
        }
        return next;
      });
    }
    schedulePreview();
  }

  function toggleTurnExpanded(index: number) {
    setExpandedTurns((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function updateTurnText(turnIndex: number, userText: string) {
    if (!currentSessionId) {
      return;
    }

    setTurns((current) => replaceTurnText(current, turnIndex, userText));
    const existingTimer = editTimersRef.current.get(turnIndex);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        const data = await api.editTurn(currentSessionId, turnIndex, userText);
        setHasTextEdits(data.hasEdits);
        schedulePreview();
      } catch (error) {
        console.error("Edit failed:", error);
      }
    }, 300);

    editTimersRef.current.set(turnIndex, timer);
  }

  function toggleBookmark(index: number, checked: boolean) {
    setBookmarks((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(index, current.get(index) || `Turn ${index}`);
      } else {
        next.delete(index);
      }
      return next;
    });
    schedulePreview();
  }

  function updateBookmarkLabel(index: number, value: string) {
    setBookmarks((current) => {
      if (!current.has(index)) {
        return current;
      }
      const next = new Map(current);
      next.set(index, value || `Turn ${index}`);
      return next;
    });
    schedulePreview();
  }

  function toggleBlock(turnIndex: number, blockIndex: number) {
    const key = blockKey(turnIndex, blockIndex);
    const block = turns.find((turn) => turn.index === turnIndex)?.blocks[
      blockIndex
    ];
    if (block?.kind === "text") {
      return;
    }
    setExpandedBlocks((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function jumpToTurn(index: number) {
    if (!iframeRef.current?.contentWindow) {
      return;
    }
    const includedTurns = turns.filter(
      (turn) => !excludedTurns.has(turn.index),
    );
    const position = includedTurns.findIndex((turn) => turn.index === index);
    if (position >= 0) {
      iframeRef.current.contentWindow.location.hash = `#turn=${position + 1}`;
    }
  }

  async function resetSession() {
    if (!currentSessionId) {
      return;
    }
    try {
      const payload = await api.resetSession(currentSessionId);
      applyLoadedSession(activePath || currentSessionId, payload);
      setHasTextEdits(false);
      setResetConfirmOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Reset failed: ${message}`);
    }
  }

  async function exportReplay() {
    if (!currentSessionId) {
      return;
    }
    try {
      const response = await api.exportReplay(
        currentSessionId,
        buildExportOptions(),
      );
      await triggerDownload(
        response,
        `${(title || "replay").replace(/[^a-z0-9_-]/gi, "_")}.html`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Export failed: ${message}`);
    }
  }

  async function exportReplayData() {
    if (!currentSessionId) {
      return;
    }
    try {
      const response = await api.exportReplayData(
        currentSessionId,
        buildExportOptions(),
      );
      await triggerDownload(
        response,
        `${(title || "replay").replace(/[^a-z0-9_-]/gi, "_")}.json`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Export failed: ${message}`);
    }
  }

  async function importReplayHtml(file: File) {
    try {
      const html = await file.text();
      const payload = await api.importReplayHtml(html, file.name);
      applyLoadedSession(file.name, payload);
      setHasTextEdits(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`Import failed: ${message}`);
    }
  }

  const filteredGroups = filterSessionGroups(
    sessionGroups,
    searchValue.startsWith("/") ? "" : searchValue,
  );
  const visibleProjectKeys = new Set(openProjects);
  if (searchValue.trim() && !searchValue.startsWith("/")) {
    for (const group of filteredGroups) {
      for (const project of group.projects) {
        visibleProjectKeys.add(`${group.name}:${project.dirName}`);
      }
    }
  }

  return (
    <div
      className={`editor-shell ${colorMode} ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${isResizing ? "is-resizing" : ""}`}
    >
      <div aria-hidden="true" className="editor-blob editor-blob-1" />
      <div aria-hidden="true" className="editor-blob editor-blob-2" />
      <div aria-hidden="true" className="editor-blob editor-blob-3" />
      <div aria-hidden="true" className="grain-layer" />
      <input
        hidden
        id="importHtmlFile"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importReplayHtml(file);
          }
          event.target.value = "";
        }}
        ref={importFileRef}
        type="file"
      />
      <div
        className="app"
        ref={appRef}
        style={{
          gridTemplateColumns: `${sidebarWidth}px minmax(${MIN_EDITOR_WIDTH}px, ${editorWidth}px) ${RESIZE_HANDLE_WIDTH}px 1fr`,
        }}
      >
        <SessionSidebar
          activePath={activePath}
          browseError={browseError}
          browseOpen={browseOpen}
          browsePath={browsePath}
          browseResults={browseResults}
          collapsed={sidebarCollapsed}
          colorMode={colorMode}
          currentSessionLoaded={currentSessionId !== null}
          exportOptions={exportOptions}
          hasChanges={hasChanges}
          onAddRule={() => {
            setExportOptions((current) => ({
              ...current,
              redactRules: [
                ...current.redactRules,
                { search: "", replacement: "[REDACTED]" },
              ],
            }));
          }}
          onBrowse={(path) => {
            void browse(path);
          }}
          onBrowsePathChange={setBrowsePath}
          onBrowsePathSubmit={() => {
            void browse(browsePath);
          }}
          onExport={() => {
            void exportReplay();
          }}
          onExportData={() => {
            void exportReplayData();
          }}
          onHelpOpen={() => setHelpOpen(true)}
          onImportHtml={() => importFileRef.current?.click()}
          onLoadSession={(path) => {
            void loadSession(path);
          }}
          onOptionChange={updateOption}
          onRemoveRule={(index) => {
            setExportOptions((current) => ({
              ...current,
              redactRules: current.redactRules.filter(
                (_, ruleIndex) => ruleIndex !== index,
              ),
            }));
            schedulePreview();
          }}
          onReset={() => {
            if (hasChanges) {
              setResetConfirmOpen(true);
              return;
            }
            void resetSession();
          }}
          onRuleChange={updateRedactRule}
          onSearchChange={setSearchValue}
          onTitleChange={(value) => {
            setTitle(value);
            schedulePreview();
          }}
          onToggleBrowse={() => setBrowseOpen((current) => !current)}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onToggleColorMode={() =>
            setColorMode((current) => (current === "dark" ? "light" : "dark"))
          }
          onToggleOptions={() => setOptionsOpen((current) => !current)}
          onToggleProject={(projectKey) => {
            setOpenProjects((current) => {
              const next = new Set(current);
              if (next.has(projectKey)) {
                next.delete(projectKey);
              } else {
                next.add(projectKey);
              }
              return next;
            });
          }}
          onToggleSessions={() => setSessionsOpen((current) => !current)}
          openProjects={visibleProjectKeys}
          optionsOpen={optionsOpen}
          searchResults={searchResults}
          searchStatus={searchStatus}
          searchValue={searchValue}
          sessionGroups={filteredGroups}
          sessionsOpen={sessionsOpen}
          themeOptions={themeOptions}
          title={title}
          version={version}
        />

        <TurnsPanel
          bookmarks={bookmarks}
          excludedTurns={excludedTurns}
          expandedBlocks={expandedBlocks}
          expandedTurns={expandedTurns}
          onBookmarkLabelChange={updateBookmarkLabel}
          onBookmarkToggle={toggleBookmark}
          onCollapseAll={() => {
            setExpandedTurns(new Set());
            setExpandedBlocks(new Set());
          }}
          onExpandAll={() => {
            setExpandedTurns(new Set(turns.map((turn) => turn.index)));
            setExpandedBlocks(allBlockKeys(turns));
          }}
          onJumpToTurn={jumpToTurn}
          onSelectAll={() => {
            setExcludedTurns(new Set());
            schedulePreview();
          }}
          onSelectNone={() => {
            setExcludedTurns(new Set(turns.map((turn) => turn.index)));
            setExpandedTurns(new Set());
            schedulePreview();
          }}
          onToggleBlock={toggleBlock}
          onToggleTurn={toggleTurn}
          onToggleTurnExpanded={toggleTurnExpanded}
          onTurnTextChange={updateTurnText}
          previewReady={previewUrl !== null}
          turns={turns}
        />

        <button
          aria-label="Resize editor and preview panels"
          className={`resize-handle ${isResizing ? "active" : ""}`}
          id="resizeHandle"
          onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
            const step = event.shiftKey ? 96 : 24;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setEditorWidth((current) => clampEditorWidth(current - step));
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              setEditorWidth((current) => clampEditorWidth(current + step));
            }
          }}
          onLostPointerCapture={stopResize}
          onPointerCancel={stopResize}
          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
            if (event.pointerType === "mouse" && event.button !== 0) {
              return;
            }

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragStateRef.current = {
              handle: event.currentTarget,
              pointerId: event.pointerId,
            };
            updateEditorWidthFromPointer(event.clientX);
            setIsResizing(true);
          }}
          onPointerMove={(event: ReactPointerEvent<HTMLButtonElement>) => {
            if (dragStateRef.current?.pointerId !== event.pointerId) {
              return;
            }

            updateEditorWidthFromPointer(event.clientX);
          }}
          onPointerUp={(event: ReactPointerEvent<HTMLButtonElement>) => {
            if (dragStateRef.current?.pointerId !== event.pointerId) {
              return;
            }

            stopResize();
          }}
          type="button"
        />

        <PreviewPane
          iframeRef={iframeRef}
          previewUrl={previewUrl}
          refreshing={refreshing}
        />
      </div>

      <Modal
        closeButtonId="helpModalClose"
        id="helpModal"
        onClose={() => setHelpOpen(false)}
        open={helpOpen}
        title="claude-replay editor"
      >
        <h3>Getting Started</h3>
        <p>
          Select session from Sessions panel, browse for replay file, or import
          previously exported HTML.
        </p>
        <h3>Editing</h3>
        <ul>
          <li>User prompts editable</li>
          <li>Assistant blocks expandable</li>
          <li>Include or exclude turns</li>
          <li>Add bookmarks for chapter markers</li>
        </ul>
        <h3>Export</h3>
        <ul>
          <li>Export HTML stays single self-contained file</li>
          <li>Export JSON downloads turn data + bookmarks</li>
          <li>Preview uses same render pipeline as export</li>
        </ul>
        <p className="modal-footer-link">
          Editor runs on localhost only. Original transcripts stay untouched.
        </p>
      </Modal>

      <Modal
        id="confirmModal"
        onClose={() => setResetConfirmOpen(false)}
        open={resetConfirmOpen}
        title={<span id="confirmTitle">Reset Session</span>}
        width="380px"
      >
        <p id="confirmMessage">
          Reset all edits, excluded turns, and bookmarks to original session?
        </p>
        <div className="confirm-actions">
          <button
            className="btn"
            id="confirmCancel"
            onClick={() => setResetConfirmOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn btn-warn"
            id="confirmOk"
            onClick={() => void resetSession()}
            type="button"
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
