# Index HTML Rule Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the root `index.html` demand prototype into a closed, testable backend rule-engine sequence without copying prototype bugs into production.

**Architecture:** Treat `index.html` as product scope and examples, not executable source. Backend rule execution remains in `RuleEvaluationService`, with reusable facts owned by `RuleDerivedFactService` and focused fact builders such as `DdoFactBuilder`, `CrewHourFactBuilder`, and later `FdpRestFactBuilder`.

**Tech Stack:** Java 17, Spring Boot, Spring Data JPA repositories, `JdbcTemplate` integration tests, Maven Surefire, MySQL/Flyway.

---

## Scope And Order

This plan follows the closure map in `docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md`.

The next work must not restart from the 35 review findings. It should use the root `index.html` as the narrowed product rule list and close rules in this order:

1. Correct DDO fact derivation first, because `RG-BASE-008`, `RG-DDO-001`, `RG-DDO-002`, and `RG-DDO-003` depend on it.
2. Wire only DDO rules that can be proven from current timeline data.
3. Leave `RG-DDO-004` closed as a documented future slice until historical DDO source-of-truth is agreed.
4. Keep already-active HOUR rules as-is unless a failing test proves a mismatch.
5. Treat FDP/rest rules as the next fact-builder family after DDO, not part of this DDO closure.

## Progress

- Task 1 implemented: DDO chains are derived from a valid base DDO before continuous units are counted.
- Task 2 implemented: `RG-BASE-008` validation hits include DDO-specific evidence.
- Task 3 implemented: crew-day sequence facts support DDO sequence rules.
- Task 4 implemented: `RG-DDO-001` and `RG-DDO-002` are wired from stable DDO facts.
- Task 5 implemented: `RG-DDO-003` rolling 14-day DDO closure is wired.
- Task 6 implemented: `RG-DDO-004` is documented as visible catalog-only and not executable yet.
- Task 7 verified: API regression, frontend build, i18n check, and diff whitespace check passed. No commits were created because the workspace already contains unrelated dirty state and an existing worktree gitlink change.

## Files

- Modify: `apps/api/src/main/java/com/pilotroster/rule/DdoFactBuilder.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`
- Modify: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`
- Modify: `docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md`
- Create or modify: `docs/superpowers/plans/2026-05-05-ddo-rule-engine-closure-notes.md`

## Definitions To Lock

Use these definitions consistently in tests, code, and docs:

- Local night window is roster-local `22:00-08:00`.
- A local night counts only if the DDO/rest interval overlaps that window by at least 8 continuous hours.
- A single DDO is valid only if there exists a continuous interval of at least 34h containing at least 2 counted local nights.
- A continuous DDO chain must first contain one valid DDO base. Each additional DDO requires both an additional 24h and an additional counted local night.
- The shorthand `34h + (N - 1) * 24h` is necessary but not sufficient; it must be applied after finding the valid DDO base.

---

### Task 1: Fix DDO Base And Continuous-DDO Derivation

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/DdoFactBuilder.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java`
- Modify: `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`

- [ ] **Step 1: Add failing test for duration-plus-night false positive**

Add this test to `RuleDerivedFactServiceIntegrationTests`.

```java
@Test
void buildLatestRosterFactsDoesNotCountContinuousDdoWithoutValidBaseDdo() {
    Long crewId = insertActiveCrew("TSTDDO03");
    Long rosterVersionId = insertRosterVersion("RV-TST-DDO-NO-BASE");
    Long blockId = insertDdoBlock(
        rosterVersionId,
        crewId,
        "2036-01-01 01:00:00",
        "2036-01-03 11:00:00",
        "TEST DDO DURATION WITHOUT VALID BASE",
        "PLANNED"
    );

    RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

    RuleDerivedFacts.DdoFact fact = facts.ddoFactsByBlockId().get(blockId);
    assertThat(fact.ddoMinutes()).isEqualTo(58 * 60L);
    assertThat(fact.localNights()).isEqualTo(2);
    assertThat(fact.validDdoUnit()).isFalse();
    assertThat(fact.consecutiveDdoAfter()).isZero();
}
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=RuleDerivedFactServiceIntegrationTests#buildLatestRosterFactsDoesNotCountContinuousDdoWithoutValidBaseDdo' test
```

