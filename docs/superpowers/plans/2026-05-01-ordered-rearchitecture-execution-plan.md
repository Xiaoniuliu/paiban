# Ordered Rearchitecture Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining maintainability and architecture work in the agreed module order so the new main path can progress from stable crew facts into draft rostering, issue handling, and publish results.

**Architecture:** Continue gradual replacement instead of rewrite. Keep backend as workflow truth, keep the timeline display-only, and move page-local inference into backend contracts before later modules depend on it. Execute work in strict module order so later modules consume stable task facts and stable crew-resource facts instead of mixed UI state.

**Tech Stack:** Spring Boot, Spring Security, Flyway, React, TypeScript, Vite, Maven, npm

---

## File structure and responsibility map

### Backend files already central to the next phase

- `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
  - Crew profile, qualification, and remaining crew write boundaries.
- `apps/api/src/main/java/com/pilotroster/flightops/FlightOperationsController.java`
  - Run-data protection read model already moved here; keep it as a backend-owned contract.
- `apps/api/src/main/java/com/pilotroster/task/TaskPlanController.java`
  - Stable task facts and downstream edit/delete gates.
- `apps/api/src/main/java/com/pilotroster/timeline/TimelineBlockController.java`
  - Crew-status timeline maintenance only, not broader workflow truth.
- `apps/api/src/main/java/com/pilotroster/common/ApiExceptionHandler.java`
  - Shared error payload contract for frontend domain feedback.

### Frontend files already central to the next phase

- `apps/web/src/app/pages/CrewInformationPage.tsx`
  - Crew module shell; should keep shrinking toward a composition-only owner.
- `apps/web/src/app/pages/CrewProfileSection.tsx`
  - Profile surface and status action entry.
- `apps/web/src/app/pages/CrewQualificationSection.tsx`
  - Qualification CRUD surface.
- `apps/web/src/app/pages/CrewLimitsSection.tsx`
  - Derived visibility surface only.
- `apps/web/src/app/pages/CrewDutyCalendarSection.tsx`
  - Duty-calendar display surface after external-work retirement.
- `apps/web/src/app/pages/FlightTaskPage.tsx`
  - Stable task-module main entry and task-facing user workflow.
- `apps/web/src/app/pages/FlightOperationsPages.tsx`
  - Now a thinner shell; keep it that way.
- `apps/web/src/app/pages/useFlightOperationsManagement.ts`
  - Flight-operations orchestration hook; keep page logic out of the shell.
- `apps/web/src/app/lib/api.ts`
  - Shared API client and contract shape.
- `apps/web/src/app/lib/apiErrors.ts`
  - Shared domain-error formatting path.

### Likely new files for next modules

- `apps/api/src/main/java/com/pilotroster/rostering/...`
  - Draft rostering controller/service/read model files when Phase 3 starts.
- `apps/web/src/app/pages/DraftRosteringPage.tsx`
  - Draft rostering module shell when created or extracted.
- `apps/api/src/main/java/com/pilotroster/issues/...`
  - Issue list and issue-action contracts for the issue-handling module.
- `apps/web/src/app/pages/IssueHandlingPage.tsx`
  - Issue queue and resolution surface.
- `apps/api/src/main/java/com/pilotroster/publish/...`
  - Publish result contracts and export actions.
- `apps/web/src/app/pages/PublishResultPage.tsx`
  - Flight-oriented and crew-oriented publish output surface.

## Ordered execution flow

The agreed execution order remains:

1. Flight task module
2. Crew resource module
3. Draft rostering module
4. Issue handling module
5. Publish results module

Phase 1 flight-task work is already basically closed. The next execution sequence should therefore be:

1. Finish crew-resource stabilization completely.
2. Lock the task-to-crew bridge contract.
3. Build the first draft-rostering closed loop on those two stable foundations.
4. Add issue handling as a separate list/action layer instead of inflating workflow state.
5. Add publish-result output and export on top of stable draft and issue truth.

## Subagent execution rules

- Use one fresh implementer subagent per task.
- After each task, run:
  - one spec-compliance review subagent
  - one code-quality review subagent
- Keep tasks serial where there is a dependency edge.
- Only parallelize tasks that do not share write scope.
- Never let a later-module subagent invent temporary truth that should belong to an earlier module.

## Task 1: Finish crew-resource write boundary split

**Why first:** Phase 2 is not truly complete until the crew module has clean write boundaries that later modules can trust.

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
- Modify: `apps/web/src/app/pages/CrewInformationPage.tsx`
- Modify: `apps/web/src/app/pages/CrewProfileSection.tsx`
- Modify: `apps/web/src/app/pages/CrewQualificationSection.tsx`
- Modify: `apps/web/src/app/pages/CrewLimitsSection.tsx`
- Modify: `apps/web/src/app/pages/CrewDutyCalendarSection.tsx`
- Modify: `apps/web/src/app/lib/api.ts`
- Modify: `apps/web/src/app/types.ts`
- Test: `apps/api/src/test/java/com/pilotroster/flightops/OperationsMasterDataIntegrationTests.java`

**Subagent mode:** One standard implementer subagent. This task is integration-heavy and touches both backend and frontend.

- [ ] Confirm the remaining mixed fields in the current crew write model and assign each field to one of the four agreed crew layers:
  - profile
  - qualification and role
  - hours and limits
  - duty-calendar or status

- [ ] Split any remaining write paths that still let one profile mutation alter hours, limits, or duty-calendar truth through the same payload.

- [ ] Keep the limits surface display-only unless there is an explicitly approved editable field. Do not invent new editable limit fields to “complete” the split.

- [ ] Keep transitional status fields small:
  - `ACTIVE`
  - `INACTIVE`
  - `AVAILABLE`
  - `UNAVAILABLE`
  Do not expand them into a larger state system.

- [ ] Make sure the crew page shell only coordinates section-level actions and no longer owns mixed business interpretation across all sections.

- [ ] Extend integration coverage for:
  - create crew member
  - update crew member
  - disable crew member
  - reactivate crew member
  - qualification create and update
  - retired external-work contract returning `410`

- [ ] Verification:
  - Run: `mvn.cmd -f apps\api\pom.xml -Dtest=OperationsMasterDataIntegrationTests test`
  - Run: `npm run build` in `apps\web`

**Completion gate:**
- Crew profile writes no longer mutate other crew truth layers by accident.
- Section boundaries are reflected in both API shape and page structure.
- No active frontend path depends on retired external-work CRUD.

## Task 2: Lock the task-to-crew bridge contract

**Why second:** Draft rostering must consume stable task facts and stable crew-resource facts through explicit backend contracts instead of page-local assembly.

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/task/TaskPlanController.java`
- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
- Modify: `apps/api/src/main/java/com/pilotroster/timeline/TimelineBlockController.java`
- Create or modify: `apps/api/src/main/java/com/pilotroster/task/...` bridge view model files as needed
- Modify: `apps/web/src/app/pages/FlightTaskPage.tsx`
- Modify: `apps/web/src/app/lib/api.ts`
- Modify: `apps/web/src/app/types.ts`

