# 三期规则引擎与全量条目重分类

更新时间：2026-04-27

## 1. 文档定位

本文替代旧版 `PHASE3_RULE_PRIORITY_INDEX.md` 作为三期规则引擎排期和业务核对的主索引。

核心口径：

- 全量 `PLAN.md / FRD 第 13 章` 条目都进入“法规/规定索引”。
- 只有能写成明确判定条件的条目进入“三期计算规则引擎”。
- “规则”不等于所有法规文字。这里的规则必须能输出 predicate、actual value、limit value、evidence window 和 Rule ID。
- 规定、信息、流程门槛、计算方法都可以很重要，但不应混进计算规则引擎。

引用来源：

- [PLAN.md](</D:/paiban2/PLAN.md>)
- [FRD_Pilot_Rostering_System_Master.md](</D:/paiban2/FRD_Pilot_Rostering_System_Master.md>) 第 13 章
- [PHASE3_RULE_ENGINE_BACKLOG.md](</D:/paiban2/PHASE3_RULE_ENGINE_BACKLOG.md>)
- [PHASE3_RULE_CATALOG_REVIEW.md](</D:/paiban2/PHASE3_RULE_CATALOG_REVIEW.md>)
- [PHASE3_RULE_ENGINE_PROGRESS.md](</D:/paiban2/PHASE3_RULE_ENGINE_PROGRESS.md>)
- [RuleEvaluationService.java](</D:/paiban2/apps/api/src/main/java/com/pilotroster/rule/RuleEvaluationService.java>)
- [V20__rule_catalog_reviewable_rules_only.sql](</D:/paiban2/apps/api/src/main/resources/db/migration/V20__rule_catalog_reviewable_rules_only.sql>)

## 2. 当前代码进度

当前后端已有 `RuleEvaluationService`，已接入基础命中：

- 发布/流程门槛：待排、任务阻断、缺 PIC/FO、经理复核。
- 时间冲突：同一机组 timeline block 重叠、飞行块与 REST / DDO / TRAINING / STANDBY / DUTY / RECOVERY 状态块冲突。
- 三期基础规则雏形：`RG-TIME-008`、`RG-FDP-003`、`RG-FDP-007`、`RG-BASE-008` 34h 部分、`RG-STBY-002`。

当前 `rule_catalog` 已导入全量 `RG-*`，但 `catalog_entry_type` 仍是粗分类：

- `DISPLAY_RULE`：混有真正计算规则、流程门槛、记录治理和法规规定。
- `DERIVATION`：大多是计算方法，但建议统一口径为 `CALCULATION_METHOD`。
- `SYSTEM_GATE`：发布/归档流程门槛，应继续存在，但和法规计算命中分开展示。
- `RULE_GROUP`：只做分组，不参与计算。

## 3. 新分类模型

| 分类 | 是否进计算规则引擎 | 说明 |
|---|---:|---|
| `EVALUATION_RULE` | 是 | 真正可计算 predicate，例如 `fdp_minutes <= allowable_fdp_minutes`、`ddo_minutes >= 34h && local_nights >= 2`。 |
| `CALCULATION_METHOD` | 否 | 计算口径或派生方法，例如 Table A/B/X、report time、local night、rolling window。它产出证据，不直接产出违规。 |
| `OPERATIONAL_GATE` | 否，但进发布/归档校验 | 系统流程门槛，例如缺 PIC/FO、待排、记录缺失不得发布/归档。它重要，但不是法规计算规则。 |
| `REGULATION_REQUIREMENT` | 否 | 法规/公司规定、治理要求或管理职责，不适合排班计算引擎直接判定。 |
| `REFERENCE_INFO` | 否 | 定义、说明、术语、背景信息。 |
| `RULE_GROUP` | 否 | 归纳分组，不作为最终执行条目。 |

## 4. 规则引擎建议架构

### 4.1 数据事实层

统一读取和标准化事实，不在规则里直接查散表：

- `task_plan_item`：航班、调机、训练、任务状态、计划开始/结束、航段数。
- `timeline_block`：机组分配、状态块、block type、assignment role、开始/结束。
- crew 主数据：base、role、qualification、acclimatization 状态。
- airport/timezone：机场时区、local night、base timezone。
- archive actual：实际 duty/FDP/flying hour/no flying hour。
- exception/CDR/AACM：discretion、报送、书面记录、授权人、PIC 决策。

### 4.2 派生计算层

只做 `CALCULATION_METHOD`：

- report time / finish time / rest start。
- duty / FDP / rest / DDO / recovery window。
- Table A / B / X lookup。
- local night、start band、preceding rest band。
- acclimatization、time-zone change、recovery eligibility。
- rolling 7d / 14d / 28d / 12m flight and duty totals。

输出统一 `DerivedFact`，供规则层引用。

### 4.3 规则判定层

只执行 `EVALUATION_RULE`。每个命中必须包含：

- Rule ID
- predicate
- actual value
- limit value
- evidence window
- severity
- source facts
- recommended action

示例：

```text
Rule ID: RG-FDP-006
predicate: fdp_minutes <= allowable_fdp_minutes
actual: 850
limit: 780
evidence window: duty_start_utc..duty_end_utc
severity: NON_COMPLIANT
```

