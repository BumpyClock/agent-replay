export const DEFAULT_EDITOR_PORT = 7331;
export const DEFAULT_SERVE_PORT = 7332;
export const MAX_INPUTS = 20;

export const SESSION_SEARCH_LOCATIONS =
  "~/.claude/projects/, ~/.cursor/projects/, ~/.codex/sessions/, ~/.gemini/tmp/, and ~/.copilot/session-state/";

export const HELP_TEXT = `Usage: claude-replay [--port N]         Launch the web editor (default)
       claude-replay editor [file|id]               Launch editor with a session auto-loaded
       claude-replay <input> [input2...] [options]  Generate replay from CLI
       claude-replay extract <replay.html> [-o output.jsonl]

Convert Claude Code, Cursor, Codex, Gemini, and Copilot CLI session transcripts into embeddable HTML replays.

<input> can be a .jsonl/.json file path or a session ID. If it does not end
in .jsonl/.json and is not an existing file, it is treated as a session ID
and searched in ${SESSION_SEARCH_LOCATIONS}

Multiple inputs are concatenated into a single replay (up to 20). Sessions
with timestamps are sorted chronologically; otherwise command-line order is
used. Turns are re-indexed sequentially.

Commands:
  (no args)             Launch web-based editor UI (default)
  editor [file|id]      Launch editor with a file or session ID auto-loaded
  extract               Extract embedded turn data from a generated replay HTML

Options:
  --port N                Port for the editor server (default: 7331)
  --host ADDR             Bind address for the editor server (default: 127.0.0.1)
  --no-origin-check       Disable CSRF origin check (use with caution)
  -o, --output FILE       Output HTML file (default: stdout)
  --turns N-M             Only include turns N through M
  --exclude-turns N,N,... Exclude specific turns by index
  --from TIMESTAMP        Start time filter (ISO 8601)
  --to TIMESTAMP          End time filter (ISO 8601)
  --speed N               Initial playback speed (default: 1.0)
  --no-thinking           Hide thinking blocks by default
  --no-tool-calls         Hide tool call blocks by default
  --font-size SIZE        Font size: small, normal, large (default: normal)
  --title TEXT             Page title (default: derived from input path)
  --description TEXT       Meta description for link previews (default: "Interactive AI session replay")
  --og-image URL          OG image URL for link previews (default: hosted default)
  --no-auto-redact        Disable automatic secret redaction
  --redact "text"         Replace text with [REDACTED] (repeatable)
  --redact "text=repl"    Replace text with custom replacement (repeatable)
  --theme NAME            Built-in theme (default: tokyo-night)
  --theme-file FILE       Custom theme JSON file (overrides --theme)
  --user-label NAME       Label for user messages (default: User)
  --assistant-label NAME  Label for assistant messages (default: auto-detected)
  --timing MODE           Timestamp mode: auto, real, paced (default: auto)
  --mark "N:Label"        Add a bookmark at turn N (repeatable)
  --bookmarks FILE        JSON file with bookmarks [{turn, label}]
  --no-minify             Use unminified template (default: minified if available)
  --no-compress           Embed raw JSON instead of compressed (for older browsers)
  --serve                 Serve the replay on a local HTTP server instead of writing to file
  --watch                 Watch input files for changes and auto-regenerate
  --open                  Open the generated HTML in the default browser
  --list-themes           List available built-in themes and exit
  -h, --help              Show this help message`;
