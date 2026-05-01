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

Partially completed:

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

Important caveat:

- The **visual split exists**
- But the **write model is still too fat** and is a known maintainability issue

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

At last verification in this session:

- Backend targeted integration tests for task / run-data flows were green
- Frontend typecheck had **no new errors introduced by this work**
- Remaining TypeScript errors are repository-historical:
  - `D:\paiban2\apps\web\src\app\components\timeline\VisTimelineAdapter.tsx`
  - `D:\paiban2\apps\web\src\app\lib\time.ts`
  - `D:\paiban2\apps\web\src\main.tsx`

## Latest Maintainability Review Findings

The most recent maintainability review for `航班运行中心` + `机组资源中心` identified these items.

### P1

1. **Crew write model is still fat**
   - File:
     - `D:\paiban2\apps\api\src\main\java\com\pilotroster\crew\CrewMemberController.java`
   - Problem:
     - UI is split into four tabs, but writes still go through one large `CrewMember` payload and one large update path.

2. **Crew backend still carries the retired duplicate workflow**
   - File:
     - `D:\paiban2\apps\api\src\main\java\com\pilotroster\crew\CrewMemberController.java`
   - Problem:
     - `external-work` CRUD and the `duty-calendar` external-work contract still exist, overlapping with the timeline/status model.

### P2

3. **Flight operations center still has a large central orchestrator**
   - File:
     - `D:\paiban2\apps\web\src\app\pages\FlightOperationsPages.tsx`

4. **Run-data reference protection still lives as frontend inference**
   - File:
     - `D:\paiban2\apps\web\src\app\pages\FlightOperationsPages.tsx`

5. **Both centers still collapse many domain failures into generic `saveFailed`**
   - Files most relevant:
     - `D:\paiban2\apps\web\src\app\pages\FlightOperationsPages.tsx`
     - `D:\paiban2\apps\web\src\app\pages\CrewInformationPage.tsx`

## Agreed Next Implementation Order

The next ordered fix plan, agreed before this handoff, is:

1. Tighten crew write boundaries
   - split or narrow the `CrewMember` write path so future fields do not keep inflating one payload/dialog

2. Retire or formally archive the duplicate `external-work` backend contract
   - remove it from mainline behavior, not just from navigation

3. Thin `FlightOperationsPage`
   - move orchestration into smaller hooks/components

4. Move run-data reference protection toward a backend/view-model contract
   - stop manually deriving three protection sets in the UI

5. Improve domain error feedback
   - surface meaningful conflict/reference messages
   - stop reducing most failures to generic `saveFailed`

## Important Open Cautions

### `Pages.tsx` still carries legacy implementations

Even after the split, `Pages.tsx` still contains substantial old shared implementations and legacy workbench code. This is an ongoing maintainability risk and should be treated carefully in future cleanup work.

Key file:

- `D:\paiban2\apps\web\src\app\pages\Pages.tsx`

### `CrewExternalWorkPage.tsx` still exists as a detached file

- It is no longer part of the main route/menu contract
- But the file still exists in the repo:
  - `D:\paiban2\apps\web\src\app\pages\CrewExternalWorkPage.tsx`

This is currently a detached residue, not a main-path page.

## Handoff Recommendation

When resuming in the next window:

1. Open this file first
2. Open:
   - `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`
   - `D:\paiban2\docs\superpowers\plans\2026-04-30-phase-2-crew-resource-module-plan.md`
3. Resume directly from the ordered maintainability fix list above

If continuing implementation, start with the two `P1` items first.
