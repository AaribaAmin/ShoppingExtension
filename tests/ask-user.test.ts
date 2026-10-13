import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAskUserRunner, AskUserValidationError } from "../src/ask-user.ts";

type AskUserOption = { id: string; label: string; tradeoff: string };
type AskUserParams = {
  question: string;
  reason: string;
  options: AskUserOption[];
  recommendation?: string;
};
interface AskUserUi {
  select(title: string, options: string[]): Promise<string | undefined>;
  input(title: string, placeholder?: string): Promise<string | undefined>;
}

const question = "Which shade do you want?";
const reason = "It affects the final look.";
const option1: AskUserOption = { id: "opt1", label: "Bold Red", tradeoff: "High impact" };
const option2: AskUserOption = { id: "opt2", label: "Soft Pink", tradeoff: "Subtle" };
const option3: AskUserOption = { id: "opt3", label: "Nude", tradeoff: "Natural" };
const option4: AskUserOption = { id: "opt4", label: "Berry", tradeoff: "Bold" };
const validOptions: AskUserOption[] = [option1, option2];
const validParams: AskUserParams = { question, reason, options: validOptions };

type SelectResponse = string | undefined | Promise<string | undefined>;
type InputResponse = string | undefined | Promise<string | undefined>;

class FakeDialog implements AskUserUi {
  calls: Array<{
    method: string;
    title: string;
    options?: string[];
    placeholder?: string;
  }> = [];
  private selectFn?: (title: string, options: string[]) => SelectResponse;
  private inputFn?: (title: string, placeholder?: string) => InputResponse;

  constructor(opts: {
    select?: ((title: string, options: string[]) => SelectResponse) | (string | undefined)[];
    input?: ((title: string, placeholder?: string) => InputResponse) | (string | undefined)[];
  } = {}) {
    if (Array.isArray(opts.select)) {
      let idx = 0;
      const arr = opts.select;
      this.selectFn = () => arr[idx++];
    } else if (opts.select) {
      this.selectFn = opts.select;
    }
    if (Array.isArray(opts.input)) {
      let idx = 0;
      const arr = opts.input;
      this.inputFn = () => arr[idx++];
    } else if (opts.input) {
      this.inputFn = opts.input;
    }
  }

  async select(
    title: string,
    options: string[],
  ): Promise<string | undefined> {
    this.calls.push({ method: "select", title, options });
    if (!this.selectFn) return undefined;
    return this.selectFn(title, options);
  }

  async input(
    title: string,
    placeholder?: string,
  ): Promise<string | undefined> {
    this.calls.push({ method: "input", title, placeholder });
    if (!this.inputFn) return undefined;
    return this.inputFn(title, placeholder);
  }
}

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };
function observe<T>(p: Promise<T>): Promise<Outcome<T>> {
  return p.then(
    (value) => ({ ok: true, value } as const),
    (error) => ({ ok: false, error } as const),
  );
}

class DeferredFakeDialog implements AskUserUi {
  calls: Array<{
    method: string;
    title: string;
    options?: string[];
    placeholder?: string;
  }> = [];
  private selectResolve?: (value: string | undefined) => void;
  private inputResolve?: (value: string | undefined) => void;
  private disposed = false;

  async select(
    title: string,
    options: string[],
  ): Promise<string | undefined> {
    this.calls.push({ method: "select", title, options });
    return new Promise<string | undefined>((resolve) => {
      this.selectResolve = resolve;
    });
  }

  async input(
    title: string,
    placeholder?: string,
  ): Promise<string | undefined> {
    this.calls.push({ method: "input", title, placeholder });
    return new Promise<string | undefined>((resolve) => {
      this.inputResolve = resolve;
    });
  }

  resolveSelect(value: string | undefined) {
    this.selectResolve?.(value);
    this.selectResolve = undefined;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.selectResolve?.(undefined);
    this.selectResolve = undefined;
    this.inputResolve?.(undefined);
    this.inputResolve = undefined;
  }
}

class DeferredInputDialog implements AskUserUi {
  calls: Array<{
    method: string;
    title: string;
    options?: string[];
    placeholder?: string;
  }> = [];
  private inputResolve?: (value: string | undefined) => void;
  private disposed = false;

  async select(
    title: string,
    options: string[],
  ): Promise<string | undefined> {
    this.calls.push({ method: "select", title, options });
    return options[options.length - 1];
  }

  async input(
    title: string,
    placeholder?: string,
  ): Promise<string | undefined> {
    this.calls.push({ method: "input", title, placeholder });
    return new Promise<string | undefined>((resolve) => {
      this.inputResolve = resolve;
    });
  }

