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
| R001 | Consecutive duty days <= 6 | `RG-DDO-001` | Active fact path / executable hit path present | Reuse as DDO sequence target. Day-7 positioning remains conservative until a dedicated return-base fact exists. |
| R002 | Single FDP <= 14h | `RG-FDP-006` | Catalog only | Do not copy prototype helper: it compares a rolling duty aggregate, not a single FDP. Backend should use `fdp_minutes <= allowable_fdp_minutes` from FDP/REST facts. |
| R003 | Rolling 7-day duty <= 55h, with special 60h / 70h variants | `RG-HOUR-003` | Active fact path / executable hit path present | Reuse threshold. Special 60h / 70h variants remain separate policy inputs; do not hide them in the base 55h rule. |
| R004 | Rolling 14-day duty <= 95h | `RG-HOUR-006` | Active fact path / executable hit path present | Reuse threshold. Backend must keep archived actual + planned projection source split. |
| R005 | Rolling 28-day duty <= 190h | `RG-HOUR-007` | Active fact path / executable hit path present | Reuse threshold. Time-zone reduction belongs to a separate derivation rule, not the base comparison. |
| R006 | Not present in prototype table | None | None | Keep absent unless product adds it explicitly. |
| R007 | Rolling 28-day flight <= 100h | `RG-HOUR-001` | Active fact path / executable hit path present | Reuse threshold. Backend uses flight-minute facts and evidence windows. |
| R008 | Rolling 12-month flight <= 900h | `RG-HOUR-002` | Active fact path / executable hit path present | Reuse threshold, but backend uses the agreed previous-month cutoff; do not copy prototype's plain 12-month rolling interpretation. |
| R009 | Standby <= 12h | `RG-STBY-002` | Active simple evaluator | Reuse threshold. Later standby callout/FDP interactions stay in standby/FDP derivations. |
| R010 | Post-flight minimum rest >= max(11h, previous duty) | `RG-REST-001`, `RG-REST-*` | Catalog / derivation only | Do not copy prototype helper: it mostly checks same-day duty duration, not actual rest interval. Needs rest chain facts. |
| R011 | Single DDO >= 34h with two local nights | `RG-BASE-008` | Active evaluator; DDO fact builder now emits reusable facts | Reuse. Backend counts a local night only when the DDO overlaps 22:00-08:00 by at least 8 continuous hours. |
| R012 | Any rolling 14 days contain 2 consecutive DDOs | `RG-DDO-003` | Active fact path / executable hit path present | Do not copy prototype simplification: it checks at least one valid DDO. Backend uses rolling 14-day DDO sequence facts. |
| R013 | Three four-week periods average >= 8 DDOs | `RG-DDO-004` | Visible catalog-only / not executable yet | Do not copy prototype simplification: it checks at least two DDOs in 28 days. The rule requires a historical cycle baseline across three four-week periods; it is not evaluator-managed, not activated, and needs a future rule-engine step after the auditable historical DDO source is agreed. |
| R014 | Same-time overlapping task conflict | `CREW_TIME_OVERLAP`, `CREW_STATUS_CONFLICT`, `RG-TIME-008` | Phase 2/3 paths already stronger | Use as product confirmation only. Prototype checks same-date overlaps and can miss overnight overlaps. |

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

Still intentionally catalog-only:
- `RG-DDO-004`: three four-week historical average. It requires a historical cycle baseline, is not evaluator-managed, is not activated, and needs a future rule-engine step once the historical DDO source-of-truth is agreed.

## Next DDO order

1. Keep `RG-DDO-004` visible as catalog-only so product and rule-center users can see the requirement without receiving false blockers.
2. Define the historical cycle source-of-truth for three 4-week periods and the baseline needed to compute the 3x4-week average.
3. Add a future rule-engine step for `RG-DDO-004` only after that historical baseline is auditable and available to the evaluator.
