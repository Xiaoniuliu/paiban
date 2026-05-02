# Flow 2 Crew Hour Fact Compatibility Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `GET /api/crew-members` read crew rolling-hour fields from `RuleDerivedFactService` while preserving the current API shape and avoiding unrelated business changes.

**Architecture:** Keep `CrewMember` as the compatibility entity. Add a controller-level response mapper that copies normal crew profile fields and fills the existing rolling-hour fields from `CrewHourFact`. Frontend remains structurally unchanged.

**Tech Stack:** Spring Boot, JdbcTemplate/JPA, JUnit/MockMvc, React TypeScript unchanged

---

## Scope

**Allowed files**

- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
- Modify: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`
- Optional modify: `apps/api/src/main/java/com/pilotroster/rule/RuleDerivedFacts.java` only if a tiny helper is required

**Do not modify**

- `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- `apps/api/src/main/java/com/pilotroster/workbench/ValidationPublishService.java`
- `apps/web/src/app/pages/CrewLimitsSection.tsx`
- `apps/web/src/app/pages/CrewInformationPage.tsx`
- `apps/web/src/app/types.ts`
- migrations
- rule catalog data
- assignment, archive, publish, or timeline business logic

---

## Behavior Contract

The `GET /api/crew-members` response must keep the current field names:

- `rollingFlightHours28d`
- `rollingDutyHours28d`
- `rollingDutyHours7d`
- `rollingDutyHours14d`
- `rollingFlightHours12m`
- `latestActualFdpHours`
- `latestActualFdpSource`

The values for the five rolling-hour fields should come from:

```text
RuleDerivedFactService
-> RuleDerivedFacts
-> CrewHourFact
```

The values should still be returned as decimal hours to preserve frontend compatibility.

Write endpoints must keep returning the current `CrewMember` shape and should not be refactored in this slice. This plan only changes the list/read model path.

---

## Implementation Tasks

### Task 1: Controller Read Model Mapper

**Files:**

- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`

- [ ] **Step 1: Add `RuleDerivedFactService` dependency to `CrewMemberController`**

Inject it alongside the existing repositories.

- [ ] **Step 2: Change only `list()` to return a compatibility response DTO**

Keep the endpoint path unchanged:

```java
@GetMapping
public ApiResponse<List<CrewMemberResponse>> list()
```

Use:

```java
RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(latestRosterVersionId());
```

If there is no roster version, fall back to current entity values instead of failing the crew list page.

- [ ] **Step 3: Add a private mapper that preserves existing JSON names**

Use a nested record in `CrewMemberController`, for example:

```java
record CrewMemberResponse(
    Long id,
    String crewCode,
    String employeeNo,
    String nameZh,
    String nameEn,
    String roleCode,
    String rankCode,
    String homeBase,
    String aircraftQualification,
    String acclimatizationStatus,
    String bodyClockTimezone,
    Integer normalCommuteMinutes,
    Boolean externalEmploymentFlag,
    String availabilityStatus,
    String status,
    BigDecimal rollingFlightHours28d,
    BigDecimal rollingDutyHours28d,
    BigDecimal rollingDutyHours7d,
    BigDecimal rollingDutyHours14d,
    BigDecimal rollingFlightHours12m,
    BigDecimal latestActualFdpHours,
    String latestActualFdpSource
) {}
```

Convert minutes back to decimal hours with a deterministic scale.

- [ ] **Step 4: Keep detail and write endpoints unchanged**

Do not refactor `detail`, `create`, `updateProfile`, `updateOperational`, `updateProfileAndOperational`, `disable`, or `reactivate`.

### Task 2: Tests

**Files:**

- Modify: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`

- [ ] **Step 1: Add a focused list-test**

The test should:

- update one active crew row's compatibility rolling fields
- call `GET /api/crew-members`
- assert the list response returns the expected decimal-hour values
- assert an inactive crew row is not allowed to override active list facts through the fact builder

- [ ] **Step 2: Preserve existing write-contract assertions**

Do not change tests that prove profile/operational writes preserve rolling fields.

- [ ] **Step 3: Run targeted tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=CrewMemberControllerIntegrationTests,RuleDerivedFactServiceIntegrationTests" test
```

Expected:

```text
BUILD SUCCESS
```

### Task 3: Scope Verification

**Files:**

- No extra files

- [ ] **Step 1: Confirm no frontend changes**

Run:

```powershell
git diff --name-only
```

Expected for this slice:

```text
apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java
apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java
```

Other already-dirty files may exist from previous work, but this slice must not add new frontend or publish/rule-evaluator changes.

- [ ] **Step 2: Run compile or targeted backend tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=CrewMemberControllerIntegrationTests,RuleDerivedFactServiceIntegrationTests" test
```

Expected:

```text
BUILD SUCCESS
```

---

## Self-Review

**Spec coverage**

- The plan changes only the crew read model path.
- The current API field names stay intact.
- Frontend structure remains untouched.
- Rule evaluation and publish behavior remain untouched.

**Placeholder scan**

- No placeholders or deferred instructions remain inside the task steps.

**Type consistency**

- `CrewHourFact` stores minutes.
- `CrewMemberResponse` returns decimal hours to preserve the existing frontend contract.

---

## Execution Handoff

Use one subagent for this whole slice. The subagent must not edit frontend files, migrations, `RuleEvaluationService`, or publish code.
