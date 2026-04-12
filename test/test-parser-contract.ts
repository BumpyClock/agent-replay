import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTranscript } from "../src/parser.js";
import { CONTRACT_FIXTURES } from "./parser-test-helpers.js";

describe("Turn structure contract", () => {
  for (const { name, path } of CONTRACT_FIXTURES) {
    it(`${name}: turns have required fields with correct types`, () => {
      const turns = parseTranscript(path);
      assert.ok(turns.length > 0, `${name} should produce at least one turn`);

      for (const turn of turns) {
        assert.equal(
          typeof turn.index,
          "number",
          `${name}: turn.index should be number`,
        );
        assert.equal(
          typeof turn.user_text,
          "string",
          `${name}: turn.user_text should be string`,
        );
        assert.ok(
          Array.isArray(turn.blocks),
          `${name}: turn.blocks should be array`,
        );
        assert.equal(
          typeof turn.timestamp,
          "string",
          `${name}: turn.timestamp should be string`,
        );

        for (const block of turn.blocks) {
          assert.ok(
            ["text", "thinking", "tool_use"].includes(block.kind),
            `${name}: block.kind "${block.kind}" should be text|thinking|tool_use`,
          );
          assert.equal(
            typeof block.text,
            "string",
            `${name}: block.text should be string`,
          );

          if (block.kind === "tool_use") {
            assert.ok(
              block.tool_call,
              `${name}: tool_use block must have tool_call`,
            );
            assert.equal(
              typeof block.tool_call.name,
              "string",
              `${name}: tool_call.name should be string`,
            );
            assert.ok(
              typeof block.tool_call.input === "object",
              `${name}: tool_call.input should be object`,
            );
            assert.equal(
              typeof block.tool_call.is_error,
              "boolean",
              `${name}: tool_call.is_error should be boolean`,
            );
          }
        }
      }
    });

    it(`${name}: turn indices are sequential starting from 1`, () => {
      const turns = parseTranscript(path);
      const indices = turns.map((t) => t.index);
      const expected = turns.map((_, index) => index + 1);
      assert.deepEqual(
        indices,
        expected,
        `${name}: indices should be sequential`,
      );
    });
  }
});
