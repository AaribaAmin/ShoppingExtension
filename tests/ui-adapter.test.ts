import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAskUserRunner } from "../src/ask-user.ts";
import { createUiFromContext } from "../src/ui-adapter.ts";

const params = {
  question: "Q?",
  reason: "R.",
  options: [
    { id: "a", label: "A", tradeoff: "a" },
    { id: "b", label: "B", tradeoff: "b" },
  ],
};

describe("A adapter UI construction", () => {
  test("A1 hasUI=true, select missing", async () => {
    const runner = createAskUserRunner();
    const ctx = {
      hasUI: true,
      ui: { input: async (_title: string, _placeholder?: string) => undefined as string | undefined },
    };
    const ui = createUiFromContext(ctx);
    const result = await runner(ui, params);
    assert.deepStrictEqual(result, { status: "unavailable", consent: false });
  });

  test("A2 hasUI=true, input missing", async () => {
    const runner = createAskUserRunner();
    const ctx = {
      hasUI: true,
      ui: { select: async (_title: string, _options: string[]) => undefined as string | undefined },
    };
    const ui = createUiFromContext(ctx);
    const result = await runner(ui, params);
    assert.deepStrictEqual(result, { status: "unavailable", consent: false });
  });

  test("A3 hasUI=true, ui undefined", async () => {
    const runner = createAskUserRunner();
    const ctx = { hasUI: true };
    const ui = createUiFromContext(ctx);
    const result = await runner(ui, params);
    assert.deepStrictEqual(result, { status: "unavailable", consent: false });
  });

  test("A4 hasUI=false, both methods present", async () => {
    const runner = createAskUserRunner();
    const ctx = {
      hasUI: false,
      ui: {
        select: async (_title: string, _options: string[]) => "whatever",
        input: async (_title: string, _placeholder?: string) => undefined as string | undefined,
      },
    };
    const ui = createUiFromContext(ctx);
    const result = await runner(ui, params);
    assert.deepStrictEqual(result, { status: "unavailable", consent: false });
  });

  test("A5 hasUI=true, both methods present", async () => {
    const runner = createAskUserRunner();
    const ctx = {
      hasUI: true,
      ui: {
        select: async (_title: string, options: string[]) => options[0],
        input: async (_title: string, _placeholder?: string) => undefined as string | undefined,
      },
    };
    const ui = createUiFromContext(ctx);
    const result = await runner(ui, params);
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "option",
      optionId: "a",
      label: "A",
    });
  });
});
