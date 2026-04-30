# Phase 1 Flight-Task Module Stabilization Plan

## Status

Phase 1 is now treated as functionally sealed for the main-path task closed loop.

Delivered outcome:

- visible flight-task entry uses a dedicated `FlightTaskPage`
- `FlightOperationsPage` is no longer the main task-module entry
- old hidden task-plan routes are removed from the active main path
- task list, create, edit, cancel, and read-only detail all run from the new task-module surface
- non-maintainable task rows remain viewable from the task side
- ordinary task maintenance cannot rewrite draft-assigned or published workflow meaning
- manual task creation defaults to `sourceStatus = MANUAL` in the backend
- flight-plan add/edit now references run-data route and aircraft master data instead of keeping all base fields free-form
- route selection now autofills departure/arrival and may seed end time from route duration
- aircraft-number selection now autofills aircraft type
- task delete semantics are now physical delete only, and only while the task has not entered downstream flow

Phase 1 intentionally leaves the following for later phases:

- backend-driven action-capability view models
- crew-resource stabilization
- draft rostering migration
- issue-handling replacement
- publish-result replacement
- batch-strip action wiring beyond layout placeholders
- heavier explicit reference-key and snapshot hardening for run-data-backed task entry

### Deferred UI follow-ups kept intentionally out of the Phase 1 seal

The approved task-page layout now includes three batch-strip action placeholders:

- `导入新批次 / Import New Batch`
- `切换批次 / Switch Batch`
- `查看批次详情 / View Batch Detail`

These buttons currently exist as layout-level placeholders only.

They were intentionally not wired during the Phase 1 seal so the team could:

- stabilize the task-module information hierarchy first,
- avoid mixing new batch workflows into the task-module closeout,
- choose the next batch-management step explicitly instead of drifting into scope expansion.

Recommended follow-up order:

1. `查看批次详情 / View Batch Detail`
2. `切换批次 / Switch Batch`
3. `导入新批次 / Import New Batch`

## Goal

Stabilize the flight-task module as the first closed loop in the new main path:

`task import/create -> task list -> task detail/edit -> delete -> task state remains trustworthy`

This phase must work without depending on:

- legacy timeline state guessing,
- draft-rostering page-local assembly,
- route/aircraft/airport management being bundled into the same workflow.

## Current baseline

Backend already provides:

- `GET /api/task-plan/batches`
- `POST /api/task-plan/batches`
- `PUT /api/task-plan/batches/{batchId}`
- `GET /api/task-plan/items`
- `POST /api/task-plan/items`
- `PUT /api/task-plan/items/{itemId}`
- `DELETE /api/task-plan/items/{itemId}` (physical delete when still safe)

Frontend already provides:

- task list and edit dialog inside `FlightOperationsPage`
- current task query and status filter
- task create/update/cancel actions

Current structural problem:

- `FlightOperationsPage` mixes task facts with route management, aircraft registry, and airport-timezone administration.

## Phase 1 boundaries

Phase 1 includes:

- task import batch view as a task-module entry surface
- task list
- task detail/edit surface
- create/update/cancel flows
- task-module action gating
- task-module status projection

Phase 1 excludes:

- draft rostering redesign
- timeline behavior changes beyond already-frozen display-only constraints
- route-management redesign
- aircraft-registry redesign
- airport-timezone redesign

## Phase 1 implementation order

### Step 1. Lock the task-module fact shape

Use current `TaskPlanItem` as the implementation baseline and explicitly map fields into:

- master task fields
- runtime fact fields
- derived workflow fields

Immediate follow-up:

- confirm which current fields remain editable in task module
- confirm which fields should later move to runtime-mark handling rather than ordinary edit

### Step 2. Isolate the frontend task surface

Refactor the current flight-operations task experience so the task closed loop is readable and maintainable on its own.

Target outcome:

- task list and task detail logic become separable from route/airport/aircraft sections
- task-module behavior is understandable without reading unrelated operational master-data code

This does not require deleting route/airport/aircraft UI in Phase 1.
It does require preventing those areas from remaining coupled to the task closed loop.

Current implemented boundary in Phase 1:

