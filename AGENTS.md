# Repository instructions

## Project scope
Build the general-purpose ask_user Pi extension described in docs/CONTRACT.md.
Use fictional makeup deals for the demonstration.

## Red/green TDD (test-driven development) 
Before implementing a behavior:
1. Write a test using a fake dialog.
2. Run it and confirm it fails for the expected reason.
3. Implement the smallest change needed.
4. Run the tests and confirm they pass.

Preserve evidence of the failing and passing test runs.

## Coordination
Use Herdr to coordinate the orchestrator, implementation worker, and independent reviewer.
Follow the task dependencies in the agreed plan.

## File ownership
Only the implementation worker edits the working tree.
The reviewer returns independent cases and reproducible findings.
The orchestrator assigns fixes to the implementation worker.

## Review
The reviewer prepares cases from the contract before inspecting implementation.
Complete implementation and independent cases before the final review.
Resolve supported findings and rerun the relevant tests.

## Evidence
Distinguish fake-dialog tests from actual Pi interactions.
Never claim a test, review, or demonstration happened unless it did.

