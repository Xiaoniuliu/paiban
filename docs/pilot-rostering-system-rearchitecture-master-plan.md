# Pilot Rostering System Rearchitecture Master Plan

## 1. Master Goal

The first priority of the next system phase is stable go-live.

The system should be planned so that:

- core workflows can go live safely,
- backend remains the single decision source for business state,
- frontend does not independently re-interpret workflow truth,
- timeline stays within official vis-timeline capability boundaries,
- future state and field growth can be absorbed without large cross-system rewrites.

This is a large system redesign plan, not a page-by-page patching exercise.

At the current stage, external FOC integration must not dominate the first production design. The near-term system should be planned to run safely with manual maintenance and import-based operation as the primary path.

## 2. Core Architecture Principles

### 2.1 Stable go-live first

All planning decisions should first answer:

- what is the minimum production responsibility of this system,
- what external dependencies are required,
- what consistency checks are mandatory,
- what fallback or degraded mode is available if external data is incomplete.

### 2.2 Backend-centered business decisions

Business truth should be decided in the backend.

The frontend should primarily consume backend view models and action permissions, instead of independently deriving workflow state from raw task data, block data, or page-local conditions.

### 2.3 Timeline is display-only

Timeline should use official vis-timeline capabilities only.

Timeline is allowed to:

- display grouped items,
- apply status colors and labels,
- provide click and navigation entry points,
- provide window navigation and selection.

Timeline is not allowed to:

- own business truth,
- define workflow state,
- act as the main editing surface for rostering facts,
- become the coupling point for validation, publish, archive, and rule logic.

Timeline display must not promote objects into a stronger workflow state than the backend has actually persisted. In particular, draft-like display must require real persisted draft facts rather than page-local guesswork or temporary selection state.

### 2.4 Legacy isolation

Existing rostering workbench, timeline-driven workflow, validation/publish flow, and archive flow should be isolated into Legacy paths and should not define the new architecture.

Rule pages are preserved.

Older implementation-path documents are archived and should not be treated as current execution guidance.

Historical `FRD-*` documents and broad import/reference materials should not be used as active planning references for this redesign. They may provide background context only, but they must not drive current module scope, ordering, or business judgment.

### 2.5 Prefer module-oriented workflow over page hopping

The new system should be organized around a small number of stable workflow modules rather than a large number of loosely connected pages.

This is especially important because future rule growth would otherwise force users to remember too many page transitions and mental checkpoints.

The preferred direction is:

- each major module owns a clear part of the workflow,
- users should complete as much related work as possible inside one module,
- cross-module jumping should be minimized,
- timeline remains a supporting display entry, not the center of module navigation.

### 2.6 Module dependency order

The first-stage workflow modules should be delivered in this dependency order:

1. Task module
2. Crew-resource module
3. Draft rostering module
4. Issue-handling module
5. Publish-result module

This order exists to keep later modules built on top of stable task facts and stable crew-resource data, instead of building assignment, validation, and publish behavior on incomplete foundations.

### 2.7 Module boundaries must stay explicit

Each workflow module must have a clear responsibility boundary.

The system should explicitly define for each module:

- what it owns,
- what it may read,
- what it may change,
- what it must not absorb from neighboring modules.

This is required to prevent the redesigned system from collapsing back into a single mixed workbench.

### 2.8 Adopted legacy guardrails

To reduce regressions, the redesign should explicitly adopt a small set of proven guardrails from legacy behavior and prior architecture constraints.

Only the guardrails that actively reduce bug risk in the current redesign should be carried forward.

These adopted guardrails are:

- time and timezone behavior must continue to follow the existing UTC-storage and display-timezone-switch model,
- language switching must continue to follow the existing unified zh-CN / en-US resource model,
- timeline remains a display adapter only and must not regain business-write responsibility,
- displayed workflow state must not be stronger than persisted backend truth,
- published or archived flights must not be directly modified through basic task editing,
- multiple blocking or warning hits on the same object must not be collapsed to only the single most severe item,
- first-stage crew limit and forecast behavior should extend current rolling/actual-derived fields rather than invent a new full calculation engine.

These guardrails are intended to constrain design freedom in places where extra creativity would increase bug risk.

### 2.9 Inherited global compatibility rules

The redesign should inherit the existing global compatibility rules rather than redefining them module by module.

Time rules:

- backend storage and transport remain UTC-based,
- display timezone switching affects presentation only,
- UTC field naming should keep explicit `*Utc` semantics,
- business pages should continue to use shared time-formatting utilities/components instead of ad hoc date handling.

Language rules:

- zh-CN / en-US switching should continue through shared language resources,
- module pages, buttons, fields, statuses, and export-facing text should not introduce new hardcoded single-language strings.

## 3. Publish Principles

For the new system plan, "publish" is defined first as an internal system action.

### 3.1 Publish definition

Publish means:

- a draft roster result becomes a formally effective version inside this system.

Publish does not automatically mean:

- external system synchronization is complete,
- notification distribution is complete,
- downstream operational systems have already acknowledged the result.

Those are separate follow-up actions.

### 3.2 Publish outputs

The first-stage publish result must have visible output.

The primary publish output is:

- a publish result page.

The secondary publish output is:

- Excel export.

### 3.3 Publish views

The first-stage publish result should support both:

- flight-oriented view,
- crew-oriented view.

The primary view is flight-oriented.

The secondary view is crew-oriented.

## 4. Workflow Simplicity Principles

The first-stage workflow must stay simple and easy to change.

### 4.1 Keep the main workflow states small

The main workflow should keep only a small number of business states, such as:

- `UNASSIGNED`
- `DRAFT_ASSIGNED`
- `READY_TO_PUBLISH`
- `PUBLISHED`

The system should avoid expanding the main state machine every time a new manual check or rule is introduced.

Not every module needs to surface every workflow state directly. A module such as the task module may intentionally project a smaller, easier-to-read subset for operational clarity.

`CANCELLED` should not be pulled back into the main workflow state list as a convenience shortcut. It belongs to runtime-mark handling and should influence workflow through explicit rules rather than by collapsing layers together again.

### 4.2 Use a simple issue list instead of growing the state machine

Manual confirmation and future rule validation should not each introduce their own parallel workflow states.

