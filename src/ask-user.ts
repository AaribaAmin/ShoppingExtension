export class AskUserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AskUserValidationError";
  }
}

export interface AskUserOption {
  id: string;
  label: string;
  tradeoff: string;
}

export interface AskUserParams {
  question: string;
  reason: string;
  options: AskUserOption[];
  recommendation?: string;
}

export type AskUserResult =
  | { status: "answered"; kind: "option"; optionId: string; label: string }
  | { status: "answered"; kind: "custom"; answer: string }
  | { status: "cancelled"; consent: false }
  | { status: "unavailable"; consent: false; reason?: string };

export interface AskUserUi {
  select(title: string, options: string[]): Promise<string | undefined>;
  input(title: string, placeholder?: string): Promise<string | undefined>;
}

export type AskUserRunner = (
  ui: AskUserUi | undefined,
  params: AskUserParams,
) => Promise<AskUserResult>;

function validate(params: AskUserParams): void {
  if (typeof params.question !== "string" || params.question.trim().length === 0) {
    throw new AskUserValidationError("question must be a non-empty string");
  }
  if (typeof params.reason !== "string" || params.reason.trim().length === 0) {
    throw new AskUserValidationError("reason must be a non-empty string");
  }
  if (
    !Array.isArray(params.options) ||
    (params.options.length !== 2 && params.options.length !== 3)
  ) {
    throw new AskUserValidationError("options must contain exactly 2 or 3 choices");
  }

  const seenIds = new Set<string>();
  for (let i = 0; i < params.options.length; i++) {
    const opt = params.options[i];
    if (typeof opt.id !== "string" || opt.id.trim().length === 0) {
      throw new AskUserValidationError(`option ${i + 1} id must be non-empty`);
    }
    if (typeof opt.label !== "string" || opt.label.trim().length === 0) {
      throw new AskUserValidationError(`option ${i + 1} label must be non-empty`);
    }
    if (typeof opt.tradeoff !== "string" || opt.tradeoff.trim().length === 0) {
      throw new AskUserValidationError(`option ${i + 1} tradeoff must be non-empty`);
    }
    if (seenIds.has(opt.id)) {
      throw new AskUserValidationError(`duplicate option id: ${opt.id}`);
    }
    seenIds.add(opt.id);
  }
}

export function createAskUserRunner(): AskUserRunner {
  let pending = false;

  return async function askUserRunner(
    ui: AskUserUi | undefined,
    params: AskUserParams,
  ): Promise<AskUserResult> {
    validate(params);

    if (pending) {
      return { status: "unavailable", reason: "busy", consent: false };
    }

    if (
      !ui ||
      typeof ui.select !== "function" ||
      typeof ui.input !== "function"
    ) {
      return { status: "unavailable", consent: false };
    }

    const optionEntries = params.options.map(
      (opt) => `[${opt.id}] ${opt.label} — ${opt.tradeoff}`,
    );
    const customEntry = "Custom answer";
    const offered = [...optionEntries, customEntry];

    const titleParts = [params.question, params.reason];
    if (params.recommendation !== undefined) {
      titleParts.push(`Recommendation: ${params.recommendation}`);
    }
    const title = titleParts.join("\n\n");

    try {
      pending = true;
      const selection = await ui.select(title, offered);

      if (selection === undefined) {
        return { status: "cancelled", consent: false };
      }

      const optionIndex = optionEntries.findIndex((entry) => entry === selection);
      if (optionIndex !== -1) {
        const opt = params.options[optionIndex];
        return {
          status: "answered",
          kind: "option",
          optionId: opt.id,
          label: opt.label,
        };
      }

      if (selection === customEntry) {
        const answer = await ui.input(title, "Your answer");
        if (answer === undefined || answer.trim() === "") {
          return { status: "cancelled", consent: false };
        }
        return { status: "answered", kind: "custom", answer };
      }

      return { status: "cancelled", consent: false };
    } finally {
      pending = false;
    }
  };
}

export const runAskUser: AskUserRunner = createAskUserRunner();