### 4.4 流程门槛层

`OPERATIONAL_GATE` 继续参与发布/归档校验，但不混入法规违规统计：

- 待排、阻断状态、缺 PIC/FO。
- 记录缺失不得发布/归档。
- CDR/AACM 必填、经理确认、授权提交。

前端展示建议分两组：

- 法规规则命中：来自 `EVALUATION_RULE`。
- 系统流程门槛：来自 `OPERATIONAL_GATE`。

### 4.5 规定与信息层

`REGULATION_REQUIREMENT / REFERENCE_INFO` 进入规则中心说明、审计清单、报表提醒，不进入核心排班计算引擎。

## 5. 严重程度口径

| 严重程度 | 说明 |
|---|---|
| `P0 BLOCK` | 发布阻断、法规高风险、飞行安全强相关。 |
| `P1 NON_COMPLIANT` | 运行安全强相关或法规违规，需要修正或正式例外。 |
| `P2 WARNING` | 需要经理复核、留痕、告警或治理提醒。 |
| `P3 DERIVATION` | 派生计算、证据口径、定义说明。 |
| `P3 INFO` | 信息、管理规定、记录保存，不直接计算。 |

## 6. 当前系统门槛条目

这些条目不是 FRD 第 13 章 `RG-*`，但当前代码已用于发布/校验闭环，应保留在门槛层。

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `CREW_ASSIGNMENT_REQUIRED` | 任务必须完成机组分配 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `task.status != UNASSIGNED` | `ACTIVE` | 保留为发布门槛。 |
| `TASK_STATUS_BLOCKED` | 阻断状态不得发布 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `task.status != BLOCKED` | `ACTIVE` | 保留为发布门槛。 |
| `CREW_PAIR_REQUIRED` | 航班必须有 PIC / FO | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `has_pic && has_fo` | `ACTIVE` | 与多人分配接口保持一致。 |
| `MANAGER_REVIEW_REQUIRED` | WARNING 需经理复核 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `warning_hit -> manager_confirmed` | `ACTIVE` | 与发布审计关联。 |
| `CREW_TIME_OVERLAP` | 同一机组时间块不得重叠 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `left.end <= right.start || right.end <= left.start` | `ACTIVE` | 保留，并补 evidence window。 |
| `CREW_STATUS_CONFLICT` | 飞行不得与休息/状态块冲突 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `!overlap(flight, rest_or_status)` | `ACTIVE` | 对接机组与状态模块。 |

## 7. FRD 第 13 章全量条目重分类

### 7.1 基础定义与状态

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-BASE-001` | Home Base 必填 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `crew.home_base is not null` | `CATALOG_ONLY` | 放到主数据/发布门槛，不进法规计算。 |
| `RG-BASE-002` | 当前适应状态必填 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `crew.acclimatization_status is not null` | `CATALOG_ONLY` | 缺失时阻断 FDP 计算。 |
| `RG-BASE-003` | 时区信息必填 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `event.timezone is not null` | `CATALOG_ONLY` | 放事实完整性校验。 |
| `RG-BASE-004` | 飞后 30 分钟计入 duty | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `duty_finish = flight_arrival + 30m` | `CALCULATION_METHOD` | 纳入 duty 派生计算。 |
| `RG-BASE-005` | 大于 3h 时差转 unacclimatized | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `abs(zone_diff) > 3h -> unacclimatized` | `CALCULATION_METHOD` | 纳入适应状态派生。 |
| `RG-BASE-006` | 48h 内返 base 可恢复 acclimatized | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `return_base_within_48h -> acclimatized` | `CALCULATION_METHOD` | 纳入适应状态派生。 |
| `RG-BASE-007` | 大于 48h 返 base 需 recovery 才恢复 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `time_away <= 48h || recovery_completed` | `CATALOG_ONLY` | 接入 recovery completion predicate。 |
| `RG-BASE-008` | 单次 DDO 至少 34h 且 2 个 local nights | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `ddo_minutes >= 2040 && local_nights >= 2` | `ACTIVE` | 当前只校验 34h，三期补 local nights。 |
| `RG-BASE-009` | EXB 至少 30h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `exb_minutes >= 1800` | `CATALOG_ONLY` | 接入 EXB 有效性判断。 |
| `RG-BASE-010` | 统计周口径统一 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `week_window = configured_base_week` | `CALCULATION_METHOD` | 作为 rolling window 基准配置。 |

### 7.2 报到与结束时间

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-TIME-001` | Flight report 默认 STD - 60 min | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `report = std - 60m unless earlier_notice` | `CALCULATION_METHOD` | 接入 report time 派生。 |
| `RG-TIME-002` | Positioning report 默认 STD - 60 min | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `positioning_report = std - 60m unless earlier_notice` | `CALCULATION_METHOD` | 接入调机 report 派生。 |
| `RG-TIME-003` | Effective report 取计划/实际较晚者 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `effective_report = max(planned_report, actual_report)` | `CALCULATION_METHOD` | 接入 actual 派生。 |
| `RG-TIME-004` | 无后续 duty 时计划 rest 起点为 STA + 30 min | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `planned_rest_start = sta + 30m` | `CALCULATION_METHOD` | 接入 rest start 派生。 |
| `RG-TIME-005` | 实际 rest 起点为 ATA + 30 min 或更晚异常结束值 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `actual_rest_start = max(ata + 30m, disruption_end)` | `CALCULATION_METHOD` | 接入 archive actual 派生。 |
| `RG-TIME-006` | Other duty 结束即 finish | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `other_duty_finish = other_duty_end` | `CALCULATION_METHOD` | 接入 duty 派生。 |
| `RG-TIME-007` | 长期机场流程延迟触发提醒 | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `trend_delay_threshold exceeded -> governance alert` | `CATALOG_ONLY` | 放治理报表，不进排班计算核心。 |
| `RG-TIME-008` | 时间顺序合法性 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `end_utc > start_utc` | `ACTIVE` | 保留事实完整性阻断。 |

