# Phase 3 Workbench Boundary Rebuild Design

## Summary

本设计用于在进入 Phase 3 之前，一次性重建排班相关页面的信息架构、路由边界和文件边界，避免后续继续在旧 `Legacy` / `Pages.tsx` 汇流结构上叠功能。

本轮不是“改菜单名”，而是把当前混杂的旧工作台收口成正式的 `排班工作台`，并将 `飞后归档` 从工作台流程中拆出，迁回 `校验与问题处理` 分组下的独立业务模块。

同时，本轮把“timeline 只展示但仍有旧工作台气质”的问题纳入范围：不改变 display-only 业务边界，但要把展示壳、标题、空态、图例和页面组织改成新的正式模块风格，而不是继续像旧壳页面。

## Why This Exists

当前左侧菜单和页面结构存在 4 类问题：

1. `待排航班`、`草稿排班`、`校验与发布` 在用户心智上高度重叠，正式主路径不清晰。
2. `飞后归档` 仍挂在旧 workbench 组中，业务上像是排班中的一步，实际却属于发布后/落地后的独立处理链路。
3. `apps/web/src/app/pages/Pages.tsx` 仍承接多个旧 workbench 分支，后续任何新增功能都容易继续回灌到这个历史汇流文件。
4. timeline 虽已被降级为 display-only，但当前页面壳、说明语气和视觉组织仍偏旧 workbench，用户会误判它仍然是旧工作台的一部分。

如果不在 Phase 3 前先做这次边界重建，后续新增功能会继续在错误的模块边界上长，最终仍需大修。

## Goals

- 把当前 `Legacy` 正式改回 `排班工作台`。
- `排班工作台` 只保留 3 个正式入口：
  - `航班视图`
  - `机组视图`
  - `草稿排班`
- 从 `排班工作台` 中移除：
  - `待排航班`
  - `校验与发布`
  - `运行日调整`
  - `飞后归档`
- 把 `飞后归档` 迁入 `校验与问题处理` 分组，作为正式模块入口。
- 拆掉 `Pages.tsx` 中与被移除菜单相关的旧 workbench 分支，让后续新增功能不再回填到该文件。
- 保留 timeline 的 display-only 业务边界，同时刷新其页面壳，使其表现为“正式观察页”，而不是“旧工作台遗留页”。
- 保留旧路由的兼容退场，不引入无提示 404。

## Non-Goals

- 不重写 assignment domain、eligibility 或 draft save 语义。
- 不把 `运行日调整` 在本轮重新定义成新业务模块；本轮只把它从工作台主路径撤出。
- 不新增 `飞后归档` 新能力；本轮只完成模块归属重建和入口迁移。
- 不重新设计 vis timeline 的底层用法；仍然严格保持官方示例级 display adapter 边界。

## Core Decisions

### 1. 排班工作台重新定义为正式模块，而不是遗留收纳箱

`排班工作台` 只承担两类职责：

- 观察：`航班视图`、`机组视图`
- 进入排班：`草稿排班`

它不再承担以下能力：

- 额外的待排列表主入口
- 校验/发布动作
- 运行日调整
- 飞后归档

### 2. 草稿排班是唯一正式编辑入口

草稿编辑主路径固定为：

`排班工作台 -> 草稿排班 -> DraftRosteringPage -> AssignmentDrawer`

任何需要进行 draft assignment 的流程，都应回到这一主路径，不允许重新通过 timeline、旧 workbench 壳页或辅助列表入口打开编辑流程。

### 3. 飞后归档是独立业务模块，不再属于 workbench

`飞后归档` 是业务需求，必须保留；但其业务位置属于发布后/问题处理链路，而非排班工作台内部步骤。

本轮将其迁入 `校验与问题处理` 分组，路由与页面边界上都与旧 workbench 解耦。

### 4. Timeline 永久保持 display-only，但页面体验要正式化

timeline 的业务边界保持不变：

- 不承接 assignment drawer
- 不承接 archive drawer
- 不承接 run-day adjustment 业务动作
- 不成为 workflow state 的来源

