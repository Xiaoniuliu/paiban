# Phase 3 Rule Engine Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable Phase 3 rule-engine batch around `P0 + EVALUATION_RULE` items, starting with `HOUR`, `DDO`, and `FDP/REST` while keeping `OPERATIONAL_GATE` rules out of the evaluation batch.

**Architecture:** Keep `CALCULATION_METHOD` and `EVALUATION_RULE` separate. Batch 1 starts by producing backend-owned derived facts, then reuses those facts in `RuleEvaluationService`, then exposes the same numbers in crew info and rule/issue views so UI and blocking logic read from one source.

**Tech Stack:** Spring Boot, JdbcTemplate/JPA, React, TypeScript, Playwright, JUnit integration tests

---

## Scope Lock

**Batch 1 groups**

- `HOUR rolling`
  - `RG-HOUR-001`
  - `RG-HOUR-002`
  - `RG-HOUR-003`
  - `RG-HOUR-006`
  - `RG-HOUR-007`
- `DDO`
  - `RG-BASE-008`
  - `RG-DDO-001`
  - `RG-DDO-002`
  - `RG-DDO-003`
- `DDO` historical extension
  - `RG-DDO-004`
- `FDP/REST`
  - Tier 1
    - `RG-FDP-006`
    - `RG-REST-004`
  - Tier 1.5
    - `RG-FDP-008`
    - `RG-REST-008`

**Explicitly out of scope for Batch 1**

- `OPERATIONAL_GATE` rules such as `RG-FDP-003`, `RG-FDP-004`, `RG-FDP-005`, `RG-TIME-008`
- `EXT` rules that depend on relief/facility facts not yet modeled (`RG-EXT-001`, `RG-EXT-011`)
- `RG-POS-010` until `DDO` day-sequence facts are stable
- global publish-severity remapping

---

## File Structure

**Backend rules and facts**

- Create: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java`
  - Owns reusable derived facts for `HOUR`, `DDO`, and `FDP/REST`
- Create: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java`
  - Typed fact container returned by `RuleDerivedFactService`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
  - Replace one-off Phase 3 foundation checks with fact-backed evaluation rules
- Modify: `apps/api/src/main/java/com/pilotroster/workbench/ValidationPublishService.java`
  - Keep current blocking semantics stable while accepting new rule hits

**Backend source data and read contracts**

- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
  - Expose crew hours/limits from derived facts instead of treating entity fields as the final source of truth
- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMember.java`
  - Preserve compatibility fields for now; do not expand it into a rules engine
- Modify: `apps/api/src/main/java/com/pilotroster/task/TaskPlanItem.java`
  - Only if new factual inputs are missing from the task model
- Modify: `apps/api/src/main/java/com/pilotroster/timeline/TimelineBlock.java`
  - Only if DDO/rest chain facts cannot be derived from existing block data

**Frontend**

- Modify: `apps/web/src/app/types.ts`
  - Add any new crew limits snapshot fields or rule-hit evidence fields
- Modify: `apps/web/src/app/pages/CrewLimitsSection.tsx`
  - Replace static limit assumptions with backend-derived current/limit pairs where needed
- Modify: `apps/web/src/app/pages/CrewInformationPage.tsx`
  - Keep the current tab structure, only switch the data contract
- Modify: `apps/web/src/app/pages/RuleCenterPages.tsx`
  - Surface new evaluation hits without changing the overall information architecture
- Modify: `apps/web/src/app/pages/ruleCenterSupport.tsx`
  - Keep rule detail helpers aligned with new fact-backed hits
- Modify: `apps/web/src/app/i18n.ts`
  - Add labels for new hours/limits or fact-status strings

**Tests**

- Create: `apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java`
  - Batch-1 fact and evaluation scenarios
- Modify: `apps/api/src/test/java/com/pilotroster/rule/RuleCatalogIntegrationTests.java`
  - Assert catalog metadata still marks the right rules as `EVALUATION_RULE`
- Modify: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`
  - Verify new `P0` hits appear without widening unrelated blocking behavior
