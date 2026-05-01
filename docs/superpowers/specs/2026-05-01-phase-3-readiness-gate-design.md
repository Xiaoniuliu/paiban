# Phase 3 Readiness Gate Design

## Context

Phase 2 / 2.5 cleanup has already removed the main structural blockers:

- Timeline is display-only and no longer acts as a business edit authority.
- Flight task delete, run-data protection, crew write atomicity, and assignment eligibility reuse have been tightened.
- Targeted backend tests, frontend build, i18n checks, and a timeline display-only Chromium smoke test are already passing.

The remaining decision is whether to begin Phase 3 immediately or require one final business-rejection gate first.

This spec formalizes that final gate.

## Decision

Adopt `Gate A` before Phase 3 starts.

Gate A means we do one final real-click and F12-aligned validation pass focused only on expected `409 Conflict` business rejections. We do not expand scope into new features or unrelated refactors. We only prove that protected actions fail in a controlled, user-visible, contract-aligned way.

## Goal

Confirm that all expected business rejections satisfy the following:

- The frontend either disables the action ahead of time or allows the click and shows the same domain reason returned by the backend.
- A `409` response is treated as an expected domain outcome, not as a runtime failure.
- Local action failures do not collapse the whole page into a load failure state.
- F12 Console shows no new runtime errors.
- F12 Network shows no unexpected `4xx/5xx` outside the intentionally exercised protected action.

## Scope

This gate covers only the main Phase 3-adjacent protected flows:

1. Flight task protected delete/edit
2. Flight operations protected master-data mutation
3. Draft rostering protected read-only / ineligible save paths

This gate does not include:

- New Phase 3 feature development
- New architecture work
- Legacy feature expansion
- Additional cleanup beyond bugs directly discovered by this gate

## Validation Paths

### 1. Flight Task

Exercise protected task actions that should be rejected, such as:

- deleting a task that is already published
- deleting a task that has already entered downstream flow
- attempting edits on rows that should be read-only

Expected result:

- Network returns the expected `409` only for the protected action
- the page stays interactive
- the visible error reason matches the backend domain reason

### 2. Flight Operations

Exercise protected route / airport / aircraft mutations against data still referenced by active tasks.

Expected result:

- if the button is disabled, the disabled reason matches the backend rule
- if the action is still allowed to click, the resulting `409` is surfaced as a domain message
- the loaded table body remains visible after the failed action

### 3. Draft Rostering

Exercise protected assignment flows, including:

- read-only users opening a task in inspection mode
- attempting to save draft assignments for ineligible crew
- attempting to save on tasks that should remain read-only

Expected result:

- manager/admin can still open read-only inspection when `canOpenAssignment` is true
- save rejection shows backend domain reasoning
- the drawer remains stable and does not degrade into a generic runtime failure

## Execution Method

Use real Chromium interaction with F12-equivalent capture.

For each scenario:

1. Open the real page
2. Perform the protected click path
3. Observe visible UI outcome
4. Capture console errors, page errors, request failures, and unexpected response statuses
5. Compare the UI message against the backend reason

## Pass Criteria

Gate A passes only if all of the following are true:

- every targeted protected action behaves according to contract
- expected `409` responses are rendered as domain-level feedback
- no page enters a broken load state after a rejected action
- no new console runtime error appears
- no unexpected request failure appears during the validation window

## Failure Handling Rule

If Gate A discovers a real bug, only the smallest fix required to restore contract alignment should be made.

Examples of allowed fixes:

- wrong button enablement or disablement
- missing or generic domain error mapping
- page-level error conflation
- real runtime error exposed by the protected flow

Examples of disallowed scope expansion:

- opportunistic refactors
- unrelated UI polish
- broad architectural redesign

## Outcome

If Gate A passes, the project is considered ready to enter Phase 3.

If Gate A fails, we fix only the directly discovered contract bug, rerun the same gate, and then proceed.
