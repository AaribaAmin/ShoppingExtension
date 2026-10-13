# ask_user contract

## Purpose
Provide a general-purpose tool that a Pi agent can call when an
important decision needs human input. Makeup shopping is the demo.

## Inputs
- question: one clear, nonempty question
- reason: a brief explanation of why the decision matters
- options: two or three choices, each with a unique id, label,
  and tradeoff
- recommendation: an optional suggestion

Invalid inputs must produce a clear error before opening a dialog.

## Interaction
Display the question, reason, options, tradeoffs, and recommendation.
Let the human select an option or write a custom answer.
Handle one question at a time and wait for the response.
Use Pi's existing selection and input dialogs.

While a question is pending, a second call returns unavailable with reason: "busy" and consent: false, without opening another dialog. The original question remains pending and can still receive its answer.

## Results
- answered: return the selected option's id and exact label,
  or the exact custom answer; identify which kind of answer it was
- cancelled: return this status when the human dismisses a dialog
  or submits an empty or whitespace-only custom answer
- unavailable: return this status when interactive UI is unavailable;
  may include an optional reason string

Cancelled and unavailable results must include consent: false.
Never silently choose a default or accept the recommendation.
Preserve nonempty custom answers exactly, including their whitespace.

## Agent guidance
Ask when missing information materially affects the outcome.
Proceed when requirements are explicit, the user delegates the choice,
or the detail is routine and reversible.
If a required decision remains unanswered, identify it rather than
inventing an answer.

## Shopping examples
Ask: "Find makeup deals" without a budget or required shades.
Proceed: "Use these exact products and shades with a $50 budget."
Proceed: "Choose the demo's display order for me."

The shopping demo uses clearly labeled fictional deals.
The general ask_user extension contains no shopping-specific logic.
