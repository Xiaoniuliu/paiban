# Remaining Rule Engine And Phase 5 Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the known unfinished scope after the DDO/HOUR slice: wire the remaining executable FDP/REST facts into validation, normalize rule catalog execution state, document the remaining RG-DDO-004 historical baseline boundary, and make Phase 5 status explicit before moving into larger rule-engine expansion.

**Architecture:** Keep the existing in-process Java rule evaluator. `RuleDerivedFactService` remains the fact facade, `FdpRestFactBuilder` becomes the FDP/REST source, and `RuleEvaluationService` persists only active executable P0 `EVALUATION_RULE` hits. Rule catalog changes happen through Flyway migrations plus integration tests. UI changes are limited to routing/type safety if backend response shape changes.

**Tech Stack:** Java 17, Spring Boot, JdbcTemplate, MySQL/Flyway, JUnit integration tests, React/TypeScript, Vite.

---

## Current Boundary

The project is clean enough to proceed, but these items are still open:

- FDP/REST facts are exposed through `RuleDerivedFactService`, but `FdpRestFactBuilder` does not yet build facts.
- FDP/REST P0 rules from the demand-side `index.html` summary are still catalog-only or not fully executable.
- `RG-DDO-004` needs a historical 3 x 4-week DDO baseline and should remain catalog-only until that data source exists.
- Rule catalog rows have mixed semantics: some executable rules are still `CATALOG_ONLY`, and some catalog-only rows have `active_flag=true`.
- Phase 5 behavior is mostly in place, but package/boundary ownership still reads like replacement work is incomplete.

Out of scope for this plan:

- External rules engine adoption.
- Full FOM Table A/B modeling beyond the current demand-side P0 closure.
- Historical 12-month archive backfill beyond the facts already available in the database.

---

## Task 1: Build FDP/REST Facts

**Objective:** Replace the empty FDP/REST fact backbone with deterministic facts for current-roster flight duties and adjacent rest windows.

**Files:**

- `apps/api/src/main/java/com/pilotroster/rule/FdpRestFactBuilder.java`
- `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java`
- `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`

**Fact contract:**

- One `FdpRestFact` per active current-roster flight task and crew assignment.
- Ignore cancelled timeline blocks and cancelled linked tasks.
- Use the current roster timeline as planned/projection source.
- Use UTC+8 local time for local-night counting.
- The initial FDP cap is 14 hours, matching the demand-side P0 closure for single FDP maximum.
- Following rest local nights are counted from the first active rest block for the same crew after the FDP.
- Reduced-rest flags are derived from the relationship between preceding duty and adjacent rest, not from static mock values.

**Implementation steps:**

- [ ] Add a failing integration test named `buildLatestRosterFactsBuildsFdpRestFactsForFlightAndFollowingRest`.
- [ ] In the test, create one roster version, one flight task, one flight timeline block, one assigned crew member, and one following rest block.
- [ ] Assert that `fdpRestFactsByTaskId()` contains the task id.
- [ ] Assert the fact includes crew id, FDP minutes, FDP start/end, following rest start/end, local-night count, and the 14-hour allowable FDP cap.
- [ ] Add a failing integration test named `buildLatestRosterFactsIgnoresCancelledFdpRestInputs`.
- [ ] Assert cancelled flight blocks and cancelled rest blocks do not produce executable FDP/REST facts.
- [ ] Extend `RuleDerivedFacts.FdpRestFact` with explicit fields needed by rule evidence.
- [ ] Implement `FdpRestFactBuilder.build(Long rosterVersionId)` using JdbcTemplate queries scoped to the passed roster version.
- [ ] Add small private helpers for local-night overlap and active-status checks.

Suggested record shape:

```java
public record FdpRestFact(
    Long taskId,
    Long crewId,
    String startBand,
    long fdpMinutes,
    long allowableFdpMinutes,
    long previousDutyMinutes,
    int restLocalNights,
    boolean precededByReducedRest,
    boolean followingRestReduced,
    boolean extendedFdp,
    boolean specialAssessmentPassed,
    Instant fdpStartUtc,
    Instant fdpEndUtc,
    Instant followingRestStartUtc,
    Instant followingRestEndUtc
) {}
```

Validation command:

```powershell
mvn.cmd -f apps\api\pom.xml -Dtest=RuleDerivedFactServiceIntegrationTests test
```