**Subagent mode:** One standard implementer subagent after Task 1 completes.

- [ ] Define the minimum backend view needed to answer:
  - which tasks need crew assignment
  - which qualifications or role constraints matter for assignment entry
  - which crew are operationally unavailable because of timeline/status truth

- [ ] Keep the bridge read-only. Do not start writing draft assignments in this task.

- [ ] Avoid frontend-side recomputation of crew eligibility from raw unrelated datasets.

- [ ] Make task edit/delete gates remain task-owned:
  - downstream-entered task cannot be deleted
  - published or archived tasks must not be casually editable through basic task editing

- [ ] Add verification that the bridge contract respects current task and crew truth without promoting display guesses into business truth.

- [ ] Verification:
  - Run: `mvn.cmd -f apps\api\pom.xml -Dtest=TaskPlanControllerIntegrationTests test`
  - Run: targeted frontend build or full `npm run build` in `apps\web`

**Completion gate:**
- There is a backend-owned task-to-crew readiness contract.
- Frontend does not need to merge unrelated task, crew, and timeline lists just to understand assignment readiness.

## Task 3: Build the first draft-rostering module shell

**Why third:** This is the first new module that depends on the now-stable task and crew foundations.

**Files:**
- Create or modify: `apps/api/src/main/java/com/pilotroster/rostering/...`
- Create or modify: `apps/api/src/test/java/com/pilotroster/rostering/...`
- Create or modify: `apps/web/src/app/pages/DraftRosteringPage.tsx`
- Create or modify: `apps/web/src/app/routes/moduleRoutes.ts`
- Modify: `apps/web/src/app/lib/api.ts`
- Modify: `apps/web/src/app/types.ts`

**Subagent mode:** One higher-capability implementer subagent. This is the first real cross-module workflow task and needs design judgment.

- [ ] Create a draft-rostering module shell that reads:
  - stable task facts
  - stable crew-resource facts
  - task-to-crew bridge readiness

- [ ] Support the minimum closed loop:
  - view unassigned tasks
  - choose draft crew assignment
  - save persisted draft assignment
  - roll draft back to unassigned if needed

- [ ] Keep timeline out of write ownership. Timeline may display draft-related facts only after they are really persisted.

- [ ] Keep the task state machine small. Do not add extra workflow states for every warning or confirmation.

- [ ] Add integration coverage for:
  - saving a draft assignment
  - rejecting invalid or unavailable crew selection
  - clearing a draft assignment back to `UNASSIGNED`

- [ ] Verification:
  - Run new draft-rostering backend tests
  - Run `npm run build` in `apps\web`

**Completion gate:**
- Users can create and clear draft assignments through a dedicated module.
- Draft state is persisted backend truth, not page-local guesswork.

