# Phase 0 Boundary Freeze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze legacy business drift so `Phase 1` can build the new flight-task module without being pulled back into old timeline-driven behavior.

**Architecture:** Keep legacy workbench behavior available only through isolated legacy entry points, treat the master redesign document as the only active planning baseline, and stop all new business meaning from being added to timeline code. This phase does not redesign assignment, issue handling, or publish behavior; it only locks boundaries and removes ambiguity.

**Tech Stack:** React, TypeScript, Spring Boot, Markdown planning docs

---

### Task 1: Lock the execution baseline in docs

**Files:**
- Modify: `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`
- Test: `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`

- [ ] **Step 1: Add a short Phase 0 execution section to the master doc**

Add a section near the phase list with the following content:

```md
### 12.1a Phase 0 execution focus

Phase 0 exists to stop drift before any new module build begins.

During Phase 0:

- no new business state meaning may be added to legacy timeline code,
- no new business workflow may be attached to legacy workbench entry points,
- legacy assignment behavior may be preserved but not redefined,
- the master redesign document remains the only active planning baseline.
```

- [ ] **Step 2: Verify the new section is present**

Run: `Select-String -Path docs\pilot-rostering-system-rearchitecture-master-plan.md -Pattern "Phase 0 execution focus"`

Expected: One match showing the new heading.

- [ ] **Step 3: Commit**

```bash
git add docs/pilot-rostering-system-rearchitecture-master-plan.md
git commit -m "docs: lock phase 0 execution baseline"
```

### Task 2: Verify legacy navigation isolation

**Files:**
- Modify: `D:\paiban2\apps\web\src\app\menu.ts`
- Modify: `D:\paiban2\apps\web\src\app\i18n.ts`
- Test: `D:\paiban2\apps\web\src\app\menu.ts`

- [ ] **Step 1: Verify old workbench views remain grouped under legacy**

Open and confirm `menu.ts` keeps old workbench views only under `menu-legacy`:

```ts
{
  id: 'menu-legacy',
  icon: LayoutGrid,
  roles: operationsRoles,
  children: [
    { id: 'workbench-flight-view', roles: operationsRoles },
    { id: 'workbench-crew-view', roles: operationsRoles },
    { id: 'workbench-unassigned-tasks', roles: operationsRoles },
    { id: 'workbench-draft-versions', roles: operationsRoles },
    { id: 'workbench-run-day-adjustments', roles: operationsRoles },
    { id: 'workbench-archive-entry', roles: operationsRoles },
  ],
}
```

- [ ] **Step 2: Verify validation aliases are not attached to the new rule-center path**

Run: `Select-String -Path apps\web\src\app\menu.ts -Pattern "validation-overview|validation-rule-hits|validation-violation-handling|validation-release-gates|validation-export" -Context 0,3`

Expected: Matches appear only under the `menu-legacy` block.

- [ ] **Step 3: Verify the legacy label exists in i18n**

Run: `Select-String -Path apps\web\src\app\i18n.ts -Pattern "'menu-legacy'"`

Expected: Matches exist in both Chinese and English resource sections.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/menu.ts apps/web/src/app/i18n.ts
git commit -m "chore: preserve legacy navigation boundary"
```

### Task 3: Add a code-level timeline freeze note

**Files:**
- Modify: `D:\paiban2\apps\web\src\app\components\timeline\GanttTimeline.tsx`
- Test: `D:\paiban2\apps\web\src\app\components\timeline\GanttTimeline.tsx`

- [ ] **Step 1: Add a top-level comment that marks timeline as display-only**

Add this short comment near the component definition:

```ts
// Phase 0 boundary rule:
// This timeline is a display adapter only.
// Do not add business-state authorship, workflow gating, or write actions here.
```

- [ ] **Step 2: Verify the comment exists**

Run: `Select-String -Path apps\web\src\app\components\timeline\GanttTimeline.tsx -Pattern "display adapter only"`

Expected: One match in the file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/components/timeline/GanttTimeline.tsx
git commit -m "chore: mark timeline as phase 0 display-only"
```

### Task 4: Record preserved legacy assignment scope

**Files:**
- Modify: `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`
- Test: `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`

- [ ] **Step 1: Add a short statement under draft rostering scope**

Add this exact note under the draft module section:

```md
Phase 0 freeze rule:

- preserve current legacy assignment semantics,
- do not redesign role structure,
- do not change candidate-pool business rules,
- remove timeline coupling later in Phase 3 instead of patching assignment semantics now.
```

- [ ] **Step 2: Verify the statement is present**

Run: `Select-String -Path docs\pilot-rostering-system-rearchitecture-master-plan.md -Pattern "Phase 0 freeze rule"`

Expected: One match in the draft-rostering section.

- [ ] **Step 3: Commit**

```bash
git add docs/pilot-rostering-system-rearchitecture-master-plan.md
git commit -m "docs: freeze legacy assignment scope for phase 0"
```

### Task 5: Phase 0 verification pass

**Files:**
- Test: `D:\paiban2\docs\pilot-rostering-system-rearchitecture-master-plan.md`
- Test: `D:\paiban2\apps\web\src\app\menu.ts`
- Test: `D:\paiban2\apps\web\src\app\i18n.ts`
- Test: `D:\paiban2\apps\web\src\app\components\timeline\GanttTimeline.tsx`

- [ ] **Step 1: Verify master-doc phase markers**

Run: `Select-String -Path docs\pilot-rostering-system-rearchitecture-master-plan.md -Pattern "Phase 0 execution focus|Phase 0 freeze rule"`

Expected: Two matches.

- [ ] **Step 2: Verify legacy menu isolation and label**

Run: `Select-String -Path apps\web\src\app\menu.ts,apps\web\src\app\i18n.ts -Pattern "menu-legacy|workbench-flight-view|validation-overview"`

Expected: Matches confirm the legacy group and label are still present.

- [ ] **Step 3: Verify timeline freeze marker**

Run: `Select-String -Path apps\web\src\app\components\timeline\GanttTimeline.tsx -Pattern "display adapter only"`

Expected: One match.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-04-30-phase-0-boundary-freeze-plan.md
git commit -m "docs: add phase 0 boundary freeze plan"
```
