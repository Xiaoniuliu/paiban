# 三期规则重要程度索引

> 旧版提示：本文是早期按发布风险整理的优先级索引，覆盖不完整，且把“规则、规定、流程门槛、计算方法”混在了一起。后续三期规则引擎开发与业务核对请以 [PHASE3_RULE_ENGINE_CLASSIFICATION.md](</D:/paiban2/PHASE3_RULE_ENGINE_CLASSIFICATION.md>) 为准；本文仅保留作历史参考。

新文档的核心变化：

- 全量 `PLAN.md / FRD 第 13 章` 条目都进入法规/规定索引。
- 只有可写成明确 predicate 的条目进入三期计算规则引擎。
- `CALCULATION_METHOD` 只产生派生事实，不直接产生违规命中。
- `OPERATIONAL_GATE` 可阻断发布/归档，但不混入法规计算违规统计。
- `REGULATION_REQUIREMENT / REFERENCE_INFO` 用于规则中心说明、审计清单或治理报表。
