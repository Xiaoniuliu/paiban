# P0 Canonical Execution Checklist

## Purpose

This checklist is the first-pass operational reconciliation artifact for `P0` rules.

It is driven by:

- [PHASE3_RULE_ENGINE_CLASSIFICATION.md](/D:/paiban2/docs/archive/legacy-plans/PHASE3_RULE_ENGINE_CLASSIFICATION.md)
- [2026-05-01-p0-canonical-execution-design.md](/D:/paiban2/docs/superpowers/specs/2026-05-01-p0-canonical-execution-design.md)
- current live rule behavior in [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java)
- current publish-loop blocking semantics in [ValidationPublishService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/workbench/ValidationPublishService.java)

This file is intentionally operational.

It does not redefine rule theory.

It records the first canonical execution decisions.

---

## First-Pass Decision Rules

- Default source of truth: [PHASE3_RULE_ENGINE_CLASSIFICATION.md](/D:/paiban2/docs/archive/legacy-plans/PHASE3_RULE_ENGINE_CLASSIFICATION.md)
- Preserve system behavior only when there is a clear `业务例外`
- `P0` identity is separate from execution readiness
- Pending `P0` rules remain visible in the rule center
- Pending `P0` rules do not appear in publish results and do not participate in the current blocking loop
- A rule is in the current publish-blocking loop only if current issue severity contributes to `blockedCount`

Current blocking semantics are derived from [ValidationPublishService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/workbench/ValidationPublishService.java:180):

- only issue severity `BLOCK` contributes to `blockedCount`
- only issue severity `WARNING` contributes to `warningCount`
- current `NON_COMPLIANT` hits are visible in issue data but do not currently block publish

---

## Current Ordering

This checklist is ordered as agreed:

1. rules currently in the real publish-blocking loop
2. rules currently `ACTIVE` in system state but not in the publish-blocking loop
3. rules documented as `P0` but not currently `ACTIVE`

At the current schema state after [V28__p0_rules_mandatory_activation.sql](/D:/paiban2/apps/api/src/main/resources/db/migration/V28__p0_rules_mandatory_activation.sql), there are no confirmed first-pass entries in section 3 yet because `active_flag` was forced on for all `P0` rows.

The real distinctions now are mostly:

- `version_status`
- whether rule logic exists
- whether the rule can calculate
- whether the rule currently contributes to publish blocking

---

## Section 1: Current Publish-Blocking P0 Rules

These rules currently participate in the real publish-blocking loop because they are emitted by the rule evaluator with severity `BLOCK`, and `ValidationPublishService` counts `BLOCK` as blocking.

### TASK_STATUS_BLOCKED

- 规则主题：阻断状态不得发布
- 文档章节：当前系统门槛条目
- 文档口径：`task.status != BLOCKED`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`ACTIVE`
- 是否 ACTIVE：`是`
- 是否可计算：`是`
- 是否进发布阻断：`是`

- 当前接入状态：`已接入`
- 是否进入当前发布阻断闭环：`是`

- 差异说明：文档与系统一致。当前代码在 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:111) 以 `BLOCK` 输出。
- 后续动作：保持为 canonical baseline。

### CREW_TIME_OVERLAP

- 规则主题：同一机组时间块不得重叠
- 文档章节：当前系统门槛条目
- 文档口径：`left.end <= right.start || right.end <= left.start`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`ACTIVE`
- 是否 ACTIVE：`是`
- 是否可计算：`是`
- 是否进发布阻断：`是`

- 当前接入状态：`已接入`
- 是否进入当前发布阻断闭环：`是`

- 差异说明：文档与系统一致。当前代码在 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:158) 通过重叠检测输出 `BLOCK`。
- 后续动作：后续补标准化 evidence 表达，但不影响 canonical 地位。

### CREW_STATUS_CONFLICT

- 规则主题：飞行不得与休息/状态块冲突
- 文档章节：当前系统门槛条目
- 文档口径：`!overlap(flight, rest_or_status)`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`ACTIVE`
- 是否 ACTIVE：`是`
- 是否可计算：`是`
- 是否进发布阻断：`是`

