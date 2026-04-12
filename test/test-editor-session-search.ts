import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { createEditorSessionSearch } from "../src/editor-server/session-search.js";
import { createSessionSearchIndex } from "../src/editor-server/session-search-index.js";
import type { SessionGroup } from "../src/types.js";

function createGroups(path: string): SessionGroup[] {
  return [
    {
      name: "claude",
      projects: [
        {
          name: "agent-replay",
          dirName: "agent-replay",
          sessions: [
            {
              file: "session.jsonl",
              path,
              date: "2026-04-11",
              source: "claude",
            },
          ],
        },
      ],
    },
  ];
}

describe("editor session search index", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reuses cached transcript content while file metadata is unchanged", () => {
    const dir = mkdtempSync(join(tmpdir(), "editor-search-index-"));
    tempDirs.push(dir);
    const file = join(dir, "session.jsonl");
    writeFileSync(file, "alpha beta gamma");

    let readCount = 0;
    const index = createSessionSearchIndex({
      readText(path) {
        readCount += 1;
        return readFileSync(path, "utf-8");
      },
      statFile(path) {
        const stats = statSync(path);
        return {
          mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs,
          size: stats.size,
        };
      },
    });

    index.sync(createGroups(file));
    const first = index.get(file);
    const second = index.get(file);

    assert.equal(first?.text, "alpha beta gamma");
    assert.equal(second?.text, "alpha beta gamma");
    assert.equal(readCount, 1);
  });

  it("reloads transcript content after file metadata changes", () => {
    const dir = mkdtempSync(join(tmpdir(), "editor-search-index-"));
    tempDirs.push(dir);
    const file = join(dir, "session.jsonl");
    writeFileSync(file, "alpha");

    let readCount = 0;
    const index = createSessionSearchIndex({
      readText(path) {
        readCount += 1;
        return readFileSync(path, "utf-8");
      },
      statFile(path) {
        const stats = statSync(path);
        return {
          mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs,
          size: stats.size,
        };
      },
    });

    index.sync(createGroups(file));
    assert.equal(index.get(file)?.normalizedText, "alpha");

    writeFileSync(file, "alpha beta");

    const updated = index.get(file);
    assert.equal(updated?.normalizedText, "alpha beta");
    assert.equal(readCount, 2);
  });

  it("reloads transcript content after same-size rewrite when status changes", () => {
    let text = "alpha";
    let readCount = 0;
    let stats = {
      mtimeMs: 1,
      ctimeMs: 1,
      size: text.length,
    };
    const path = "/virtual/session.jsonl";
    const index = createSessionSearchIndex({
      readText() {
        readCount += 1;
        return text;
      },
      statFile() {
        return { ...stats };
      },
    });

    index.sync(createGroups(path));
    assert.equal(index.get(path)?.normalizedText, "alpha");

    text = "bravo";
    stats = {
      mtimeMs: 1,
      ctimeMs: 2,
      size: text.length,
    };

    assert.equal(index.get(path)?.normalizedText, "bravo");
    assert.equal(readCount, 2);
  });

  it("syncs index before short-query early return", () => {
    let syncCount = 0;
    let getCount = 0;
    const search = createEditorSessionSearch({
      index: {
        sync() {
          syncCount += 1;
        },
        get() {
          getCount += 1;
          return undefined;
        },
      },
    });

    const response = search.search(
      createGroups("/virtual/session.jsonl"),
      "ab",
    );

    assert.deepEqual(response, { results: [] });
    assert.equal(syncCount, 1);
    assert.equal(getCount, 0);
  });

  it("returns same search result shape and snippet behavior", () => {
    const dir = mkdtempSync(join(tmpdir(), "editor-session-search-"));
    tempDirs.push(dir);
    const file = join(dir, "session.jsonl");
    writeFileSync(file, "prefix line\nAlpha beta gamma delta suffix line");

    const search = createEditorSessionSearch();
    const response = search.search(createGroups(file), "BETA");

    assert.equal(response.results.length, 1);
    assert.deepEqual(response.results[0], {
      group: "claude",
      project: "agent-replay",
      file: "session.jsonl",
      path: file,
      date: "2026-04-11",
      snippet: "prefix line Alpha beta gamma delta suffix line",
      source: "claude",
    });
  });
});