Instead, the system should keep a simple issue list attached to tasks.

Examples include:

- manual entry pending confirmation,
- imported timing changed and needs review,
- future rule validation problem,
- future qualification or conflict problem.

The first-stage principle is:

- keep the workflow state simple,
- express check/confirmation needs as issues,
- allow later rule growth by adding issue types rather than redesigning workflow states.

### 4.3 Publish gating stays simple

The publish rule should remain easy to understand:

- if blocking issues still exist, publish is not allowed,
- if blocking issues are cleared or confirmed, the task may continue toward publish.

This keeps first-stage manual confirmation light while preserving a clear extension path for later rule integration.

### 4.4 Draft rollback must exist

Draft workflow must not be forward-only.

If conflicts, invalid assignments, changed requirements, or manual review outcomes make the current draft unsuitable, the system must allow the draft state to move back safely.

The first-stage system should support at least:

- reverting a draft-assigned task back to `UNASSIGNED`,
- clearing the current draft assignment result,
- preserving enough audit context to explain that a draft existed and was rolled back.

## 5. Runtime Fact And Judgment Principles

Runtime-change handling must remain understandable and maintainable.

The system should not rely on large if/else chains or on enumerating every possible combination such as:

- delayed then cancelled,
- timing changed then delayed,
- timing changed then cancelled after publish.

Instead, runtime handling should be based on stable layers and priority rules.

### 5.1 Separate four different concepts

The system must keep these concepts distinct:

- main workflow state,
- runtime marks,
- issue list,
- raw task facts.

They must not be collapsed into a single overloaded field.

### 5.2 Not every runtime fact should become a first-stage decision mark

The first stage should keep runtime marks small.

The recommended first-stage runtime marks are:

- `CANCELLED`
- `TIMING_CHANGED`

`DELAYED` may still be captured as a raw operational fact or note, but it should not automatically become a first-stage workflow-driving mark unless later business usage proves it necessary.

This is intended to reduce noise and prevent the first-stage decision layer from becoming too complex.

### 5.3 Runtime marks need priority rules, not combination tables

Runtime marks should be resolved by priority instead of by enumerating every sequence combination.

The first-stage priority direction is:

- `CANCELLED` has the highest priority,
- `TIMING_CHANGED` is lower than `CANCELLED`,
- lower-priority operational facts must not override higher-priority workflow-breaking marks.

### 5.4 Runtime marks must define how they affect main workflow state

Each runtime mark must explicitly define:

- whether it changes the main workflow state,
- whether it blocks scheduling,
- whether it blocks publish,
- whether it creates or updates an issue entry,
- whether it forces a manual confirmation step.

### 5.5 Runtime marks must define who can apply and clear them

If runtime marks are manually maintained in the first stage, the system must define:

- who can add them,
- who can clear them,
- what audit trail is preserved,
- what state the task returns to after clearance or confirmation.

### 5.6 Draft behavior must be defined per mark

When a runtime mark appears after draft rostering already exists, the system must define the draft consequence per mark.

Typical consequences include:

- draft remains visible,
- publish becomes blocked,
- task moves to confirmation-required state,
- draft may need rollback.

### 5.7 Post-publish behavior must be defined early

`PUBLISHED` must not be treated as the end of all workflow thinking.

If runtime marks appear after publish, the design must define whether the system should:

- create a new issue,
- require manual confirmation,
- require a new publish cycle,
- or only annotate the published result.

This must be explicit before implementation begins.

### 5.8 Manual-first operation requires idempotence and auditability

Because the first production stage will rely heavily on manual operation, the system must support:

- repeated mark updates without corrupting state,
- safe correction of mistakes such as accidental cancellation,
- clear audit records of who changed what and when.

### 5.9 First-stage recommendation for runtime handling

The first stage should follow this simplified approach:

- keep main workflow states small,
- keep formal runtime marks to `CANCELLED` and `TIMING_CHANGED`,
- keep `DELAYED` as a lower-level fact unless later usage proves otherwise,
- let runtime marks influence workflow through issues and gating rules rather than by exploding the state machine.

### 5.12 Maintainability over shortcut logic

As runtime rules grow, the system must prefer explicit layered judgment over scattered shortcut logic.

This means:

- do not add new workflow states just to avoid writing proper judgment rules,
- do not push runtime-mark meaning into UI-only condition branches,
- do not rely on ad hoc page-specific shortcuts that bypass the backend decision model,
- prefer a small number of stable concepts with clearly written influence rules.

The goal is not to make the first stage artificially simple by skipping needed logic. The goal is to keep the logic structured so that later change does not break the system.

### 5.10 First-stage `CANCELLED` rule

For first-stage manually maintained or later externally sourced tasks, `CANCELLED` should behave as a workflow-breaking runtime mark.

The recommended behavior is:

- `CANCELLED` moves the task out of normal schedulable flow,
- new draft assignment actions are not allowed while `CANCELLED` is active,
- publish is not allowed while `CANCELLED` is active,
- if a draft already exists, the draft may remain visible for audit/reference, but it must no longer be treated as active publishable output,
- the system should create or maintain a blocking issue explaining that the task is cancelled.

If cancellation is cleared manually, the system must not silently guess the correct next business state. A human should confirm whether the task returns to:

- `UNASSIGNED`,
- `DRAFT_ASSIGNED`,
- or `READY_TO_PUBLISH`

depending on the remaining facts and issues.

### 5.11 First-stage `TIMING_CHANGED` rule

`TIMING_CHANGED` should be treated as a workflow-interrupting but not workflow-terminating runtime mark.

The recommended behavior is:

- the task remains in the system,
- existing draft data may remain visible,
- publish becomes blocked,
- the task enters a confirmation-required position in the workflow,
- the system should create or maintain a blocking issue explaining that task timing changed and human review is required.

If human review confirms the draft is still valid under the new timing:

- the blocking issue may be cleared,
- the task may resume its forward workflow path.

If human review concludes the draft is no longer valid:

- the draft should be rolled back or cleared,
- the task should return to a schedulable state such as `UNASSIGNED`.

## 6. Flight Task Data Principles

### 6.1 Fact and business object separation

The minimum external/input fact is:

- `Leg`

The minimum internal rostering business object is:

- `Task`

### 6.2 First-stage scope

In the first stage:

- one Task maps to one Leg.

The architecture must preserve the ability to extend later to:

- one Task containing multiple continuous Legs.

### 6.3 Minimum first-stage task fields

The first-stage minimum closed-loop task field set is:

- unique identifier (external source id or internal task id),
- flight number / task code,
- flight date,
- departure airport,
- arrival airport,
- scheduled departure time,
- scheduled arrival time,
- leg status (at least normal / cancelled),
- aircraft type.

These are the minimum required fields, not the final full field model.

### 6.4 Internal key first, external key reserved

In the first stage:

- the system should use an internal auto-increment primary key as the operational record key,
- manual entry and import testing should not depend on users manually filling external ids.

At the same time, the model must reserve external-source identity fields such as:

- `source_system`,
- `source_leg_id`.

These fields may remain empty in the first stage, but they must exist as reserved extensibility points for later integration.

### 6.5 Source distinction

The model should support distinguishing at least:

- manually created records,
- externally synchronized records.

This distinction should be available through source metadata rather than through different business models.

The recommended first-stage shape is:

- keep the internal auto-increment id as the record anchor,
- add explicit source metadata such as `source_type`,
- support at least `MANUAL` and `EXTERNAL` as source categories.

Source distinction should not depend on special primary-key ranges or other id-encoding conventions.

### 6.6 Extensibility requirement

Future field growth must not force large rewrites across task modeling, timeline rendering, publish view, or workflow state logic.

This implies:

- minimum fields and extended fields should be treated separately,
- pages should consume stable backend view models instead of binding directly to all raw fields,
- imported and manually created data should land in the same internal fact model.

## 7. First-Stage Data Entry Principles

At the current stage, external interfaces are not yet guaranteed.

Therefore first-stage flight task data entry must support:

- manual maintenance page,
- Excel/CSV import.

The preferred first-stage operating mode is:

- import-first,
- with manual maintenance available for testing, correction, and fallback.

First-stage operation must explicitly include basic CRUD capability for task facts and related draft data:

- create,
- read,
- update,
- delete.

These operations are part of the minimum closed loop, not optional admin-only extras.

Manual confirmation and manual operation are expected to remain first-class capabilities in the first production stage, not merely temporary developer-only scaffolding.

## 8. External Snapshot Minimum Requirements

External-system integration is not a first-stage delivery dependency.

If FOC integration is introduced later, support should eventually cover both:

- full snapshot import,
- incremental change ingestion,

with full snapshot as the primary operational baseline.

At the current planning stage, these rules are treated as reserved integration principles rather than as mandatory first-stage workflow scope.

### 8.1 Minimum external synchronization metadata

Beyond the first-stage task fields, the first-stage external snapshot should provide at least:

- `updated_at` or equivalent source update timestamp,
- `source_version` or equivalent monotonic version marker when available.

At least one of these must exist so that the system can judge:

- whether incoming data is newer than current local state,
- whether a full snapshot can safely overwrite or reconcile local imported facts,
- whether a publish or scheduling action should be blocked because source freshness is unknown.

### 8.2 Degraded mode when freshness metadata is missing

If externally sourced data is imported without usable freshness metadata such as update time or version:

- the system may allow import,
- the imported records should enter a read-only degraded mode,
- scheduling actions should be blocked,
- publish actions should be blocked,
- the system should surface that source freshness is unknown.

### 8.3 Source-scoped consistency guards

External-source consistency rules should apply primarily to records with source metadata such as:

- `source_type = EXTERNAL`

They should not automatically block first-stage manual test data with source metadata such as:

- `source_type = MANUAL`

This means:

- external freshness, cancellation, and synchronization guards should be source-scoped,
- manual test and fallback data should continue to use internal workflow rules,
- source-scoped enforcement should prevent external-integration guardrails from blocking first-stage testing and local closed-loop validation.

### 8.4 External cancellation guard

For records with external source metadata such as:

- `source_type = EXTERNAL`

if the external source explicitly marks the leg as cancelled:

- the task must leave any schedulable state,
- the task must not remain eligible for new scheduling actions,
- downstream state machine and publish rules must respect this cancellation guard.

### 8.5 External schedule-change guard

For records with external source metadata such as:

- `source_type = EXTERNAL`

if the external source changes planned timing fields such as STD or STA after a draft roster already exists:

- the draft may remain stored,
- the task must leave any directly publishable state,
- publish must be blocked,
- the task must require explicit human confirmation before it can continue through the workflow.

The first-stage goal is not to build a heavy exception workflow, but to preserve safety:

- keep the draft visible,
- surface that external timing changed,
- require a lightweight human confirmation step before workflow can continue.

## 9. Working Rule For Planning

Whenever discussion produces a principle-level rule or architecture decision, it should be written into this master document immediately instead of being left only in conversation context.

This document is the active planning baseline for the redesign.

For the current redesign phase, preferred planning references are limited to:

- this master plan,
- current code and menu structure facts,
- legacy business behavior that has been explicitly confirmed as correct.

Broad historical FRD collections should not be reintroduced as primary references, because doing so pulls old product assumptions back into the redesign and increases drift.

## 10. First-Stage Workflow Modules

### 10.0 Closed-loop delivery order

For first-stage delivery, modules should be refined and implemented by business closed loop rather than by page count or UI adjacency.

The recommended first-stage closed-loop order is:

1. flight-task closed loop
2. crew-resource closed loop
3. draft-rostering closed loop
4. issue-handling closed loop
5. publish-result closed loop

This order is intended to keep later workflow steps built on top of already trustworthy task facts and crew facts.

### 10.1 Task module

The task module owns:

- manual task creation,
- Excel/CSV import,
- task list viewing and filtering,
- task detail viewing,
- task update,
- task deletion.

The task module may read:

- source metadata,
- current workflow state,
- lightweight summary information needed for list and detail display.

The task module may change:

- task facts,
- source metadata,
- basic task lifecycle records before draft rostering begins.

The task module should not own:

- crew assignment behavior,
- issue confirmation workflow,
- publish behavior,
- timeline truth decisions.