- 当前接入状态：`已接入`
- 是否进入当前发布阻断闭环：`是`

- 差异说明：文档与系统一致。当前代码与 `CREW_TIME_OVERLAP` 共用冲突扫描，在 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:158) 根据 flight/status block 类型切换 rule id。
- 后续动作：保持为 canonical baseline。

### RG-FDP-003

- 规则主题：缺航段数不得计算
- 文档章节：`FRD 13.3 / FOM 7.1`
- 文档口径：`sector_count is not null && sector_count > 0`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`ACTIVE`
- 是否 ACTIVE：`是`
- 是否可计算：`是`
- 是否进发布阻断：`是`

- 当前接入状态：`已接入`
- 是否进入当前发布阻断闭环：`是`

- 差异说明：文档与系统一致。当前代码在 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:204) 以 `BLOCK` 输出。
- 后续动作：保持为 canonical baseline；后续事实层仍需保证 sector count 来源稳定。

### RG-FDP-007

- 规则主题：两人制大于 9h 或夜间大于 8h 需增员
- 文档章节：`FRD 13.3 / FOM 7.1`
- 文档口径：`!(two_pilot && (fdp > 9h || night_fdp > 8h)) || augmented`
- 规则类型：`EVALUATION_RULE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`是，部分`
- 是否进发布阻断：`是`

- 当前接入状态：`待实现`
- 是否进入当前发布阻断闭环：`是`

- 差异说明：系统当前只实现了 `fdp > 9h && assignedCrewCount <= 2` 这一部分，在 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:220) 以 `BLOCK` 输出；文档要求还包括 `night_fdp > 8h` 与 `augmented` 判定。这里不是业务例外，而是部分实现。
- 后续动作：保持在当前阻断闭环中，但明确标记为“部分实现”；后续补 `night_fdp` 和 `augmented/facility` 事实。

---

## Section 2: ACTIVE But Not In The Current Publish-Blocking Loop

These rules are already present in system state as active identities, but do not currently participate in real publish blocking.

Some are implemented but use a non-blocking severity under the current `ValidationPublishService` counting rule.

Some remain active catalog rows without complete execution.

### RG-TIME-008

- 规则主题：时间顺序合法性
- 文档章节：`FRD 13.2 / FOM 7.1`
- 文档口径：`end_utc > start_utc`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`ACTIVE`
- 是否 ACTIVE：`是`
- 是否可计算：`是`
- 是否进发布阻断：`否`

- 当前接入状态：`已接入`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：当前代码会生成命中，但 severity 是 `NON_COMPLIANT`，见 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:194) 和 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:235)，而 [ValidationPublishService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/workbench/ValidationPublishService.java:186) 只把 `BLOCK` 计入阻断。
- 后续动作：后续单独决定它是否应该提升为当前真实阻断，而不是默认凭 `P0` 自动进入。

### RG-BASE-008

- 规则主题：单次 DDO 至少 34h 且 2 个 local nights
- 文档章节：`FRD 13.1 / FOM 7.1`
- 文档口径：`ddo_minutes >= 2040 && local_nights >= 2`
- 规则类型：`EVALUATION_RULE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`ACTIVE`
- 是否 ACTIVE：`是`
- 是否可计算：`是，部分`
- 是否进发布阻断：`否`

- 当前接入状态：`待补事实`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：当前代码只实现了 `34h` 部分，在 [RuleEvaluationService.java](/D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java:246) 以 `NON_COMPLIANT` 输出；文档要求还包含 `local_nights >= 2`。这更像事实层缺口而不是纯算法空白。
- 后续动作：保持 `P0` 身份，但不进入当前阻断闭环；规则中心详情应明确 `待补事实`。

### RG-BASE-001

- 规则主题：Home Base 必填
- 文档章节：`FRD 13.1 / FOM 7.1`
- 文档口径：`crew.home_base is not null`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`否`
- 是否进发布阻断：`否`

- 当前接入状态：`待补事实`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：文档口径明确，但当前 Phase 3 publish loop 尚未把 crew home-base completeness 接入真实阻断。
- 后续动作：保留 `P0`，等待事实层与 gate 决策。