### 7.3 标准 FDP

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-FDP-001` | Acclimatized 用 Table A | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `allowable_fdp = table_a(start_band, sectors)` | `CALCULATION_METHOD` | 实现 Table A lookup。 |
| `RG-FDP-002` | Unacclimatized 用 Table B | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `allowable_fdp = table_b(rest_band, sectors)` | `CALCULATION_METHOD` | 实现 Table B lookup。 |
| `RG-FDP-003` | 缺航段数不得计算 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `sector_count is not null && sector_count > 0` | `ACTIVE` | 保留为数据门槛。 |
| `RG-FDP-004` | 缺起始时间 band 不得计算 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `start_band is not null` | `CATALOG_ONLY` | 接入派生前置门槛。 |
| `RG-FDP-005` | 缺 preceding rest band 不得计算 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `preceding_rest_band is not null` | `CATALOG_ONLY` | 接入派生前置门槛。 |
| `RG-FDP-006` | FDP 不得超过允许上限 | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `fdp_minutes <= allowable_fdp_minutes` | `CATALOG_ONLY` | 三期核心规则，依赖 Table A/B。 |
| `RG-FDP-007` | 两人制大于 9h 或夜间大于 8h 需增员 | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `!(two_pilot && (fdp > 9h || night_fdp > 8h)) || augmented` | `ACTIVE` | 当前只做 >9h，补 night FDP 和 facility。 |
| `RG-FDP-008` | Reduced Rest 后不可直接按普通表放行 | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `!preceded_by_reduced_rest || special_assessment_passed` | `CATALOG_ONLY` | 接入 reduced rest 链路。 |

### 7.4 Extended FDP / Relief

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-EXT-001` | 无 relief qualification 或 facility 不得 extended FDP | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `extended_fdp -> relief_qualified && facility_available` | `CATALOG_ONLY` | 接入 relief 资质和设施事实。 |
| `RG-EXT-002` | relief 小于 3h 不得延长 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `extended_fdp -> relief_minutes >= 180` | `CATALOG_ONLY` | 接入 relief window。 |
| `RG-EXT-003` | bunk 延长 = relief/2，封顶 18h | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `extended_limit = min(base + relief/2, 18h)` | `CALCULATION_METHOD` | 实现 bunk extension 计算。 |
| `RG-EXT-004` | seat 延长 = relief/3，封顶 15h | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `extended_limit = min(base + relief/3, 15h)` | `CALCULATION_METHOD` | 实现 seat extension 计算。 |
| `RG-EXT-005` | controls 连续不得大于 8h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `max_continuous_controls_minutes <= 480` | `CATALOG_ONLY` | 需要 controls segment 事实。 |
| `RG-EXT-006` | 超 8h 前必须有至少 1h complete relief | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `controls_over_8h -> complete_relief_before_overrun >= 60m` | `CATALOG_ONLY` | 接入 relief sequence。 |
| `RG-EXT-007` | 单 FDP 内 controls 累计不得大于 10h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `sum_controls_minutes <= 600` | `CATALOG_ONLY` | 需要 controls 记录。 |
| `RG-EXT-008` | 可计 relief 最大值不得超过 actual block - 1h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `credited_relief_minutes <= actual_block_minutes - 60` | `CATALOG_ONLY` | 依赖实际 block time。 |
| `RG-EXT-009` | 非计划地停休息仅在满足条件时可计 relief | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `unscheduled_ground_relief_credited = conditions_met ? minutes : 0` | `CALCULATION_METHOD` | 作为 relief credit 派生。 |
| `RG-EXT-010` | 完成 relief 后余下航段可按 positioning 处理 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `post_relief_remaining_sector_role = POSITIONING when no duty` | `CALCULATION_METHOD` | 影响 duty/FDP 归属。 |
| `RG-EXT-011` | 长航段增员必须提供 seat 或 bunk | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `augmented_long_sector -> facility in {seat,bunk}` | `CATALOG_ONLY` | 接入 facility 字段。 |