但页面呈现需要收口成新的正式观察页：

- 不再使用旧 workbench 风格的混合壳
- 标题、说明、图例、空态和时间窗说明按正式模块组织
- 允许保留 vis-timeline 的原生 pan/zoom 体验
- 不引入新的业务按钮或自研时间轴动作

## Target Information Architecture

### 排班工作台

- `航班视图`
- `机组视图`
- `草稿排班`

### 校验与问题处理

- `违规处理`
- `发布结果`
- `结果导出`
- `飞后归档`

### 从排班工作台移除的能力

- `待排航班`
  - 能力由 `草稿排班` 队列覆盖
- `校验与发布`
  - 能力已被正式 validation / publish 模块覆盖
- `运行日调整`
  - 退出本轮主路径，后续单独定义归属
- `飞后归档`
  - 迁入 `校验与问题处理`

## Route Strategy

### 正式路由

- `/rostering-workbench/flight-view`
- `/rostering-workbench/crew-view`
- `/rostering-workbench/draft-rostering`
- `/validation-center/violation-handling`
- `/validation-center/release-gates`
- `/validation-center/export`
- `/validation-center/archive-entry`

### 兼容旧路由

- `/rostering-workbench/unassigned-tasks`
  - 重定向到 `/rostering-workbench/draft-rostering`
- `/rostering-workbench/draft-versions`
  - 重定向到 `/validation-center/release-gates`
- `/rostering-workbench/archive-entry`
  - 重定向到 `/validation-center/archive-entry`
- `/rostering-workbench/run-day-adjustments`
  - 不继续作为正式入口
  - 保留受控退场行为：显示明确说明或重定向到受控说明页
  - 不允许静默进入无关页面

规则：

- 菜单只暴露正式入口
- 兼容旧路由不再出现在菜单
- 不允许旧兼容路由继续长新功能

## File and Module Boundaries

### Workbench 模块

目标：只保留 display-only 观察页和主入口编排。

建议边界：

- `apps/web/src/app/pages/workbench/WorkbenchLayoutPage.tsx`
- `apps/web/src/app/pages/workbench/WorkbenchFlightViewPage.tsx`
- `apps/web/src/app/pages/workbench/WorkbenchCrewViewPage.tsx`
- `apps/web/src/app/pages/workbench/components/WorkbenchTimelineCard.tsx`
- `apps/web/src/app/pages/workbench/hooks/useWorkbenchTimeline.ts`

约束：

- 不引入 assignment / archive / publish 业务流程
- 不向 timeline 组件传递业务 drawer/action callback

### Draft Rostering 模块

目标：继续作为正式 draft assignment 主闭环，并为后续 Phase 3 功能扩展留出独立空间。

建议边界：

- `apps/web/src/app/pages/draft-rostering/DraftRosteringPage.tsx`
- `apps/web/src/app/pages/draft-rostering/components/DraftTaskQueue.tsx`
- `apps/web/src/app/pages/draft-rostering/components/AssignmentEntryButton.tsx`
- `apps/web/src/app/pages/draft-rostering/hooks/useDraftRosteringTasks.ts`
- `apps/web/src/app/pages/draft-rostering/hooks/useAssignmentDrawerFlow.ts`

### Validation / Archive 模块

目标：将发布后处理与 archive 正式模块化，不再依附旧 workbench state。

建议边界：

- `apps/web/src/app/pages/validation/IssueHandlingPage.tsx`
- `apps/web/src/app/pages/validation/PublishResultsPage.tsx`
- `apps/web/src/app/pages/validation/PublishExportPage.tsx`
- `apps/web/src/app/pages/validation/archive/ArchiveEntryPage.tsx`

### Routes 模块

目标：只做路径到页面的装配，不写业务分发逻辑。

建议边界：

- `apps/web/src/app/routes/workbenchRoutes.ts`
- `apps/web/src/app/routes/validationRoutes.ts`
- `apps/web/src/app/routes/moduleRoutes.ts` 仅做汇总或过渡

### Pages.tsx 退场策略

`apps/web/src/app/pages/Pages.tsx` 不再继续作为所有旧 workbench 流程的总装页。