- Modify: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`
  - Verify crew limits payloads
- Modify: `apps/web/e2e/framework.spec.ts`
  - Real-click coverage for crew limits and rule hit visibility

**Docs**

- Modify: `docs/superpowers/plans/2026-05-01-p0-canonical-execution-checklist.md`
  - Mark batch-1 decisions after implementation lands
- Modify: `docs/archive/legacy-plans/PHASE3_RULE_ENGINE_CLASSIFICATION.md`
  - Only if wording must be tightened to match final implemented algorithm names

---

### Task 1: Fact Backbone For Batch 1

**Files:**
- Create: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java`
- Create: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java`
- Test: `apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java`

- [ ] **Step 1: Write failing integration tests for reusable fact snapshots**

Add scenarios that prove the backend can derive:

- `rolling_7d_duty_minutes`
- `rolling_14d_duty_minutes`
- `rolling_28d_duty_minutes`
- `rolling_28d_flight_minutes`
- `rolling_12m_to_prev_month_flight_minutes`
- `ddo_minutes`
- `local_nights`
- `consecutive_duty_days`
- `consecutive_ddo_after`
- `allowable_fdp_minutes`
- `previous_duty_minutes`
- `rest_local_nights`

- [ ] **Step 2: Run the new backend test slice and confirm it fails**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests" test
```

Expected: FAIL because the fact service and scenarios do not exist yet.

- [ ] **Step 3: Implement the derived fact contract**

Create a focused fact model, for example:

```java
public record RuleDerivedFacts(
    Map<Long, CrewHourSnapshot> crewHoursByCrewId,
    Map<Long, DdoSnapshot> ddoByBlockId,
    Map<Long, FdpSnapshot> fdpByTaskId,
    Map<Long, RestSnapshot> restByCrewId
) {}
```

And a service entry point:

```java
public RuleDerivedFacts buildLatestRosterFacts(Long rosterVersionId) { ... }
```

- [ ] **Step 3.5: Lock the DDO and reduced-rest fact semantics before broad rule coding**

Write the implementation-facing fact notes directly into the plan branch or adjacent engineering notes before coding:

- what counts as one valid DDO unit
- how `local_nights` are counted
- whether rest can count toward a continuous DDO span
- what history source is acceptable for `RG-DDO-004`
- what fact proves `special_assessment_passed` for reduced-rest follow-up rules

- [ ] **Step 4: Re-run the backend fact tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests" test
```

Expected: PASS for the fact-only scenarios.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java
git commit -m "feat: add batch-one rule derived fact backbone"
```

### Task 2: Crew Hours And Limits Snapshot

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMember.java`
- Modify: `apps/web/src/app/types.ts`
- Modify: `apps/web/src/app/pages/CrewLimitsSection.tsx`
- Modify: `apps/web/src/app/pages/CrewInformationPage.tsx`
- Test: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`
- Test: `apps/web/e2e/framework.spec.ts`

- [ ] **Step 1: Write failing tests for crew limits payload and UI rendering**

Cover:

- backend returns current values plus limits for `7d duty`, `14d duty`, `28d duty`, `28d flight`, `12m flight`
- frontend renders those values in the `crewLimitsTab`
- existing `latestActualFdpHours` behavior remains visible

- [ ] **Step 2: Run targeted backend and frontend tests to confirm failure**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=CrewMemberControllerIntegrationTests" test
npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "crew limits"
```

Expected: FAIL because the new snapshot contract is not wired.

- [ ] **Step 3: Implement the snapshot contract without making `CrewMember` the engine**

Keep the entity compatibility fields for now, but have the controller build a derived read payload such as:

```java
record CrewLimitSnapshotResponse(
    BigDecimal currentValueHours,
    BigDecimal limitValueHours,
    String sourceRuleId
) {}
```

Use `RuleDerivedFactService` as the source of truth for rolling-hour values.

- [ ] **Step 4: Update the crew limits frontend to consume derived current/limit pairs**

Keep the page structure intact. Replace hard-coded assumptions in `CrewLimitsSection.tsx` where the backend can now provide authoritative limit values.

- [ ] **Step 5: Re-run the targeted tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=CrewMemberControllerIntegrationTests" test
npm run build
npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "crew limits"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java apps/api/src/main/java/com/pilotroster/crew/CrewMember.java apps/web/src/app/types.ts apps/web/src/app/pages/CrewLimitsSection.tsx apps/web/src/app/pages/CrewInformationPage.tsx apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java apps/web/e2e/framework.spec.ts
git commit -m "feat: expose derived crew hours and limits snapshot"
```

