import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

// The llama.rn adapter imports native code, so it cannot run under Node. These
// source checks guard settings whose absence was measured to break extraction on
// a real phone (Honor X9b, AI-001 probe, 2026-10-10).
const source = readFileSync(join(__dirname, "..", "..", "src", "ai", "llamaRnRuntime.ts"), "utf8");

describe("llama.rn adapter settings (source guard)", () => {
  it("keeps the generation prompt explicit and validates text with the chat header removed", () => {
    assert.match(source, /add_generation_prompt:\s*true/);
    assert.match(source, /extractCompletionText\(result\.text, result\.content\)/);
  });

  it("keeps the canonical JSON schema as the grammar", () => {
    assert.match(source, /response_format:\s*\{\s*type:\s*"json_schema"/);
  });
});