## Task 4: Add issue-handling as a separate module

**Why fourth:** The master plan explicitly prefers a small workflow state machine plus an issue list instead of adding more task states.

**Files:**
- Create or modify: `apps/api/src/main/java/com/pilotroster/issues/...`
- Create or modify: `apps/api/src/test/java/com/pilotroster/issues/...`
- Create or modify: `apps/web/src/app/pages/IssueHandlingPage.tsx`
- Modify: `apps/web/src/app/lib/api.ts`
- Modify: `apps/web/src/app/types.ts`
- Modify: `apps/web/src/app/i18n.ts`

**Subagent mode:** One standard or higher-capability implementer subagent depending on issue model complexity.

- [ ] Introduce a backend-owned issue list attached to tasks or draft assignments.

- [ ] Start with a small issue model that can express:
  - blocking issue
  - warning issue
  - manually confirmed issue

- [ ] Keep issue actions explicit:
  - acknowledge
  - resolve
  - clear when source fact changes

- [ ] Do not create extra primary workflow states for these issue types.

- [ ] Add list and detail views so dispatchers can understand why publish is blocked without opening mixed workbench pages.

- [ ] Verification:
  - issue creation and resolution tests
  - publish-gating tests showing blocking issues stop publish
  - `npm run build` in `apps\web`

**Completion gate:**
- Validation and manual review needs are visible as issues, not hidden inside inflated task-state branching.

## Task 5: Add publish-result module and export baseline

**Why fifth:** Publish should be built on top of stable draft truth and stable issue gating, not before them.

**Files:**
- Create or modify: `apps/api/src/main/java/com/pilotroster/publish/...`
- Create or modify: `apps/api/src/test/java/com/pilotroster/publish/...`
- Create or modify: `apps/web/src/app/pages/PublishResultPage.tsx`
- Modify: `apps/web/src/app/lib/api.ts`
- Modify: `apps/web/src/app/types.ts`
- Modify: `apps/web/src/app/i18n.ts`

**Subagent mode:** One higher-capability implementer subagent. This task defines user-visible output and gating semantics.

- [ ] Implement publish as an internal system action that converts draft results into a formally effective published version.

- [ ] Block publish when blocking issues still exist.

- [ ] Provide visible outputs:
  - flight-oriented primary view
  - crew-oriented secondary view
  - export baseline such as Excel if already supported by the current stack

- [ ] Make sure publish does not imply external synchronization success unless there is a separate confirmed flow for it.

- [ ] Keep published results protected from casual basic-task editing.

- [ ] Verification:
  - publish succeeds only when no blocking issues remain
  - published result views return the right flight and crew projections
  - frontend build remains green

**Completion gate:**
- The first-stage publish loop exists and is understandable without legacy workbench logic.

## Task 6: Final module hardening and regression sweep

**Why last:** After all five modules are in place, run one pass focused on explicit boundaries and regression risk.

**Files:**
- Modify as needed across:
  - `apps/api/src/main/java/com/pilotroster/...`
  - `apps/api/src/test/java/com/pilotroster/...`
  - `apps/web/src/app/pages/...`
  - `apps/web/src/app/lib/...`

**Subagent mode:** One review-focused subagent for spec compliance, then one review-focused subagent for code quality across the whole implementation.

- [ ] Recheck that each module has a clear answer to:
  - what it owns
  - what it reads
  - what it may change
  - what it must not absorb

- [ ] Recheck that timeline remains display-only.

- [ ] Recheck that frontend contracts consume backend-owned permissions, issue truth, and protection truth instead of inferring them from raw lists.

- [ ] Re-run the most important backend integration suites.

- [ ] Re-run:
  - `npm run build`
  - optional `npx tsc --noEmit` to confirm no new TypeScript errors beyond historical repo issues

**Completion gate:**
- The main-path modules form a readable chain:
  - task facts
  - crew facts
  - draft assignment
  - issue handling
  - publish result
- No module has collapsed back into a mixed workbench.

## Recommended subagent dispatch order

Run these serially:

1. Task 1 implementer -> spec review -> quality review
2. Task 2 implementer -> spec review -> quality review
3. Task 3 implementer -> spec review -> quality review
4. Task 4 implementer -> spec review -> quality review
5. Task 5 implementer -> spec review -> quality review
6. Task 6 final reviewers

Parallel work is only safe inside a single task when the write scopes do not overlap. For example:

- frontend copy and i18n adjustments can run in parallel with backend test additions for the same task
- two subagents must not both edit `apps/web/src/app/lib/api.ts` or the same controller at once

## Immediate next action

Start with **Task 1: Finish crew-resource write boundary split**.

That is the highest-value next step because:

- it completes the still-open Phase 2 maintainability work,
- it removes the last unstable crew truth coupling before later modules depend on it,
- it keeps execution aligned with the agreed module dependency order.
