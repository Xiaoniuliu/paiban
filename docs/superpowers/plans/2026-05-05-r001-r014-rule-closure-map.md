# R001-R014 Rule Closure Map

**Source of truth for this pass:** root `index.html` demand prototype.

**Source anchors:**
- Rule summary: `index.html:438`
- R001-R014 table: `index.html:902`
- DDO prototype helpers: `index.html:3469`
- Compliance prototype helpers: `index.html:6900`
- Rolling time aggregation prototype: `index.html:7215`
- Same-time task conflict prototype: `index.html:7685`

## Decision

Use `index.html` as a product-side closure list, not as production code. The table is useful for narrowing the rule-engine backlog; the JavaScript helpers are useful for business intent and edge cases, but several helpers are simplified and must not be copied directly into the backend.

## Mapping

| Prototype ID | Prototype requirement | Backend rule ID | Current backend state | Reuse / do-not-copy notes |
| --- | --- | --- | --- | --- |
| R001 | Consecutive duty days <= 6 | `RG-DDO-001` | Executable: `active_flag=true`, `version_status=ACTIVE` | Reuse as DDO sequence target. Day-7 positioning remains conservative until a dedicated return-base fact exists. |
| R002 | Single FDP <= 14h | `RG-FDP-006` | Executable: `active_flag=true`, `version_status=ACTIVE` | Do not copy prototype helper: it compares a rolling duty aggregate, not a single FDP. Backend uses `fdp_minutes <= allowable_fdp_minutes` from FDP/REST facts. |
| R003 | Rolling 7-day duty <= 55h, with special 60h / 70h variants | `RG-HOUR-003` | Executable: `active_flag=true`, `version_status=ACTIVE` | Reuse threshold. Special 60h / 70h variants remain separate policy inputs; do not hide them in the base 55h rule. |
| R004 | Rolling 14-day duty <= 95h | `RG-HOUR-006` | Executable: `active_flag=true`, `version_status=ACTIVE` | Reuse threshold. Backend must keep archived actual + planned projection source split. |
| R005 | Rolling 28-day duty <= 190h | `RG-HOUR-007` | Executable: `active_flag=true`, `version_status=ACTIVE` | Reuse threshold. Time-zone reduction belongs to a separate derivation rule, not the base comparison. |
| R006 | Not present in prototype table | None | No catalog row / not executable | Keep absent unless product adds it explicitly. |
| R007 | Rolling 28-day flight <= 100h | `RG-HOUR-001` | Executable: `active_flag=true`, `version_status=ACTIVE` | Reuse threshold. Backend uses flight-minute facts and evidence windows. |
| R008 | Rolling 12-month flight <= 900h | `RG-HOUR-002` | Executable: `active_flag=true`, `version_status=ACTIVE` | Reuse threshold, but backend uses the agreed previous-month cutoff; do not copy prototype's plain 12-month rolling interpretation. |
| R009 | Standby <= 12h | `RG-STBY-002` | Catalog/system-gate visible only for this closure; not in the 13-rule calculation-engine executable set | Reuse threshold. Later standby callout/FDP interactions stay in standby/FDP derivations and require a separate activation decision before entering the calculation engine set. |
| R010 | Post-flight minimum rest >= max(11h, previous duty) | `RG-REST-001`, `RG-REST-*` | Catalog-only / derivation boundary except executable `RG-REST-004` and `RG-REST-008` | Do not copy prototype helper: it mostly checks same-day duty duration, not actual rest interval. Needs broader rest chain facts beyond the active P0 slice. |
| R011 | Single DDO >= 34h with two local nights | `RG-BASE-008` | Executable: `active_flag=true`, `version_status=ACTIVE` | Reuse. Backend counts a local night only when the DDO overlaps 22:00-08:00 by at least 8 continuous hours. |
| R012 | Any rolling 14 days contain 2 consecutive DDOs | `RG-DDO-003` | Executable: `active_flag=true`, `version_status=ACTIVE` | Do not copy prototype simplification: it checks at least one valid DDO. Backend uses rolling 14-day DDO sequence facts. |
| R013 | Three four-week periods average >= 8 DDOs | `RG-DDO-004` | Catalog-only: `active_flag=false`, `version_status=CATALOG_ONLY` | Do not copy prototype simplification: it checks at least two DDOs in 28 days. The rule requires a historical cycle baseline across three four-week periods; it is not evaluator-managed, not activated, and needs a future rule-engine step after the auditable historical DDO source is agreed. |
| R014 | Same-time overlapping task conflict | `CREW_TIME_OVERLAP`, `CREW_STATUS_CONFLICT`, `RG-TIME-008` | Catalog/system-gate visible only for this closure; not in the 13-rule calculation-engine executable set | Use as product confirmation only. Prototype checks same-date overlaps and can miss overnight overlaps. Gate-like overlap behavior is outside the exact P0 `EVALUATION_RULE` activation set normalized by Task 4. |

