import type {
  BrowseDirectoryResponse,
  RedactRule,
  SearchResult,
  SessionGroup,
} from "../../../src/editor-app-types.js";
import { AgentIcon } from "./AgentIcon.js";

interface SessionSidebarProps {
  collapsed: boolean;
  sessionsOpen: boolean;
  optionsOpen: boolean;
  browseOpen: boolean;
  sessionGroups: SessionGroup[];
  openProjects: Set<string>;
  activePath: string | null;
  searchValue: string;
  searchResults: SearchResult[] | null;
  searchStatus: string | null;
  browsePath: string;
  browseResults: BrowseDirectoryResponse | null;
  browseError: string | null;
  themeOptions: string[];
  version: string;
  title: string;
  currentSessionLoaded: boolean;
  hasChanges: boolean;
  colorMode: "dark" | "light";
  exportOptions: {
    theme: string;
    speed: number;
    showThinking: boolean;
    showToolCalls: boolean;
    fontSize: string;
    redactSecrets: boolean;
    redactRules: RedactRule[];
    userLabel: string;
    assistantLabel: string;
    description: string;
    ogImage: string;
    timing: string;
    minified: boolean;
    compress: boolean;
  };
  onToggleCollapsed(): void;
  onToggleColorMode(): void;
  onHelpOpen(): void;
  onReset(): void;
  onExport(): void;
  onExportData(): void;
  onImportHtml(): void;
  onToggleSessions(): void;
  onToggleOptions(): void;
  onToggleBrowse(): void;
  onToggleProject(projectKey: string): void;
  onSearchChange(value: string): void;
  onBrowsePathChange(value: string): void;
  onBrowsePathSubmit(): void;
  onBrowse(path: string): void;
  onLoadSession(path: string): void;
  onOptionChange(
    field:
      | "theme"
      | "speed"
      | "showThinking"
      | "showToolCalls"
      | "fontSize"
      | "redactSecrets"
      | "userLabel"
      | "assistantLabel"
      | "description"
      | "ogImage"
      | "timing"
      | "minified"
      | "compress",
    value: string | number | boolean,
  ): void;
  onRuleChange(
    index: number,
    field: "search" | "replacement",
    value: string,
  ): void;
  onAddRule(): void;
  onRemoveRule(index: number): void;
  onTitleChange(value: string): void;
}