Expected: FAIL because the current duration/local-night aggregate can over-count continuous DDO without proving a valid 34h base.

- [ ] **Step 3: Add DDO evidence fields**

Extend `RuleDerivedFacts.DdoFact` with base evidence so later rule hits can explain the calculation.

```java
public record DdoFact(
    Long timelineBlockId,
    Long crewId,
    long ddoMinutes,
    int localNights,
    int consecutiveDutyDaysBefore,
    int consecutiveDdoAfter,
    boolean validDdoUnit,
    boolean restContributesToContinuousDdoSpan,
    Instant baseDdoStartUtc,
    Instant baseDdoEndUtc,
    List<CrewHourContributor> localNightContributors
) {
    public DdoFact {
        localNightContributors = List.copyOf(localNightContributors);
    }
}
```

Update existing constructors/usages in `DdoFactBuilder` only. Do not modify `CrewHourFactBuilder` for this task.

- [ ] **Step 4: Implement valid-base-first algorithm**

In `DdoFactBuilder`, replace aggregate-only `consecutiveDdoUnits` with base-first calculation:

```java
private DdoComputation computeDdo(TimelineBlock block) {
    List<RuleDerivedFacts.CrewHourContributor> nights = localNightContributors(block.getStartUtc(), block.getEndUtc());
    long ddoMinutes = positiveDurationMinutes(block.getStartUtc(), block.getEndUtc());
    BaseDdoWindow base = findBaseDdoWindow(block.getStartUtc(), block.getEndUtc(), nights);
    if (base == null) {
        return new DdoComputation(ddoMinutes, nights, false, 0, null, null);
    }
    int additionalByDuration = (int) (Duration.between(base.endUtc(), block.getEndUtc()).toMinutes() / ADDITIONAL_CONSECUTIVE_DDO_MINUTES);
    long nightsAfterBase = nights.stream()
        .filter(night -> !night.startUtc().isBefore(base.endUtc()))
        .count();
    int units = 1 + Math.min(additionalByDuration, (int) nightsAfterBase);
    return new DdoComputation(ddoMinutes, nights, true, units, base.startUtc(), base.endUtc());
}
```

`findBaseDdoWindow` must search for the earliest 34h-or-longer interval starting at the DDO block start that contains 2 counted local nights. If no such base exists, the fact is not a valid DDO unit.

- [ ] **Step 5: Run DDO fact tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=RuleDerivedFactServiceIntegrationTests#buildLatestRosterFactsBuildsDdoFactsFromRosterTimeline+buildLatestRosterFactsCountsConsecutiveDdoUnitsByDurationAndLocalNights+buildLatestRosterFactsDoesNotCountContinuousDdoWithoutValidBaseDdo' test
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/DdoFactBuilder.java apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java
git commit -m "fix: derive DDO chains from a valid base DDO"
```

---

### Task 2: Add DDO Rule Evidence For RG-BASE-008

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`

- [ ] **Step 1: Add failing evidence assertion**

Extend `validationBlocksDdoWithInsufficientLocalNightsEvenWhenDurationIsLongEnough` to assert evidence contains DDO fields:

```java
.andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-BASE-008')].evidenceJson").value(hasItem(containsString("localNights"))))
.andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-BASE-008')].evidenceJson").value(hasItem(containsString("validDdoUnit"))))
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=ValidationPublishIntegrationTests#validationBlocksDdoWithInsufficientLocalNightsEvenWhenDurationIsLongEnough' test
```

Expected: FAIL because current `blockHit` uses default evidence JSON.

- [ ] **Step 3: Add DDO-specific hit constructor**

In `RuleEvaluationService`, add a private method:

