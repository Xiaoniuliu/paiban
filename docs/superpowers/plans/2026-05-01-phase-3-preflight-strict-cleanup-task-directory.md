# Phase 3 Preflight Strict Cleanup Task Directory

## Goal

Clear all Phase 1 / Phase 2 / Phase 2.5 structural bugs before starting Phase 3.

This stage is not a feature phase. It exists to make the current main path stable enough that Phase 3 draft rostering can build on it without returning to large repairs.

## Completion Gate

- Main-path manual testing has no structural blockers.
- Real click testing passes for the listed core actions.
- F12 Console has no new red runtime errors, unhandled promise errors, or React crashes.
- F12 Network has no unexpected 4xx/5xx for normal allowed actions.
- Expected business rejections may return 409, but the page must show the same domain reason.
- A local action failure must not turn into a full page load failure.
- Frontend action availability must match backend rules.
- Timeline remains display-only and is not used as an edit/delete/draft authority.

## Phase 3 Workbench Boundary Rebuild Status

- [x] Workbench boundary rebuild complete: the old Legacy group is now the formal `排班工作台` and only owns flight view, crew view, and draft rostering.
- [x] Archive moved under validation center: `飞后归档` is reached from `校验与问题处理`, while the old workbench archive URL remains a compatibility entry.
- [x] Old workbench routes remain compatible without reintroducing old ownership: removed menu entries are hidden, and direct URLs land on the formal destination or retired compatibility page.
- [x] Old run-day adjustment workbench implementation removed from `Pages.tsx`; `/rostering-workbench/run-day-adjustments` now renders an explicit retired compatibility page with no timeline/edit surface.
- [x] Timeline rebuilt on the official vis-timeline display seam: initialization, groups/items, template, tooltip template, native pan/zoom, selection, and display-only read model.
- [x] Timeline rule-hit marker and summary are current backend projections only: markers appear when returned by timeline data, open a read-only detail on color-block click, and disappear when backend results are cleared.
- [x] Real click + F12 gate passed for workbench navigation, archive placement, display-only timeline behavior, compatibility routes, and rule-hit projection.

## Subagent Workstreams

### A. Flight Task Module

Owner: subagent explorer, then implementer if fixes are isolated.

Scope:

- `apps/web/src/app/pages/FlightTaskPage.tsx`
- `apps/web/src/app/pages/FlightTaskModule.tsx`
- `apps/api/src/main/java/com/pilotroster/task/TaskPlanController.java`
- `apps/api/src/test/java/com/pilotroster/task/TaskPlanControllerIntegrationTests.java`
- task-related repository helpers

Checklist:

- [x] Verify create/edit/delete/view detail clicks.
- [x] Verify batch strip buttons do not expose dead actions.
- [x] Verify load errors and action errors stay separate.
- [x] Verify `UNASSIGNED` task delete succeeds even with derived display/rule residue.
- [x] Verify `PUBLISHED`, `ASSIGNED_DRAFT`, archived, and run-day tasks remain protected.
- [x] Verify F12 Network matches visible page message for expected 409.

Known candidate issue:

- Fixed: batch strip no longer shows import, switch, or view-batch buttons unless a real callback is provided.
- Fixed: task delete now removes `violation_hit` rows before display `timeline_block` rows so non-null `violation_hit.timeline_block_id` cannot block `UNASSIGNED` deletion.

### B. Flight Operations Master Data

Owner: subagent explorer, then implementer if fixes are isolated.

Scope:

- `apps/web/src/app/pages/FlightOperationsPages.tsx`
- `apps/web/src/app/pages/useFlightOperationsManagement.ts`
- `apps/web/src/app/pages/RouteMaintenanceSection.tsx`
- `apps/web/src/app/pages/AirportMaintenanceSection.tsx`
- `apps/web/src/app/pages/AircraftMaintenanceSection.tsx`
- `apps/web/src/app/pages/FlightOperationsShared.tsx`
- `apps/api/src/main/java/com/pilotroster/flightops/*`
- `apps/api/src/main/java/com/pilotroster/system/AirportDictionaryController.java`
- `apps/api/src/test/java/com/pilotroster/flightops/OperationsMasterDataIntegrationTests.java`

