import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEditorSessionCatalog } from "../src/editor-server/session-catalog.js";
import type { SessionGroup } from "../src/types.js";

function createGroups(label: string): SessionGroup[] {
  return [
    {
      name: `group-${label}`,
      projects: [
        {
          name: `project-${label}`,
          dirName: `dir-${label}`,
          sessions: [
            {
              file: `session-${label}.jsonl`,
              path: `/tmp/session-${label}.jsonl`,
              date: "2026-04-11",
              source: "claude",
            },
          ],
        },
      ],
    },
  ];
}

describe("editor session catalog", () => {
  it("returns stable snapshot identity while ttl is active", () => {
    let now = 100;
    let discoverCount = 0;
    const catalog = createEditorSessionCatalog({
      ttlMs: 1000,
      now: () => now,
      discover() {
        discoverCount += 1;
        return createGroups(String(discoverCount));
      },
    });

    const first = catalog.getSnapshot();
    const second = catalog.getSnapshot();

    assert.equal(first, second);
    assert.equal(first.groups, second.groups);
    assert.equal(first.version, 1);
    assert.equal(discoverCount, 1);

    now = 500;
    const third = catalog.getSnapshot();

    assert.equal(third, first);
    assert.equal(discoverCount, 1);
  });

  it("refreshes snapshot identity and version after ttl expiry", () => {
    let now = 100;
    let discoverCount = 0;
    const catalog = createEditorSessionCatalog({
      ttlMs: 1000,
      now: () => now,
      discover() {
        discoverCount += 1;
        return createGroups(String(discoverCount));
      },
    });

    const first = catalog.getSnapshot();
    now = 1200;
    const second = catalog.getSnapshot();

    assert.notEqual(second, first);
    assert.notEqual(second.groups, first.groups);
    assert.equal(first.version, 1);
    assert.equal(second.version, 2);
    assert.equal(second.groups[0]?.name, "group-2");
    assert.equal(discoverCount, 2);
  });

  it("invalidates cached snapshot and keeps list response shape", () => {
    let discoverCount = 0;
    const catalog = createEditorSessionCatalog({
      discover() {
        discoverCount += 1;
        return createGroups(String(discoverCount));
      },
      getHomedir() {
        return "/tmp/home";
      },
    });

    const first = catalog.getSnapshot();
    const listed = catalog.listSessions("1.2.3");

    assert.deepEqual(listed.groups, first.groups);
    assert.notEqual(listed.groups, first.groups);
    assert.equal(listed.homedir, "/tmp/home");
    assert.equal(listed.version, "1.2.3");

    catalog.invalidate();
    const second = catalog.getSnapshot();

    assert.notEqual(second, first);
    assert.equal(second.version, 2);
    assert.equal(second.groups[0]?.name, "group-2");
    assert.equal(discoverCount, 2);
  });

  it("keeps list payload mutations isolated from cached snapshot", () => {
    const catalog = createEditorSessionCatalog({
      discover() {
        return createGroups("stable");
      },
      getHomedir() {
        return "/tmp/home";
      },
    });

    const snapshot = catalog.getSnapshot();
    const listed = catalog.listSessions("1.2.3");
    const listedGroup = listed.groups[0];

    assert.ok(listedGroup);
    listedGroup.name = "mutated";

    assert.equal(snapshot.groups[0]?.name, "group-stable");
    assert.equal(
      snapshot.groups[0]?.projects[0]?.sessions[0]?.path,
      "/tmp/session-stable.jsonl",
    );
    assert.equal(catalog.getSnapshot().groups[0]?.name, "group-stable");
    assert.equal(catalog.listSessions("1.2.3").groups[0]?.name, "group-stable");
  });

  it("freezes cached snapshot groups to prevent shared-state mutation", () => {
    const catalog = createEditorSessionCatalog({
      discover() {
        return createGroups("stable");
      },
    });

    const snapshot = catalog.getSnapshot();
    const firstGroup = snapshot.groups[0];
    const firstSession = firstGroup?.projects[0]?.sessions[0];

    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(Object.isFrozen(snapshot.groups), true);
    assert.ok(firstGroup);
    assert.equal(Object.isFrozen(firstGroup), true);
    assert.ok(firstSession);
    assert.equal(Object.isFrozen(firstSession), true);
    assert.throws(() => {
      (firstGroup as SessionGroup).name = "mutated";
    });
    assert.throws(() => {
      (firstSession as { path: string }).path = "mutated";
    });
  });
});