### Task 3: HOUR Rolling P0 Evaluation Rules

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`
- Modify: `apps/api/src/test/java/com/pilotroster/rule/RuleCatalogIntegrationTests.java`
- Test: `apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java`

- [ ] **Step 1: Write failing tests for `RG-HOUR-001/002/003/006/007`**

Each test should set up a roster or crew-hour snapshot that breaches one threshold and assert:

- the expected `ruleId`
- `severity = BLOCK`
- evidence points back to the affected crew/task window

- [ ] **Step 2: Run the HOUR test slice and confirm failure**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests,RuleCatalogIntegrationTests" test
```

Expected: FAIL because the rules are not emitted yet.

- [ ] **Step 3: Implement HOUR rule emission in `RuleEvaluationService`**

Before emitting the `P0` hour rules, make sure the supporting calculation methods are represented in the fact layer:

- `RG-HOUR-008`
- `RG-HOUR-009`
- `RG-HOUR-010`
- `RG-HOUR-011`

Use fact-backed comparisons such as:

```java
if (snapshot.rollingDutyHours7d().compareTo(BigDecimal.valueOf(55)) > 0) {
    hits.add(... "RG-HOUR-003" ...);
}
```

Keep blocking semantics local to these new `P0 + EVALUATION_RULE` items. Do not change how unrelated `NON_COMPLIANT` rules are counted.

- [ ] **Step 4: Re-run the HOUR backend suite**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests,RuleCatalogIntegrationTests" test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java apps/api/src/test/java/com/pilotroster/rule/RuleCatalogIntegrationTests.java
git commit -m "feat: add hour rolling p0 evaluation rules"
```

### Task 4: DDO P0 Evaluation Rules

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Test: `apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java`
- Test: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`

- [ ] **Step 1: Write failing tests for `RG-BASE-008` and `RG-DDO-001/002/003/004`**

Cover:

- `34h` DDO minimum
- `local_nights` shortfall
- `consecutive_duty_days > 6`
- day-7 return-base sequence
- rolling 14-day two-DDO requirement
- three-cycle four-week average

- [ ] **Step 2: Run the DDO test slice to confirm failure**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests" test
```

Expected: FAIL because the DDO sequences are not derived yet.

- [ ] **Step 3: Implement DDO sequences and rule emission**

Add focused snapshots and checks such as:

```java
record DdoSnapshot(
    long ddoMinutes,
    int localNights,
    int consecutiveDutyDays,
    boolean day7ReturnBase,
    int consecutiveDdoAfter
) {}
```

Use those facts to emit `RG-BASE-008` and the `RG-DDO-*` family.

- [ ] **Step 3.5: Keep `RG-DDO-004` behind a separate readiness check**

Only implement `RG-DDO-004` in this task if the agreed history source is available and auditable. Otherwise:

- finish `RG-BASE-008`
- finish `RG-DDO-001`
- finish `RG-DDO-002`
- finish `RG-DDO-003`
- leave `RG-DDO-004` tracked as the next historical-window slice

- [ ] **Step 4: Re-run the DDO backend suite**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests" test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java
git commit -m "feat: add ddo p0 evaluation rules"
```

### Task 5: FDP/REST Tier 1

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Test: `apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java`
- Test: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`

- [ ] **Step 1: Write failing tests for `RG-FDP-006` and `RG-REST-004`**

Cover:

- `RG-FDP-006` with Table A and Table B backed `allowable_fdp_minutes`
- `RG-REST-004` with `previous_duty_minutes` and `rest_local_nights`
- gate preconditions `RG-FDP-004` and `RG-FDP-005` only as setup requirements, not as evaluation-rule targets

- [ ] **Step 2: Run the FDP/REST Tier 1 test slice and confirm failure**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests" test
```

Expected: FAIL because `allowable_fdp_minutes` and `rest_local_nights` are not yet derived.

- [ ] **Step 3: Implement Tier 1 derivations and checks**

Support facts:

```java
allowable_fdp_minutes = table_a_or_b_lookup(...);
rest_local_nights = localNightCounter(...);
```

Then emit:

```java
RG-FDP-006
RG-REST-004
```

- [ ] **Step 4: Re-run the FDP/REST Tier 1 suite**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests" test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java
git commit -m "feat: add fdp rest tier-one p0 rules"
```

### Task 6: FDP/REST Tier 1.5 Chain Rules

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Modify: `apps/api/src/main/java/com/pilotroster/workbench/ValidationPublishService.java`
- Test: `apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java`
- Test: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`

- [ ] **Step 1: Write failing tests for `RG-FDP-008` and `RG-REST-008`**

Cover:

- reduced-rest detection
- special-assessment pass/fail
- reduced-rest followed by extended-FDP followed by reduced-rest

- [ ] **Step 2: Run the Tier 1.5 test slice and confirm failure**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests" test
```

Expected: FAIL because reduced-rest and extended-FDP chain facts do not exist.

- [ ] **Step 3: Implement reduced-rest and chain facts without widening unrelated workflow scope**

Introduce only the minimal facts needed:

```java
boolean precededByReducedRest
boolean specialAssessmentPassed
boolean followingExtendedFdp
boolean nextRestReduced
```

Defer relief/accommodation expansions that belong to `EXT` rules.

- [ ] **Step 4: Re-run the Tier 1.5 backend suite**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,ValidationPublishIntegrationTests" test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/main/java/com/pilotroster/workbench/ValidationPublishService.java apps/api/src/test/java/com/pilotroster/rule/RuleEvaluationServiceIntegrationTests.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java
git commit -m "feat: add reduced-rest chain p0 rules"
```

### Task 7: Rule Center, Issue Views, And Docs

**Files:**
- Modify: `apps/web/src/app/pages/RuleCenterPages.tsx`
- Modify: `apps/web/src/app/pages/ruleCenterSupport.tsx`
- Modify: `apps/web/src/app/i18n.ts`
- Modify: `docs/superpowers/plans/2026-05-01-p0-canonical-execution-checklist.md`
- Test: `apps/web/e2e/framework.spec.ts`

- [ ] **Step 1: Write failing UI assertions for batch-one hit visibility**

Cover:

- crew limits tab shows current/limit values from backend
- rule center recent-hit/details pages render new batch-one rule IDs
- issue handling can display the new P0 hits without layout regressions

- [ ] **Step 2: Run the frontend build and targeted E2E slice to confirm failure**

Run:

```powershell
npm run build
npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "crew limits|rule center|publish result"
```

Expected: FAIL until the frontend reads the new contracts.

- [ ] **Step 3: Implement frontend read-model updates and checklist refresh**

Keep the current page structure. Only update data consumption and copy needed for new fact-backed rules. Then mark the implemented rules in the checklist.

- [ ] **Step 4: Re-run full targeted verification**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleEvaluationServiceIntegrationTests,CrewMemberControllerIntegrationTests,RuleCatalogIntegrationTests,ValidationPublishIntegrationTests" test
npm run check:i18n
npm run build
npm run test:e2e -- e2e/framework.spec.ts --project=chromium -g "crew limits|rule center|issue|publish"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/pages/RuleCenterPages.tsx apps/web/src/app/pages/ruleCenterSupport.tsx apps/web/src/app/i18n.ts docs/superpowers/plans/2026-05-01-p0-canonical-execution-checklist.md apps/web/e2e/framework.spec.ts
git commit -m "feat: surface batch-one rule engine outputs"
```

---

## Self-Review

**Spec coverage**

- `HOUR rolling` is covered by Tasks 1-3.
- `DDO` core rules are covered by Task 4, with `RG-DDO-004` explicitly called out as the historical extension.
- `FDP/REST` Tier 1 and Tier 1.5 are covered by Tasks 5-6.
- Crew info `小时与限制` display requirements are covered by Task 2.
- Rule center / issue visibility is covered by Task 7.

**Placeholder scan**

- No `TODO`, `TBD`, or “similar to above” placeholders remain.

**Type consistency**

- The plan uses one shared concept: `RuleDerivedFactService` produces facts, `RuleEvaluationService` consumes them, UI reads the derived crew snapshot.
- `RG-FDP-004/005` remain gates, not evaluation targets, throughout the plan.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-02-phase-3-rule-engine-batch-1-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