Published or archived downstream facts must remain protected from basic task editing. If a flight has already entered publish or archive-sensitive flow, changes should move into the appropriate downstream operational path rather than silently rewriting base task facts from the task module.

For first-stage list display, the task module should show one unified workflow status field rather than multiple overlapping status-like columns.

This means the task list should not separately present parallel primary columns such as:

- current state,
- has blocking issues,
- has draft.

Instead:

- the task list should show a single status field,
- blocking issue detail should remain in the draft rostering / issue-handling flow,
- the task module should stay focused on task facts and lightweight workflow positioning.

The recommended first-stage unified task status values are:

- `待排`
- `草稿已排`
- `已发布`

`待确认` and `可发布` should not be surfaced as task-module list statuses. They belong to draft rostering and issue-handling progression, not to the simplified task-fact management view.

Runtime marks such as cancellation or timing change should influence what actions remain available, but should not become extra parallel primary status columns in the task list.

#### 10.1.1 Task list view

The task list is the main entry of the task module.

Its first-stage purpose is to let users:

- view imported or manually created task facts,
- find tasks quickly,
- inspect current workflow position,
- open the right next action.

The first-stage task list should display at least:

- task id,
- flight number / task code,
- flight date,
- departure airport,
- arrival airport,
- scheduled departure time,
- scheduled arrival time,
- aircraft type,
- source type,
- unified task status.

The first-stage task list should support:

- keyword search,
- date-range filtering,
- source-type filtering,
- unified-status filtering,
- sorting by date/time,
- opening task detail,
- opening create-task flow,
- opening import flow.

The task list should not directly own:

- full draft-editing workflow,
- full issue-resolution workflow,
- publish execution.

The first-stage task list should keep filtering small and operationally useful.

The recommended first-stage filter set is:

- date range,
- departure airport,
- arrival airport,
- source type,
- unified task status.

Free-text keyword search may cover identifiers such as:

- task id,
- flight number / task code.

The task list should avoid first-stage filter explosion. Filters such as runtime-mark combinations, issue-type combinations, or deep publish metadata should remain outside the first-stage task module list.

#### 10.1.2 Task detail view

Task detail should be the single-record working surface inside the task module.

Its first-stage purpose is to let users:

- inspect complete task facts,
- edit task facts,
- inspect source metadata,
- understand current workflow position,
- see lightweight summary of whether draft data exists.

The task detail should display at least:

- all task fact fields,
- source metadata,
- unified task status,
- runtime marks summary,
- lightweight draft summary when draft exists,
- audit summary such as creation/update information when available.

The task detail should not become:

- the main draft-editing workspace,
- the main issue-resolution workspace,
- the publish page.

#### 10.1.3 Task detail action visibility rules

Task-detail actions should be determined by backend workflow judgment instead of page-local guesswork.

The recommended first-stage detail actions are:

- `Edit task`
- `Delete task`
- `Open draft rostering`
- `View draft summary`
- `View related issues`
- `View published result`

The visibility direction should be:

- `Edit task` is available while the task remains manually maintainable in the current workflow stage,
- `Delete task` is available only when deletion is still safe and does not violate downstream workflow constraints,
- `Open draft rostering` is available only when the task is schedulable,
- `View draft summary` is available when draft data exists,
- `View related issues` is available when issue records exist,
- `View published result` is available when publish output exists.

The frontend should not independently infer these action rules from raw fields. The backend should provide action availability in the detail view model.

The first-stage action rules should follow these directions:

- `Edit task`
  - available primarily while the task is still in `待排`,
  - should become restricted once draft or published downstream artifacts already exist.

- `Delete task`
  - means physical deletion only,
  - is available only when the task has not yet entered downstream workflow,
  - should remain a true physical-delete path for test data and mistaken data,
  - is not available once draft, publish, archive, or other downstream artifacts already exist.

- `Open draft rostering`
  - available when the task is schedulable and has no workflow-breaking runtime mark,
  - should be the main forward action from `待排`.

- `Continue draft rostering`
  - available when the task is in `草稿已排`,
  - should re-enter draft rostering instead of forcing users to start from task editing again.

- `View draft summary`
  - available when draft assignment data exists,
  - should remain viewable even when draft is no longer publishable, so users can understand what had been assigned.

- `Rollback draft`
  - available when draft assignment data exists and rollback is still operationally allowed,
  - should move the task safely back toward `待排` through draft-clearing behavior rather than through direct hard deletion.

- `View related issues`
  - available when issue records exist,
  - should act as the main path from task detail into issue-handling flow.

- `View published result`
  - available when publish output exists,
  - should remain viewable even if later runtime marks or issues appear.

In the first stage, the backend detail view model should prefer explicit action flags such as:

- `canEditTask`
- `canDeleteTask`
- `canOpenDraftRostering`
- `canContinueDraftRostering`
- `canRollbackDraft`
- `hasDraftSummary`
- `hasIssues`
- `hasPublishedResult`

This is preferred over forcing the frontend to reconstruct action rules from state, marks, and issue combinations.

#### 10.1.4 Task module primary actions

The first-stage task module should support these primary actions:

- create task,
- import tasks,
- view task detail,
- edit task,
- delete task,
- open draft rostering for eligible tasks,
- continue draft rostering,
- roll back draft where allowed.

Here, `delete task` means physical deletion only. It is not the same thing as cancellation.

The task module may also support lightweight safe actions such as:

- add or clear runtime marks where first-stage operation requires manual maintenance,
- cancellation marking when first-stage business handling requires it, kept separate from deletion,
- navigate to the draft or issue module when relevant.

The task module should not directly support:

- final publish,
- full crew assignment editing inside the list,
- rule-definition actions.

### 10.2 Crew-resource module

The crew-resource module is the next business module after flight-task management and before draft rostering.

This ordering should follow the existing system menu and dependency logic:

- flight-operation tasks enter first,
- crew resources are managed and checked next,
- draft assignment happens only after both task facts and crew facts are available.

The first-stage crew-resource module owns:

- crew information,
- qualification-related crew facts,
- crew status timeline / operational availability context,
- crew external-work records.

The crew-resource module may read:

- task-side required crew patterns for reference,
- runtime summaries needed to explain crew availability context.

The crew-resource module may change:

- crew master data within allowed maintenance scope,
- crew qualification records,
- crew status blocks,
- crew external-work records.

The crew-resource module should not own:

- flight-task CRUD,
- draft assignment editing,
- issue-resolution workflow,
- publish execution.

This module should be treated as a prerequisite data module for draft rostering, not as a secondary side page after assignment starts.

#### 10.2.1 Crew-resource closed loop

The first-stage crew-resource closed loop should be refined in this order:

1. crew information
2. qualification and role facts
3. crew status timeline
4. crew external work

This order keeps candidate selection and assignment decisions built on top of usable crew facts instead of on incomplete placeholders.

#### 10.2.2 Crew information

Crew information is the base fact layer for the crew-resource module.

It should own:

- crew identity,
- crew code / employee number,
- display names,
- role and rank facts,
- home base,
- aircraft qualification summary,
- availability status.

The first-stage crew-information loop must support:

- create,
- read,
- update,
- disable.

This is not optional reference data. It is a prerequisite business closed loop for later draft rostering.

#### 10.2.3 Qualification and role facts

Qualification and role facts must remain in the crew-resource module, not be deferred into draft rostering.

They should at least support:

- role-code truth,
- rank-code truth,
- qualification records,
- effective start/end time where applicable,
- enable / disable lifecycle.

The purpose of this loop is to ensure later candidate pools can rely on crew facts instead of re-deriving them ad hoc inside assignment screens.

#### 10.2.3a Crew-side time calculation and forecast layer

The crew-resource module must also preserve the time-calculation behavior that helps dispatchers judge future risk before hard failure happens.

This is not only an alerting function and should not be reduced to "remind when nearly expired".

Its purpose is:

- give dispatchers a forward-looking view of crew risk,
- show whether a crew member is approaching important limits,
- support better roster judgment before a later blocking problem occurs.

This layer should be treated as a derived calculation layer on top of crew facts, not as raw master data.

Examples of first-stage calculation/forecast outputs include:

- rolling hour summaries,
- duty/rest-related limit summaries,
- qualification-expiry horizon summaries,
- projected risk or near-limit indicators useful for pre-assignment judgment.

Based on the current system facts, the existing crew-side calculation layer already includes fields such as:

- `rollingFlightHours28d`
- `rollingDutyHours28d`
- `rollingDutyHours7d`
- `rollingDutyHours14d`
- `rollingFlightHours12m`
- `latestActualFdpHours`
- `latestActualFdpSource`

The current UI also already treats these values as dispatcher-facing judgment aids rather than as hidden backend-only data.

The maintainability rule is:

- raw crew facts remain in the crew-resource fact layers,
- calculated limit/forecast outputs remain in a separate derived layer,
- later field growth or rule growth should extend the calculation layer without forcing a redesign of core crew master data.

#### 10.2.3b Crew-resource data must stay four-layered

For first-stage maintainability, crew-resource data should be kept in four distinct layers:

1. crew master profile fields
2. qualification and role fields
3. operational status fields
4. derived calculation and forecast fields

These layers may be shown together in one module, but they should not be collapsed into one undifferentiated data model.

Recommended direction:

- master profile fields hold stable crew identity and organizational facts,
- qualification and role fields hold eligibility truth,
- operational status fields hold current availability context,
- derived calculation fields hold rolling limits, hour summaries, and forward-looking risk signals.

Future growth should prefer adding fields to the correct layer rather than expanding one large mixed crew record.

#### 10.2.4 Crew status timeline

Crew status timeline is part of the crew-resource closed loop, not part of the task or draft module.

Its first-stage purpose is to maintain crew-side operational context such as:

- standby,
- duty,
- training,
- rest,
- recovery,
- positioning,
- other supported crew-status block types already present in the system.

This loop should support:

- create status block,
- view status blocks,
- update status block,
- delete status block.

It exists to maintain crew availability context before assignment, not to become the main assignment editor.

#### 10.2.5 External work follow-up

External work should no longer remain in the main crew-resource path by default.

At the current stage it overlaps too heavily with crew-status maintenance while still writing to a different backend model that does not feed the same timeline truth.

Current decision:

- remove external work from the main crew-resource navigation path,
- keep the backend `CrewExternalWork` model and APIs temporarily,
- defer the final cleanup decision until later:
  - either map external work into crew-status timeline truth,
  - or retire the separate concept entirely.

### 10.3 Draft rostering module

The draft rostering module owns:

- assigning crew to tasks,
- saving draft roster results,
- viewing current draft assignment,
- clearing draft assignment,
- rolling draft-assigned tasks back to unassigned.

The draft rostering module may read:

- task facts,
- task state,
- current draft roster data,
- lightweight issue summary needed to prevent obviously invalid draft actions.

The draft rostering module may change:

- draft roster facts,
- draft-related task state transitions.

Phase 0 freeze rule:

- preserve current legacy assignment semantics as the working baseline,
- do not redesign role structure during Phase 0,
- do not change candidate-pool business rules during Phase 0,
- remove unstable timeline coupling in Phase 3 instead of patching assignment semantics early.

The draft rostering module should not own:

- task import and deletion policy,
- final publish behavior,
- full issue-processing logic,
- rule-definition logic.

#### 10.2.1 Draft rostering should be a single-task workspace

The first-stage draft rostering module should primarily operate on one task at a time.

This means the module should not begin as:

- a large batch-edit workbench,
- a mixed validation-and-publish console,
- or a timeline-led editing surface.

The recommended first-stage shape is:

- open one task,
- inspect the task context,
- assign or adjust crew,
- save or roll back the draft,
- move to issue handling only when needed.

This keeps the draft workflow understandable and reduces coupling between assignment editing, issue handling, and publish logic.

The existing legacy assignment logic should be treated as the business baseline for this module.

The redesign goal here is:

- preserve the current valid assignment behavior end to end,
- preserve the current role structure and candidate selection behavior,
- preserve current save-draft / clear-draft / read-only lock behavior,
- remove timeline-driven editing and unstable timeline coupling only.

This module should not be redesigned as a new assignment workflow if the legacy business behavior is already correct.

#### 10.2.2 What the draft workspace should show

The first-stage draft workspace should display:

