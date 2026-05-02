# Crew Hours Fact Display Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Crew Resource Center > Hours and Limits as a current-hours fact and utilization view, while keeping HOUR rule violations in rule center / validation handling only.

**Architecture:** Crew member APIs should return crew profile and current hour facts only. The HOUR rule engine may still calculate and persist `RG-HOUR-*` hits to `violation_hit`, but CrewLimitsSection must not read or render rule-hit payloads. Validation center and rule center remain the only places that display violation identity, blocking status, and related handling context.

**Tech Stack:** Spring Boot API, JPA repositories, JdbcTemplate only where already needed, React + TypeScript, Vite, existing integration tests.

---

## File Structure

- Modify: `apps/web/src/app/pages/CrewLimitsSection.tsx`
  - Responsibility: render current accumulated hours and utilization hints only.
  - Remove rule-hit imports, rule ID mapping, hit lookup, and validation-center links.

- Modify: `apps/web/src/app/types.ts`
  - Responsibility: shared frontend DTOs.
  - Remove `CrewHourRuleHit` and `CrewMember.hourRuleHits` unless another page uses them.

- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
  - Responsibility: crew profile / operational facts API.
  - Remove `hourRuleHitsByCrewId()`, `CrewHourRuleHitResponse`, and the list endpoint's `violation_hit` query.
  - Keep `RuleDerivedFactService.buildCrewHourCompatibilityFacts()` because it supplies the current-hours fact values.

- Modify: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`
  - Responsibility: crew member API behavior.
  - Remove the test that expects `hourRuleHits` from `/api/crew-members`.
  - Add a boundary test that proves stored HOUR hits do not leak into the crew-hours fact response.

- Keep: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
  - Responsibility: rule evaluation.
  - No behavior change unless tests reveal a regression. HOUR hits should still be generated and persisted for validation/rule modules.

- Keep: `apps/web/src/app/pages/IssueHandlingPage.tsx`
  - Responsibility: validation issue handling.
  - No behavior change unless nullable crew-level HOUR issue rendering needs a follow-up fix.

---

### Task 1: Frontend Fact-Only Hours Display

**Files:**
- Modify: `apps/web/src/app/pages/CrewLimitsSection.tsx`
- Modify: `apps/web/src/app/types.ts`

- [ ] **Step 1: Remove rule-hit dependency from CrewLimitsSection**

Replace the import:

```tsx
import type { CrewMember, Language } from '../types';
import { Badge } from '../components/ui/badge';
```

Remove:

```tsx
import type { CrewHourRuleHit, CrewMember, Language } from '../types';

