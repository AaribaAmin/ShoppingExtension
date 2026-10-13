import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { runAskUser, type AskUserResult } from "./ask-user.ts";
import { createUiFromContext } from "./ui-adapter.ts";

const OptionSchema = Type.Object({
  id: Type.String({ description: "Unique identifier for this option" }),
  label: Type.String({ description: "Display label shown to the user" }),
  tradeoff: Type.String({ description: "Brief tradeoff or consequence of choosing this option" }),
});

const AskUserToolParams = Type.Object({
  question: Type.String({ description: "One clear question to ask the user" }),
  reason: Type.String({ description: "Why this decision matters" }),
  options: Type.Array(OptionSchema, {
    description: "Two or three choices the user can pick from",
    minItems: 2,
    maxItems: 3,
  }),
  recommendation: Type.Optional(Type.String({
    description: "Optional suggested choice",
  })),
});

function contentText(result: AskUserResult): string {
  switch (result.status) {
    case "answered":
      if (result.kind === "option") {
        return `Status: answered (option). The user selected option "${result.optionId}" with label "${result.label}".`;
      }
      return `Status: answered (custom). The user wrote: ${result.answer}.`;
    case "cancelled":
      return "Status: cancelled. No decision was made. Do not invent or assume a decision; identify the unanswered question for the user.";
    case "unavailable":
      if (result.reason) {
        return `Status: unavailable (${result.reason}). No decision was made. Do not invent or assume a decision; identify the unanswered question for the user.`;
      }
      return "Status: unavailable. No decision was made. Do not invent or assume a decision; identify the unanswered question for the user.";
  }
}

export default function askUserExtension(pi: ExtensionAPI) {
  pi.registerTool(
    defineTool({
      name: "ask_user",
      label: "Ask User",
      description:
        "Ask the user an important question when a decision materially affects the outcome. " +
        "Proceed without asking when requirements are explicit, the user delegates the choice, " +
        "or the detail is routine and reversible. " +
        "If the user cancels or the UI is unavailable, the result reports that no decision was made; " +
        "do not invent or assume a choice, identify the unresolved decision instead.",
      parameters: AskUserToolParams,
      executionMode: "sequential",

      async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
        const ui = createUiFromContext({
          hasUI: ctx.hasUI,
          ui: ctx.ui as { select?: unknown; input?: unknown },
        });

        const result = await runAskUser(ui, params);

        return {
          content: [{ type: "text", text: contentText(result) }],
          details: result,
        };
      },
    }),
  );
}