Checklist:

- [x] Verify route create/edit/delete clicks.
- [x] Verify airport create/edit/delete clicks.
- [x] Verify aircraft create/edit/delete clicks.
- [x] Verify referenced data is visibly disabled with a reason before click.
- [x] Verify backend reference protection remains the source of button state.
- [x] Verify no page-local task scanning reappears.
- [x] Verify action errors do not replace the entire module body.

Resolved issues:

- Fixed: `/reference-protection` and run-data CRUD now share the same `CANCELLED`-task semantics. Cancelled tasks do not block route, airport, or aircraft maintenance.
- Fixed: run-data action failures are now reported as action errors and no longer replace the loaded table body.

### C. Crew Resource Module

Owner: subagent explorer, then implementer if fixes are isolated.

Scope:

- `apps/web/src/app/pages/CrewInformationPage.tsx`
- `apps/web/src/app/pages/CrewProfileSection.tsx`
- `apps/web/src/app/pages/CrewQualificationSection.tsx`
- `apps/web/src/app/pages/CrewLimitsSection.tsx`
- `apps/web/src/app/pages/CrewDutyCalendarSection.tsx`
- `apps/web/src/app/pages/CrewStatusTimelinePage.tsx`
- `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
- `apps/api/src/main/java/com/pilotroster/timeline/TimelineBlockController.java`
- `apps/api/src/main/java/com/pilotroster/timeline/TimelineBlockService.java`
- crew and timeline integration tests

Checklist:

- [x] Verify crew create/edit/disable/reactivate clicks.
- [x] Verify qualification create/edit/disable clicks.
- [x] Verify profile and operational writes stay split.
- [x] Verify crew create is atomic from the user's perspective.
- [x] Verify external-work endpoints remain retired and no active page calls them.
- [x] Verify limits are display-only unless explicitly backed by an approved write path.
- [x] Verify crew status timeline only edits manual crew status blocks.

Resolved issues:

- Fixed: PILOT no longer sees crew-resource module routes that call dispatcher/manager/admin-only list APIs. Pilot users stay on the pilot portal path.
- Fixed: crew create is atomic from the user's perspective. Crew edit now chooses profile-only, operational-only, or combined profile-operational backend contracts based on the fields changed, while the existing split endpoints remain available for explicitly layered writes.

Open architecture note:

- A subagent flagged crew status timeline blocks as participating in assignment readiness. This conflicts with the Phase 3A eligibility plan, which explicitly requires task-window conflicts from crew status or assignment blocks to be checked. This item is not changed in the cleanup batch until the product rule is explicitly revised.

### D. Timeline, Legacy, and Error Model

Owner: controller first, subagent reviewer when agent capacity is available.

Scope:

- `apps/web/src/app/components/timeline/*`
- `apps/web/src/app/pages/Pages.tsx`
- `apps/web/src/app/pages/DraftRosteringPage.tsx`
- `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- `apps/web/src/app/lib/apiErrors.ts`
- shared i18n error keys

Checklist:

- [x] Verify timeline creates no business drawer, archive drawer, or assignment drawer from item click.
- [x] Verify timeline has no custom write/zoom/window toolbar responsibility beyond display shell.
- [x] Verify `editable` remains false.
- [x] Verify Legacy entries route users to new module paths where appropriate.
- [x] Verify major main-path pages use domain error messages instead of only `saveFailed`.
- [x] Verify action errors and load errors are separated where users click actions.

Resolved issues:

- Fixed: cancelled assignment timeline blocks no longer create assignment `TIME_CONFLICT` decisions.
- Fixed: assignment task detail now loads crew candidates once and reuses the task-window block query across candidate eligibility checks.
- Fixed: saving assignment draft now reuses one task-window block query for backend eligibility validation.
- Fixed: `Pages.tsx` no longer carries old workbench business branches for unassigned tasks, draft versions, or run-day adjustments. The run-day compatibility route is a clear retired page, not an active legacy workflow.

## Execution Batches

### Batch 1: Inventory and Findings

- [x] Flight task subagent returns findings and click/F12 script.
- [x] Flight operations subagent returns findings and click/F12 script.
- [x] Crew resource subagent returns findings and click/F12 script.
- [x] Controller completes timeline/legacy/error scan.

### Batch 2: Isolated Fixes

- [x] Remove or implement no-op batch buttons in flight task module.
- [x] Fix button-state/backend-rule mismatches found by subagents.
- [x] Fix load/action error conflation found by subagents.
- [x] Add targeted integration or frontend build verification per touched module.

### Batch 3: Cross-Module Review

- [x] Run backend targeted tests for task, flight operations, crew, assignment.
- [x] Run `npm run build`.
- [x] Run `npm run check:i18n`.
- [x] Produce a manual real-click + F12 checklist for user verification.

Verification result:

- Passed: `mvn.cmd -f apps\api\pom.xml "-Dtest=TaskPlanControllerIntegrationTests,OperationsMasterDataIntegrationTests,CrewMemberControllerIntegrationTests,AssignmentIntegrationTests" test`
- Passed after final review fixes: 29 tests, 0 failures, 0 errors.
- Passed: `npm run build` in `apps\web`
- Passed: `npm run check:i18n` in `apps\web`
- Passed: `npx playwright test e2e/framework.spec.ts -g "dispatcher timeline is display-only" --project=chromium` in `apps\web`
- Real click evidence: Chromium opened the workbench flight timeline, verified the timeline rendered, clicked a visible timeline item, and confirmed no archive drawer, no assignment drawer, no Console errors, no PageError, no request failures, and no unexpected 4xx/5xx responses during the captured window.
- Passed: `npx playwright test e2e/framework.spec.ts -g "protected|display-only" --project=chromium` in `apps\web`
- Gate A evidence: flight-task downstream rows stay read-only; a forced protected task delete returns the expected `409` and shows `Flights already entered downstream flow cannot be deleted`; run-data referenced rows are disabled with the reference-protection reason; draft rostering allows manager read-only inspection and surfaces the expected archive `409` message on dispatcher save. No unexpected Console, PageError, request failure, or unexpected `4xx/5xx` appeared in the captured protected-action windows.
- Passed: `npx playwright test e2e/framework.spec.ts -g "workbench|archive|display-only|redirect|rule-hit" --project=chromium` in `apps\web`
- Workbench boundary evidence: Chromium verified the workbench menu has only flight view, crew view, and draft rostering; archive is reachable from validation center; removed workbench routes remain compatible; timeline item clicks do not open assignment/archive drawers; rule-hit markers render from mocked backend results, open read-only detail on color-block click, and disappear after backend results are cleared. No unexpected Console, PageError, request failure, or unexpected `4xx/5xx` appeared in the captured windows.
- Latest residue evidence: the old run-day URL renders the retired compatibility page and does not render `gantt-timeline`, preventing accidental reuse of the legacy run-day workflow during Phase 3.
- Phase 3 readiness: Gate A passed. Phase 3 can start from the draft rostering path without carrying a known Phase 2 / Phase 2.5 protection-contract blocker.
- Note: `npm run build` still reports the existing large chunk warning; it is not introduced by this cleanup and does not block Phase 3.

## Verification Commands

- `mvn.cmd -f apps\api\pom.xml "-Dtest=TaskPlanControllerIntegrationTests,OperationsMasterDataIntegrationTests,CrewMemberControllerIntegrationTests,AssignmentIntegrationTests,TaskPlanControllerIntegrationTests" test`
- `npm run build` in `apps\web`
- `npm run check:i18n` in `apps\web`
- `npx playwright test e2e/framework.spec.ts -g "workbench|archive|display-only|redirect|rule-hit" --project=chromium` in `apps\web`