### 7.5 ULR

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-ULR-001` | 两人制机型 + 3 名及以上飞行员 + 时差 >=6h 识别 ULR | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `is_ulr = two_pilot_aircraft && crew_count >= 3 && zone_diff >= 6h` | `CALCULATION_METHOD` | 实现 ULR classifier。 |
| `RG-ULR-002` | ULR 不使用普通 Table A/B | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `is_ulr -> use_ulr_limits` | `CALCULATION_METHOD` | 分离 ULR 计算通道。 |
| `RG-ULR-003` | 3 pilots 最大 13h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `ulr && crew_count == 3 -> fdp_minutes <= 780` | `CATALOG_ONLY` | 接入 ULR limit。 |
| `RG-ULR-004` | 4 pilots 最大 18h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `ulr && crew_count >= 4 -> fdp_minutes <= 1080` | `CATALOG_ONLY` | 接入 ULR limit。 |
| `RG-ULR-005` | 最多计划 2 sectors | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `planned_sector_count <= 2 || disruption_approved` | `CATALOG_ONLY` | 接入 disruption 例外。 |
| `RG-ULR-006` | 每多一段减 45 分钟 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `allowable_fdp -= max(0, sectors - base_sectors) * 45m` | `CALCULATION_METHOD` | 作为 ULR limit 派生。 |
| `RG-ULR-007` | 每名机组 total relief >=3h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `min(total_relief_per_crew) >= 180m` | `CATALOG_ONLY` | 需要每人 relief 事实。 |
| `RG-ULR-008` | ULR relief facility 必须为 bunk | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `ulr -> relief_facility == BUNK` | `CATALOG_ONLY` | 接入 facility 字段。 |

### 7.6 Split Duty

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-SPLIT-001` | 中间休息小于 minimum rest 视为 split duty | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `is_split_duty = interim_rest < minimum_rest` | `CALCULATION_METHOD` | 实现 split duty classifier。 |
| `RG-SPLIT-002` | 小于 3h 不延长 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `split_extension = 0 when rest < 3h` | `CALCULATION_METHOD` | 派生 extension。 |
| `RG-SPLIT-003` | 3-10h 延长一半 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `split_extension = rest_minutes / 2` | `CALCULATION_METHOD` | 派生 extension。 |
| `RG-SPLIT-004` | 休息前后各段不超过 10h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `pre_rest_duty <= 600m && post_rest_duty <= 600m` | `CATALOG_ONLY` | 接入 split segment。 |
| `RG-SPLIT-005` | 总 FDP 不超过 18h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `split_total_fdp_minutes <= 1080` | `CATALOG_ONLY` | 接入 split total。 |
| `RG-SPLIT-006` | 不得和 augmented extension 叠加 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `!(split_extension_used && augmented_extension_used)` | `CATALOG_ONLY` | 接入 extension source。 |
| `RG-SPLIT-007` | split rest 不含地面流程和 travel | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `creditable_split_rest = raw_rest - ground_process - travel` | `CALCULATION_METHOD` | 派生有效 rest。 |
| `RG-SPLIT-008` | 小于 6h 需 quiet / comfortable / non-public | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `rest < 6h -> quiet && comfortable && non_public` | `CATALOG_ONLY` | 接入 rest facility。 |
| `RG-SPLIT-009` | 大于 6h 或覆盖夜间 >=3h 需 suitable accommodation | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `(rest > 6h || night_overlap >= 3h) -> suitable_accommodation` | `CATALOG_ONLY` | 接入 accommodation。 |
| `RG-SPLIT-010` | 机上地面休息必须满足 6 项条件 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `onboard_ground_rest -> all(required_conditions)` | `CATALOG_ONLY` | 需要条件清单事实。 |

### 7.7 Late Finish / Early Start

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-LNP-001` | 仅适用于 acclimatized flight crew 且非纯 ground duty cycle | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `lnp_applicable = acclimatized && flight_crew && !ground_only` | `CALCULATION_METHOD` | 实现 LNP classifier。 |
| `RG-LNP-002` | disruption 延入 LNP 的 FDP 不适用 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `lnp_applicable = false when disruption_caused_lnp` | `CALCULATION_METHOD` | LNP classifier 排除。 |
| `RG-LNP-003` | 连续 LNP duties 不超过 3 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `consecutive_lnp_duties <= 3` | `CATALOG_ONLY` | 接入连续序列。 |
| `RG-LNP-004` | 任意 6 天内 LNP duties 不超过 4 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `rolling_6d_lnp_duties <= 4` | `CATALOG_ONLY` | 接入 rolling 6d。 |
| `RG-LNP-005` | 住宿且 15 分钟可达时 0659 可按 0559 处理 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `effective_lnp_boundary = 0559 when accommodation_within_15m` | `CALCULATION_METHOD` | 派生 LNP 边界。 |
| `RG-LNP-006` | 连续 LNP 序列前一日 2100 前必须脱 duty | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `pre_lnp_duty_end_local <= 21:00` | `CATALOG_ONLY` | 接入 local time 判断。 |
| `RG-LNP-007` | 连续 3 次或 7 天内大于 3 次后需 48h + 2 local nights | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `threshold_hit -> free_minutes >= 2880 && local_nights >= 2` | `CATALOG_ONLY` | 依赖 local night。 |
| `RG-LNP-008` | overnight 模式最多 5 连续、前置 36h、单班 <=8h、结束后 free >=63h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `consecutive <= 5 && pre_free >= 36h && duty <= 8h && post_free >= 63h` | `CATALOG_ONLY` | 拆成组合 predicate。 |

### 7.8 Mixed Duty / Simulator / Ground

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-MIX-001` | 飞前其他公司任务计入后续 FDP | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `fdp_start = include_prior_company_duty` | `CALCULATION_METHOD` | 纳入 FDP 派生。 |
| `RG-MIX-002` | 管理飞行员飞前 office duty 计入 duty | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `duty_minutes += pre_flight_office_duty` | `CALCULATION_METHOD` | 纳入 duty 派生。 |
| `RG-MIX-003` | office duty 必须留实际完成记录 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `office_duty -> actual_record_exists` | `CATALOG_ONLY` | 记录门槛，不进法规计算核心。 |
| `RG-MIX-004` | 同一 duty 内 simulator 全额计入后续 FDP | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `fdp_minutes += simulator_minutes_in_same_duty` | `CALCULATION_METHOD` | 纳入 FDP 派生。 |
| `RG-MIX-005` | trainee simulator 计 sector，Instructor 不计 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `sector_count += trainee_simulator; instructor_simulator = 0` | `CALCULATION_METHOD` | 纳入 sectors 派生。 |