Commit after this task:

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/FdpRestFactBuilder.java apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java
git commit -m "feat: build FDP and rest derived facts"
```

---

## Task 2: Wire FDP/REST Tier-1 P0 Rules

**Objective:** Persist real validation hits for the first executable FDP/REST rules.

**Rules:**

- `RG-FDP-006`: single FDP must not exceed 14 hours for the current P0 closure.
- `RG-REST-004`: duty over 18 hours must be followed by rest containing at least one local night.

**Files:**

- `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`
- `apps/api/src/test/java/com/pilotroster/rule/RuleCatalogIntegrationTests.java`
- New Flyway migration under `apps/api/src/main/resources/db/migration/`

**Implementation steps:**

- [ ] Add failing validation tests for `RG-FDP-006` and `RG-REST-004`.
- [ ] Test that a 14h 30m FDP creates an active blocking validation hit with crew/task evidence.
- [ ] Test that an 18h 30m duty followed by rest without a local night creates an active blocking validation hit.
- [ ] Test that in-limit FDP/rest produces no hit.
- [ ] Add `RG-FDP-006` and `RG-REST-004` to the evaluator-managed executable set.
- [ ] Add `buildFdpRestHits(...)` in `RuleEvaluationService`.
- [ ] Persist evidence JSON with predicate, actual, limit, crew id, task id, FDP window, rest window, and local-night count.
- [ ] Add a migration that marks `RG-FDP-006` and `RG-REST-004` as executable active P0 rules.
- [ ] Keep `RG-FDP-008` and `RG-REST-008` catalog-only until Task 3 is implemented.

Suggested evidence shape:

```json
{
  "phase": "phase5",
  "predicate": "fdp_minutes <= 840",
  "actualMinutes": 870,
  "limitMinutes": 840,
  "crewId": 1001,
  "taskId": 2001,
  "fdpStartUtc": "2026-04-25T00:00:00Z",
  "fdpEndUtc": "2026-04-25T14:30:00Z"
}
```

Validation command:

```powershell
mvn.cmd -f apps\api\pom.xml -Dtest=ValidationPublishIntegrationTests,RuleCatalogIntegrationTests test
```

Commit after this task:

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java apps/api/src/test/java/com/pilotroster/rule/RuleCatalogIntegrationTests.java apps/api/src/main/resources/db/migration
git commit -m "feat: wire FDP and rest P0 validation rules"
```

---

## Task 3: Wire Reduced-Rest Chain Rules

**Objective:** Close the reduced-rest P0 chain that depends on the same FDP/REST facts.

**Rules:**

- `RG-FDP-008`: reduced rest requires explicit special assessment before the following FDP is accepted.
- `RG-REST-008`: reduced rest cannot be chained after extended FDP when the following rest is also reduced.

**Files:**

- `apps/api/src/main/java/com/pilotroster/rule/FdpRestFactBuilder.java`
- `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`
- `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`
- New Flyway migration under `apps/api/src/main/resources/db/migration/`

**Implementation steps:**

- [ ] Add a fact-builder test for a crew sequence with duty, reduced rest, next FDP, and next rest.
- [ ] Assert the next FDP fact has `precededByReducedRest=true`.
- [ ] Assert an extended FDP fact has `extendedFdp=true`.
- [ ] Assert the following reduced rest sets `followingRestReduced=true`.
- [ ] Add validation tests for `RG-FDP-008` and `RG-REST-008`.
- [ ] Implement reduced-rest chain detection in `FdpRestFactBuilder` from sorted crew timeline events.
- [ ] Add `RG-FDP-008` and `RG-REST-008` to the evaluator-managed executable set.
- [ ] Persist evidence JSON with previous rest, FDP, next rest, and chain reason.
- [ ] Add a migration that marks `RG-FDP-008` and `RG-REST-008` executable active only after the tests pass.

Validation command:

```powershell
mvn.cmd -f apps\api\pom.xml -Dtest=RuleDerivedFactServiceIntegrationTests,ValidationPublishIntegrationTests test
```