export function SessionSidebar({
  collapsed,
  sessionsOpen,
  optionsOpen,
  browseOpen,
  sessionGroups,
  openProjects,
  activePath,
  searchValue,
  searchResults,
  searchStatus,
  browsePath,
  browseResults,
  browseError,
  themeOptions,
  version,
  title,
  currentSessionLoaded,
  hasChanges,
  colorMode,
  exportOptions,
  onToggleCollapsed,
  onToggleColorMode,
  onHelpOpen,
  onReset,
  onExport,
  onExportData,
  onImportHtml,
  onToggleSessions,
  onToggleOptions,
  onToggleBrowse,
  onToggleProject,
  onSearchChange,
  onBrowsePathChange,
  onBrowsePathSubmit,
  onBrowse,
  onLoadSession,
  onOptionChange,
  onRuleChange,
  onAddRule,
  onRemoveRule,
  onTitleChange,
}: SessionSidebarProps) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>claude-replay editor</h1>
        </div>
        <div className="topbar-center">
          <input
            className="topbar-title-input"
            id="titleInput"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Replay title"
            type="text"
            value={title}
          />
        </div>
        <div className="topbar-right">
          <button
            className={`btn ${hasChanges ? "btn-warn" : ""}`}
            disabled={!currentSessionLoaded}
            id="resetBtn"
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
          <button
            className="btn"
            disabled={!currentSessionLoaded}
            id="exportDataBtn"
            onClick={onExportData}
            type="button"
          >
            Export JSON
          </button>
          <button
            className="btn btn-primary"
            disabled={!currentSessionLoaded}
            id="exportBtn"
            onClick={onExport}
            type="button"
          >
            Export HTML
          </button>
          <button
            className="btn"
            id="importHtmlBtn"
            onClick={onImportHtml}
            type="button"
          >
            Import HTML
          </button>
          <button
            className="btn theme-mode-btn"
            id="themeModeBtn"
            onClick={onToggleColorMode}
            type="button"
          >
            {colorMode === "dark" ? "Light" : "Dark"}
          </button>
          <button
            className="btn"
            id="helpBtn"
            onClick={onHelpOpen}
            type="button"
          >
            Help
          </button>
          <span className="topbar-version" id="helpVersion">
            {version ? `v${version}` : ""}
          </span>
        </div>
      </div>

      <div className="sidebar">
        <button
          className={`sidebar-section-toggle ${sessionsOpen ? "open" : ""}`}
          id="sessionsToggle"
          onClick={onToggleSessions}
          type="button"
        >
          <span className="arrow">&#9654;</span>
          <span>Sessions</span>
        </button>
        <div
          className={`sidebar-section ${sessionsOpen ? "open" : ""}`}
          id="sessionsSection"
        >
          <div className="sessions-content">
            <input
              className="sessions-search"
              id="sessionsSearch"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search sessions or /content"
              type="text"
              value={searchValue}
            />
            <div className="search-hint">
              Use `/query` for transcript content
            </div>
            {searchResults !== null ? (
              <div className="search-results" id="searchResults">
                {searchStatus ? (
                  <div className="search-status">{searchStatus}</div>
                ) : searchResults.length === 0 ? (
                  <div className="search-status">No matches found</div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      className="search-result-item"
                      data-path={result.path}
                      key={`${result.path}-${result.snippet}`}
                      onClick={() => onLoadSession(result.path)}
                      type="button"
                    >
                      <div className="search-result-meta">
                        {result.source ? (
                          <AgentIcon source={result.source} size={12} />
                        ) : null}
                        {result.group} / {result.file}
                      </div>
                      <div className="search-result-snippet">
                        {result.snippet}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="sessions-tree" id="sessionsTree">
                {sessionGroups.length === 0 ? (
                  <div className="empty-state empty-state-hint">
                    No sessions found in default locations
                  </div>
                ) : (
                  sessionGroups.map((group) => (
                    <div className="session-group" key={group.name}>
                      {group.projects.map((project) => {
                        const projectKey = `${group.name}:${project.dirName}`;
                        const open = openProjects.has(projectKey);
                        return (
                          <div className="session-project" key={projectKey}>
                            <button
                              className={`session-project-name ${open ? "open" : ""}`}
                              data-target={projectKey}
                              onClick={() => onToggleProject(projectKey)}
                              title={project.dirName.replace(/^-+/, "")}
                              type="button"
                            >
                              <span className="arrow">&#9654;</span>
                              {project.name}
                            </button>
                            <div
                              className={`session-list ${open ? "open" : ""}`}
                              id={projectKey}
                            >
                              {project.sessions.map((session) => (
                                <button
                                  className={`session-item ${activePath === session.path ? "active" : ""}`}
                                  data-path={session.path}
                                  key={session.path}
                                  onClick={() => onLoadSession(session.path)}
                                  type="button"
                                >
                                  {session.source ? (
                                    <AgentIcon source={session.source} />
                                  ) : null}
                                  <div className="session-item-info">
                                    <span className="session-item-name">
                                      {session.summary ||
                                        session.file.replace(/\.jsonl$/i, "")}
                                    </span>
                                    {session.date ? (
                                      <span className="session-item-date">
                                        {new Date(
                                          session.date,
                                        ).toLocaleDateString()}
                                      </span>
                                    ) : null}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="browse-section">
              <button
                className={`browse-header ${browseOpen ? "open" : ""}`}
                id="browseToggle"
                onClick={onToggleBrowse}
                type="button"
              >
                <span className="arrow">&#9654;</span>
                Open folder
              </button>
              {browseOpen ? (
                <div className="browse-body" id="browseBody">
                  <input
                    className="sessions-search browse-path-input"
                    id="browsePathInput"
                    onChange={(event) => onBrowsePathChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onBrowsePathSubmit();
                      }
                    }}
                    type="text"
                    value={browsePath}
                  />
                  <div className="browse-list" id="browseList">
                    {browseError ? (
                      <div className="browse-item browse-error">
                        {browseError}
                      </div>
                    ) : browseResults ? (
                      <>
                        {browseResults.parent ? (
                          <button
                            className="browse-item"
                            data-browse={browseResults.parent}
                            onClick={() => {
                              if (browseResults.parent) {
                                onBrowse(browseResults.parent);
                              }
                            }}
                            type="button"
                          >
                            <span className="icon">..</span>
                            <span className="browse-parent">(parent)</span>
                          </button>
                        ) : null}
                        {browseResults.dirs.map((dir) => (
                          <button
                            className="browse-item"
                            data-browse={dir.path}
                            key={dir.path}
                            onClick={() => onBrowse(dir.path)}
                            type="button"
                          >
                            <span className="icon icon-folder">&#128193;</span>
                            {dir.name}
                          </button>
                        ))}
                        {browseResults.files.map((file) => (
                          <button
                            className={`browse-item ${activePath === file.path ? "selected" : ""}`}
                            data-path={file.path}
                            key={file.path}
                            onClick={() => onLoadSession(file.path)}
                            type="button"
                          >
                            <span className="icon icon-file">&#128196;</span>
                            <span>{file.name}</span>
                            {file.date ? (
                              <span className="browse-date">
                                {new Date(file.date).toLocaleDateString()}
                              </span>
                            ) : null}
                          </button>
                        ))}
                        {browseResults.dirs.length === 0 &&
                        browseResults.files.length === 0 ? (
                          <div className="browse-item browse-empty">
                            No folders or replay files
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <button
          className={`sidebar-section-toggle ${optionsOpen ? "open" : ""}`}
          id="optionsToggle"
          onClick={onToggleOptions}
          type="button"
        >
          <span className="arrow">&#9654;</span>
          <span>Options</span>
        </button>
        <div
          className={`sidebar-section ${optionsOpen ? "open" : ""}`}
          id="optionsSection"
        >
          <div className="options-content">
            <div className="opt-group-label">Playback</div>
            <OptionRow label="Speed">
              <input
                id="optSpeed"
                max="10"
                min="0.1"
                onChange={(event) =>
                  onOptionChange(
                    "speed",
                    Number.parseFloat(event.target.value) || 1,
                  )
                }
                step="0.1"
                type="number"
                value={exportOptions.speed}
              />
            </OptionRow>
            <OptionRow label="Show Thinking">
              <input
                checked={exportOptions.showThinking}
                id="optThinking"
                onChange={(event) =>
                  onOptionChange("showThinking", event.target.checked)
                }
                type="checkbox"
              />
            </OptionRow>
            <OptionRow label="Show Tool Calls">
              <input
                checked={exportOptions.showToolCalls}
                id="optToolCalls"
                onChange={(event) =>
                  onOptionChange("showToolCalls", event.target.checked)
                }
                type="checkbox"
              />
            </OptionRow>
            <OptionRow label="Font size">
              <select
                id="optFontSize"
                onChange={(event) =>
                  onOptionChange("fontSize", event.target.value)
                }
                value={exportOptions.fontSize}
              >
                <option value="small">Small</option>
                <option value="normal">Medium</option>
                <option value="large">Large</option>
              </select>
            </OptionRow>

            <div className="opt-group-label">Appearance</div>
            <OptionRow label="Theme">
              <select
                id="optTheme"
                onChange={(event) =>
                  onOptionChange("theme", event.target.value)
                }
                value={exportOptions.theme}
              >
                {themeOptions.map((themeName) => (
                  <option key={themeName} value={themeName}>
                    {themeName}
                  </option>
                ))}
              </select>
            </OptionRow>
            <OptionRow label="Timing">
              <select
                id="optTiming"
                onChange={(event) =>
                  onOptionChange("timing", event.target.value)
                }
                value={exportOptions.timing}
              >
                <option value="auto">Auto</option>
                <option value="real">Real</option>
                <option value="paced">Paced</option>
              </select>
            </OptionRow>

            <div className="opt-group-label">Content</div>
            <OptionRow label="User label">
              <input
                id="optUserLabel"
                onChange={(event) =>
                  onOptionChange("userLabel", event.target.value)
                }
                type="text"
                value={exportOptions.userLabel}
              />
            </OptionRow>
            <OptionRow label="Asst. label">
              <input
                id="optAssistantLabel"
                onChange={(event) =>
                  onOptionChange("assistantLabel", event.target.value)
                }
                placeholder="auto"
                type="text"
                value={exportOptions.assistantLabel}
              />
            </OptionRow>
            <OptionRow label="Auto-redact">
              <input
                checked={exportOptions.redactSecrets}
                id="optRedact"
                onChange={(event) =>
                  onOptionChange("redactSecrets", event.target.checked)
                }
                type="checkbox"
              />
            </OptionRow>
            <OptionRow label="Custom redact" multiline>
              <div className="redact-rules" id="redactRules">
                {exportOptions.redactRules.map((rule, index) => (
                  <div
                    className="redact-rule"
                    key={`${rule.search}:${rule.replacement}`}
                  >
                    <input
                      onChange={(event) =>
                        onRuleChange(index, "search", event.target.value)
                      }
                      placeholder="Search text"
                      type="text"
                      value={rule.search}
                    />
                    <span className="arrow">&rarr;</span>
                    <input
                      onChange={(event) =>
                        onRuleChange(index, "replacement", event.target.value)
                      }
                      placeholder="Replacement"
                      type="text"
                      value={rule.replacement}
                    />
                    <button
                      className="remove-rule"
                      onClick={() => onRemoveRule(index)}
                      type="button"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="add-rule-btn"
                id="addRuleBtn"
                onClick={onAddRule}
                type="button"
              >
                + Add rule
              </button>
            </OptionRow>

            <div className="opt-group-label">Metadata</div>
            <OptionRow label="Description" multiline>
              <textarea
                id="optDescription"
                onChange={(event) =>
                  onOptionChange("description", event.target.value)
                }
                rows={3}
                value={exportOptions.description}
              />
            </OptionRow>
            <OptionRow label="OG Image URL">
              <input
                id="optOgImage"
                onChange={(event) =>
                  onOptionChange("ogImage", event.target.value)
                }
                placeholder="https://..."
                type="text"
                value={exportOptions.ogImage}
              />
            </OptionRow>

            <div className="opt-group-label">Output</div>
            <OptionRow label="Minify">
              <input
                checked={exportOptions.minified}
                id="optMinify"
                onChange={(event) =>
                  onOptionChange("minified", event.target.checked)
                }
                type="checkbox"
              />
            </OptionRow>
            <OptionRow label="Compress">
              <input
                checked={exportOptions.compress}
                id="optCompress"
                onChange={(event) =>
                  onOptionChange("compress", event.target.checked)
                }
                type="checkbox"
              />
            </OptionRow>
          </div>
        </div>
      </div>

      <button
        className="sidebar-edge-toggle"
        id="sidebarToggleBtn"
        onClick={onToggleCollapsed}
        title="Toggle sidebar"
        type="button"
      >
        {collapsed ? "\u203a" : "\u2039"}
      </button>
    </>
  );
}

function OptionRow({
  label,
  multiline = false,
  children,
}: {
  label: string;
  multiline?: boolean;
  children: import("react").ReactNode;
}) {
  return (
    <div className={`opt-row ${multiline ? "multiline" : ""}`}>
      <div className="opt-row-label">{label}</div>
      <div className="opt-control">{children}</div>
    </div>
  );
}