### 7.9 Traveling / Positioning / Standby / Delayed Reporting

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-POS-001` | 普通 traveling 不计 duty | `REFERENCE_INFO` | 否 | `P3 INFO` | `traveling_minutes excluded from duty` | `CATALOG_ONLY` | 放定义说明和派生前置。 |
| `RG-POS-002` | 去非通常机场的超额 travel 计 positioning | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `excess_travel_to_non_normal_airport -> positioning` | `CALCULATION_METHOD` | 纳入 positioning 派生。 |
| `RG-POS-003` | 正常通勤大于 90 分钟给疲劳提醒 | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `commute_minutes > 90 -> fatigue_alert` | `CATALOG_ONLY` | 治理提醒，不进硬性计算引擎。 |
| `RG-POS-004` | delayed report 用 planned/actual 更严格 band | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `report_band = stricter(planned_band, actual_band)` | `CALCULATION_METHOD` | 纳入 band 派生。 |
| `RG-POS-005` | 延误 >=4h 时从原 report 后第 4 小时算 FDP | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `fdp_start = original_report + 4h when delay >= 4h` | `CALCULATION_METHOD` | 纳入 FDP 派生。 |
| `RG-POS-006` | 10h 以上提前通知且未再打扰可计为 rest | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `notice >= 10h && undisturbed -> count_as_rest` | `CALCULATION_METHOD` | 纳入 rest 派生。 |
| `RG-POS-007` | positioning 全额计 duty | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `duty_minutes += positioning_minutes` | `CALCULATION_METHOD` | 纳入 duty 派生。 |
| `RG-POS-008` | positioning 默认不计 sector | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `positioning_sector_count = 0 unless special_case` | `CALCULATION_METHOD` | 纳入 sector 派生。 |
| `RG-POS-009` | positioning 后休息不足而要用 split duty 时 positioning 必须计 sector | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `split_after_positioning_due_short_rest -> positioning_counts_as_sector` | `CATALOG_ONLY` | 接入 split + positioning 联动。 |
| `RG-POS-010` | 第 7 天只允许 positioning 回 base | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `duty_day == 7 -> task_type == POSITIONING && destination == base` | `CATALOG_ONLY` | 与 DDO 连续 duty 联动。 |
| `RG-STBY-001` | standby 起止和类型必填 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `standby.start && standby.end && standby.type` | `CATALOG_ONLY` | 放状态块保存/发布门槛。 |
| `RG-STBY-002` | standby 最长 12h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `standby_minutes <= 720` | `ACTIVE` | 当前已接入。 |
| `RG-STBY-003` | callout 后 standby 截止于报到点 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `standby_end = callout_report_time` | `CALCULATION_METHOD` | 纳入 standby 派生。 |
| `RG-STBY-004` | airport standby 从 standby start 算 FDP | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `airport_standby_fdp_start = standby_start` | `CALCULATION_METHOD` | 纳入 FDP 派生。 |
| `RG-STBY-005` | home standby acclimatized 用更严格 band | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `home_standby_band = stricter_band` | `CALCULATION_METHOD` | 纳入 band 派生。 |
| `RG-STBY-006` | home standby unacclimatized 按 Table B 算 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `home_standby_unacclimatized -> table_b` | `CALCULATION_METHOD` | 纳入 FDP 派生。 |
| `RG-STBY-007` | report 晚于 standby start 4h 及以上，从第 4 小时点算 FDP | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `fdp_start = standby_start + 4h when report_delay >= 4h` | `CALCULATION_METHOD` | 纳入 FDP 派生。 |
| `RG-STBY-008` | standby callout 总 duty = standby(max 4h) + FDP + post-flight | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `duty = min(standby,4h) + fdp + post_flight` | `CALCULATION_METHOD` | 纳入 duty 派生。 |

### 7.10 Rest / Recovery / DDO

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-REST-001` | 时差小于 6h minimum rest = max(previous duty, 11h) | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `minimum_rest = max(previous_duty, 11h)` | `CALCULATION_METHOD` | 纳入 minimum rest 派生。 |
| `RG-REST-002` | earned rest 恰为 11h 且有住宿时可减 1h | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `minimum_rest -= 1h when earned_rest == 11h && accommodation` | `CALCULATION_METHOD` | 纳入 rest adjustment。 |
| `RG-REST-003` | 酒店往返 travel 大于 1h 的超额部分补回 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `minimum_rest += max(0, hotel_travel - 1h)` | `CALCULATION_METHOD` | 纳入 rest adjustment。 |
| `RG-REST-004` | 前序 duty 大于 18h 后续 rest 必含 1 local night | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `previous_duty <= 18h || rest_local_nights >= 1` | `CATALOG_ONLY` | 接入 local night。 |
| `RG-REST-005` | 时差 >=6h 且 72h 内取 previous duty / 8h sleep / 14h 最大 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `minimum_rest = max(previous_duty, 8h_sleep_opportunity, 14h)` | `CALCULATION_METHOD` | 纳入 minimum rest 派生。 |
| `RG-REST-006` | 时差 >=6h 且 72h 后按最后休息地当地夜间算 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `rest_local_night_base = last_rest_location` | `CALCULATION_METHOD` | 纳入 local night 派生。 |
| `RG-REST-007` | 可用 max(previous duty, 34h) 替代 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `alternative_min_rest = max(previous_duty, 34h)` | `CALCULATION_METHOD` | 作为替代口径。 |
| `RG-REST-008` | reduced rest 后又 extended FDP，后续 rest 不得再 reduced | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `!(reduced_rest && following_extended_fdp && next_rest_reduced)` | `CATALOG_ONLY` | 接入链路判断。 |
| `RG-REST-009` | unacclimatized 14 天内 18-30h band 最多 3 连续或累计 4 次 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `consecutive_band_18_30 <= 3 && rolling_14d_band_18_30 <= 4` | `CATALOG_ONLY` | 接入 rolling 14d。 |
| `RG-REST-010` | 达阈值后同 14 天内 EXB 至少 34h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `threshold_hit -> exb_minutes >= 2040 within 14d` | `CATALOG_ONLY` | 接入 EXB。 |
| `RG-REST-011` | standby callout 后 minimum rest 由 standby + completed duty 决定 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `minimum_rest_base = standby_minutes + completed_duty_minutes` | `CALCULATION_METHOD` | 纳入 rest 派生。 |
| `RG-REST-012` | away from base 应提供 suitable accommodation | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `away_from_base -> suitable_accommodation_provided` | `CATALOG_ONLY` | 建议做住宿事实告警/审计，不混入核心时间规则。 |
| `RG-REC-001` | duty cycle >48h 且返 base 时 unacclimatized 适用 recovery | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `recovery_required = duty_cycle > 48h && return_base && unacclimatized` | `CALCULATION_METHOD` | 实现 recovery classifier。 |
| `RG-REC-002` | recovery 可包含 rest 和 DDO | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `recovery_minutes = rest_minutes + ddo_minutes` | `CALCULATION_METHOD` | 派生 recovery total。 |
| `RG-REC-003` | 跨 >=6 时区 recovery 中首个 DDO 不计入 DDO 达标 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `zone_diff >= 6h -> first_ddo_excluded_from_required_ddo_count` | `CATALOG_ONLY` | 接入 recovery DDO count。 |
| `RG-REC-004` | recovery reduction 仅限 roster stability | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `reduction_reason == ROSTER_STABILITY` | `CATALOG_ONLY` | 放例外审批门槛，不进核心计算。 |
| `RG-REC-005` | 28 天内最多 1 次 recovery reduction | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `rolling_28d_recovery_reduction_count <= 1` | `CATALOG_ONLY` | 接入 rolling 28d。 |
| `RG-REC-006` | 原 recovery <4 DDO 不得 reduction | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `reduction_used -> original_required_ddo >= 4` | `CATALOG_ONLY` | 接入 Table X 结果。 |
| `RG-REC-007` | 公司可减 1 DDO | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `company_reduction_limit = 1 DDO` | `CALCULATION_METHOD` | 作为 reduction limit。 |
| `RG-REC-008` | 经机组同意最多再减 1 DDO，总减幅不大于 2 | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `total_reduction <= 2 && (crew_consented || crew_reduction == 0)` | `CATALOG_ONLY` | 接入 consent 和 reduction。 |
| `RG-DDO-001` | 连续 duty 不得超过 6 天 | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `consecutive_duty_days <= 6 || day_7_only_positioning_to_base` | `CATALOG_ONLY` | 接入 duty day sequence。 |
| `RG-DDO-002` | 第 7 天回 base 后至少 2 连续 DDO | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `day_7_return_base -> consecutive_ddo_after >= 2` | `CATALOG_ONLY` | 接入 DDO sequence。 |
| `RG-DDO-003` | 任意连续 14 天必须出现 2 连续 DDO | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `rolling_14d_has_two_consecutive_ddo == true` | `CATALOG_ONLY` | 接入 rolling 14d。 |
| `RG-DDO-004` | 3 个四周周期平均 DDO >=8 | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `avg_ddo_per_4w_over_3_cycles >= 8` | `CATALOG_ONLY` | 接入 multi-cycle rolling。 |