  resolveInput(value: string | undefined) {
    this.inputResolve?.(value);
    this.inputResolve = undefined;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.inputResolve?.(undefined);
    this.inputResolve = undefined;
  }
}

async function assertValidationError(
  params: AskUserParams,
  fieldName: string,
  ui?: FakeDialog,
) {
  const runner = createAskUserRunner();
  await assert.rejects(
    async () => {
      await runner(ui ?? new FakeDialog(), params);
    },
    (err: any) =>
      err instanceof AskUserValidationError &&
      err.message.toLowerCase().includes(fieldName.toLowerCase()),
  );
  if (ui) {
    assert.strictEqual(ui.calls.length, 0, "expected zero dialog calls");
  }
}

describe("V validation", () => {
  test("V1 question empty string", async () => {
    const ui = new FakeDialog();
    await assertValidationError({ ...validParams, question: "" }, "question", ui);
  });

  test("V2 question whitespace only", async () => {
    const ui = new FakeDialog();
    await assertValidationError(
      { ...validParams, question: "   " },
      "question",
      ui,
    );
  });

  test("V3 reason empty string", async () => {
    const ui = new FakeDialog();
    await assertValidationError({ ...validParams, reason: "" }, "reason", ui);
  });

  test("V4 one option", async () => {
    const ui = new FakeDialog();
    await assertValidationError(
      { ...validParams, options: [option1] },
      "options",
      ui,
    );
  });

  test("V5 four options", async () => {
    const ui = new FakeDialog();
    await assertValidationError(
      { ...validParams, options: [option1, option2, option3, option4] },
      "options",
      ui,
    );
  });

  test("V6 duplicate option ids", async () => {
    const ui = new FakeDialog();
    const dup = [
      { id: "dup", label: "A", tradeoff: "a" },
      { id: "dup", label: "B", tradeoff: "b" },
    ];
    await assertValidationError({ ...validParams, options: dup }, "id", ui);
  });

  test("V7 option with empty id", async () => {
    const ui = new FakeDialog();
    const bad = [
      { id: "", label: "L", tradeoff: "T" },
      option2,
    ];
    await assertValidationError({ ...validParams, options: bad }, "id", ui);
  });

  test("V8 option with empty label", async () => {
    const ui = new FakeDialog();
    const bad = [
      { id: "x", label: "", tradeoff: "T" },
      option2,
    ];
    await assertValidationError({ ...validParams, options: bad }, "label", ui);
  });

  test("V9 option with empty tradeoff", async () => {
    const ui = new FakeDialog();
    const bad = [
      { id: "x", label: "L", tradeoff: "" },
      option2,
    ];
    await assertValidationError(
      { ...validParams, options: bad },
      "tradeoff",
      ui,
    );
  });
});

describe("I interaction surface", () => {
  test("I1 dialog surface includes question, reason, options, tradeoffs, recommendation", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({ select: (_title, options) => options[0] });
    const params: AskUserParams = {
      ...validParams,
      recommendation: "Soft Pink",
    };
    await runner(ui, params);
    assert.strictEqual(ui.calls.length, 1);
    const call = ui.calls[0];
    assert.strictEqual(call.method, "select");
    assert.ok(call.title.includes(question), "title should include question");
    assert.ok(call.title.includes(reason), "title should include reason");
    assert.ok(
      call.title.includes(`Recommendation: ${params.recommendation}`),
      "title should include recommendation with prefix",
    );
    for (let i = 0; i < validOptions.length; i++) {
      assert.ok(
        call.options![i].includes(validOptions[i].label),
        `option ${i} should include label`,
      );
      assert.ok(
        call.options![i].includes(validOptions[i].tradeoff),
        `option ${i} should include tradeoff`,
      );
    }
  });

  test("I2 custom-answer entry is offered and distinct from real option entries", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({ select: (_title, options) => options[0] });
    await runner(ui, validParams);
    assert.strictEqual(ui.calls.length, 1);
    const call = ui.calls[0];
    assert.strictEqual(call.method, "select");
    const offered = call.options!;
    assert.strictEqual(
      offered.length,
      validParams.options.length + 1,
      "offered length should be options.length + 1",
    );
    const customEntry = offered[offered.length - 1];
    const optionEntries = offered.slice(0, offered.length - 1);
    assert.ok(
      !optionEntries.some((entry) => entry === customEntry),
      "custom entry must be distinct from every option entry",
    );
  });

  test("I3 without recommendation, surface contains no Recommendation section", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({ select: (_title, options) => options[0] });
    const params: AskUserParams = { ...validParams }; // no recommendation
    await runner(ui, params);
    assert.strictEqual(ui.calls.length, 1);
    const call = ui.calls[0];
    assert.strictEqual(call.method, "select");
    assert.ok(
      !call.title.includes("Recommendation:"),
      "title should not contain Recommendation:",
    );
  });
});

