# Phase 3 Draft Rostering Subagent Task Cards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 3 draft rostering migration from the formal draft rostering path, while keeping timeline, issue handling, publish-result/export action, archive, and run-day adjustment outside draft ownership.

**Architecture:** Phase 3 is a draft rostering module migration, not a rule-engine or publish-flow build. Draft rostering owns assignment draft editing and consumes backend-owned read models for candidate eligibility, blocked reasons, runtime context, lightweight issue summary, and draft audit context. Later modules remain responsible for issue resolution, publish-result workflows, export as a publish-result button/action, and archive workflows.

**Tech Stack:** Spring Boot / Java integration tests for backend contracts, React / TypeScript for queue and drawer UX, Playwright Chromium for real-click + F12 verification.

---

## Rule Boundary

Phase 3 does not implement the rules module.

Phase 3 may consume:

- candidate eligibility reason codes from assignment backend logic
- lightweight `issueSummary` derived from existing validation/rule-hit data
- read-only rule/issue counts or latest issue messages needed to orient dispatchers

Phase 3 must not own:

- full rule evaluation
- rule catalog changes
- issue confirmation or resolution
- manager review workflow
- publish gating logic
- rule center UI

If a behavior requires acting on a rule issue, it belongs to `校验与问题处理`, not draft rostering.

---

## Current Starting Point

Already started in this window:

- Backend queue/detail DTOs expose `runtimeSummary`, `issueSummary`, and `draftAuditSummary`.
- `AssignmentDraftContextService` exists as the first small read-model extraction.
- `DraftTaskQueue` and `AssignmentDrawer` consume the new summaries.
- Playwright draft rostering real-click test covers manager read-only, dispatcher edit, save draft, and queue audit refresh.

Relevant current files:

- `apps/api/src/main/java/com/pilotroster/assignment/AssignmentDtos.java`
- `apps/api/src/main/java/com/pilotroster/assignment/AssignmentDraftContextService.java`
- `apps/api/src/main/java/com/pilotroster/assignment/AssignmentService.java`
- `apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java`
- `apps/web/src/app/pages/DraftRosteringPage.tsx`
- `apps/web/src/app/pages/draft-rostering/components/DraftTaskQueue.tsx`
- `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- `apps/web/e2e/framework.spec.ts`

---

## Task Card P3-1: Draft Contract Freeze

**Owner:** Backend implementer subagent, then backend reviewer subagent.

**Goal:** Make the draft rostering API contract explicit enough that the drawer and queue do not need timeline data or page-local inference.

**Files:**

- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentDtos.java`
- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java`

**Required fields:**

- queue task summary includes `runtimeSummary`, `issueSummary`, `draftAuditSummary`
- task detail includes the same three summaries
- save draft response keeps existing affected window/crew/task outputs
- clear draft response keeps existing affected crew/task outputs

**Forbidden:**

- do not call `/api/gantt-timeline` to satisfy drawer data
- do not add publish/export/archive actions to assignment endpoints
- do not change role semantics for `PIC`, `FO`, `RELIEF`, `EXTRA`

**Steps:**

- [x] Add or verify integration tests asserting queue summary fields on `/api/assignments/draft-rostering/tasks`.
- [x] Add or verify integration tests asserting detail summary fields on `/api/assignments/tasks/{taskId}`.
- [x] Add or verify tests for save draft and clear draft preserving existing behavior.
- [x] Run `mvn.cmd -f apps\api\pom.xml -Dtest=AssignmentIntegrationTests test`.
- [x] Expected: all assignment integration tests pass.

---

## Task Card P3-2: Backend-Owned Eligibility And Read Model

**Owner:** Backend implementer subagent, then code-quality reviewer subagent.

**Goal:** Keep candidate eligibility, blocked reasons, and draft context backend-owned.

**Files:**

- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentDraftContextService.java`
- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentEligibilityService.java`
- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java`

**Required behavior:**

- candidate reason codes remain backend-produced
- issue summary is read-only orientation, not issue handling
- runtime summary only reports draft-relevant runtime blocking context
- no frontend route scans task/timeline rows to infer draft truth

**Forbidden:**

- do not introduce frontend-only blocked reason derivation
- do not query per crew repeatedly for the same task-window context
- do not treat every validation issue as a draft-edit blocker

**Steps:**

