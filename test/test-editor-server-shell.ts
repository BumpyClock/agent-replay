import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createEditorServerHarness } from "./helpers/editor-server.js";

const harness = createEditorServerHarness();

describe("editor-server shell", () => {
  before(async () => {
    await harness.start();
  });

  after(() => {
    harness.stop();
  });

  it("GET /api/sessions returns groups array", async () => {
    const res = await harness.get("/api/sessions");
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.groups));
    assert.ok(typeof data.homedir === "string");
  });

  it("GET / returns editor shell", async () => {
    const res = await harness.get("/");
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /src="\/editor-app\.js"/);
    assert.match(html, /href="\/editor-app\.css"/);
  });

  it("GET /editor-app.js returns compiled editor app", async () => {
    const res = await harness.get("/editor-app.js");
    assert.equal(res.status, 200);
    assert.match(
      res.headers.get("content-type") || "",
      /application\/javascript/,
    );
    const js = await res.text();
    assert.match(js, /createRoot/);
    assert.match(js, /renderPreview/);
  });

  it("GET /editor-app.css returns compiled editor styles", async () => {
    const res = await harness.get("/editor-app.css");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /text\/css/);
    const css = await res.text();
    assert.match(css, /\.editor-shell/);
  });

  it("GET /api/themes returns theme list", async () => {
    const res = await harness.get("/api/themes");
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(typeof data[0] === "string");
  });

  it("rejects cross-origin API requests", async () => {
    const res = await harness.get("/api/sessions", {
      headers: { Origin: "https://evil.example.com" },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Cross-origin/);
  });

  it("allows same-origin API requests", async () => {
    const res = await harness.get("/api/sessions", {
      headers: { Origin: harness.getBaseUrl() },
    });
    assert.equal(res.status, 200);
  });
});