describe("A answered", () => {
  test("A1 select returns offered[1]", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({ select: (_title, options) => options[1] });
    const result = await runner(ui, validParams);
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "option",
      optionId: option2.id,
      label: option2.label,
    });
    assert.ok(!("consent" in result), "answered result must not contain consent");
  });

  test("A2 select custom entry then custom input", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({
      select: (_title, options) => options[options.length - 1],
      input: () => "  pink velvet  ",
    });
    const result = await runner(ui, validParams);
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "custom",
      answer: "  pink velvet  ",
    });
    assert.ok(!("consent" in result), "answered result must not contain consent");
  });

  test("A3 custom answer preserves whitespace exactly", async () => {
    const answer = "line1\n\tline2 ";
    const runner = createAskUserRunner();
    const ui = new FakeDialog({
      select: (_title, options) => options[options.length - 1],
      input: () => answer,
    });
    const result = await runner(ui, validParams);
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "custom",
      answer,
    });
    assert.ok(!("consent" in result), "answered result must not contain consent");
  });

  test("A4 option label with surrounding whitespace preserved exactly", async () => {
    const runner = createAskUserRunner();
    const spacedOption: AskUserOption = { id: "sp", label: "  Spaced Label  ", tradeoff: "x" };
    const otherOption: AskUserOption = { id: "other", label: "Other", tradeoff: "y" };
    const params: AskUserParams = { question, reason, options: [spacedOption, otherOption] };
    const ui = new FakeDialog({ select: (_title, options) => options[0] });
    const result = await runner(ui, params);
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "option",
      optionId: spacedOption.id,
      label: "  Spaced Label  ",
    });
    assert.ok(!("consent" in result), "answered result must not contain consent");
  });

  test("A5 substring-overlapping labels mapped by exact index, not substring", async () => {
    const runner = createAskUserRunner();
    const optA: AskUserOption = { id: "a", label: "Red", tradeoff: "warm" };
    const optB: AskUserOption = { id: "b", label: "Bold Red", tradeoff: "warm" };
    const params: AskUserParams = { question, reason, options: [optA, optB] };
    const ui = new FakeDialog({ select: (_title, options) => options[1] });
    const result = await runner(ui, params);
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "option",
      optionId: "b",
      label: "Bold Red",
    });
    assert.ok(!("consent" in result), "answered result must not contain consent");
  });
});

describe("C cancellation", () => {
  test("C1 select returns undefined", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({ select: () => undefined });
    const result = await runner(ui, validParams);
    assert.deepStrictEqual(result, { status: "cancelled", consent: false });
    assert.strictEqual(
      ui.calls.filter((c) => c.method === "input").length,
      0,
      "input should not be called",
    );
  });

  test("C2 select custom entry then input undefined", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({
      select: (_title, options) => options[options.length - 1],
      input: () => undefined,
    });
    const result = await runner(ui, validParams);
    assert.deepStrictEqual(result, { status: "cancelled", consent: false });
  });

  test("C3 select custom entry then input whitespace only spaces", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({
      select: (_title, options) => options[options.length - 1],
      input: () => "   ",
    });
    const result = await runner(ui, validParams);
    assert.deepStrictEqual(result, { status: "cancelled", consent: false });
  });

  test("C4 select custom entry then input whitespace mixed", async () => {
    const runner = createAskUserRunner();
    const ui = new FakeDialog({
      select: (_title, options) => options[options.length - 1],
      input: () => "\t\n ",
    });
    const result = await runner(ui, validParams);
    assert.deepStrictEqual(result, { status: "cancelled", consent: false });
  });
});

describe("P pending / no default", () => {
  test("P1 stays pending while select unresolved, then returns selected answer", async () => {
    const runner = createAskUserRunner();
    const ui = new DeferredFakeDialog();
    const promise = runner(ui, validParams);
    const timer = new Promise<"timer">((resolve) => setTimeout(() => resolve("timer"), 50));
    const raceResult = await Promise.race([promise, timer]).catch((e) => e);
    assert.strictEqual(raceResult, "timer", "runAskUser should still be pending");
    ui.resolveSelect(ui.calls[0].options![0]);
    const result = await promise;
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "option",
      optionId: option1.id,
      label: option1.label,
    });
  });

  test("P2 with recommendation present and select unresolved, no default auto-accept", async () => {
    const runner = createAskUserRunner();
    const ui = new DeferredFakeDialog();
    const params: AskUserParams = {
      ...validParams,
      recommendation: "Bold Red",
    };
    const promise = runner(ui, params);
    const timer = new Promise<"timer">((resolve) => setTimeout(() => resolve("timer"), 50));
    const raceResult = await Promise.race([promise, timer]).catch((e) => e);
    assert.strictEqual(raceResult, "timer", "should not auto-resolve with recommendation");
    ui.resolveSelect(ui.calls[0].options![1]);
    const result = await promise;
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "option",
      optionId: option2.id,
      label: option2.label,
    });
  });
});

