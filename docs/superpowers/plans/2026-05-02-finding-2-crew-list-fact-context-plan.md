# Finding 2 Crew List Fact Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Finding 2 by ensuring the crew list endpoint does not choose or depend on a latest roster version for crew-hour compatibility facts.

**Architecture:** `CrewMemberController` should consume an explicit compatibility-fact service method and should not query `roster_version` or pass roster context for list display. `RuleDerivedFactService` owns the compatibility boundary; real roster-scoped facts remain future rule-engine work.

**Tech Stack:** Java 17, Spring Boot, Spring MVC, JdbcTemplate, JUnit integration tests with MockMvc.

---

### Task 1: Verify Production Boundary

**Files:**
- Inspect: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
- Inspect: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFactService.java`
- Inspect: `apps/api/src/main/java/com/pilotroster/rule/CrewHourFactBuilder.java`

- [ ] **Step 1: Confirm controller no longer queries roster context**

Check that `CrewMemberController.list()` directly calls:

```java
Map<Long, RuleDerivedFacts.CrewHourFact> crewHourFacts = ruleDerivedFactService.buildCrewHourCompatibilityFacts();
```

Expected: no `latestRosterVersionId()` helper, no `JdbcTemplate` dependency, no query against `roster_version`.

- [ ] **Step 2: Confirm service owns compatibility entrypoint**

Check that `RuleDerivedFactService` exposes:

```java
public Map<Long, RuleDerivedFacts.CrewHourFact> buildCrewHourCompatibilityFacts() {
    return crewHourFactBuilder.buildCompatibilitySnapshot();
}
```

Expected: caller can obtain crew-hour compatibility facts without passing roster context.

- [ ] **Step 3: Confirm builder API is context-free for compatibility facts**

Check that `CrewHourFactBuilder` exposes:

```java
public Map<Long, RuleDerivedFacts.CrewHourFact> buildCompatibilitySnapshot()
```

Expected: no unused `rosterVersionId` parameter in the compatibility snapshot path.

---

### Task 2: Lock Regression Coverage

**Files:**
- Inspect or modify only if missing: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`
- Inspect or modify only if missing: `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`

- [ ] **Step 1: Verify crew list compatibility test**

Check that `CrewMemberControllerIntegrationTests` verifies `/api/crew-members` still returns rolling-hour compatibility fields through the list endpoint.

Expected: existing endpoint response remains compatible with frontend field names.

- [ ] **Step 2: Verify service compatibility snapshot test**

Check that `RuleDerivedFactServiceIntegrationTests` contains a test for `buildCrewHourCompatibilityFacts()` without roster context.

Expected: test proves the compatibility snapshot can be built directly from crew-member snapshot fields.

- [ ] **Step 3: Keep scope narrow**

Do not add HOUR rule evaluation, rule-center hit projection, frontend behavior, DDO, FDP, REST, or publish-flow changes in this task.

Expected: Finding 2 remains a boundary cleanup only.

---

### Task 3: Verification

**Files:**
- Test: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`
- Test: `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`

- [ ] **Step 1: Run targeted backend tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=CrewMemberControllerIntegrationTests,RuleDerivedFactServiceIntegrationTests" test
```

Expected: `BUILD SUCCESS`, with `CrewMemberControllerIntegrationTests` and `RuleDerivedFactServiceIntegrationTests` passing.

- [ ] **Step 2: Review final diff**

Run:

```powershell
git diff -- apps\api\src\main\java\com\pilotroster\crew\CrewMemberController.java apps\api\src\main\java\com\pilotroster\rule\RuleDerivedFactService.java apps\api\src\main\java\com\pilotroster\rule\CrewHourFactBuilder.java apps\api\src\test\java\com\pilotroster\crew\CrewMemberControllerIntegrationTests.java apps\api\src\test\java\com\pilotroster\rule\RuleDerivedFactServiceIntegrationTests.java
```

Expected: only Finding 2 boundary cleanup and tests are present; no unrelated business logic changes.

---

## Self-Review

- Spec coverage: Finding 2 is covered by removing controller-owned latest roster context and routing through the service compatibility entrypoint.
- Placeholder scan: no TBD/TODO/placeholders.
- Scope check: Finding 1 is treated as already completed; Finding 3 is explicitly deferred.
