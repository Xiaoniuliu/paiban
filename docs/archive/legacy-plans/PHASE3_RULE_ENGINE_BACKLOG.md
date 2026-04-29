# 三期规则引擎待办清单

## Summary

二期没有把 [PLAN.md](</D:/paiban2/PLAN.md>) 中的全部法规规则实现为可执行规则。

二期已完成的是规则中心展示能力、规则命中池雏形，以及当前数据已经能支撑的基础规则。完整规则引擎放入三期，重点解决 FDP、Rest、DDO、Recovery、Standby、Positioning、累计小时和 Discretion / CDR / AACM 的真实计算。

当前三期规则引擎暂停实施，等待业务方完成规则目录核对。暂停期间只维护规则目录、分类和文档，不继续新增规则计算逻辑。

## 二期已完成范围

- 发布门槛规则：待排、阻断状态、缺 PIC / FO、WARNING 经理确认。
- 时间冲突规则：同一机组 timeline block 时间重叠。
- 状态冲突规则：航班与 `REST / DDO / TRAINING / STANDBY / DUTY / RECOVERY` 状态块重叠。
- 运行日调整应用后可触发当前规则重算。
- 规则中心支持规则目录、版本状态、FOM 来源、最近命中和三期试算占位。
- `rule_catalog.version_status = ACTIVE` 表示当前已执行；`PHASE_3` 表示已进入目录但尚未执行。

## 当前规则目录状态

- [PLAN.md](</D:/paiban2/plan.md>) 明确要求规则分类颜色固定为：`硬校验 = 红色`、`告警/留痕 = 橙色`、`治理提醒 = 蓝色`。
- `rule_category` 和 `severity_default` 不能混用：分类色用于页面展示和处理语义；`BLOCK / NON_COMPLIANT / ALERT / INFO` 用于发布门槛和动作控制。
- FRD 第 13 章当前稳定编号的 `RG-*` 共 142 条已导入 `rule_catalog`。
- 其中 87 条标记为 `DISPLAY_RULE`，进入规则中心默认核对列表；55 条标记为 `DERIVATION`，作为规则引擎计算口径，不直接进入默认核对列表。
- 另有 7 条 `SYSTEM_GATE` 系统门禁和 32 条 `RULE_GROUP` 归纳辅助条目；它们可筛选查看，但不作为默认规则清单。
- 详细拆分见 [PHASE3_RULE_CATALOG_REVIEW.md](</D:/paiban2/PHASE3_RULE_CATALOG_REVIEW.md>)。
- 规则目录默认启用；红色阻断类规则不得关闭。橙色告警/留痕与蓝色治理提醒如被人工停用，发布时必须在审计日志中记录停用的 Rule ID。

## 三期必须补的规则数据底座

- Duty / FDP 派生时间：
  - report time、effective report time、post-flight 30 分钟、FDP start/end、duty start/end。
  - planned 与 actual 口径分离。
- 航班与机场时区：
  - 起降机场 IANA timezone。
  - start band、local night、WOCL、跨时区 zones。
- 机组适应状态：
  - acclimatized / unacclimatized 状态历史。
  - duty cycle 起点、返 base 判断、recovery 后恢复逻辑。
- Rest / DDO / Recovery 事实：
  - rest block、DDO block、EXB、Recovery block 的有效性计算。
  - local nights、34h DDO、Table X 所需 DDO 数。
- 增员与 relief 数据：
  - RELIEF / EXTRA 角色。
  - bunk / seat、relief 时长、controls 时长、relief qualification。
- Standby / Positioning 数据：
  - standby 类型、callout time、reporting point。
  - positioning 类型、是否回 base、是否计 sector。
- 累计小时与历史窗口：
  - rolling 7d / 14d / 28d duty。
  - rolling 28d flight hours。
  - 12 个月 flight hours。
  - 归档 actual flying hour 回算。
- 例外与报送：
  - CDR、PIC decision、company request、AACM reporting deadline。
  - 被覆盖 rule ids、例外审批状态。

## 三期规则批次

### Batch 1：规则目录核对与派生口径确认