### 7.11 Flight Hours / Duty Hours / Records

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-HOUR-001` | rolling 28 天 flight <=100h | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `rolling_28d_flight_minutes <= 6000` | `CATALOG_ONLY` | 接入 rolling flight total。 |
| `RG-HOUR-002` | 12 个月至上月底 flight <=900h | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `rolling_12m_to_prev_month_flight_minutes <= 54000` | `CATALOG_ONLY` | 接入 12m 统计。 |
| `RG-HOUR-003` | 7 天 duty <=55h | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `rolling_7d_duty_minutes <= 3300` | `CATALOG_ONLY` | 接入 rolling duty total。 |
| `RG-HOUR-004` | 已开始 rostered duty 因不可预见延误可放宽到 60h | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `unforeseen_delay -> soft_limit_7d_duty = 60h` | `CATALOG_ONLY` | 作为例外/告警，不作为普通排班硬规则。 |
| `RG-HOUR-005` | 为回 base positioning 可再超最多 10h | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `return_base_positioning_extra <= 10h` | `CATALOG_ONLY` | 放例外审批和审计。 |
| `RG-HOUR-006` | 14 天 duty <=95h | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `rolling_14d_duty_minutes <= 5700` | `CATALOG_ONLY` | 接入 rolling duty total。 |
| `RG-HOUR-007` | 28 天 duty <=190h | `EVALUATION_RULE` | 是 | `P0 BLOCK` | `rolling_28d_duty_minutes <= 11400` | `CATALOG_ONLY` | 接入 rolling duty total。 |
| `RG-HOUR-008` | 每出现一次 6h+ 时差 FDP，28 天 allowable duty 再减 8h | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `allowable_28d_duty -= count(zone_diff_fdp>=6h)*8h` | `CALCULATION_METHOD` | 纳入 duty limit 派生。 |
| `RG-HOUR-009` | standby 默认全额计入 cumulative duty | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `cumulative_duty += standby_minutes` | `CALCULATION_METHOD` | 纳入 cumulative duty。 |
| `RG-HOUR-010` | 特定 standby 场景按半额计入 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `cumulative_duty += standby_minutes * 0.5 when special_case` | `CALCULATION_METHOD` | 纳入 cumulative duty。 |
| `RG-HOUR-011` | 连续 28 天不飞不待命可不带入旧 duty；回归前 28 天仍需记录 | `CALCULATION_METHOD` | 否 | `P3 DERIVATION` | `reset_prior_duty_when_no_flight_or_standby_28d` | `CALCULATION_METHOD` | 纳入 rolling window reset。 |
| `RG-RECLOG-001` | duty / rest 记录缺失不得归档或发布 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `required_duty_rest_records_complete` | `CATALOG_ONLY` | 归档/发布门槛，不进计算引擎。 |
| `RG-RECLOG-002` | DDO 记录缺失给告警 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `ddo_record_exists` | `CATALOG_ONLY` | 数据质量告警。 |
| `RG-RECLOG-003` | 每条 duty 必须记录开始、结束、岗位功能 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `duty.start && duty.end && duty.function` | `CATALOG_ONLY` | 数据完整性门槛。 |
| `RG-RECLOG-004` | daily / 28d / 12m flying totals 必须可追溯 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `totals_have_traceable_sources` | `CATALOG_ONLY` | 审计门槛，不做法规计算命中。 |
| `RG-RECLOG-005` | 记录保留至少 12 个月 | `REGULATION_REQUIREMENT` | 否 | `P3 INFO` | `retention_months >= 12` | `CATALOG_ONLY` | 数据治理/审计清单。 |
| `RG-RECLOG-006` | CDR 保留至少 12 个月 | `REGULATION_REQUIREMENT` | 否 | `P3 INFO` | `cdr_retention_months >= 12` | `CATALOG_ONLY` | 数据治理/审计清单。 |
| `RG-RECLOG-007` | block time 必须反映可实现运行时间 | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `planned_block_bias_threshold exceeded -> review` | `CATALOG_ONLY` | 放趋势治理。 |
| `RG-RECLOG-008` | 2 个月 15% 航班超计划 15 分钟以上必须调整 block time | `EVALUATION_RULE` | 是 | `P2 WARNING` | `rolling_2m_late_over_15m_ratio <= 15%` | `CATALOG_ONLY` | 可做治理计算规则，但不阻断单次排班。 |
| `RG-RECLOG-009` | 触发 PIC discretion 的 sector 必须纳入月度复核 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `discretion_sector -> included_in_monthly_review` | `CATALOG_ONLY` | 复核清单门槛。 |

### 7.12 Service Disruption / Commander's Discretion

| Rule ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 计算口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `RG-DISC-001` | 仅适用于已开始 rostered FDP 后发生的不可预见情况 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `discretion -> rostered_fdp_started && unforeseen_event` | `CATALOG_ONLY` | 作为 CDR 发起门槛。 |
| `RG-DISC-002` | 不得预先排入班表 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `planned_roster.contains(discretion_extension) == false` | `CATALOG_ONLY` | 发布门槛/审计门槛。 |
| `RG-DISC-003` | 必须为不可预见运行情况 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `discretion.reason == UNFORESEEN_OPERATIONAL_CIRCUMSTANCE` | `CATALOG_ONLY` | CDR 表单门槛。 |
| `RG-DISC-004` | 公司请求人必须为授权角色 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `requester.role in authorized_roles` | `CATALOG_ONLY` | CDR 提交流程门槛。 |
| `RG-DISC-005` | PIC 拥有最终决定权 | `REGULATION_REQUIREMENT` | 否 | `P3 INFO` | `pic_decision_recorded` | `CATALOG_ONLY` | 审计说明与表单留痕。 |
| `RG-DISC-006` | 普通延长 FDP 最多 +3h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `normal_discretion_extension_minutes <= 180 || emergency` | `CATALOG_ONLY` | 接入 actual FDP + CDR。 |
| `RG-DISC-007` | augmented / split / reduced-rest 后最多再 +2h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `special_discretion_extension_minutes <= 120 || emergency` | `CATALOG_ONLY` | 接入 CDR subtype。 |
| `RG-DISC-008` | reduced rest discretion 不适用于 recovery | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `!(reduced_rest_discretion && recovery_period)` | `CATALOG_ONLY` | 接入 recovery facts。 |
| `RG-DISC-009` | reduced rest 后房间可用时间不得少于 10h | `EVALUATION_RULE` | 是 | `P1 NON_COMPLIANT` | `reduced_rest -> room_available_minutes >= 600` | `CATALOG_ONLY` | 接入 accommodation actual。 |
| `RG-DISC-010` | 每次 discretion 必须生成 CDR | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `discretion_used -> cdr_exists` | `CATALOG_ONLY` | 归档/审计门槛，不进计算引擎。 |
| `RG-DISC-011` | 公司请求必须有书面记录 | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `company_request -> written_record_exists` | `CATALOG_ONLY` | CDR 提交流程门槛。 |
| `RG-DISC-012` | 延长 >2h 或减休 >1h 需 7 天内报 AACM | `OPERATIONAL_GATE` | 否 | `P2 WARNING` | `(extension > 2h || rest_reduction > 1h) -> aacm_reported_within_7d` | `CATALOG_ONLY` | 报送门槛和审计清单。 |

## 8. PLAN-only 治理与实现提醒

`PLAN.md` 里还有一些不适合作为 `RG-*` 计算规则的落地提醒，应放入实施清单或审计清单。

| ID | 原文主题 | 分类 | 进计算引擎 | 严重程度 | predicate / 口径 | 当前状态 | 三期动作 |
|---|---|---|---:|---|---|---|---|
| `PLAN-GOV-001` | 规则中心可启停、版本、生效期、审计 | `REGULATION_REQUIREMENT` | 否 | `P3 INFO` | `rule_version/effective_date/audit_log maintained` | `CATALOG_ONLY` | 规则中心治理能力。 |
| `PLAN-GOV-002` | 规则命中需保留 Rule ID 和证据 | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `hit.rule_id && hit.evidence_window && hit.actual_value` | `CATALOG_ONLY` | 标准化 violation hit。 |
| `PLAN-GOV-003` | 派生值需可追溯来源 | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `derived_fact.source_fact_ids not empty` | `CATALOG_ONLY` | DerivedFact 设计要求。 |
| `PLAN-GOV-004` | 红色阻断不可随意关闭，停用需审计 | `OPERATIONAL_GATE` | 否 | `P0 BLOCK` | `p0_rule_disabled -> approval_audit_exists` | `CATALOG_ONLY` | 规则启停管控。 |
| `PLAN-GOV-005` | 例外/CDR/AACM 和归档实际值要反哺规则评估 | `REGULATION_REQUIREMENT` | 否 | `P2 WARNING` | `actuals_and_exceptions linked to evaluation` | `CATALOG_ONLY` | 四期/飞后闭环衔接。 |

## 9. 后续数据迁移建议

建议后续迁移 `rule_catalog.catalog_entry_type`：

| 当前值 | 新口径 |
|---|---|
| `DISPLAY_RULE` | 拆为 `EVALUATION_RULE / OPERATIONAL_GATE / REGULATION_REQUIREMENT / REFERENCE_INFO` |
| `DERIVATION` | 改名或文档统一为 `CALCULATION_METHOD` |
| `SYSTEM_GATE` | 保留为 `OPERATIONAL_GATE` |
| `RULE_GROUP` | 保留 |

建议新增字段：

- `engine_executable boolean`
- `predicate_template text`
- `fact_requirements jsonb`
- `derived_fact_requirements jsonb`
- `evidence_window_strategy varchar`
- `default_severity varchar`
- `audit_category varchar`

## 10. 验收口径

- 全量 `RG-*` 都在本文第 7 章出现。
- `EVALUATION_RULE` 必须有 predicate。
- `CALCULATION_METHOD` 只产出派生事实，不直接产出 violation hit。
- `OPERATIONAL_GATE` 可以阻断发布/归档，但不计入法规计算违规统计。
- `REGULATION_REQUIREMENT / REFERENCE_INFO` 用于说明、审计、报表或治理提醒。
- 发布最终同时消费“法规规则命中”和“系统流程门槛”，但规则中心和审计报表中必须分开展示。