本轮要求：

- 与 `待排航班 / 校验与发布 / 运行日调整 / 飞后归档` 相关的分支全部迁出
- 不允许在该文件继续新增排班业务分支
- 如需兼容老 import，可暂时保留极少量导出层，但不保留业务实现

## Maintainability Guardrails

1. `排班工作台` 只允许观察入口和 draft 入口，不允许重新加入 publish / archive / run-day 业务动作。
2. 被判定为 display-only 的 timeline 页面，不接受任何业务 drawer/action callback。
3. 同一个业务事实只允许一个正式主入口：
   - draft assignment: `草稿排班`
   - publish: `发布结果`
   - archive: `飞后归档`
4. 兼容旧路由只能重定向或退场提示，不能继续长新能力。
5. 新增功能必须优先进入正式模块目录，不允许再向 `Pages.tsx` 或旧 workbench 汇流层堆分支。
6. 跨模块共享只能通过明确的共享组件/hook，不允许页面内部状态互相渗透。
7. timeline 的视觉刷新必须停留在 display shell 范围内，不能借机重新恢复业务按钮或业务入口。

## Implementation Shape

本轮建议按 4 个相对独立的任务包推进：

### 任务包 A：信息架构与菜单/路由收口

- `Legacy` 改名为 `排班工作台`
- workbench 菜单裁剪到 3 个入口
- `飞后归档` 迁入 validation 分组
- 旧路由重定向和退场策略落地

### 任务包 B：Workbench 页面边界重建

- flight/crew timeline 页面从 `Pages.tsx` 中迁出
- 提炼 display-only timeline card / layout / hook
- workbench 只保留观察壳

### 任务包 C：Validation / Archive 模块落位

- archive 页面从旧 workbench 迁入 validation 子模块
- 修正标题、文案、入口和跳转链路
- 删除 timeline 对 archive 入口的历史暗示

### 任务包 D：真实点击与 F12 Gate

- 菜单与入口点击回归
- 旧路由兼容回归
- timeline display-only 回归
- Console / Network 观察，确保没有新增意外红错、404、500

## Acceptance Criteria

### 结构验收

- 左侧不再出现职责重叠的 `待排航班 / 草稿排班 / 校验与发布` 三入口并存。
- `排班工作台` 菜单只剩 3 个入口。
- `飞后归档` 不再出现在 workbench 分组中，而是在 `校验与问题处理` 下作为正式入口出现。
- `Pages.tsx` 不再承载被移除菜单的业务分支。

### 行为验收

- `草稿排班` 仍是唯一正式可编辑入口。
- `航班视图 / 机组视图` 继续为 display-only，点击 timeline item 不打开 assignment 或 archive drawer。
- archive 页面可从新入口独立打开，不依赖 timeline state。
- 旧路由访问时不会出现无提示 404。

### Timeline 体验验收

- timeline 页面保留 display-only 业务边界。
- timeline 页面标题、说明、图例和空态表现为正式观察页，而不是旧 workbench 遗留页。
- 不引入新的 timeline 自研动作，也不恢复旧 toolbar 逻辑。

### 测试验收

- `npm run build`
- `npm run check:i18n`
- Playwright 真实点击：
  - workbench 三入口可达
  - 被移除入口不再出现
  - archive 新入口可达
  - 旧路由重定向或退场行为正确
  - timeline display-only 无回归
- F12/Console/Network：
  - 无新增未预期红错
  - 无因菜单/路由迁移引入的未预期 404/500

## Phase 3 Readiness

当以下条件全部满足时，可以认为系统已在新边界上进入 Phase 3：

- 菜单结构已收口
- workbench 页面边界已重建
- archive 已脱离旧 workbench
- 旧路由已兼容退场
- timeline 已完成 display-only 正式化展示
- 真实点击与 F12 Gate 通过

届时，Phase 3 新功能即可围绕以下稳定边界继续开发：

- 观察：`排班工作台`
- 编辑：`草稿排班`
- 发布后处理：`校验与问题处理`
- 归档：`飞后归档`
