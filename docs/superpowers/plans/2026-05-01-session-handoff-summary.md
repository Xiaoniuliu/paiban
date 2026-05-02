# 2026-05-01 Session Handoff Summary

## Purpose

This file summarizes:

- the architectural direction agreed in this session
- what has already been implemented
- what was verified
- what remains to do next
- the current ordered task list at the moment the session paused

It is intended as a handoff baseline for the next window/session.

## Core Product / Architecture Decisions

### Overall direction

- Use **gradual replacement**, not a full rewrite.
- Keep the **rule center**.
- Move old unstable flows into **Legacy**.
- Treat the **timeline** as an official-capability-only **display layer**, not a business-state source.
- Prioritize **stable rollout**, **maintainability**, and **clear module boundaries** over feature breadth.

### Module / closure order

The agreed execution order is:

1. Flight task module
2. Crew resource module
3. Draft rostering module
4. Issue handling module
5. Publish results module

### Deletion semantics

This was tightened explicitly:

- **Delete = physical delete**
- No logical delete should be called "delete"
- **Cancel != delete**

For run-data master data:

- Unreferenced data: can be physically deleted
- Referenced data: cannot be deleted

For flight plan tasks:

- Not yet entered downstream flow: can be physically deleted
- Already entered downstream flow: cannot be deleted

### Run-data ownership

`运行资料` is the master-data source for:

- routes
- airports / timezones
- aircraft / aircraft-type related data

`航班计划` should reference these instead of freely re-typing all base fields.

### Crew module structure

`机组信息` was agreed to be divided into four bounded parts:

1. 人员档案
2. 资质/执照
3. 小时与限制
4. 执勤日历

Important principle:

- Do **not** pre-add speculative fields everywhere now
- Keep the **structure ready**
- Add future fields into the correct bounded section later

### Transitional status fields

The following are currently treated as **transitional control fields**, not a future long-term business-state model:

- `ACTIVE`
- `INACTIVE`
- `AVAILABLE`
- `UNAVAILABLE`

They should not be expanded into a larger product-state system unless future requirements clearly demand that.

## Documents Created / Updated

Primary working docs:

- `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`
- `D:\paiban2\docs\superpowers\plans\2026-04-30-phase-0-boundary-freeze-plan.md`
- `D:\paiban2\docs\superpowers\plans\2026-04-30-phase-1-flight-task-module-plan.md`
- `D:\paiban2\docs\superpowers\plans\2026-04-30-phase-2-crew-resource-module-plan.md`

This handoff file:

- `D:\paiban2\docs\superpowers\plans\2026-05-01-session-handoff-summary.md`

## What Has Been Implemented

### Phase 0

Completed:

- Legacy isolation direction frozen
- Timeline frozen as display-only
- Main architecture / rollout boundaries written down

### Phase 1: Flight task module

Completed in principle:

- `航班计划` is now the main task-module entry
- `运行资料` is separated from the task-module main page
- Task CRUD / delete / readonly-view closure is basically running
- Task user-facing status closure reduced to:
  - `UNASSIGNED -> 待排`
  - `ASSIGNED_DRAFT -> 草稿已排`
  - `PUBLISHED -> 已发布`
- Old `ASSIGNED` was normalized toward `ASSIGNED_DRAFT`
- Layout for task module was simplified into:
  - compact summary
  - batch strip
  - full-width task table

Files involved include:

- `D:\paiban2\apps\web\src\app\pages\FlightTaskPage.tsx`
- `D:\paiban2\apps\web\src\app\pages\FlightTaskModule.tsx`
- `D:\paiban2\apps\web\src\app\routes\moduleRoutes.ts`
- `D:\paiban2\apps\api\src\main\java\com\pilotroster\task\TaskPlanController.java`
- `D:\paiban2\apps\api\src\test\java\com\pilotroster\task\TaskPlanControllerIntegrationTests.java`
- `D:\paiban2\apps\api\src\main\resources\db\migration\V25__normalize_task_status_assigned_to_assigned_draft.sql`