- 已将 PLAN.md / FRD 13 章稳定编号规则导入 `rule_catalog`。
- 业务方先核对 `DISPLAY_RULE` 默认列表，确认哪些条目是真正要发布阻断、告警留痕或治理提醒的规则。
- `DERIVATION` 条目不直接作为规则展示，必须落到三期规则引擎的时长计算、窗口计算、表格计算、累计值回算和证据生成层。
- 未实现规则统一标记 `version_status = PHASE_3`；`active_flag` 只表示规则是否被业务启用，不表示是否已接入计算。
- 每条规则补齐 `rule_id / rule_category / severity_default / source_section / source_clause / source_page / pdf_deeplink`。
- 必须同时导入 `硬校验 / 告警留痕 / 治理提醒` 三类规则，不能只导入阻断类或红色硬校验规则。
- 对 PLAN.md 中没有独立 `RG-*` 编号但属于治理提醒的条目，三期需补分配稳定 Rule ID，例如 `RG-GOV-*` 或归入对应章节前缀。
- 规则中心可以查询全部规则，但只对 `ACTIVE` 规则展示真实命中。

### Batch 2：FDP / Rest 基础计算

- `RG-TIME-001` 到 `RG-TIME-008`：报到、收工、时间顺序。
- `RG-FDP-001` 到 `RG-FDP-008`：Table A / B、sector、start band、preceding rest、FDP 超限、长航段增员。
- `RG-REST-001` 到 `RG-REST-012`：minimum rest、local night、跨时区 rest、reduced rest。

### Batch 3：DDO / Recovery / 连续性

- `RG-BASE-008`：单次 DDO 至少 34h 且 2 个 local nights。
- `RG-DDO-001` 到 `RG-DDO-004`：连续 duty、第 7 天、14 天 2 连续 DDO、四周平均 DDO。
- `RG-REC-001` 到 `RG-REC-008`：跨时区 recovery、Table X、recovery reduction。

### Batch 4：Standby / Positioning / Mixed Duty

- `RG-POS-001` 到 `RG-POS-010`：positioning 是否计 duty / sector、回 base、split duty 前置。
- `RG-STBY-001` 到 `RG-STBY-008`：standby 时长、callout、FDP 起算。
- `RG-MIX-001` 到 `RG-MIX-005`：office duty、simulator、training 与 FDP 叠加。

### Batch 5：Extended FDP / ULR / Split Duty

- `RG-EXT-001` 到 `RG-EXT-011`：relief qualification、facility、relief 时长、controls 限制。
- `RG-ULR-001` 到 `RG-ULR-008`：ULR 识别、3/4 pilots 上限、sector 限制。
- `RG-SPLIT-001` 到 `RG-SPLIT-010`：split duty 识别、延长、住宿条件和叠加限制。

### Batch 6：累计小时、Discretion、CDR / AACM

- `RG-HOUR-001` 到 `RG-HOUR-011`：7d / 14d / 28d duty、28d / 12m flight hours。
- `RG-RECLOG-001` 到 `RG-RECLOG-009`：记录完整性、DDO 记录、block time 偏差。
- `RG-DISC-001` 到 `RG-DISC-012`：discretion 前提、FDP extension、reduced rest、CDR 和 AACM 报送。

## 三期验收标准

- 校验与发布不再只依赖基础规则，而是读取完整规则命中池。
- 同一对象命中多条规则时，必须全部展示，不能只保留最严重一条。
- 每条命中必须包含 Rule ID、severity、rule_category、证据时间窗、来源章节、条款、页码和建议动作。
- 规则中心能从 Rule ID 看到版本、来源、最近命中和试算结果。
- 甘特图只做风险展示、定位和打开详情，不直接编辑规则事实。

## 当前遗留说明

当前规则中心已经有全量稳定 `RG-*` 目录，但不代表所有规则都已可执行。

三期第一步应先完成 `DISPLAY_RULE` 核对和 `DERIVATION` 归属确认，再逐批启用可执行规则。

在核对完成前，FDP / Rest / DDO / Recovery / Standby / Positioning / Discretion / CDR / AACM 等规则引擎批次全部保持待办状态。