### RG-BASE-002

- 规则主题：当前适应状态必填
- 文档章节：`FRD 13.1 / FOM 7.1`
- 文档口径：`crew.acclimatization_status is not null`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`否`
- 是否进发布阻断：`否`

- 当前接入状态：`待补事实`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：适应状态尚未形成可稳定消费的事实层输入。
- 后续动作：后续与 FDP / recovery 事实层一起处理。

### RG-BASE-003

- 规则主题：时区信息必填
- 文档章节：`FRD 13.1 / FOM 7.1`
- 文档口径：`event.timezone is not null`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`否`
- 是否进发布阻断：`否`

- 当前接入状态：`待补事实`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：机场/事件时区虽然有主数据基础，但尚未被统一接成规则引擎事实层完整性 gate。
- 后续动作：后续与 local night / WOCL / time-zone 派生一起处理。

### RG-FDP-004

- 规则主题：缺起始时间 band 不得计算
- 文档章节：`FRD 13.3 / FOM 7.1`
- 文档口径：`start_band is not null`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`否`
- 是否进发布阻断：`否`

- 当前接入状态：`待补事实`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：依赖 `CALCULATION_METHOD` 层先稳定产出 `start_band`。
- 后续动作：放入首批事实层建设候选。

### RG-FDP-005

- 规则主题：缺 preceding rest band 不得计算
- 文档章节：`FRD 13.3 / FOM 7.1`
- 文档口径：`preceding_rest_band is not null`
- 规则类型：`OPERATIONAL_GATE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`否`
- 是否进发布阻断：`否`

- 当前接入状态：`待补事实`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：依赖 rest 派生链路先落地。
- 后续动作：放入 FDP / Rest 事实层批次。

### RG-FDP-006

- 规则主题：FDP 不得超过允许上限
- 文档章节：`FRD 13.3 / FOM 7.1`
- 文档口径：`fdp_minutes <= allowable_fdp_minutes`
- 规则类型：`EVALUATION_RULE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`否`
- 是否进发布阻断：`否`

- 当前接入状态：`待实现`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：文档口径明确，但依赖 Table A / B 和 preceding-rest/start-band 等派生链路，当前系统未接入。
- 后续动作：这是最典型的后续规则引擎首批候选。

### RG-FDP-008

- 规则主题：Reduced Rest 后不可直接按普通表放行
- 文档章节：`FRD 13.3 / FOM 7.1`
- 文档口径：`!preceded_by_reduced_rest || special_assessment_passed`
- 规则类型：`EVALUATION_RULE`
- 严重等级：`P0`

- 系统现状
- 目录状态：`CATALOG_ONLY`
- 是否 ACTIVE：`是`
- 是否可计算：`否`
- 是否进发布阻断：`否`

- 当前接入状态：`待实现`
- 是否进入当前发布阻断闭环：`否`

- 差异说明：规则口径明确，但链路依赖 reduced-rest 事实与 assessment 事实。
- 后续动作：后续与 rest/recovery 链路一起处理。

---

## Section 3: Documented P0 But Not Currently ACTIVE

At this first-pass checkpoint, no confirmed entries are listed here because [V28__p0_rules_mandatory_activation.sql](/D:/paiban2/apps/api/src/main/resources/db/migration/V28__p0_rules_mandatory_activation.sql) forces `active_flag = TRUE` for current `P0` rows.

If future review finds documented `P0` rules missing from the live catalog or intentionally deactivated, they should be added here.

---

## Immediate Follow-Up Candidates

The most important next reconciliation targets after this first pass are:

- `RG-FDP-006`
- `RG-FDP-008`
- `RG-FDP-004`
- `RG-FDP-005`
- `RG-BASE-001`
- `RG-BASE-002`
- `RG-BASE-003`
- `RG-REST-004`
- `RG-REST-008`
- `RG-POS-010`
- `RG-STBY-001`

These are good next candidates because they are all `P0`, are not yet cleanly inside the current blocking loop, and represent either fact-gap or implementation-gap work instead of low-priority catalog cleanup.
