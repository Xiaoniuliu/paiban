# 三期规则引擎落地进度

## 当前实现切片

- 当前三期规则引擎实现暂停推进，等待业务方完成 `DISPLAY_RULE` 规则目录逐条核对后再继续。
- 暂停期间不继续扩 FDP / DDO / Recovery / Standby / Positioning 等规则计算，避免在规则口径未确认前把算法写死。
- 已将 FRD 第 13 章中稳定编号的 `RG-*` 规则导入 `rule_catalog`，覆盖硬校验、告警留痕、治理提醒三类。
- 规则中心默认核对口径已调整为 `DISPLAY_RULE`：只展示真正需要人工逐条核对的规则类条目。
- 规则引擎算法、时长派生、表格计算、累计值回算等内容标记为 `DERIVATION`，保留给三期规则引擎使用，不再默认混入规则目录核对列表。
- 归纳摘要条目标记为 `RULE_GROUP`，仅作为辅助分组，不作为最终规则清单。
- `active_flag` 默认启用；红色阻断类规则以 `BLOCK / NON_COMPLIANT` 表示，不能在规则中心关闭。
- `version_status = PHASE_3` 表示规则已进入目录但尚未完整接入计算；`ACTIVE` 表示当前规则评估已实际执行。
- 已新增规则评估接口：
  - `POST /api/rules/evaluate/latest-roster`
  - `POST /api/rules/evaluate/task/{taskId}`
  - `POST /api/rules/evaluate/crew/{crewId}`
  - `POST /api/rules/trial`

## 已接入基础评估的规则

- `RG-TIME-008`：任务或时间轴块结束时间早于/等于开始时间。
- `RG-FDP-003`：飞行任务缺航段数，不能计算 FDP。
- `RG-FDP-007`：两人制计划飞行超过 9 小时，需要增员。
- `RG-BASE-008`：计划 DDO 少于 34 小时。两个 local nights 的精算仍在后续批次。
- `RG-STBY-002`：Standby 状态块超过 12 小时。

这些规则已经写入统一 `violation_hit` 命中池，校验与发布、规则中心最近命中、后续甘特风险展示都可以从同一来源读取。

## 仍属于三期后续批次的内容

- FDP Table A / B 的完整计算：start band、sector、preceding rest、acclimatized / unacclimatized。
- Rest / DDO / Recovery 的完整 local night、34h、Table X、跨时区恢复逻辑。
- Standby callout、positioning 是否计 duty / sector、mixed duty 叠加。
- Extended FDP、ULR、split duty、relief facility、controls 时长。
- 7d / 14d / 28d duty、28d / 12m flying hour、actual archive 回算。
- Discretion、CDR、AACM 的来源命中、报送清单和缺失阻断。

## 重要边界

- 三期剩余内容先作为待办记录，不进入开发实施，直到规则目录核对完成。
- 规则中心展示“目录状态”和“启用状态”，不等于所有规则都已可计算。
- 默认规则目录用于业务核对；`DERIVATION` 只用于三期规则引擎计算证据，不直接作为发布规则展示。
- 暂缺底层事实数据的规则保持 `PHASE_3`，不能伪装成 `ACTIVE`。
- 甘特图继续只做展示、定位和打开详情，不拖拽编辑业务事实。

详细分类见 `PHASE3_RULE_CATALOG_REVIEW.md`。