- read-only task summary,
- current runtime-mark summary,
- current draft assignment if one exists,
- assignment slots needed for the task,
- lightweight issue summary related to the draft,
- lightweight audit summary when useful.

For first-stage business correctness, the draft workspace must preserve the currently valid assignment semantics already present in the system:

- required core assignment for `PIC`
- required core assignment for `FO`
- optional additional assignment rows for `RELIEF`
- optional additional assignment rows for `EXTRA`

The first stage must not regress this into a PIC/FO-only model.

The data model may still preserve future extensibility, but that extensibility must be built on top of the current valid business baseline rather than by removing working first-stage roles.

The draft workspace may include read-only contextual references such as timeline views, but such references must remain secondary. They must not become the primary editing model.

#### 10.2.3 First-stage draft actions

The first-stage draft rostering module should support these core actions:

- assign crew into required task slots,
- replace assigned crew,
- remove assigned crew from draft,
- add additional crew rows,
- save draft,
- continue editing an existing draft,
- roll back draft,
- leave draft workspace without publishing.

These actions together form the minimum CRUD-like lifecycle for draft roster data in the first stage.

The module should not directly perform:

- final publish,
- issue-resolution authoring,
- task-fact maintenance such as changing core flight fields.

The first-stage candidate-selection behavior should also follow the current valid business split already present in the system:

- `PIC` candidates come from captain-qualified crew,
- `FO` candidates come from first-officer-qualified crew,
- additional rows may select from the broader additional-candidate pool,
- duplicate use of the same crew member in one task draft is not allowed.

This behavior should be preserved unless business explicitly decides to change it.

#### 10.2.3 Legacy-aligned draft scope

For avoidance of future drift, the first-stage draft rostering module should be considered legacy-aligned in business scope.

That means:

- if the legacy assignment behavior is correct, the redesign should copy it,
- if the timeline presentation around it is unstable, only the timeline coupling should be removed,
- business changes to assignment semantics should happen only when explicitly requested, not as a side effect of architecture cleanup.

#### 10.2.4 One active draft per task in the first stage

For first-stage maintainability, a task should have one active current draft roster result.

The recommended first-stage rule is:

- saving draft updates the current active draft for that task,
- continuing draft reopens that same active draft,
- rolling back draft clears the active draft result and returns workflow safely toward task-level waiting state.

This avoids introducing multi-version draft branching too early.

If draft history needs to be preserved, it should be preserved through audit/history records rather than through multiple simultaneously active draft versions.

#### 10.2.5 Draft action gating rules

The first-stage draft module should distinguish between:

- conditions that block draft editing itself,
- conditions that allow draft editing but block later publish.

Recommended direction:

- workflow-breaking runtime marks such as `CANCELLED` should block draft editing actions,
- workflow-interrupting marks such as `TIMING_CHANGED` may allow the existing draft to remain visible, but should still prevent the draft from being treated as ready for publish,
- issue presence should not automatically block saving draft unless the issue is of a type that makes the draft structurally invalid.

This distinction is important for maintainability because it prevents the system from treating every warning or review requirement as a full editing lock.

#### 10.2.6 Draft module outputs to later modules

The draft rostering module should output:

- current draft assignment facts,
- draft audit trail,
- whether draft exists,
- whether draft editing remains allowed,
- lightweight issue summary for downstream handling.

The issue-handling module should consume these outputs instead of recomputing draft truth from scratch.

The publish-result module should consume cleared and valid draft outputs instead of reaching back into task editing behavior.

### 10.4 Issue-handling module

The issue-handling module owns:

- viewing the issue list,
- distinguishing blocking and non-blocking issues,
- manual confirmation actions,
- lightweight resolution actions that clear issues without changing the whole workflow structure.

The issue-handling module may read:

- task facts,
- draft roster facts,
- issue records,
- source metadata,
- summary state needed to explain why workflow is blocked.

The issue-handling module may change:

- issue records,
- confirmation records,
- workflow readiness flags that depend on issue clearance.

The issue-handling module should not own:

- task creation/import CRUD,
- core draft assignment editing,
- final publish-result presentation structure,
- timeline-specific rendering behavior.

### 10.5 Publish-result module

The publish-result module owns:

- internal publish action,
- publish result page,
- flight-oriented published result view,
- crew-oriented published result view,
- Excel export.

The publish-result module may read:

- task facts,
- cleared draft roster facts,
- issue state,
- publish version/result records.

The publish-result module may change:

- formal publish result records,
- publish version metadata,
- export artifacts.

The publish-result module should not own:

- task-source data maintenance,
- crew assignment editing,
- issue-resolution authoring beyond publish gating,
- rule-definition logic.

## 11. Source Data Maps

This redesign should treat source data structure as an explicit planning artifact rather than as an implementation detail.

The current planning baseline has two primary source domains:

1. flight-task data
2. crew-resource data

All later workflow modules should consume these two source domains through stable backend models instead of rebuilding facts page by page.

### 11.1 Flight-task data map

Flight-task data should be divided into three layers:

1. master task fields
2. runtime fact fields
3. derived workflow fields

#### 11.1.1 Flight-task master fields

These are the stable base facts that define the task itself:

- `id`
- `batchId`
- `taskCode`
- `taskType`
- `titleZh`
- `titleEn`
- `departureAirport`
- `arrivalAirport`
- `scheduledStartUtc`
- `scheduledEndUtc`
- `sectorCount`
- `aircraftType`
- `aircraftNo`
- `requiredCrewPattern`
- `sourceType`
- `sourceSystem`
- `sourceLegId`

These fields belong to task-fact ownership and should be editable only through the task module or controlled import paths.

Reference-data rule:

- route, airport, and aircraft master data should be maintained in the run-data module,
- task creation and task editing may consume those values through selection and controlled autofill,
- current first-stage closure now concretely uses:
  - route selection to drive departure/arrival autofill,
  - aircraft-number selection to drive aircraft-type autofill,
  - simple task-side CRUD without yet requiring a heavier explicit reference-key redesign,
- reference data may be created, edited, and physically deleted when it is not referenced by any existing task,
- once a reference record is already in use by existing tasks, it must not be physically deleted or changed in a way that breaks the task reference chain,
- first-stage implementation should not introduce a separate disable/inactive workflow here; it should keep one clear deletion rule:
  - unreferenced reference data may be physically deleted,
  - referenced reference data may not be physically deleted.

