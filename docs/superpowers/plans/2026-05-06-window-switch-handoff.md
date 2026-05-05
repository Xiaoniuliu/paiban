# 2026-05-06 Window Switch Handoff

> 接手优先读这份。它压缩了当前可提交状态、已经完成的 Phase 0-5 / 规则引擎前置收口、真实浏览器验证结果，以及下一窗口建议顺序。

## Current State

- 当前代码可提交、可换机器继续开发。
- Phase 0-5 前置已收口，后续主线进入规则引擎扩展，而不是继续补工作台/发布/归档基础设施。
- 规则引擎当前仍采用后端 Java in-process evaluator，不引入外部规则引擎。
- 规则中心只允许严重级别 `P0` 且 `catalog_entry_type = EVALUATION_RULE` 的规则进入计算引擎；其他规则可以留在目录展示，但不参与计算。
- `index.html` 已被作为需求方规则收口依据，不直接复制原型代码，只映射 R001-R014 到后端 ruleId 和实现状态。
- DDO、HOUR、FDP/REST 的第一批可执行事实与规则已落地，`RG-DDO-004` 仍因缺历史 3 x 4-week DDO baseline 数据源保持 catalog-only。

## Latest Completed Work

- 完成 `R001-R014 -> 后端 ruleId -> 已实现/待实现/不能照抄原因` 映射文档。
- 完成剩余 6 个规则引擎收尾任务：
  - FDP/REST facts 进入 `RuleDerivedFactService`。
  - FDP/REST Tier 1 可执行规则接入校验。
  - reduced-rest / consecutive-rest 相关规则状态规范化。
  - rule catalog 执行边界通过 Flyway migration 收口。
  - 测试覆盖更新。
  - master plan 和 closure plan 更新。
- 完成 in-app browser 真实点击流 ralph-loop 3 轮。
- 未发现需要马上修复的前端/后端阻断问题。

## Verification Passed

- `mvn.cmd -f apps\api\pom.xml test`
- `npm run build`
- `npm run check:i18n`
- `git diff --check`
- API smoke:
  - login 正常。
  - `/api/rules` 中 exact executable rules 状态符合边界。
  - `RG-DDO-004` 保持 inactive/catalog-only。
  - validation summary 正常返回。
- in-app browser ralph-loop 3 轮真实点击流：
  - 新增航班。
  - 进入机组信息。
  - 草稿排班选择 PIC / FO 并保存。
  - 规则中心查看规则目录、P0 强制启用提示、最近命中。
  - 发布结果页提交校验。
  - 发布按钮可用时执行发布。
  - 问题处理页正常进入并展示当前空态。

## Browser Flow Evidence

三轮真实新增并发布的数据：

- Loop 1: `RL98115782`
- Loop 2: `R298922782`
- Loop 3: `R398966626`

注意：一开始侧栏点击像是失效，实际原因是浏览器宽度下侧栏处于收起状态。点击左上角“打开菜单”后，侧栏真实点击正常。后续 in-app browser 流程先确认侧栏是否展开即可。

## Key Business Boundaries

- 机组小时页面展示的是当前累计/计划占比，不是规则超限提示 UI。
- 小时规则的计算值应与页面展示的时长事实同源，再与阈值比较；规则中心负责阻断/命中解释。
- 未来排班时间要进入规则投影；归档后要用归档实际时间替代计划时间。
- 未完成或未确认归档表单不能污染小时事实。
- 校验读接口不应产生重算副作用；提交校验是明确写入口。
- 发布、归档、结果导出都必须以当前 published truth / roster scope 为边界，不能扫全库。
- 发布结果和结果导出不是两个重叠模块；导出只保留按钮入口。

## Important Documents

- `docs/superpowers/plans/2026-05-05-r001-r014-rule-closure-map.md`
- `docs/superpowers/plans/2026-05-05-remaining-rule-engine-phase5-closure-plan.md`
- `docs/superpowers/plans/2026-05-05-index-html-rule-closure-implementation-plan.md`
- `docs/pilot-rostering-system-rearchitecture-master-plan.md`
- `index.html` demand prototype, useful anchors:
  - R001-R014 summary around `index.html:902`
  - DDO prototype helpers around `index.html:3469`
  - compliance helpers around `index.html:6900`
  - rolling time aggregation around `index.html:7215`

## Suggested Next Window Order

1. Run `git status --short` and confirm only intentional local changes exist.
2. Open this handoff and the R001-R014 closure map.
3. Re-run backend tests before changing rule logic if the environment changed.
4. Continue rule engine expansion from the remaining catalog-only P0 rules, one rule family at a time.
5. For every new executable rule, follow this closure loop:
   - Confirm business wording.
   - Confirm available facts.
   - Add failing integration test.
   - Implement fact/evaluator change.
   - Persist explainable evidence.
   - Verify rule center / validation / issue handling display.
6. Use in-app browser for real click verification after any UI-visible backend rule change.

## Known Deferred Items

- `RG-DDO-004`: keep catalog-only until historical 3 x 4-week DDO baseline exists.
- More advanced local-night DDO edge cases may need product confirmation before full execution.
- External rule engine is not currently needed; reconsider only if rule volume/authoring workflow becomes unmanageable.
- Broader rule authoring UI is not part of this current closure.

## Safe Commit Note

At the time this handoff was written, the worktree was clean before adding this file. Commit this document together with any final intended changes before switching machine/window.