```java
private RuleHit ddoHit(TimelineBlock block, TaskPlanItem task, RuleDerivedFacts.DdoFact fact) {
    return new RuleHit(
        "RG-BASE-008",
        "NON_COMPLIANT",
        "TIMELINE_BLOCK",
        block.getId(),
        block.getCrewMemberId(),
        block.getTaskPlanItemId(),
        block.getId(),
        block.getStartUtc(),
        block.getEndUtc(),
        route(task),
        taskCode(task, block),
        "Planned DDO must be at least 34 hours and contain two local nights.",
        "EXTEND_DDO",
        ddoEvidenceJson(fact)
    );
}
```

Add `ddoEvidenceJson` with fields: `phase`, `ruleId`, `ddoMinutes`, `localNights`, `validDdoUnit`, `consecutiveDdoAfter`, `baseDdoStartUtc`, `baseDdoEndUtc`.

- [ ] **Step 4: Replace the RG-BASE-008 block hit**

Change the DDO block branch from `blockHit(...)` to `ddoHit(block, task, ddoFact)`.

- [ ] **Step 5: Run DDO validation tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=ValidationPublishIntegrationTests#validationPublishUsesRuleHitPoolForEvaluationRules+validationBlocksDdoWithInsufficientLocalNightsEvenWhenDurationIsLongEnough+validationGetEndpointsKeepSavedHitSnapshotWhenFactsChange' test
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java
git commit -m "feat: add DDO evidence to validation hits"
```

---

### Task 3: Build Crew-Day Sequence Facts For RG-DDO-001 And RG-DDO-002

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/DdoFactBuilder.java`
- Modify: `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`

- [ ] **Step 1: Add failing test for consecutive duty days**

Add:

```java
@Test
void buildLatestRosterFactsCountsConsecutiveDutyDaysBeforeDdo() {
    Long crewId = insertActiveCrew("TSTDDO04");
    Long rosterVersionId = insertRosterVersion("RV-TST-DDO-DUTY-SEQUENCE");
    for (int day = 1; day <= 6; day += 1) {
        Long taskId = insertFlightTask(
            "TST-DDO-DUTY-" + day,
            "2036-01-0" + day + " 00:00:00",
            "2036-01-0" + day + " 08:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            taskId,
            "2036-01-0" + day + " 00:00:00",
            "2036-01-0" + day + " 08:00:00"
        );
    }
    Long ddoBlockId = insertDdoBlock(
        rosterVersionId,
        crewId,
        "2036-01-07 14:00:00",
        "2036-01-09 00:00:00",
        "TEST DDO AFTER SIX DUTY DAYS",
        "PLANNED"
    );

    RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

    assertThat(facts.ddoFactsByBlockId().get(ddoBlockId).consecutiveDutyDaysBefore()).isEqualTo(6);
}
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=RuleDerivedFactServiceIntegrationTests#buildLatestRosterFactsCountsConsecutiveDutyDaysBeforeDdo' test
```

Expected: FAIL because `consecutiveDutyDaysBefore` is currently zero.

- [ ] **Step 3: Implement duty-day grouping**

In `DdoFactBuilder`, group non-cancelled non-DDO duty-producing blocks by `crewMemberId` and local date. Duty-producing block types are `FLIGHT`, `DUTY`, `TRAINING`, and `STANDBY`. Do not count `REST`, `DDO`, or `RECOVERY` as duty days.

- [ ] **Step 4: Set `consecutiveDutyDaysBefore` for each DDO block**

For each DDO fact, walk backward from the day before the DDO starts while the crew has a duty-producing day. Stop at the first non-duty day.

- [ ] **Step 5: Run DDO fact suite**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=RuleDerivedFactServiceIntegrationTests#buildLatestRosterFactsCountsConsecutiveDutyDaysBeforeDdo+buildLatestRosterFactsBuildsDdoFactsFromRosterTimeline+buildLatestRosterFactsCountsConsecutiveDdoUnitsByDurationAndLocalNights' test
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/DdoFactBuilder.java apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java
git commit -m "feat: derive DDO duty-day sequence facts"
```

---

### Task 4: Wire RG-DDO-001 And RG-DDO-002 Only After Facts Are Stable

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`