- visible task routes now use a dedicated `FlightTaskPage`
- `FlightTaskPage` owns task batches, task list, task filters, task edit dialog, and task create/update/cancel calls
- `FlightOperationsPage` is reduced toward route/airport/aircraft maintenance and no longer acts as the main task-module entry
- task-module UI helpers were extracted into `FlightTaskModule.tsx` so task behavior is no longer duplicated inside the mixed operations page
- old hidden `/task-plan/*` routes are removed from the active route table
- `TaskPlanCenterPage` is no longer part of the active page export chain
- `menu-flight-operations` no longer treats old task-plan views as current aliases

### Step 3. Normalize task-module states

Task-module display should project only the task-level stable states already agreed for this module:

- `UNASSIGNED`
- `ASSIGNED_DRAFT`
- `PUBLISHED`

Notes:

- runtime marks such as cancellation or timing change should not cause task module to invent extra workflow states
- task module should show trustworthy task truth, not downstream issue-processing detail

### Step 4. Enforce task-module action gates

At the end of Phase 1, task actions must be explicit and backend-driven.

Minimum action expectations:

- unassigned task can be edited
- unassigned task can be cancelled
- draft-assigned task can still be viewed from the task side
- published task cannot be changed through ordinary task edit

Current implemented gate in Phase 1:

- newly created tasks are normalized to `UNASSIGNED`
- ordinary task CRUD can no longer create `PUBLISHED` tasks directly
- ordinary task edit is blocked for `ASSIGNED_DRAFT`
- ordinary task cancel is blocked for `ASSIGNED_DRAFT`
- published-task protection remains in place
- frontend task action buttons are shown only for `UNASSIGNED` tasks
- task edit dialog no longer allows direct workflow-status editing
- task update payload no longer sends workflow status back to the backend
- task update payload no longer sends `sourceStatus` back through ordinary task maintenance
- task create payload keeps `sourceStatus = MANUAL` as the task-module-owned creation baseline

Phase 1 does not need to finish all downstream actions.
It does need to stop ambiguous editing behavior.

### Step 5. Add Phase 1 verification coverage

Add or extend verification around:

- create task
- update task
- cancel task
- published task edit rejection
- task list still returns trustworthy statuses

## Required code decisions

### Decision A. Backend baseline

Keep `TaskPlanController` as the initial Phase 1 backend baseline rather than redesigning task APIs in the same phase.

Reason:

- it already matches the closed-loop entry we need
- replacing it now adds risk without increasing business clarity

### Decision B. Frontend baseline

Use the task portion of `FlightOperationsPage` as the extraction baseline rather than redesigning the whole flight-operations center first.

Reason:

- task CRUD already works there
- the main risk is coupling, not absence

### Decision C. Soft cancel remains the current first-stage behavior

Current cancel behavior sets task status to `CANCELLED`.
Phase 1 should preserve this behavior while clarifying that it is a runtime fact transition, not an invitation to invent extra task-module workflow states.

### Decision D. Frontend delete wording can close before backend physical delete

The current frontend can adopt delete wording and hide cancelled or inactive rows from the main working set in order to keep the CRUD surface simple for users.

This does **not** mean backend physical delete is complete.
Real physical delete semantics for task-plan and operations master data remain a later backend follow-up.

## Deliverables

Phase 1 should produce:

- a clear task-module frontend surface
- task-module action boundaries that do not depend on legacy timeline semantics
- task-module backend behavior documented by verification
- a code path that Phase 2 crew-resource work can safely depend on

## Completion gate

Phase 1 is complete when:

- dispatchers can manage task facts without entering legacy workbench pages
- task list and task detail no longer depend on timeline-derived meaning
- published-task protection remains enforced
- task-module code can be understood separately from route/airport/aircraft administration

Current completion check:

- yes: dispatchers can enter from the new `flight-plan` route instead of legacy workbench pages
- yes: task CRUD and read-only detail no longer depend on timeline-derived state
- yes: published-task protection remains enforced
- yes: task-module code is split away from the mixed operations page

## Verification snapshot

Verified at phase seal:

- `mvn.cmd -f apps\\api\\pom.xml -Dtest=TaskPlanControllerIntegrationTests test` passes (`4/4`)
- `npx.cmd tsc --noEmit --pretty false` still fails only on three pre-existing repository-wide TypeScript issues outside the Phase 1 task-module surface:
  - `src/app/components/timeline/VisTimelineAdapter.tsx`
  - `src/app/lib/time.ts`
  - `src/main.tsx`
