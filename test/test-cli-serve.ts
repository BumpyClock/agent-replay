import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE,
  runCli,
  startCli,
  waitForServerReady,
} from "./helpers/cli.js";

describe("CLI serve", () => {
  it("--watch without --serve requires -o", async () => {
    const { code, stderr } = await runCli([FIXTURE, "--watch"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /--watch without --serve requires -o/);
  });

  it("--serve starts server and serves replay", async () => {
    const port = 18900 + Math.floor(Math.random() * 100);
    const child = startCli([FIXTURE, "--serve", "--port", String(port)]);

    try {
      await waitForServerReady(child);

      const response = await fetch(`http://127.0.0.1:${port}`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<!DOCTYPE html>/);

      const reload = await fetch(`http://127.0.0.1:${port}/__reload`);
      const data = await reload.json();
      assert.ok(typeof data.version === "number");
    } finally {
      child.kill();
    }
  });

  it("--serve reload endpoint includes turn count", async () => {
    const port = 19100 + Math.floor(Math.random() * 100);
    const child = startCli([FIXTURE, "--serve", "--port", String(port)]);

    try {
      await waitForServerReady(child);
      const response = await fetch(`http://127.0.0.1:${port}/__reload`);
      const data = await response.json();
      assert.ok(typeof data.version === "number");
      assert.ok(typeof data.turns === "number");
      assert.ok(data.turns > 0);
    } finally {
      child.kill();
    }
  });
});
