import type { AskUserUi } from "./ask-user.ts";

export interface DialogContextLike {
  hasUI: boolean;
  ui?: { select?: unknown; input?: unknown };
}

export function createUiFromContext(ctx: DialogContextLike): AskUserUi | undefined {
  if (!ctx.hasUI || !ctx.ui) return undefined;
  const { select, input } = ctx.ui;
  if (typeof select !== "function" || typeof input !== "function") return undefined;
  return {
    select: (title, options) => select.call(ctx.ui, title, options),
    input: (title, placeholder) => input.call(ctx.ui, title, placeholder),
  };
}