describe("U unavailable", () => {
  test("U1 ui undefined returns unavailable", async () => {
    const runner = createAskUserRunner();
    const result = await runner(undefined, validParams);
    assert.deepStrictEqual(result, { status: "unavailable", consent: false });
  });

  test("U2 select method missing", async () => {
    const runner = createAskUserRunner();
    const ui = { input: async (_title: string, _placeholder?: string) => undefined as string | undefined };
    const result = await runner(ui as any, validParams);
    assert.deepStrictEqual(result, { status: "unavailable", consent: false });
  });

  test("U3 input method missing", async () => {
    const runner = createAskUserRunner();
    const ui = { select: async (_title: string, _options: string[]) => undefined as string | undefined };
    const result = await runner(ui as any, validParams);
    assert.deepStrictEqual(result, { status: "unavailable", consent: false });
  });
});

describe("B busy", () => {
  test("B1 second call on same runner while pending returns unavailable busy", async () => {
    const runner = createAskUserRunner();
    const deferred = new DeferredFakeDialog();
    const promise1 = runner(deferred, validParams);
    const firstOutcome = observe(promise1);

    try {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fake2 = new FakeDialog();
      const result2 = await runner(fake2, validParams);
      assert.deepStrictEqual(result2, { status: "unavailable", reason: "busy", consent: false });
      assert.strictEqual(fake2.calls.length, 0, "second dialog should receive zero calls");

      deferred.resolveSelect(deferred.calls[0].options![0]);
      const result1 = await promise1;
      assert.deepStrictEqual(result1, {
        status: "answered",
        kind: "option",
        optionId: option1.id,
        label: option1.label,
      });
    } finally {
      deferred.dispose();
      await firstOutcome;
      const outcome = await firstOutcome;
      if (!outcome.ok) throw outcome.error;
      assert.deepStrictEqual(outcome.value, {
        status: "answered",
        kind: "option",
        optionId: option1.id,
        label: option1.label,
      });
    }
  });

  test("B2 after first call finishes, later call on same runner is not busy", async () => {
    const runner = createAskUserRunner();
    const fake1 = new FakeDialog({ select: () => undefined });
    await runner(fake1, validParams);

    const fake2 = new FakeDialog({ select: (_title, options) => options[0] });
    const result2 = await runner(fake2, validParams);
    assert.deepStrictEqual(result2, {
      status: "answered",
      kind: "option",
      optionId: option1.id,
      label: option1.label,
    });
    assert.strictEqual(fake2.calls.length, 1, "second dialog should be called");
  });
});

describe("R regressions", () => {
  test("R1 identical labels and tradeoffs stay distinguishable by id", async () => {
    const runner = createAskUserRunner();
    const optA: AskUserOption = { id: "a", label: "Same", tradeoff: "same" };
    const optB: AskUserOption = { id: "b", label: "Same", tradeoff: "same" };
    const ui = new FakeDialog({ select: (_title, options) => options[1] });
    const result = await runner(ui, { question, reason, options: [optA, optB] });
    assert.deepStrictEqual(result, {
      status: "answered",
      kind: "option",
      optionId: "b",
      label: "Same",
    });
    assert.ok(!("consent" in result), "answered result must not contain consent");
  });

  test("R2 custom input stays busy; first answer still resolves", async () => {
    const runner = createAskUserRunner();
    const d = new DeferredInputDialog();
    const p1 = runner(d, validParams);
    const firstOutcome = observe(p1);

    try {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const fake2 = new FakeDialog();
      const r2 = await runner(fake2, validParams);
      assert.deepStrictEqual(r2, { status: "unavailable", reason: "busy", consent: false });
      assert.strictEqual(fake2.calls.length, 0, "second dialog should receive zero calls");

      d.resolveInput("a custom pick");
      const r1 = await p1;
      assert.deepStrictEqual(r1, { status: "answered", kind: "custom", answer: "a custom pick" });
    } finally {
      d.dispose();
      const outcome = await firstOutcome;
      if (!outcome.ok) throw outcome.error;
    }
  });
});
