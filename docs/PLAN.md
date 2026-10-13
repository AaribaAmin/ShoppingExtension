# Implementation Plan — ask_user Pi extension

## Stages

| Stage | Description | Status |
|-------|-------------|--------|
| W2-0  | Contract | Done |
| W2-1  | Roles + failing tests | Done |
| W2-2  | Implementation (parallel with W2-3) | Done |
| W2-3  | Independent review cases | Done |
| W2-4  | Review + fixes | Done |
| W2-5  | Demonstration + submission | Pending |

## W2-4 Evidence

| Run | Description | Evidence file(s) |
|-----|-------------|-----------------|
| R1/R2 regressions (RED) | Added regression tests R1 and R2; both failed before fix | `evidence/w2-4-red.log`, `evidence/w2-4-red-tap.log` |
| L-01 / busy fix (GREEN) | Applied option-id decoration and pending-scope fix; all 30 tests passed | `evidence/w2-4-green.log`, `evidence/w2-4-green-tap.log`, `evidence/w2-4-green-node-test.log` |
| Adapter guard (RED) | Added `ui-adapter.ts` and adapter tests A1–A5; A1/A2/A3 failed before guard fix | `evidence/w2-4b-red.log`, `evidence/w2-4b-red-tap.log`, `evidence/w2-4b-red-adapter-tap.log` |
| Adapter guard (GREEN) | Applied `typeof select/input !== "function"` guard; all 35 tests passed | `evidence/w2-4b-green.log`, `evidence/w2-4b-green-tap.log`, `evidence/w2-4b-green-adapter-tap.log` |

Fresh independent reviews (reviewer2, reviewer3) reproduced the findings and verified the fixes. No supported findings remain unresolved.

## Dependencies

- W2-1 depends on W2-0 (plan must be recorded before tests are written).
- W2-2 depends on W2-1 red evidence (tests must exist before implementing behavior).
- W2-3 depends on W2-1 (review cases are prepared after tests exist).
- W2-4 depends on W2-2 and W2-3 (review happens after both implementation and independent cases are complete).
- W2-5 depends on W2-4 (demonstration follows review and fixes).

## Roles & File Ownership

- **Orchestrator**: Coordinates work, assigns fixes, ensures the plan is followed.
- **Implementation Worker**: The only agent permitted to edit the working tree (`/Users/aaribaamin/Industry_AI/ShoppingExtension`). Responsible for writing tests and implementing behavior.
- **Independent Reviewer**: Prepares cases from `docs/CONTRACT.md`, returns independent findings and reproducible test results. Does not edit the working tree.

## Evidence Rules

- Distinguish fake-dialog tests from actual Pi interactions.
- Preserve evidence of both **failing** (RED) and **passing** (GREEN) test runs.
- Never claim a test passed, a review occurred, or a demonstration happened unless it actually did.
- Save raw test output logs under `evidence/` with descriptive names.

## Frozen Clarifications

These clarifications are fixed and will not change during implementation:

1. **Answered results must NOT include `consent: true`.** Only `cancelled` and `unavailable` results include `consent: false`.
2. **Tool description and core code stay general-purpose.** Shopping examples live only in the demo, never in core logic.
3. **No forbidden-term scan.** The reviewer checks separation of core and demo dependencies instead.
4. **Tests must explicitly cover cancellation in BOTH dialogs.** Additionally, they must cover a pending-dialog awaited with no default auto-accept.

## Additional Behaviors

- **Busy behavior:** While a question is pending, a second call on the same runner returns `unavailable` with `reason: "busy"` and `consent: false`, without opening another dialog. The original question remains pending and can still receive its answer.
- **Unavailable reason:** `unavailable` results may carry an optional `reason` string to explain why the UI is unavailable.
