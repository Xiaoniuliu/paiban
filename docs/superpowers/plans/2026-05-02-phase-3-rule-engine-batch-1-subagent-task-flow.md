# Phase 3 Rule Engine Batch 1 Subagent Task Flow

> **Execution mode:** Use `superpowers:subagent-driven-development`. One fresh implementer subagent per task. After each task: spec-compliance review, then code-quality review, then move on.

**Goal:** Execute the first Phase 3 rules-engine batch in a stable order, starting from derived facts and ending in UI/read-model consumption.

**Run targets:**

- Frontend: `http://127.0.0.1:5180`
- Backend: `http://127.0.0.1:8088`

---

## Flow Principles

- Do not start with rule predicates before derived facts exist.
- Do not let frontend own any core calculation.
- Keep `OPERATIONAL_GATE` out of this batch unless a task explicitly needs them as prerequisites.
- `RG-DDO-004` is not in the same readiness bucket as the rest of DDO. Treat it as an extension task.
- `RG-FDP-008` and `RG-REST-008` are chain-rule tasks, not Tier-1 baseline tasks.
- Use one public derived-fact facade, but keep domain fact builders separate internally.
  - Public facade: `RuleDerivedFactService`
  - HOUR internals: `CrewHourFactBuilder`
  - DDO internals: `DdoFactBuilder`
  - FDP/REST internals: `FdpRestFactBuilder`
- Keep DDO separate from HOUR/FDP internals because it needs local-night semantics, continuous-DDO spans, day-7 positioning context, and eventually historical DDO cycles.

---

## Task Flow

### Flow 0: Plan Lock And Baseline Review

**Owner:** controller only  
**Output:** scope frozen before implementation

- Confirm implementation plan: [2026-05-02-phase-3-rule-engine-batch-1-plan.md](/D:/paiban2/docs/superpowers/plans/2026-05-02-phase-3-rule-engine-batch-1-plan.md)
- Keep checklist nearby: [2026-05-01-p0-canonical-execution-checklist.md](/D:/paiban2/docs/superpowers/plans/2026-05-01-p0-canonical-execution-checklist.md)
- Freeze Batch 1 scope:
  - `HOUR`: `RG-HOUR-001/002/003/006/007`
  - `DDO core`: `RG-BASE-008`, `RG-DDO-001/002/003`
  - `FDP/REST Tier 1`: `RG-FDP-006`, `RG-REST-004`
- Freeze deferred scope:
  - `DDO historical extension`: `RG-DDO-004`
  - `FDP/REST Tier 1.5`: `RG-FDP-008`, `RG-REST-008`

---

### Flow 1: Derived Fact Backbone

**Owner:** implementer subagent 1  
**Files:** backend rule/fact layer only

**Why first:** everything else depends on this.

**Maintainability-first proposal:**

- Expose exactly one public facade for other backend modules: `RuleDerivedFactService`.
- Keep `RuleDerivedFactService` orchestration-only: it should gather source data, delegate domain calculations, and return one immutable `RuleDerivedFacts` snapshot.
- Keep calculation ownership split by rule family:
  - `CrewHourFactBuilder` owns rolling duty/flight windows and HOUR calculation-method facts.
  - `DdoFactBuilder` owns DDO unit validity, local-night counting, continuous DDO span, day-7 positioning, and future historical DDO cycle inputs.
  - `FdpRestFactBuilder` owns FDP table lookup inputs, prior-duty context, rest-local-night facts, and future reduced-rest chain facts.
- Do not let builders emit rule hits. Builders produce typed facts only; `RuleEvaluationService` remains the predicate and violation-hit owner.
- Do not let UI or read models recompute these facts. They should consume service/read-model outputs backed by the same fact snapshot.
- Start with a behavior-neutral skeleton if needed: typed records, empty immutable maps, and no evaluator wiring until tests define the first algorithms.

**DDO placement decision:**

- Publicly, DDO belongs behind the same `RuleDerivedFactService` facade so rule evaluation, crew read models, and issue surfaces have one source of derived truth.
- Internally, DDO should stay separate from HOUR and FDP/REST because its invariants are sequence and calendar-context heavy: local-night semantics, continuous-DDO spans, day-7 positioning, and later historical DDO cycles.
- Folding DDO into HOUR or FDP/REST would make the first implementation look smaller, but it would couple unrelated time-window math to DDO-specific sequence rules and make `RG-DDO-004` harder to add cleanly.
- Splitting DDO internally also lets Flow 4 add `RG-BASE-008` and `RG-DDO-001/002/003` without forcing premature historical-window approximations for `RG-DDO-004`.

**Deliverables:**

- `RuleDerivedFactService` as the single public facade consumed by rule evaluation and read models
- `RuleDerivedFacts` as the single immutable batch snapshot returned by the facade
- `CrewHourFactBuilder` for rolling hour facts
- `DdoFactBuilder` for DDO/local-night/day-sequence facts
- `FdpRestFactBuilder` for FDP/rest facts
- fact snapshots for:
  - crew hour totals
  - DDO facts
  - FDP/rest facts

**Must settle in this task:**

- DDO fact semantics:
  - valid DDO unit
  - local-night counting basis
  - whether rest contributes to continuous DDO span