- [ ] **Step 1: Add failing test for seven consecutive duty days**

Add a validation test that creates seven consecutive duty-producing days for one crew and expects `RG-DDO-001`.

```java
@Test
void validationBlocksCrewWithMoreThanSixConsecutiveDutyDays() throws Exception {
    String token = loginToken("dispatcher01", "Admin123!");
    Long rosterVersionId = latestRosterVersionId();
    Long crewId = insertActiveCrewForValidation("TSTVALDDO01");
    insertConsecutiveDutyDays(rosterVersionId, crewId, 7, "2036-02-01");

    mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-DDO-001")));
}
```

- [ ] **Step 2: Add failing test for day-7 return-base requiring two DDOs**

Add a validation test where day 7 is return-base positioning and the following DDO fact has only one DDO unit. Expect `RG-DDO-002`.

- [ ] **Step 3: Run failing tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=ValidationPublishIntegrationTests#validationBlocksCrewWithMoreThanSixConsecutiveDutyDays+validationBlocksDaySevenReturnBaseWithoutTwoDdos' test
```

Expected: FAIL because `RuleEvaluationService` does not yet emit these DDO family hits.

- [ ] **Step 4: Add DDO rule emission**

Use `RuleDerivedFacts.DdoFact` values:

```java
if (fact.consecutiveDutyDaysBefore() > 6) {
    hits.add(ddoSequenceHit("RG-DDO-001", fact, "Crew cannot exceed six consecutive duty days.", "ADD_DDO"));
}
if (fact.consecutiveDutyDaysBefore() == 7 && fact.consecutiveDdoAfter() < 2) {
    hits.add(ddoSequenceHit("RG-DDO-002", fact, "Day-7 return-base duty requires at least two consecutive DDOs after it.", "ADD_DDO"));
}
```

Keep `RG-DDO-002` conservative until a real positioning/return-base fact exists: only apply it to the testable day-7 condition and document the limitation in evidence.

- [ ] **Step 5: Run validation tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=ValidationPublishIntegrationTests#validationBlocksCrewWithMoreThanSixConsecutiveDutyDays+validationBlocksDaySevenReturnBaseWithoutTwoDdos+validationPublishUsesRuleHitPoolForEvaluationRules' test
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java
git commit -m "feat: evaluate core DDO sequence blockers"
```

---

### Task 5: Add RG-DDO-003 Rolling 14-Day Closure

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/rule/DdoFactBuilder.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java`
- Modify: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Modify: `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`
- Modify: `apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java`

- [ ] **Step 1: Add failing fact test for rolling 14-day DDO gap**

Add a crew timeline with 14 days of duty/rest data and no two-consecutive-DDO chain. Expected derived fact should report `rolling14dHasTwoConsecutiveDdo=false`.

- [ ] **Step 2: Add field to DDO/crew sequence fact**

If per-block `DdoFact` becomes awkward, add a new map to `RuleDerivedFacts`:

```java
Map<Long, DdoCrewSequenceFact> ddoSequenceFactsByCrewId
```

with:

```java
public record DdoCrewSequenceFact(
    Long crewId,
    boolean rolling14dHasTwoConsecutiveDdo,
    Instant windowStartUtc,
    Instant windowEndUtc
) {}
```

- [ ] **Step 3: Implement rolling 14-day scan**

Scan roster-local dates per crew. A 14-day window passes only if it contains at least one continuous DDO chain with `consecutiveDdoAfter >= 2`.

- [ ] **Step 4: Wire `RG-DDO-003` hit**

Emit `RG-DDO-003` only for crew with an active latest-roster timeline and a failing rolling 14-day DDO sequence fact.

- [ ] **Step 5: Run DDO rolling tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml '-Dtest=RuleDerivedFactServiceIntegrationTests#buildLatestRosterFactsDetectsRollingFourteenDayDdoGap,ValidationPublishIntegrationTests#validationBlocksRollingFourteenDaysWithoutTwoConsecutiveDdos' test
```