Deferred follow-ups for later reference-driven task entry:

- add explicit task-side reference keys such as `routeId` and stable aircraft reference fields instead of relying only on copied text values,
- keep task-side snapshot fields such as departure airport, arrival airport, and aircraft type so historical task truth does not drift when run-data records change later,
- decide one primary aircraft selector (preferred: aircraft number) and derive the secondary aircraft fields from it,
- define a controlled auto-fill rule for scheduled end time based on route duration and whether later manual override should suppress recalculation,
- extend backend delete-protection checks across the full reference chain rather than relying only on frontend button hiding.

These are intentionally deferred. They should not block the first closed-loop implementation of flight-task creation and maintenance.

#### 11.1.2 Flight-task runtime fact fields

These are operational facts that may later affect workflow but are not the same thing as workflow state:

- `sourceStatus`
- runtime marks such as `CANCELLED`
- runtime marks such as `TIMING_CHANGED`

Future runtime facts may grow here, but they should stay separate from master task fields and from workflow state.

#### 11.1.3 Flight-task derived workflow fields

These are backend-derived fields used by later modules:

- task workflow status
- whether draft exists
- whether task editing is allowed
- whether draft editing is allowed
- whether publish is allowed
- action flags for task detail

These derived fields should not be the source of truth for task facts. They should be produced from task facts, draft facts, issue facts, and runtime facts.

### 11.2 Crew-resource data map

Crew-resource data should remain four-layered:

1. crew master profile fields
2. qualification and role fields
3. operational status fields
4. derived calculation and forecast fields

The crew information surface should also remain explicitly split into four stable parts so later field growth can be absorbed without redesigning the whole page:

1. personnel profile
2. qualifications and licenses
3. hours and limits
4. duty calendar

#### 11.2.1 Crew master profile fields

These are the stable identity and organizational facts for a crew member:

- `id`
- `crewCode`
- `employeeNo`
- `nameZh`
- `nameEn`
- `homeBase`
- `status`

These fields should stay relatively stable and should not absorb rolling calculations or status-block logic.

Implementation rule:

- do not pre-create large numbers of speculative future fields in the profile model just to “reserve them”,
- reserve maintainability by keeping the four-part split stable,
- add later fields into the correct part when the business meaning is known,
- avoid forcing future field growth back into one overloaded crew record form.

For the current code baseline, the personnel-profile surface should treat these as the first stable profile core:

- `crewCode`
- `employeeNo`
- `nameZh`
- `nameEn`
- `homeBase`
- `status`

The following currently exist in the same entity but should be treated as split-sensitive fields rather than permanent core-profile fields:

- `roleCode`
- `rankCode`
- `aircraftQualification`
- `acclimatizationStatus`
- `bodyClockTimezone`
- `normalCommuteMinutes`
- `externalEmploymentFlag`
- `availabilityStatus`

The following must remain derived judgment fields, not ordinary profile maintenance fields:

- `rollingFlightHours28d`
- `rollingDutyHours28d`
- `rollingDutyHours7d`
- `rollingDutyHours14d`
- `rollingFlightHours12m`
- `latestActualFdpHours`
- `latestActualFdpSource`

The hours-and-limits surface should consume these values as backend-derived judgment aids.

It should not become a first-stage calculation owner itself.

Future enhancements should prefer expanding backend-derived outputs rather than pushing rolling-hour or FDP logic into the page layer.

#### 11.2.2 Crew qualification and role fields

These fields define assignment eligibility:

- `roleCode`
- `rankCode`
- `aircraftQualification`
- `qualificationType`
- `qualificationCode`
- `effectiveFromUtc`
- `effectiveToUtc`
- qualification `status`

These fields should remain the source for candidate-pool truth in draft rostering.

#### 11.2.3 Crew operational status fields

These fields define current operational availability context:

- `availabilityStatus`
- crew status timeline blocks
- crew external-work records

This layer should capture what is currently affecting availability without collapsing that context into one flat crew profile row.

#### 11.2.4 Crew derived calculation and forecast fields

These fields support dispatcher pre-judgment and should stay in a separate derived layer:

- `rollingFlightHours28d`
- `rollingDutyHours28d`
- `rollingDutyHours7d`
- `rollingDutyHours14d`
- `rollingFlightHours12m`
- `latestActualFdpHours`
- `latestActualFdpSource`

Future calculation growth should extend this layer rather than forcing new fields into the crew master profile layer.

## 12. Phased Execution Order

The redesign should move forward through a small number of explicit phases. Each phase must produce a stable, reviewable checkpoint before the next phase begins.

### 12.1 Phase 0: Freeze and boundary cleanup

Goal:

- stop ad hoc behavioral changes in legacy timeline-driven workflow
- preserve the current planning baseline
- make redesign boundaries explicit

Required outcomes:

- legacy paths remain isolated
- current master plan remains the active source of truth
- no new business meaning is added to the legacy timeline

### 12.1a Phase 0 execution focus

Phase 0 is a boundary-freeze stage, not a behavior-redesign stage.

During Phase 0:

- freeze legacy timeline as a display-first surface,
- freeze legacy assignment semantics as the draft baseline,
- prevent new workflow meaning from being invented in UI state,
- avoid broad refactors outside boundary cleanup and explicit documentation.

### 12.2 Phase 1: Flight-task module stabilization

Goal:

- make flight-task facts manageable without depending on legacy timeline behavior

Scope:

- task list
- task detail
- create/import/update/cancel flows
- task-module action gating

Completion gate:

- flight-task closed loop works without relying on legacy workbench state guessing

### 12.2a Phase 1 execution focus

Phase 1 should stabilize the flight-task module as a standalone fact-management surface.

Current implementation baseline:

- backend task CRUD already exists in `TaskPlanController`,
- frontend task editing already exists inside `FlightOperationsPage`,
- current page mixes flight tasks with routes, airports, and aircraft registries.

Phase 1 should:

- keep `TaskPlanItem` CRUD as the initial backend baseline,
- preserve current create, update, and cancel behavior unless it conflicts with explicit boundary rules,
- separate task-module scope from route, airport, and aircraft master-data scope,
- treat route / airport / aircraft maintenance as reference-data ownership outside the task module,
- allow reference data to be created, edited, and disabled only when the change does not break existing task references,
- avoid reintroducing timeline-derived workflow meaning into task list or task detail.
- remove old hidden `task-plan` route entry points from the active main-path route table.

Phase 1 should not:

- redesign draft assignment behavior,
- move route management into the task closed loop,
- move aircraft registry into the task closed loop,
- move airport-timezone administration into the task closed loop.

Current closure snapshot:

- the main visible task entry is the dedicated `flight-plan` route and page,
- `FlightOperationsPage` no longer acts as the primary task-module host,
- active main-path task CRUD is separated from legacy timeline/workbench entry points,
- non-editable tasks remain viewable from the task side through read-only detail,
- backend protects task maintenance from rewriting draft-assigned and published workflow meaning.

### 12.3 Phase 2: Crew-resource module stabilization

Goal:

- make crew facts, qualification facts, status facts, and forecast facts trustworthy before assignment work begins

Scope:

- crew information
- qualification and role facts
- crew status timeline
- existing crew forecast/calculation fields

Completion gate:

- draft rostering can read crew-side truth from the crew-resource module instead of from legacy page-local assembly

### 12.3a Phase 2 execution focus

Phase 2 should stabilize the crew-resource module as the second standalone fact-management surface.

Current implementation baseline:

- frontend crew pages already exist, but are still embedded inside the large mixed `Pages.tsx` file,
- backend crew APIs already exist for crew members, qualifications, and crew-status blocks; separate external-work APIs still exist as temporary residue,
- existing crew limit and forecast fields already exist and should be preserved.

Phase 2 should:

- keep current crew CRUD and supporting APIs as the initial backend baseline,
- separate crew-resource UI and helper logic from the mixed page file,
- preserve the four-layer model already agreed for crew data:
  - master profile
  - qualification and role
  - operational status
  - derived calculation and forecast
- keep current rolling-hours and FDP-related dispatcher judgment fields visible,
- avoid redesigning assignment semantics while crew-resource truth is being stabilized.

Current Phase 2 progress:

- the route entry already goes through a dedicated `CrewStatusPage` dispatcher file,
- `CrewInformationPage` is already extracted into its own file and is the active route target,
- `CrewStatusTimelinePage` is already extracted into its own file and is the active route target,
- external work has been removed from the main crew-resource path and is now treated as a deferred cleanup decision rather than a primary module surface,
- old duplicate implementations inside the mixed page host are now temporary extraction residue and can be removed in a later cleanup step after behavior verification,
- the four `CrewInformationPage` domains now also exist as separate section files:
  - `CrewProfileSection.tsx`
  - `CrewQualificationSection.tsx`
  - `CrewLimitsSection.tsx`
  - `CrewDutyCalendarSection.tsx`
  so future field growth no longer needs to accumulate inside one tab-heavy page body.

Phase 2 should not:

- redesign draft rostering behavior,
- move crew-resource logic back into timeline-driven workflow,
- replace the current calculation model with a new rule engine,
- merge crew-resource facts back into task-module pages.

### 12.4 Phase 3: Draft rostering migration

Goal:

- keep the correct legacy assignment behavior while detaching it from unstable timeline coupling

Scope:

- preserve current role semantics: `PIC`, `FO`, `RELIEF`, `EXTRA`
- preserve current save-draft / clear-draft / candidate-pool behavior
- remove timeline-driven editing responsibility

Completion gate:

- draft rostering closed loop works from task facts and crew facts without requiring legacy timeline-derived truth

### 12.5 Phase 4: Timeline downgrade to display adapter

Goal:

- convert timeline into an official-capability display layer only

Scope:

- items/groups display
- colors and labels
- click-through navigation
- window and zoom behavior

Out of scope:

- workflow-state authorship
- direct business editing
- page-local truth inference

Completion gate:

- timeline only consumes backend truth and no longer generates business truth

### 12.6 Phase 5: Issue-handling and publish replacement

Goal:

- complete the new downstream workflow after upstream facts and draft behavior are already stable

Scope:

- issue list
- manual confirmation
- publish result page
- Excel export

Completion gate:

- end-to-end closed loop works as:
  - task
  - crew
  - draft
  - issues
  - publish

### 12.7 Cross-phase execution rules

These rules apply to every phase:

- a later phase must not redefine upstream source facts casually
- frontend modules must not reconstruct truth from legacy timeline state
- button visibility and workflow actions should continue to come from backend view models
- if a new phase requires page-local state guessing, the upstream boundary is not clean enough and should be corrected first

## 13. Minimal physical-delete rules

Current implementation baseline:

- `delete` always means physical deletion
- `cancel` is a separate business action and must not be conflated with delete

### 13.1 Flight-plan tasks

- tasks may be physically deleted only while they have not entered downstream flow
- current minimal safe rule:
  - `UNASSIGNED` tasks may be physically deleted
  - `ASSIGNED_DRAFT`, `PUBLISHED`, `CANCELLED`, or any task blocked by downstream foreign-key references may not be physically deleted

### 13.2 Operations master data

- routes may be physically deleted only when no flight-plan task references the same departure/arrival pair
- aircraft may be physically deleted only when no flight-plan task references the same aircraft number
- airports may be physically deleted only when they are not referenced by:
  - flight routes
  - aircraft base airport
  - flight-plan task departure/arrival fields
- referenced operations-master-data records are also not editable in the first-stage closed loop

### 13.3 No disable/soft-delete expansion in current closure

- the current closure intentionally does not introduce an additional disable/deactivate workflow for these delete paths
- if an object is referenced, delete is rejected
- if it is not referenced, delete is physical

### 13.4 Current split status of run-data maintenance

- frontend run-data maintenance is now split into three section files:
  - `RouteMaintenanceSection.tsx`
  - `AirportMaintenanceSection.tsx`
  - `AircraftMaintenanceSection.tsx`
- backend run-data maintenance is now split by controller responsibility:
  - `FlightRouteController`
  - `AirportDictionaryController`
  - `AircraftRegistryController`