Commit after this task:

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/FdpRestFactBuilder.java apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java apps/api/src/main/resources/db/migration
git commit -m "feat: enforce reduced rest chain rules"
```

---

## Task 4: Normalize Rule Catalog Execution State

**Objective:** Make the catalog clearly say which rules are executable and which are catalog-only.

**Files:**

- `apps/api/src/test/java/com/pilotroster/rule/RuleCatalogIntegrationTests.java`
- New Flyway migration under `apps/api/src/main/resources/db/migration/`
- `docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md`

**Implementation steps:**

- [ ] Add a catalog integration test named `executableEvaluationRulesHaveAlignedActiveStatus`.
- [ ] Assert every active executable P0 `EVALUATION_RULE` has `active_flag=true` and `version_status='ACTIVE'`.
- [ ] Assert catalog-only executable-rule rows that do not enter the engine have `active_flag=false` and `version_status='CATALOG_ONLY'`.
- [ ] Add a migration that aligns current executable rules:
  `RG-BASE-008`, `RG-DDO-001`, `RG-DDO-002`, `RG-DDO-003`, `RG-HOUR-001`, `RG-HOUR-002`, `RG-HOUR-003`, `RG-HOUR-006`, `RG-HOUR-007`, `RG-FDP-006`, `RG-REST-004`, `RG-FDP-008`, `RG-REST-008`.
- [ ] Keep `RG-DDO-004` catalog-only with `active_flag=false`.
- [ ] Update the R001-R014 closure map with the exact executable/catalog-only status.

Validation command:

```powershell
mvn.cmd -f apps\api\pom.xml -Dtest=RuleCatalogIntegrationTests test
```

Optional database sanity query:

```powershell
mysql -uroot -padmin123 -D pilot_roster -e "select rule_id, catalog_entry_type, active_flag, version_status from rule_catalog where severity='P0' and catalog_entry_type='EVALUATION_RULE' order by rule_id;"
```

Commit after this task:

```powershell
git add apps/api/src/test/java/com/pilotroster/rule/RuleCatalogIntegrationTests.java apps/api/src/main/resources/db/migration docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md
git commit -m "chore: normalize executable rule catalog status"
```

---

## Task 5: Document Remaining Phase 5 And RG-DDO-004 Boundaries

**Objective:** Prevent future workers from mistaking known non-executable boundaries for completed engine behavior.

**Files:**

- `docs/pilot-rostering-system-rearchitecture-master-plan.md`
- `docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md`
- New handoff note if needed under `docs/superpowers/plans/`

**Implementation steps:**

- [ ] Update the master plan Phase 5 section to state that validation/publish behavior is functionally closed, while package ownership remains a cleanup item.
- [ ] Add a short package-boundary note explaining why `ValidationPublishService` still lives under `workbench` and what would be required to move it safely.
- [ ] Add an `RG-DDO-004` boundary note: historical 3 x 4-week DDO baseline is required before the rule can enter the calculation engine.
- [ ] Specify the required historical inputs for `RG-DDO-004`: crew id, DDO date/window, local-night qualification, source roster/archive version, and rolling 4-week grouping.
- [ ] Confirm the note says `RG-DDO-004` remains visible in catalog but does not block validation/publish.

Validation command:

```powershell
git diff --check
```

Commit after this task:

```powershell
git add docs/pilot-rostering-system-rearchitecture-master-plan.md docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md docs/superpowers/plans
git commit -m "docs: close phase five and DDO historical boundaries"
```

---

## Task 6: Full Regression And Real-Flow Smoke Test

**Objective:** Prove the remaining closure does not regress Phase 0-5 behavior.

**Validation steps:**

- [ ] Run the full API suite.
- [ ] Run the web build.
- [ ] Run i18n check.
- [ ] Run whitespace check.
- [ ] Start backend and frontend.
- [ ] In the browser, submit validation from the validation/publish page.
- [ ] Confirm FDP/REST hits appear in issue handling when seeded test data violates limits.
- [ ] Confirm rule center recent hits link by `hitId` into the correct issue.
- [ ] Confirm catalog-only `RG-DDO-004` is visible but does not create a validation hit.
- [ ] Confirm publish remains blocked only by current-roster active executable hits.

Commands:

```powershell
mvn.cmd -f apps\api\pom.xml test
```

```powershell
npm run build
```

```powershell
npm run check:i18n
```

```powershell
git diff --check
```

Commit after this task if any smoke-test-only fixes were needed:

```powershell
git add .
git commit -m "fix: stabilize remaining rule engine closure"
```

---

## Task Ordering For Subagents

Use subagents sequentially for shared files, with one worker owning one slice at a time:

- Worker 1 owns Task 1 only: FDP/REST facts and fact tests.
- Worker 2 starts after Worker 1 is merged and owns Task 2: first FDP/REST validation rules.
- Worker 3 starts after Worker 2 is merged and owns Task 3: reduced-rest chain rules.
- Worker 4 starts after Worker 3 is merged and owns Task 4: catalog state normalization.
- Worker 5 owns Task 5: docs and boundary notes.
- Main agent owns Task 6: final regression, browser smoke, and integration cleanup.

Do not run Workers 1-4 in parallel because they all modify `RuleDerivedFacts`, `FdpRestFactBuilder`, `RuleEvaluationService`, and migrations.

---

## Completion Criteria

This plan is complete when:

- FDP/REST facts are non-empty for real current-roster timeline data.
- `RG-FDP-006`, `RG-REST-004`, `RG-FDP-008`, and `RG-REST-008` have tests proving both blocking and non-blocking paths.
- Rule center and issue handling only show active current-roster executable hits.
- `RG-DDO-004` is clearly catalog-only and documented as dependent on historical DDO baseline data.
- Phase 5 is marked functionally closed with package cleanup separated from business behavior.
- `mvn.cmd -f apps\api\pom.xml test`, `npm run build`, `npm run check:i18n`, and `git diff --check` pass.