## DDO fact-builder slice

This pass moves the executable DDO rules out of the placeholder boundary while keeping `RG-DDO-004` intentionally catalog-only.

Implemented fact semantics:
- Read active `DDO` timeline blocks scoped to the requested roster version.
- Ignore `CANCELLED` DDO blocks.
- Compute `ddoMinutes` from block start/end.
- Count local nights from the fixed roster-local `UTC+8` 22:00-08:00 window.
- Count one local night only when overlap is at least 8 continuous hours.
- Prove a valid base DDO before counting any continuous DDO chain.
- A valid base DDO is the earliest 34h-or-longer interval from the DDO block start that contains at least two counted local nights.
- If no valid base exists, `validDdoUnit=false` and `consecutiveDdoAfter=0`, even when total duration and total local-night count look sufficient in the aggregate.
- After the valid base is proven, count additional continuous DDO units only when both another 24h and another counted local night exist after the base.

Executable in this slice:
- `RG-BASE-008`: single DDO minimum duration and local-night evidence.
- `RG-DDO-001`: consecutive duty day scan.
- `RG-DDO-002`: day-7 return-base requirement, conservatively evaluated from available day-sequence facts until a dedicated return-base fact exists.
- `RG-DDO-003`: rolling 14-day two-consecutive-DDO requirement.

Executable catalog status after Task 4 normalization:
- `RG-BASE-008`, `RG-DDO-001`, `RG-DDO-002`, `RG-DDO-003`, `RG-HOUR-001`, `RG-HOUR-002`, `RG-HOUR-003`, `RG-HOUR-006`, `RG-HOUR-007`, `RG-FDP-006`, `RG-REST-004`, `RG-FDP-008`, and `RG-REST-008` are P0 `EVALUATION_RULE` rows with `active_flag=true` and `version_status=ACTIVE`.

Still intentionally catalog-only:
- `RG-DDO-004`: three four-week historical average. It requires a historical 3 x 4-week DDO baseline, is not evaluator-managed, has `active_flag=false`, has `version_status=CATALOG_ONLY`, remains visible in the catalog, and must not block validation or publish until the calculation engine has an auditable historical source.
- `RG-STBY-002`, `RG-TIME-008`, `CREW_TIME_OVERLAP`, and `CREW_STATUS_CONFLICT`: visible as catalog/system-gate concepts where applicable, but they are not part of the exact 13-rule calculation-engine executable set for this closure.

`RG-DDO-004` historical input boundary:
- Required crew identity: stable `crewId` for each DDO counted in the baseline.
- Required DDO window: exact DDO date/window start and end, not just a count copied from a prototype helper.
- Required local-night qualification: whether each DDO window satisfies the agreed local-night rule used by backend DDO facts.
- Required source lineage: roster/archive version that produced each historical DDO window, so recalculation and audit can explain the baseline.
- Required grouping: rolling 4-week buckets across three consecutive 4-week periods, with enough history to calculate the average without mixing current-roster projection and archived actuals silently.

Do not activate `RG-DDO-004` or add it to evaluator-managed rule sets until those inputs exist. Catalog visibility is intentional so product and rule-center users can see the rule boundary; absence from validation/publish blockers is also intentional.

## Next DDO order

1. Keep `RG-DDO-004` visible as catalog-only so product and rule-center users can see the requirement without receiving false blockers.
2. Define the historical cycle source-of-truth for three 4-week periods and the baseline needed to compute the 3x4-week average.
3. Add a future rule-engine step for `RG-DDO-004` only after that historical baseline is auditable and available to the evaluator.
