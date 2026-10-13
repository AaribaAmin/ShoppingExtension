# ask_user — General-Purpose Decision Tool for Pi

A Pi extension that lets agents ask the user an important decision-making question, present 2–3 clear options (each with a tradeoff), and wait for the answer before proceeding. Agents may also offer a *custom* answer alongside the fixed options.

**When to use:** Ask when missing information materially affects the outcome.
**When to proceed without asking:** When requirements are explicit, the user delegates the choice, or the detail is routine and reversible.

## Install / Load

The extension is a single TypeScript file. Pi loads it directly with `jiti`, so no compile step is needed.

```bash
pi --extension ./src/index.ts
```

## Running tests

```bash
npm test
```

(`npm test` runs `node --test`, which discovers `tests/ask-user.test.ts` and `tests/ui-adapter.test.ts`.)

## Inputs

| Field | Required | Description |
|-------|----------|-------------|
| `question` | Yes | One clear question to ask the user |
| `reason` | Yes | Why the decision matters |
| `options` | Yes | Exactly 2 or 3 choices. Each choice has a **unique** `id`, a display `label`, and a `tradeoff` string |
| `recommendation` | No | Optional suggested choice |

## Results

| Status | Shape | What it means |
|--------|-------|---------------|
| `answered` (option) | `{status:"answered", kind:"option", optionId, label}` | User picked a provided option. Returns the original `optionId` and the **exact** original `label` (including any surrounding whitespace) |
| `answered` (custom) | `{status:"answered", kind:"custom", answer}` | User picked the custom-answer entry and typed something. The `answer` string is preserved **exactly** (untrimmed) |
| `cancelled` | `{status:"cancelled", consent:false}` | User dismissed the select dialog, or picked custom answer but then dismissed the input dialog, or submitted whitespace only |
| `unavailable` | `{status:"unavailable", consent:false, reason?}` | Interactive UI is missing or incomplete. A second call while a question is already pending returns `reason: "busy"` |

**Answered results never contain a `consent` field.**

## How the options are presented

The tool shows each option as one list entry, decorated with its unique `id` so identical labels/tradeoffs stay distinguishable:

```
[50] $50 budget — Enough room for the full list, but allows more spending.
```

The user sees the label and tradeoff exactly as provided, but selection is matched by the full decorated entry so the tool always returns the correct `optionId`.

## Two kinds of evidence

1. **Fake-dialog tests** (`tests/ask-user.test.ts`, `tests/ui-adapter.test.ts`) — run by `npm test` against `FakeDialog` and `DeferredFakeDialog`. These cover validation, result mapping, cancellation, busy-state, and UI-adapter guards.
2. **Real Pi demonstration** (`evidence/w2-5-demo.md`) — a literal Pi session transcript (`pi --extension ./src/index.ts`) where the agent called `ask_user`, the user answered via Pi's actual UI dialogs, and the tool result was returned to the agent.

## Fictional demo prices

The real demonstration used clearly labeled *fictional* prices:

- Foundation: $24
- Concealer: $12
- Blush: $9
- Total: $45

No real fees or actual products are involved.

## Limitations & review notes

- **No real demo of `unavailable` path:** The demonstration session did not exercise the headless / busy / missing-dialog scenarios; those are covered only by fake-dialog tests.
- **Identical-label distinguishability:** Independent review found that two options with the same label and tradeoff could be confused. The fix adds `[id]` decoration to every presented option entry.
- **Busy scope:** The first implementation cleared the busy flag immediately after `select`. Review showed a second call could open a dialog while the user was still typing a custom answer. The fix now holds the `pending` flag until the *entire* interaction (select → result mapping → optional input) is complete.
- **Adapter guard:** The UI adapter originally assumed `ctx.ui.select` and `ctx.ui.input` were always present. Review showed that `runAskUser` only checked `typeof ui.input === "function"` after the adapter already created a wrapper function. The adapter now guards each method before wrapping, so missing-dialog conditions yield `unavailable` with no throw.

## Files

| File | Role |
|------|------|
| `src/ask-user.ts` | Core types + `createAskUserRunner()` |
| `src/ui-adapter.ts` | Pi-specific adapter that builds `AskUserUi` from `ExtensionContext` |
| `src/index.ts` | Pi extension factory (registers the `ask_user` tool) |
| `tests/ask-user.test.ts` | 30 fake-dialog tests (validation, interaction, answers, cancellation, pending, unavailable, busy, regressions) |
| `tests/ui-adapter.test.ts` | 5 adapter construction tests |
| `evidence/` | Raw RED and GREEN test logs + real demo transcript |