### Phase 2: Crew resource module

Completed for the boundary needed before draft rostering:

- Crew module route/page boundary split from mixed hub
- Main crew path currently focuses on:
  - `机组信息`
  - `状态时间线`
- `外部工作` removed from main navigation / main route path
- `机组信息` tab UI aligned to four sections
- Those four sections were split into dedicated files:
  - `D:\paiban2\apps\web\src\app\pages\CrewProfileSection.tsx`
  - `D:\paiban2\apps\web\src\app\pages\CrewQualificationSection.tsx`
  - `D:\paiban2\apps\web\src\app\pages\CrewLimitsSection.tsx`
  - `D:\paiban2\apps\web\src\app\pages\CrewDutyCalendarSection.tsx`
- Duty-calendar status labels and colors were localized / cleaned up

Follow-up note:

- Additional crew-domain fields can be added later inside the four bounded sections.
- This is no longer a Phase 3 / rules-engine blocker.

### Run-data module closure

Substantial progress completed:

- Frontend split into:
  - `RouteMaintenanceSection.tsx`
  - `AirportMaintenanceSection.tsx`
  - `AircraftMaintenanceSection.tsx`
  - shared helper file `FlightOperationsShared.tsx`
- Backend split into:
  - `FlightRouteController.java`
  - `AirportDictionaryController.java`
  - `AircraftRegistryController.java`
- Run-data delete confirmation dialogs were added
- Reference protection was added so referenced data cannot be deleted or edited
- Action buttons were improved:
  - visible disabled state instead of blank column
  - color cues for edit/delete
- Aircraft reference protection was corrected to check both:
  - `aircraftNo`
  - `aircraftType`

Files involved include:

- `D:\paiban2\apps\web\src\app\pages\FlightOperationsPages.tsx`
- `D:\paiban2\apps\web\src\app\pages\FlightOperationsShared.tsx`
- `D:\paiban2\apps\web\src\app\pages\RouteMaintenanceSection.tsx`
- `D:\paiban2\apps\web\src\app\pages\AirportMaintenanceSection.tsx`
- `D:\paiban2\apps\web\src\app\pages\AircraftMaintenanceSection.tsx`
- `D:\paiban2\apps\api\src\main\java\com\pilotroster\flightops\FlightRouteController.java`
- `D:\paiban2\apps\api\src\main\java\com\pilotroster\system\AirportDictionaryController.java`
- `D:\paiban2\apps\api\src\main\java\com\pilotroster\flightops\AircraftRegistryController.java`

## Live Bug History Resolved In This Session

### Aircraft add failure / 500

Observed issue:

- Adding aircraft data failed with `500 Internal Server Error`
- UI only showed generic failure

Root causes found during debugging:

1. The live backend on port `8088` was an **old stale process**
2. The local DB still had **old INACTIVE residue rows**
3. The aircraft uniqueness collision was being hidden behind a generic error flow

What was done:

- Restarted the backend using current code
- Repaired local Flyway/migration state
- Fixed broken migration `V26`
- Cleared stale unreferenced soft-delete residue
- Reactivated referenced historical rows where needed
- Verified aircraft add works against the live local backend

Migration fixed:

- `D:\paiban2\apps\api\src\main\resources\db\migration\V26__normalize_operations_master_data_after_disable_removal.sql`

### Disabled / hidden action-column issue

Observed issue:

- Referenced rows showed blank action columns

What was done:

- Disabled buttons remain visible
- Tooltip-based blocked reason attached through wrapper span

### Missing delete confirmation

Observed issue:

- Delete actions were one-click destructive

What was done:

- Added confirm dialog to:
  - flight plan delete
  - route delete
  - airport delete
  - aircraft delete

## Current Verified State

At the latest Phase 3 / Phase 4 closeout verification:

- Backend targeted integration tests passed for task planning, assignment, eligibility, crew, flight operations, and archive contracts.
- `npm run build` passed for `apps\web`.
- `npm run check:i18n` passed for `apps\web`.
- Playwright real-click + F12 checks passed for dispatcher login, protected actions, draft rostering read-only/edit behavior, display-only timeline behavior, workbench route compatibility, archive placement, and rule-hit projection.
- The remaining frontend build warning is the known large chunk warning and is not a rules-engine blocker.

## Maintainability Findings Resolved Before Phase 3

The maintainability findings from the latest review have been closed or moved behind explicit archived boundaries:

1. Crew writes no longer require the frontend to perform a profile create followed by an operational update. Create is atomic, and edits choose the narrow backend contract needed for the changed fields.
2. Retired `external-work` APIs are no longer active workflow contracts; active pages do not call them, and the backend returns retired/archived semantics instead of keeping a parallel live path.
3. Flight operations orchestration was moved into smaller hooks/sections, with backend reference-protection as the source for edit/delete state.
4. Crew and flight operations action errors now surface domain messages separately from load failures.
5. Assignment readiness and task-detail candidate eligibility reuse task-window/status data instead of re-querying once per crew.
6. Draft queue summary decisions avoid repeated archive existence checks and expose one backend decision per row.
7. Timeline and workbench behavior are display-only; item clicks do not open assignment, archive, or run-day workflows.

## Phase 3 Preflight Residue Cleanup

Completed after the workbench boundary review:

- `D:\paiban2\apps\web\src\app\pages\Pages.tsx` is now a thin export / view wrapper only. The old workbench implementations for unassigned tasks, draft versions, and run-day adjustments were removed from this file.
- `/rostering-workbench/run-day-adjustments` now lands on an explicit retired compatibility page with no timeline and no edit controls.
- The compatibility Playwright test now asserts the retired run-day route does **not** render `gantt-timeline`.
- Remaining `runDayAdjustment` API/type names are not consumed by the workbench main path; they are reserved only for a future independent business module decision.

## Phase 3 / Phase 4 Closure

The scoped Phase 3 draft rostering migration is closed:

1. Phase 3 draft rostering contract is frozen around `DraftRosteringPage` and `AssignmentDrawer`.
2. Assignment validation and candidate explanation come through backend eligibility/read models.
3. Timeline remains a read-only projection of persisted backend facts.
4. Rule issues route through `校验与问题处理`; issue-handling behavior is not owned by timeline or workbench pages.
5. Publish results route through `发布结果`; export is a button/action inside `发布结果`, and old `校验与发布` workbench ownership is not restored.
6. Post-flight archive stays under `校验与问题处理 -> 飞后归档`.

The pulled-forward Phase 4 timeline downgrade is also closed for the current scope:

- timeline consumes backend truth only
- timeline may display status/rule-hit projections
- timeline must not generate, promote, or edit assignment state
- workbench timeline loading does not trigger archive synchronization or other write-side refresh operations

The next major implementation track is the rules engine.

## Important Open Cautions

### Run-day adjustment is not a Phase 3 workbench feature

The frontend workbench route is retired. If run-day adjustment returns later, it should be designed as an independent module with its own route, page directory, backend contract review, tests, and product acceptance criteria.

### `CrewExternalWorkPage.tsx` remains a detached file

- It is no longer part of the main route/menu contract.
- It should not be reconnected during Phase 3.
- If removed later, do it as a separate cleanup with route and API checks.

## Handoff Recommendation

When resuming:

1. Open this file first.
2. Open:
   - `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`
   - `D:\paiban2\docs\superpowers\plans\2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md`
   - `D:\paiban2\docs\superpowers\specs\2026-05-01-phase-3-workbench-boundary-rebuild-design.md`
3. Start the rules-engine track from backend task/crew/draft facts; do not add new workflow behavior through `Pages.tsx` or timeline item clicks.