- reduced-rest fact semantics:
  - what counts as reduced rest
  - what counts as `special_assessment_passed`

**Review gate:**

- spec review confirms no rule predicates are embedded prematurely
- quality review confirms facts are typed and reusable

---

### Flow 2: Crew Hours And Limits Snapshot

**Owner:** implementer subagent 2  
**Files:** backend crew read-model + frontend crew limits tab

**Why second:** `HOUR` rules and crew info both need the same facts.

**Deliverables:**

- backend contract for current/limit snapshots
- frontend `CrewLimitsSection` reading backend-derived values
- no calculation moved into React

**Visible outcome:**

- crew info `小时与限制` tab shows trustworthy values and limits

**Review gate:**

- spec review confirms page structure remains unchanged
- quality review confirms backend is the only calculation owner

---

### Flow 3: HOUR Evaluation Rules

**Owner:** implementer subagent 3  
**Files:** backend rule evaluator + tests

**Rules in scope:**

- `RG-HOUR-001`
- `RG-HOUR-002`
- `RG-HOUR-003`
- `RG-HOUR-006`
- `RG-HOUR-007`

**Dependency note:**

Before these fire, the fact layer must already account for:

- `RG-HOUR-008`
- `RG-HOUR-009`
- `RG-HOUR-010`
- `RG-HOUR-011`

These remain `CALCULATION_METHOD`, but they are part of the real technical dependency chain.

**Visible outcome:**

- evaluator emits hour-rule hits from fact-backed totals
- publish path and rule center can consume them

**Review gate:**

- spec review confirms only `P0 + EVALUATION_RULE` targets were added
- quality review confirms no global severity-counting regression

---

### Flow 4: DDO Core Rules

**Owner:** implementer subagent 4  
**Files:** backend fact layer + evaluator + tests

**Rules in scope:**

- `RG-BASE-008`
- `RG-DDO-001`
- `RG-DDO-002`
- `RG-DDO-003`

**Explicitly not required in this flow:**

- `RG-DDO-004`

**Why split it:** `RG-DDO-004` needs a stronger historical-window source of truth and should not slow down the DDO core slice.

**Visible outcome:**

- DDO-related P0 hits stop being “34h only”
- DDO sequence rules become executable for latest-roster validation

**Review gate:**

- spec review confirms `RG-DDO-004` did not sneak in as a weak approximation
- quality review confirms local-night and continuous-span logic are explicit and test-backed

---

### Flow 5: FDP/REST Tier 1

**Owner:** implementer subagent 5  
**Files:** backend fact layer + evaluator + tests

**Rules in scope:**

- `RG-FDP-006`
- `RG-REST-004`

**Required supporting methods/facts:**

- `RG-FDP-001`
- `RG-FDP-002`
- `allowable_fdp_minutes`
- `start_band`
- `preceding_rest_band`
- `previous_duty_minutes`
- `rest_local_nights`

**Visible outcome:**

- baseline FDP limit and rest-local-night rule become executable

**Review gate:**

- spec review confirms `RG-FDP-004/005` are still treated as gates, not as evaluation-rule deliverables
- quality review confirms Table A/B lookup and local-night logic are isolated from predicate code

---

### Flow 6: Rule Center And Issue Read Models

**Owner:** implementer subagent 6  
**Files:** backend read models + rule center frontend + issue UI + e2e

**Why here:** only after Batch-1 hits are real do we wire the surfaces.

**Deliverables:**

- rule center displays batch-one hits cleanly
- issue handling displays batch-one hits without changing workflow ownership
- crew limits and rule hits align with the same backend facts

**Review gate:**

- spec review confirms no new workflow side effects were introduced
- quality review confirms UI is only reading, not deriving

---

### Flow 7: DDO Historical Extension

**Owner:** implementer subagent 7  
**Start only if:** DDO history source-of-truth is agreed

**Rule in scope:**

- `RG-DDO-004`

**Risk:** this is the first slice that likely needs stronger historical persistence or auditable cycle aggregation beyond latest-roster-only derivation.

---

### Flow 8: FDP/REST Tier 1.5 Chain Rules

**Owner:** implementer subagent 8  
**Start only if:** reduced-rest and extended-FDP chain facts are real

**Rules in scope:**

- `RG-FDP-008`
- `RG-REST-008`

**Risk:** these are chain-state rules, not simple threshold checks.

---

## Suggested Execution Order

1. Flow 1: Derived Fact Backbone  
2. Flow 2: Crew Hours And Limits Snapshot  
3. Flow 3: HOUR Evaluation Rules  
4. Flow 4: DDO Core Rules  
5. Flow 5: FDP/REST Tier 1  
6. Flow 6: Rule Center And Issue Read Models  
7. Flow 7: DDO Historical Extension  
8. Flow 8: FDP/REST Tier 1.5 Chain Rules

---

## Controller Checklist

- After each flow, stop and run spec-compliance review first.
- Do not start code-quality review until spec-compliance review is green.
- Do not dispatch parallel implementers against overlapping files.
- Use the running frontend/backend to sanity-check real UI surfaces between flows.
- Update [2026-05-01-p0-canonical-execution-checklist.md](/D:/paiban2/docs/superpowers/plans/2026-05-01-p0-canonical-execution-checklist.md) only after the corresponding flow lands.
