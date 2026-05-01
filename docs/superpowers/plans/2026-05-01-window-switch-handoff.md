# 2026-05-01 Window Switch Handoff

## Purpose

This file is the short handoff for the next window.

It summarizes:

- what this session completed
- what is already verified
- what remains to do before and during Phase 3
- which files should be opened first when continuing

## Session Outcome

This session finished the **Phase 3 preflight cleanup** and moved the project to a usable **Phase 3 starting state**.

The big result is:

- the main path is now stable enough to start Phase 3 from `DraftRosteringPage` and `AssignmentDrawer`
- timeline is locked to **display-only**
- old workbench overlap has been cut back so new Phase 3 work should not grow on legacy routing or legacy page hubs

## What Was Completed In This Session

### 1. Phase 3 preflight risks were cleared

Previously identified maintainability and structural blockers were handled:

- crew create is now atomic from the user's perspective
- crew edit chooses narrow backend write contracts instead of forcing one broad flow every time
- retired `external-work` behavior is no longer an active workflow contract
- run-data protection comes from backend/view-model behavior rather than fragile page-local guessing
- action errors and load errors are separated in the main modules
- assignment eligibility/query reuse was tightened to avoid repeated per-crew queries
- draft queue summary decisions were tightened to avoid repeated archive lookups

### 2. Workbench boundary rebuild was completed

The formal workbench shape is now:

- `航班视图`
- `机组视图`
- `草稿排班`

And the old overlap was removed from the main path:

- `待排航班` is no longer a separate formal workbench entry
- `校验与发布` is no longer owned by old workbench flow
- `飞后归档` is under `校验与问题处理`
- `运行日调整` is **not** an active workbench workflow

### 3. Old run-day adjustment residue was explicitly retired

This was the last cleanup handled before window switch:

- [Pages.tsx](/D:/paiban2/apps/web/src/app/pages/Pages.tsx) was reduced to a thin export/view wrapper
- the old workbench implementations for unassigned tasks, draft versions, and run-day adjustment were removed from that file
- `/rostering-workbench/run-day-adjustments` now goes to a retired compatibility page instead of entering an old timeline-driven workflow
- the compatibility Playwright test was updated so this route must **not** render `gantt-timeline`

This matters because it prevents Phase 3 work from accidentally reconnecting to the old run-day path.

## Current Verified State

The following passed before this handoff:

- backend targeted integration tests for task / flight operations / crew / assignment / archive
- `npm run build`
- `npm run check:i18n`
- Playwright real-click + F12 regression around:
  - display-only timeline behavior
  - protected task/master-data actions
  - workbench route compatibility
  - archive placement
  - rule-hit read-only projection
  - retired run-day route behavior

Known non-blocker:

- frontend build still reports the existing large chunk warning
- this warning was already present and is not the blocker for Phase 3

## Where The Project Stands Now

### Safe statement

We are **past Phase 3 preflight** and can start **Phase 3 implementation**.

### Important boundary

Phase 3 must start from:

- [DraftRosteringPage.tsx](/D:/paiban2/apps/web/src/app/pages/DraftRosteringPage.tsx)
- [AssignmentDrawer.tsx](/D:/paiban2/apps/web/src/app/components/assignment/AssignmentDrawer.tsx)

Phase 3 must **not** reintroduce workflow behavior through:

- timeline item clicks
- old workbench compatibility routes
- `Pages.tsx`
- retired run-day adjustment entry

## Recommended Next Implementation Order

### Phase 3 main path

1. Freeze the draft rostering read/write contract around task detail, candidate pool, save draft, and clear draft.
2. Keep candidate eligibility and blocked reasons backend-owned and explicit in the read model.
3. Strengthen the queue/drawer UX only through formal draft rostering files, not through timeline pages.
4. Keep issue handling under `校验与问题处理`.
5. Keep publish/export under `发布结果` / `结果导出`.
6. Keep archive under `飞后归档`.

### Practical rule for next window

If a new behavior belongs to:

- observing assignment/status truth -> workbench display pages
- editing draft assignment -> draft rostering module
- handling rule problems -> issue handling module
- publishing outputs -> publish results module
- post-flight actuals -> archive module

then it should be added only in that bounded module, not in a compatibility route or mixed page host.

## Important Cautions

### 1. Run-day adjustment is intentionally out of the current main path

If it comes back later, it should return as a separately designed module with:

- its own route
- its own page directory
- explicit backend contract review
- dedicated tests

It should not be quietly reattached to workbench or timeline.

### 2. Detached residue files still exist in the repo

Example:

- [CrewExternalWorkPage.tsx](/D:/paiban2/apps/web/src/app/pages/CrewExternalWorkPage.tsx)

These files are not active main-path pages and should not be pulled back into Phase 3 by convenience.

## Files To Open First In The Next Window

Open these in order:

1. [2026-05-01-window-switch-handoff.md](/D:/paiban2/docs/superpowers/plans/2026-05-01-window-switch-handoff.md)
2. [2026-05-01-session-handoff-summary.md](/D:/paiban2/docs/superpowers/plans/2026-05-01-session-handoff-summary.md)
3. [2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md](/D:/paiban2/docs/superpowers/plans/2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md)
4. [2026-05-01-phase-3-workbench-boundary-rebuild-design.md](/D:/paiban2/docs/superpowers/specs/2026-05-01-phase-3-workbench-boundary-rebuild-design.md)
5. [pilot-rostering-system-rearchitecture-master-plan.md](/D:/paiban2/docs/pilot-rostering-system-rearchitecture-master-plan.md)

Then continue implementation from:

- [DraftRosteringPage.tsx](/D:/paiban2/apps/web/src/app/pages/DraftRosteringPage.tsx)
- [AssignmentDrawer.tsx](/D:/paiban2/apps/web/src/app/components/assignment/AssignmentDrawer.tsx)

## One-Line Resume Prompt

If the next window wants a direct resume point, use this:

> Phase 3 preflight cleanup is complete. Start Phase 3 from the formal draft rostering path only, keep timeline display-only, and do not reconnect run-day/workbench legacy routes.
