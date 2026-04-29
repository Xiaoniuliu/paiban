# 三期规则目录核对说明

## 当前口径

规则中心默认只用于核对“规则类”条目，也就是可以被业务判断为通过、不通过、告警或治理提醒的条款。

本轮把目录条目分成四类：

| 条目类型 | 当前数量 | 默认显示 | 用途 |
| --- | ---: | --- | --- |
| `DISPLAY_RULE` | 87 | 是 | 人工逐条核对的真实规则条目。 |
| `DERIVATION` | 56 | 否 | 时长、窗口、表格、累计值等规则引擎计算口径，不直接作为业务规则核对。 |
| `SYSTEM_GATE` | 7 | 否 | 系统发布门槛和基础数据门禁，例如待排、人员重复、经理确认。 |
| `RULE_GROUP` | 32 | 否 | 归纳分组和核对辅助摘要，不作为最终规则条目。 |

`RG-*` 全量稳定编号共 142 条，其中：

- `DISPLAY_RULE`：87 条，进入规则中心默认核对列表。
- `DERIVATION`：55 条，保留在目录库但默认不展示，用于三期规则引擎计算。

另有历史系统规则 7 条和 `FDP_STD_A` 1 条派生标准，共同构成当前接口总数 182 条。

## 为什么不把所有条目都当规则显示

PLAN.md 和 FRD 第 13 章里有两种内容混在一起：

- 规则：例如 FDP 超限、DDO 不足、休息不足、CDR 缺失、AACM 需报送。这些可以直接产生 `BLOCK / NON_COMPLIANT / ALERT / INFO`。
- 计算方法：例如怎么计算 report time、FDP start、local night、positioning 是否计 duty、standby callout 后怎么算。这些不是最终规则，而是规则引擎生成证据和时长的算法。

所以规则中心默认只给排班员、经理和业务方核对规则。计算方法留给规则引擎实现和测试，不放在默认规则目录里干扰核对。

## `DERIVATION` 应该给哪里用

### 时间与窗口计算

用于生成 duty / FDP / rest / DDO / recovery 的时间窗口和证据。

- `RG-TIME-001 ~ RG-TIME-006`
- `RG-BASE-004 ~ RG-BASE-006`
- `RG-BASE-010`

### FDP 表格和报告时间计算

用于三期 FDP Table A / B、report time、sector、start band、acclimatization 的算法。

- `RG-FDP-001 ~ RG-FDP-002`
- `RG-POS-004 ~ RG-POS-006`
- `RG-STBY-004 ~ RG-STBY-008`

### Extended / ULR / Split Duty 计算

用于增员、休息设施、split duty credit、controls time 等计算。

- `RG-EXT-003 ~ RG-EXT-004`
- `RG-EXT-009 ~ RG-EXT-010`
- `RG-ULR-001 ~ RG-ULR-002`
- `RG-ULR-006`
- `RG-SPLIT-001 ~ RG-SPLIT-003`
- `RG-SPLIT-007`

### Positioning / Mixed Duty 记账

用于判断 positioning 是否计入 duty / sector、mixed duty 如何叠加。

- `RG-MIX-001 ~ RG-MIX-002`
- `RG-MIX-004 ~ RG-MIX-005`
- `RG-POS-001`
- `RG-POS-007 ~ RG-POS-008`

### Rest / DDO / Recovery 计算

用于 local night、34h DDO、Table X、跨时区恢复等计算。

- `RG-REST-001 ~ RG-REST-002`
- `RG-REST-005 ~ RG-REST-007`
- `RG-REST-011`
- `RG-REC-001 ~ RG-REC-003`

### 累计小时和归档回算

用于 7d / 14d / 28d / 12m 的累计统计，以及飞后归档 actual duty / actual FDP / flying hour 回算。

- `RG-HOUR-008 ~ RG-HOUR-011`

## 核对方式

1. 打开 `规则中心`，默认筛选为 `DISPLAY_RULE`。
2. 先按严重级别从红色阻断类开始核对。
3. 再核对橙色告警/留痕和蓝色治理提醒。
4. 如需检查被排除的计算口径，把“条目类型”切到 `DERIVATION`。
5. `RULE_GROUP` 只用于看归纳摘要，不作为最终规则清单。

## 后续实现边界

- 本轮只整理目录，不继续扩规则引擎。
- 三期规则引擎实现时，`DERIVATION` 作为算法输入和证据字段来源。
- 校验与发布最终只消费规则命中池，不直接消费 `DERIVATION` 条目。
- 红色阻断类规则不可停用；橙色/蓝色可停用，但发布时必须记录未启用 Rule ID。