Expected: PASS.

- [ ] **Step 6: Commit this task**

```powershell
git add apps/api/src/main/java/com/pilotroster/rule/DdoFactBuilder.java apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java apps/api/src/test/java/com/pilotroster/workbench/ValidationPublishIntegrationTests.java
git commit -m "feat: evaluate rolling fourteen-day DDO requirement"
```

---

### Task 6: Document RG-DDO-004 As Not Yet Executable

**Files:**
- Modify: `docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md`
- Modify: `docs/superpowers/plans/2026-05-05-index-html-rule-closure-implementation-plan.md`

- [x] **Step 1: Update closure map**

Change the DDO fact-builder section so it no longer describes continuous DDO as an aggregate-only duration/local-night formula. Replace it with the valid-base-first rule.

- [x] **Step 2: Add RG-DDO-004 note**

Document `RG-DDO-004` in the closure map and this plan as visible catalog-only and not executable yet.

```markdown
`RG-DDO-004` remains visible catalog-only until the historical DDO source-of-truth is agreed.

Reason:
- It requires a historical cycle baseline for a three-by-four-week average, not only current draft roster data.
- Current roster timeline can prove planned DDO blocks, but cannot by itself prove historical DDO entitlement.
- Using current demo data as history would create false blockers.
- It is not evaluator-managed, not activated, and needs a future rule-engine step after the historical baseline is auditable.
```

- [x] **Step 3: Run doc check**

Run:

```powershell
rg -n "E[s]timate consecutive DDO units|min[(]duration units|open[-]ended marker" docs\superpowers\plans\2026-05-05-r001-r014-rule-closure-map.md docs\superpowers\plans\2026-05-05-index-html-rule-closure-implementation-plan.md
```

Expected: no misleading aggregate-only continuous-DDO language remains; no open-ended-marker wording.

- [ ] **Step 4: Commit this task**

```powershell
git add docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md docs/superpowers/plans/2026-05-05-ddo-rule-engine-closure-notes.md
git commit -m "docs: close DDO rule-engine scope"
```

---

### Task 7: Final Regression And Handoff

**Files:**
- Modify only if tests expose a defect.

- [ ] **Step 1: Run full API tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml test
```

Expected: BUILD SUCCESS with all tests passing.

- [ ] **Step 2: Run whitespace check**

Run:

```powershell
git diff --check -- apps\api\src\main\java\com\pilotroster\rule apps\api\src\test\java\com\pilotroster\rule apps\api\src\test\java\com\pilotroster\workbench docs\superpowers\plans
```

Expected: no whitespace errors. LF/CRLF warnings are acceptable on this Windows workspace.

- [ ] **Step 3: Write handoff summary**

Add a short section to `docs/superpowers/plans/2026-05-05-ddo-rule-engine-closure-notes.md`:

```markdown
## Completed In This Slice

- `RG-BASE-008` uses DDO facts.
- DDO fact builder proves valid base DDO before counting continuous DDO units.
- `RG-DDO-001`, `RG-DDO-002`, and `RG-DDO-003` are executable only if tests in this plan pass.
- `RG-DDO-004` remains intentionally catalog-only pending historical source agreement.
```

- [ ] **Step 4: Commit final handoff**

```powershell
git add docs/superpowers/plans/2026-05-05-ddo-rule-engine-closure-notes.md
git commit -m "docs: summarize DDO closure handoff"
```

---

## Self-Review Checklist

- The plan starts from `index.html` as scope, not from unrelated review findings.
- DDO continuous calculation is corrected to valid-base-first.
- `RG-DDO-004` is not approximated.
- HOUR rules are not reworked in this plan.
- FDP/rest rules are acknowledged but deferred to a separate fact-builder plan.
- Every implementation task has a failing test first, an expected failure, a minimal implementation step, a passing verification command, and a commit command.