- [x] Add tests for inactive, unavailable, qualification mismatch, and time conflict candidates preserving backend reason codes.
- [x] Add tests for `issueSummary` counts and latest message against open `violation_hit` rows.
- [x] Confirm cancelled/published/archive read-only reasons still come from backend decisions.
- [x] Run targeted assignment tests through `AssignmentIntegrationTests` and final backend targeted suite.
- [x] Expected: all targeted assignment tests pass.

---

## Task Card P3-3: Candidate Pool Semantics Freeze

**Owner:** Backend + frontend paired subagent.

**Goal:** Freeze first-stage role behavior: required `PIC` and `FO`, optional `RELIEF` and `EXTRA`, no duplicate crew in one draft.

**Files:**

- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentService.java`
- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentEligibilityService.java`
- Modify: `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- Modify: `apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java`
- Modify: `apps/web/e2e/framework.spec.ts`

**Required behavior:**

- `PIC` candidates come from captain-qualified crew
- `FO` candidates come from first-officer-qualified crew
- additional rows use broader candidate pool
- save rejects duplicate crew
- save rejects wrong required roles
- drawer disables ineligible candidates and blocks save if selected candidate is ineligible

**Forbidden:**

- do not redesign roles
- do not collapse first-stage behavior into PIC/FO-only
- do not add batch-edit behavior

**Steps:**

- [x] Add backend tests for required role mismatch and duplicate crew.
- [x] Add backend tests for `RELIEF` and `EXTRA` additional rows.
- [x] Add Playwright test coverage for adding/removing one additional crew row.
- [x] Run `mvn.cmd -f apps\api\pom.xml -Dtest=AssignmentIntegrationTests test`.
- [x] Run `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "draft rostering"`.
- [x] Expected: backend and real-click tests pass with no F12 errors.

---

## Task Card P3-4: Save/Clear Audit Closure

**Owner:** Backend implementer subagent.

**Goal:** Make save and clear draft audit-visible without turning audit into a workflow owner.

**Files:**

- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentDtos.java`
- Modify: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java`

**Required behavior:**

- save draft response includes `auditLogId`
- clear draft response includes `auditLogId`
- audit details include roster version, affected crew, affected task, action type, and affected window
- domain event payload is meaningful JSON rather than `{}`
- queue/detail `draftAuditSummary` reflects latest save or clear

**Forbidden:**

- do not create a separate draft-history workflow
- do not add multiple active draft versions
- do not expose audit mutation endpoints from draft rostering

**Steps:**

- [x] Write failing tests for `auditLogId` in save draft response.
- [x] Write failing tests for `auditLogId` in clear draft response.
- [x] Write failing tests that `audit_log.detail_json` contains affected crew/task/window data.
- [x] Write failing tests that `domain_event.payload_json` is not `{}`.
- [x] Implement minimal DTO and service changes.
- [x] Run `mvn.cmd -f apps\api\pom.xml -Dtest=AssignmentIntegrationTests test`.
- [x] Expected: all assignment integration tests pass.

---

## Task Card P3-5: Queue UX Closure

**Owner:** Frontend implementer subagent.

**Goal:** Make the queue useful for dispatcher triage without becoming a validation/publish page.

**Files:**

- Modify: `apps/web/src/app/pages/draft-rostering/components/DraftTaskQueue.tsx`
- Modify: `apps/web/src/app/pages/draft-rostering/components/AssignmentEntryButton.tsx`
- Modify: `apps/web/src/app/types.ts`
- Modify: `apps/web/src/app/i18n.ts`
- Modify: `apps/web/e2e/framework.spec.ts`

**Required behavior:**

- queue shows task status
- queue shows lightweight issue count and blocking count
- queue shows latest draft audit action
- queue action stays assignment-focused: `排班` or `调整`

**Forbidden:**

- do not add publish button
- do not add issue-resolution controls
- do not add archive action
- do not use timeline click behavior

**Steps:**

- [x] Add Playwright assertions for queue issue/audit summary.
- [x] Add accessible labels or visible text for issue count and latest draft action.
- [x] Run `npm run build`.
- [x] Run `npm run check:i18n`.
- [x] Run `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "draft rostering"`.
- [x] Expected: build/i18n/E2E pass; F12 diagnostics are empty.

---

## Task Card P3-6: Drawer UX Closure

**Owner:** Frontend implementer subagent.

**Goal:** Make the drawer a complete single-task draft workspace.

**Files:**

- Modify: `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- Modify: `apps/web/src/app/pages/draft-rostering/hooks/useAssignmentDrawerFlow.ts`
- Modify: `apps/web/src/app/pages/IssueHandlingPage.tsx`
- Modify: `apps/web/e2e/framework.spec.ts`

