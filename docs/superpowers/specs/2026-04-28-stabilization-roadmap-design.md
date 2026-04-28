# Stabilization Roadmap Design

## Summary

This spec defines how the project should proceed from its current unstable state toward a recoverable, maintainable development flow.

The immediate goal is not to maximize FRD coverage. The immediate goal is to restore the team's ability to continue development without each bug fix or feature change expanding scope unpredictably.

The recommended strategy is `stop-the-bleeding first`:

1. Freeze scope expansion.
2. Restore one trustworthy core workflow.
3. Reduce structural weight in the most overloaded frontend files.
4. Resume feature closure work only after the system is trustworthy again.

## Current Problem Statement

The project has a real product direction and meaningful progress, but the current implementation has drifted away from the intended development rhythm.

The main problems are:

- The timeline/workbench surface has accumulated too much responsibility.
- Some previously working flows were broken after additional rule and status logic was layered in.
- Several user-visible states are no longer trustworthy because displayed status and real persisted entities can diverge.
- Bug fixes are expensive because one issue can span display logic, workflow logic, state interpretation, and data consistency.
- Large files such as `GanttTimeline.tsx` and `Pages.tsx` increase the cost of reasoning and make localized changes harder.

This means the project is not primarily blocked by missing features. It is blocked by loss of development control.

## Outcome Goal

At the end of the stabilization phase, the system should be back in a state where:

- one core workflow is trustworthy again,
- timeline responsibilities are frozen and understandable,
- a bug can be fixed without touching many unrelated layers,
- the next feature closure can be chosen intentionally instead of reactively.

## Guiding Principles

### 1. Stop-the-bleeding before FRD expansion

Do not treat the current phase as a feature race.

The team should first restore the ability to change the system safely. FRD coverage can resume only after the current instability stops compounding.

### 2. Closure-first, module-owned development

Development order should be driven by closures, not by filling out modules page-by-page.

Code should still live in the correct modules, but each work cycle should only advance one closure at a time.

### 3. Trustworthy state beats rich state

Displayed state must only represent stable, real system state.

The system must avoid showing a stronger state than the persisted workflow has actually reached. In particular, timeline state must not claim that a draft exists when no real draft entity or corresponding workflow entry exists.

### 4. Timeline is a visual workflow surface, not the business source of truth

The timeline can contain display logic, aggregation logic, and interaction routing that are necessary for stable visualization.

However, it should not continue absorbing new business responsibilities during stabilization.

### 5. Small rollback is normal

This roadmap assumes some targeted rollback of logic boundaries is necessary and healthy.

Rollback should happen early and locally, not as a late large rewrite.

## Phase Plan

## Phase 1: Stabilization

### Objective

Restore the ability to continue development safely.

### In Scope

- Freeze new business scope on the timeline and workbench.
- Restore one core workflow to a trustworthy state.
- Reduce structural weight in the heaviest frontend files without changing intended behavior.
- Prevent display state from getting ahead of real system state.

### Out of Scope

- New FRD pages
- New rule-engine capability
- Expanded archive workflow capability
- Timeline drag editing
- Timeline-side delete/edit operations
- Large visual redesign
- Broad refactor unrelated to stabilization

### Required Freeze Rules

During Phase 1, do not:

- add new business actions to the timeline,
- add new primary status semantics to timeline color logic,
- add new workflow entry points to the workbench,
- continue growing archive/rule/timeline coupling,
- use bug fixes as a reason to add missing product capability.

## Phase 2: Core Workflow Recovery

### Objective

Recover the most important broken workflow so that the UI, state, and persisted entities are aligned again.

### First Workflow To Restore

The first workflow to recover is:

`unassigned/timeline display -> click -> correct draft/detail entry -> displayed state matches real data`

This is the highest-value closure because it directly addresses the current trust problem.

### Acceptance Criteria

The workflow is considered recovered when:

- unassigned blocks display consistently,
- clicking a block always leads to the correct target flow,
- a block only displays draft state if a real draft entity exists,
- the system no longer enters misleading half-states where the color changes but the corresponding draft data does not exist.

### Recovery Rule

Displayed draft state must require a real draft entity.

Any temporary, test-only, partially-selected, or validation-intermediate state must not promote the block into draft presentation unless the backing draft really exists.

## Phase 3: Resume Closure Sequencing

### Objective

After stabilization and workflow recovery, resume feature progress in a controlled order.

### Recommended Closure Order

1. Timeline display closure
2. Timeline click to read-only detail closure
3. Real draft write closure
4. Minimal rollback closure
5. Archive read-only closure
6. Archive write closure
7. Rule warning/prompt closure

### Ordering Rationale

This order prioritizes:

- restoring system truthfulness,
- enabling safe forward progress,
- deferring heavier coupled flows until the core path is trustworthy.

## Immediate Two-Week Execution Rhythm

## Week 1: Stop the bleeding

### Goals

- Freeze all nonessential scope expansion
- Recover the core timeline/draft truthfulness path
- Continue low-risk structural reductions in overloaded files

### Allowed Work

- Fix only issues directly related to the recovered core workflow
- Continue structural extraction work in `GanttTimeline.tsx`
- Continue low-risk extraction in `Pages.tsx`

### Not Allowed

- New FRD page work
- New timeline actions
- New rule-driven primary state semantics
- Archive workflow expansion
- Broad refactor sprawl

## Week 2: Restore trust and controlled forward motion

### Goals

- Add a stable read-only detail path
- Add one minimal rollback path
- Make archive readable without reopening full archive complexity

### Target Closures

1. Read-only detail closure
2. Minimal rollback closure
3. Archive read-only closure

## Structural Guidance

## `GanttTimeline.tsx`

This file should continue being reduced as a component shell.

Its long-term shape should favor:

- component rendering and event wiring in the main file,
- extracted timeline option building,
- extracted display/item/group mapping,
- extracted flight aggregation and status interpretation helpers.

The stabilization phase should continue structural separation, but should not use the extraction effort as a reason to redesign timeline behavior at the same time.

## `Pages.tsx`

This file should continue shrinking through safe extractions of static and low-risk page slices first.

Heavy workbench, archive, and rule pages should not all be split at once. Extraction should proceed incrementally to reduce context load without introducing new instability.

## Risk Management Rules

When evaluating any next task during this roadmap, apply the following filters:

### Do the task now only if:

- it restores truthfulness of the main workflow,
- it reduces change cost in a focused way,
- it does not expand the system's responsibility surface.

### Defer the task if:

- it adds new product behavior,
- it opens another workflow before the current one is trustworthy,
- it introduces additional timeline state semantics,
- it couples rules more tightly into the timeline primary state logic.

## Success Criteria

The stabilization roadmap is successful when:

- one core workflow is trustworthy again,
- the timeline has stopped accumulating responsibilities,
- changes can be made in a smaller scope,
- the next closure can be selected intentionally from a controlled order,
- the team feels able to move forward without every bug fix reopening system-wide uncertainty.

## Explicit Non-Goals

This roadmap does not attempt to:

- finish all FRD closures now,
- redesign the entire product,
- replace the timeline library,
- rebuild the backend architecture,
- define the full future rule engine.

It is intentionally narrower: restore control first, then continue building.