const hourRuleByLimit = {
  dutyHours7d: 'RG-HOUR-003',
  dutyHours14d: 'RG-HOUR-006',
  dutyHours28d: 'RG-HOUR-007',
  flightHours28d: 'RG-HOUR-001',
  flightHours12m: 'RG-HOUR-002',
} as const;
```

- [ ] **Step 2: Stop passing rule-hit props into limit cells**

Use this row rendering shape:

```tsx
<td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours7d} normalLimit={55} warningLimit={60} extremeLimit={70} t={t} /></td>
<td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours14d} normalLimit={95} t={t} /></td>
<td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours28d} normalLimit={190} t={t} /></td>
<td className="py-3 pr-4"><CrewLimitCell value={item.rollingFlightHours28d} normalLimit={100} t={t} /></td>
<td className="py-3 pr-4"><CrewLimitCell value={item.rollingFlightHours12m} normalLimit={900} t={t} /></td>
```

- [ ] **Step 3: Simplify CrewLimitCell props and rendering**

Use this signature:

```tsx
function CrewLimitCell({
  value,
  normalLimit,
  warningLimit,
  extremeLimit,
  t,
}: {
  value: number;
  normalLimit: number;
  warningLimit?: number;
  extremeLimit?: number;
  t: (key: string) => string;
}) {
```

Delete the branch that renders `ruleHit.ruleId`, `ruleHit.message`, and `hourRuleHitHref(...)`.

- [ ] **Step 4: Remove unused helpers**

Delete:

```tsx
function findHourRuleHit(crew: CrewMember, ruleId: string) {
  return (crew.hourRuleHits ?? []).find((hit) => hit.ruleId === ruleId);
}

function hourRuleHitHref(crewId: number, ruleHit: CrewHourRuleHit) {
  const params = new URLSearchParams({ crewId: String(crewId), ruleId: ruleHit.ruleId });
  if (ruleHit.hitId != null) params.set('hitId', String(ruleHit.hitId));
  return `/validation-center/violation-handling?${params.toString()}`;
}
```

- [ ] **Step 5: Remove frontend DTO leakage**

In `apps/web/src/app/types.ts`, remove `hourRuleHits?: CrewHourRuleHit[];` from `CrewMember`.

Remove this interface if `rg "CrewHourRuleHit" apps/web/src` shows no remaining use:

```ts
export interface CrewHourRuleHit {
  ruleId: string;
  severity: string;
  status: string;
  message: string;
  hitId: number | null;
  createdAtUtc: string | null;
}
```

- [ ] **Step 6: Run frontend verification**

Run:

```powershell
npm run build
npm run check:i18n
```

Expected:

```text
build succeeds
i18n check succeeds
```

---

### Task 2: Backend Crew API Boundary

**Files:**
- Modify: `apps/api/src/main/java/com/pilotroster/crew/CrewMemberController.java`
- Modify: `apps/api/src/test/java/com/pilotroster/crew/CrewMemberControllerIntegrationTests.java`

- [ ] **Step 1: Write a boundary test that stored HOUR hits do not appear in crew list**

In `CrewMemberControllerIntegrationTests`, replace the current test that expects `hourRuleHits` with a boundary test:

```java
@Test
void listKeepsRuleHitsOutOfCrewHourFacts() throws Exception {
    Long crewId = activeCrewId();
    jdbcTemplate.update("""
        INSERT INTO violation_hit (
            roster_version_id, rule_id, severity, status, message,
            task_id, crew_id, timeline_id, start_utc, end_utc, created_at_utc
        )
        SELECT rv.id, rc.id, 'BLOCK', 'OPEN', 'Crew exceeds rolling 28-day flight limit.',
               NULL, ?, NULL, NULL, NULL, CURRENT_TIMESTAMP
        FROM roster_version rv
        JOIN rule_catalog rc ON rc.rule_id = 'RG-HOUR-001' AND rc.active_flag = TRUE
        ORDER BY rv.created_at_utc DESC
        LIMIT 1
        """, crewId);

    mockMvc.perform(get("/api/crew-members").with(dispatcher()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[?(@.id == %d)].rollingFlightHours28d", crewId).exists())
        .andExpect(jsonPath("$.data[?(@.id == %d)].hourRuleHits", crewId).doesNotExist());
}
```

Expected first run before implementation:

```text
FAIL because hourRuleHits still exists in /api/crew-members response
```

- [ ] **Step 2: Remove rule-hit query from list endpoint**

Change:

```java
Map<Long, RuleDerivedFacts.CrewHourFact> crewHourFacts = ruleDerivedFactService.buildCrewHourCompatibilityFacts();
Map<Long, List<CrewHourRuleHitResponse>> hourRuleHits = hourRuleHitsByCrewId();
return ApiResponse.ok(crewMemberRepository.findAll().stream()
    .map(crew -> toResponse(crew, crewHourFacts.get(crew.getId()), hourRuleHits.getOrDefault(crew.getId(), List.of())))
    .toList());
```

To:

```java
Map<Long, RuleDerivedFacts.CrewHourFact> crewHourFacts = ruleDerivedFactService.buildCrewHourCompatibilityFacts();
return ApiResponse.ok(crewMemberRepository.findAll().stream()
    .map(crew -> toResponse(crew, crewHourFacts.get(crew.getId())))
    .toList());
```

- [ ] **Step 3: Remove unused imports and constructor dependency**

Remove imports if no longer used:

```java
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
```

Keep `java.util.List` and `java.util.Map` if still used by other records/methods in the file.

Remove field:

```java
private final JdbcTemplate jdbcTemplate;
```

Remove constructor parameter:

```java
JdbcTemplate jdbcTemplate
```

- [ ] **Step 4: Remove backend response field**

Change `toResponse` to no longer accept rule hits:

```java
private CrewMemberResponse toResponse(CrewMember crew, RuleDerivedFacts.CrewHourFact crewHourFact) {
```

Remove the final `hourRuleHits` argument from the `new CrewMemberResponse(...)` call.

Remove this field from the response record:

```java
List<CrewHourRuleHitResponse> hourRuleHits
```

Delete:

```java
private Map<Long, List<CrewHourRuleHitResponse>> hourRuleHitsByCrewId() { ... }

record CrewHourRuleHitResponse(
    String ruleId,
    String severity,
    String status,
    String message,
    Long hitId,
    Instant createdAtUtc
) {}
```

- [ ] **Step 5: Run backend boundary tests**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=CrewMemberControllerIntegrationTests,RuleDerivedFactServiceIntegrationTests" test
```

Expected:

```text
BUILD SUCCESS
```

---

### Task 3: Preserve Rule Engine HOUR Hits in Validation Modules

**Files:**
- Verify only: `apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java`
- Verify only: `apps/api/src/test/java/com/pilotroster/rule/RuleDerivedFactServiceIntegrationTests.java`
- Verify only: `apps/web/src/app/pages/IssueHandlingPage.tsx`

- [ ] **Step 1: Confirm HOUR rule engine still generates real hits**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=RuleDerivedFactServiceIntegrationTests#evaluateLatestRosterCreatesHourRuleHitsFromCrewHourCompatibilityFacts" test
```

Expected:

```text
BUILD SUCCESS
```

- [ ] **Step 2: Confirm validation issue DTO still accepts crew-level HOUR hits**

Run:

```powershell
mvn.cmd -f apps\api\pom.xml "-Dtest=ValidationPublishIntegrationTests" test
```

Expected:

```text
BUILD SUCCESS
```

- [ ] **Step 3: Confirm frontend issue handling build still passes**

Run:

```powershell
npm run build
```

Expected:

```text
build succeeds
```

---

### Task 4: Manual Browser Verification

**Files:**
- No source changes.

- [ ] **Step 1: Open the crew hours page**

Use Browser Use or the in-app browser:

```text
http://127.0.0.1:5180
```

Navigate:

```text
机组资源中心 -> 机组信息 -> 小时与限制
```

Expected:

```text
The table shows current accumulated hours and utilization hints only.
No RG-HOUR rule ID appears.
No "打开关联现场" link appears in the hours table.
No validation/violation copy appears in this fact view.
```

- [ ] **Step 2: Validate rule-side behavior separately**

Navigate:

```text
校验与问题处理
```

Expected:

```text
Rule hits, blocking status, and related context remain visible in validation/rule pages when validation data contains hits.
```

- [ ] **Step 3: Do not mutate seed data for visual proof unless explicitly approved**

If a red-rule visual proof is needed, use a temporary local DB update and restore original values immediately after testing. Do not change migrations or seed data just to manufacture a red state.

---

## Risks and Mitigations

- **Risk: Accidentally removing the HOUR engine instead of only removing fact-page display.**
  - Mitigation: Do not edit `RuleEvaluationService` except if tests reveal a compile issue. Keep `evaluateLatestRosterCreatesHourRuleHitsFromCrewHourCompatibilityFacts` passing.

- **Risk: Crew page loses current-hour values.**
  - Mitigation: Keep `RuleDerivedFactService.buildCrewHourCompatibilityFacts()` in `CrewMemberController.list()`. Only remove `violation_hit` lookup.

- **Risk: API contract change breaks hidden frontend consumers.**
  - Mitigation: Run `rg "hourRuleHits|CrewHourRuleHit"` after edits. If only tests/types referenced it, removal is safe.

- **Risk: UI still uses red as if it were a violation result.**
  - Mitigation: Keep badges as utilization/threshold hints only. Text should say "常规上限", "特殊区间", or "超过参考上限", not rule IDs or violation handling.

- **Risk: False confidence from current data having no HOUR hits.**
  - Mitigation: Tests must insert stored HOUR hits and prove crew list still does not expose them, while rule evaluation tests prove hits still exist in validation path.

- **Risk: Subagent touches unrelated rule center / validation code.**
  - Mitigation: Give workers explicit write scope. Task 1 owns only `CrewLimitsSection.tsx` and `types.ts`; Task 2 owns only `CrewMemberController.java` and its integration test; Task 3 is verification only unless compile errors require a minimal fix.

---

## Execution Order

1. Task 1: Frontend fact-only display.
2. Task 2: Backend crew API boundary.
3. Task 3: Rule engine preservation checks.
4. Task 4: Manual browser verification.

This order keeps user-facing semantics corrected first, then cleans API leakage, then proves the rule engine has not regressed.