**Required behavior:**

- drawer shows read-only task summary
- drawer shows current assignment
- drawer shows required slots and optional additional rows
- drawer shows lightweight issue summary
- drawer shows latest draft audit summary
- drawer supports save, continue edit, and clear draft
- drawer remains reusable from issue handling

**Forbidden:**

- do not add issue confirmation inside drawer
- do not add publish/export controls
- do not add archive controls
- do not add timeline edit controls

**Steps:**

- [x] Add Playwright test for opening an existing draft and continuing edit.
- [x] Add Playwright test for clear draft returning the row to `UNASSIGNED`.
- [x] Add Playwright test for issue-handling opening the drawer without taking over issue resolution.
- [x] Run `npm run build`.
- [x] Run `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "draft rostering|issue"`.
- [x] Expected: drawer workflows pass with empty diagnostics.

---

## Task Card P3-7: Issue Boundary Check

**Owner:** Boundary reviewer subagent, then implementer only if findings are concrete.

**Goal:** Ensure draft rostering consumes issue summaries but does not own issue handling.

**Files:**

- Inspect: `apps/web/src/app/pages/IssueHandlingPage.tsx`
- Inspect: `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- Inspect: `apps/web/src/app/lib/api.ts`
- Inspect: `apps/api/src/main/java/com/pilotroster/workbench/*`
- Inspect: `apps/api/src/main/java/com/pilotroster/assignment/*`
- Test: `apps/web/e2e/framework.spec.ts`

**Required boundary:**

- issue list lives in `校验与问题处理`
- issue detail lives in issue handling
- issue confirmation/resolution lives in issue handling or later issue module work
- draft rostering displays only task-local summary
- issue handling may open the shared assignment drawer as a repair context, but it must not treat save/clear as issue resolution or mutate the issue list from inside the drawer

**Forbidden:**

- do not add `resolve`, `confirm`, `ignore`, or `manager review` actions to draft drawer
- do not make draft drawer refresh or mutate the full issue list
- do not make timeline click open issue mutation UI

**Steps:**

- [x] Dispatch reviewer subagent to inspect issue/drawer coupling.
- [x] If findings exist, write focused failing Playwright test.
- [x] Implement only the minimum boundary fix.
- [x] Run `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "issue|draft rostering"`.
- [x] Expected: issue handling still owns issue actions; drawer only opens assignment context.

**Closeout note:** The current issue page reuses `AssignmentDrawer` so a dispatcher can repair assignment context from an issue. This is allowed only as shared assignment editing through the assignment API. It does not close, confirm, ignore, or otherwise mutate issue records from the drawer.

---

## Task Card P3-8: Publish Result And Export Boundary Check

**Owner:** Boundary reviewer subagent.

**Goal:** Ensure draft rostering does not absorb publish behavior, and ensure export is not kept as a separate first-class module when touched by Phase 3.

**Files:**

- Inspect: publish result pages/routes
- Inspect: result export page/menu/route, if still present
- Inspect: `apps/web/src/app/menu.ts`
- Inspect: `apps/web/src/app/routes/validationRoutes.ts`
- Inspect: `apps/web/src/app/i18n.ts`
- Inspect: `apps/web/src/app/pages/DraftRosteringPage.tsx`
- Inspect: `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- Inspect: workbench compatibility routes
- Test: `apps/web/e2e/framework.spec.ts`

**Required boundary:**

- draft rostering can create or clear draft assignments
- publish remains under the `发布结果` module
- export is only a button/action inside `发布结果`, not a separate active `结果导出` module
- old `校验与发布` workbench ownership does not return

**Forbidden:**

- do not add publish button to draft queue
- do not add publish button to assignment drawer
- do not keep building parallel publish result and result export module behavior
- do not route draft save directly into publish
- do not restore old workbench validation/publish ownership

**Steps:**

- [x] Dispatch reviewer subagent to inspect draft/publish routes and buttons.
- [x] Add or verify Playwright test that draft page does not expose publish controls.
- [x] Add or verify compatibility route still lands on formal publish destination.
- [x] If `validation-export` is touched, consolidate it into `发布结果` as an export button/action.
- [x] If a legacy `/validation-center/export` route must remain temporarily, make it redirect to `发布结果` or mark it as compatibility-only rather than a separate module.
- [x] Remove or hide separate active `结果导出` navigation when the publish area is updated.
- [x] Run `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "publish|workbench|draft rostering"`.
- [x] Expected: publish controls are absent from draft module; publish and export entry points are present only in the publish-result surface, with export represented as a button/action.

---

## Task Card P3-9: Archive Boundary Check

**Owner:** Boundary reviewer subagent.

**Goal:** Ensure archive remains under `飞后归档` and draft rostering only observes archive-related read-only state.

**Files:**

- Inspect: archive entry pages/routes
- Inspect: `apps/api/src/main/java/com/pilotroster/assignment/AssignmentService.java`
- Inspect: `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- Test: `apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java`
- Test: `apps/web/e2e/framework.spec.ts`

**Required boundary:**

- archive case blocks draft edit where appropriate
- draft UI shows archive read-only reason
- archive work is performed in archive module
- old archive workbench URL stays compatibility-only

**Forbidden:**

- do not add archive form controls to draft drawer
- do not add archive case creation/update from draft rostering
- do not let old workbench archive route regain ownership

**Steps:**

- [x] Dispatch reviewer subagent to inspect archive/draft coupling.
- [x] Add or verify backend test for archive read-only assignment detail.
- [x] Add or verify Playwright test for archive route ownership.
- [x] Run `mvn.cmd -f apps\api\pom.xml -Dtest=AssignmentIntegrationTests test`.
- [x] Run `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "archive|draft rostering"`.
- [x] Expected: archive blocks draft edit but archive workflow stays in archive module.

---

## Task Card P3-10: Legacy And Timeline Guard

**Owner:** Final boundary reviewer subagent.

**Goal:** Ensure no Phase 3 work reconnects business editing through timeline, `Pages.tsx`, old workbench routes, or run-day adjustment.

**Files:**

- Inspect: `apps/web/src/app/pages/Pages.tsx`
- Inspect: `apps/web/src/app/routes/workbenchRoutes.ts`
- Inspect: `apps/web/src/app/components/timeline/*`
- Inspect: `apps/web/src/app/pages/workbench/*`
- Test: `apps/web/e2e/framework.spec.ts`

**Required boundary:**

- timeline item clicks remain display-only
- old workbench removed entries do not return to menu
- `/rostering-workbench/run-day-adjustments` stays retired compatibility page
- `Pages.tsx` stays a thin wrapper

**Forbidden:**

- do not open assignment drawer from timeline item click
- do not open archive drawer from timeline item click
- do not route run-day adjustment back into workbench
- do not add draft business branches to `Pages.tsx`

**Steps:**

- [x] Dispatch reviewer subagent to inspect route and timeline diffs.
- [x] Add or verify Playwright tests for display-only timeline and retired run-day route.
- [x] Run `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "workbench|display-only|run-day|draft rostering"`.
- [x] Expected: no business drawer opens from timeline; retired route has no timeline/edit surface.

---

## Task Card P3-11: Phase 3 Closing Verification

**Owner:** Controller.

**Goal:** Close Phase 3 with fresh evidence.

**Commands:**

- `mvn.cmd -f apps\api\pom.xml "-Dtest=TaskPlanControllerIntegrationTests,OperationsMasterDataIntegrationTests,CrewMemberControllerIntegrationTests,AssignmentIntegrationTests" test`
- `npm run build` in `apps\web`
- `npm run check:i18n` in `apps\web`
- `npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "draft rostering|issue|publish|archive|workbench|display-only|run-day"`

**Required evidence:**

- backend targeted tests pass
- frontend build passes
- i18n check passes
- real-click browser tests pass
- console errors are empty
- page errors are empty
- request failures are empty
- unexpected `4xx/5xx` responses are empty

**Known non-blocker:**

- existing Vite large chunk warning is allowed if unchanged.

**Final evidence captured on 2026-05-01:**

- [x] Backend targeted suite: 42 tests, 0 failures.
- [x] Frontend build: passed with existing large chunk warning only.
- [x] i18n check: passed.
- [x] Playwright Chromium real-click/F12 suite: 7 tests, 0 failures.
- [x] Final code-quality review subagent: approved with no blockers.

---

## Recommended Subagent Dispatch Order

1. `Subagent A`: P3-3 Candidate Pool Semantics Freeze + P3-4 Save/Clear Audit Closure
2. `Subagent B`: P3-7 Issue Boundary Check
3. `Subagent C`: P3-8 Publish Boundary Check + P3-9 Archive Boundary Check
4. `Subagent D`: P3-10 Legacy And Timeline Guard
5. Controller: P3-11 Closing Verification

Do not run multiple implementer subagents on the same files at the same time. Boundary reviewer subagents may run in parallel because they are read-only.
