# 一期飞后归档专项开发流程：归档工作区优先，甘特展示

## 1. 最终结论

一期飞后归档不再以甘特图作为唯一主入口。正式方向是：

- `Post-flight Archive`、归档详情和飞后归档表单承载录入、确认、权限、版本和审计。
- 甘特图只作为态势展示视图，显示归档状态、风险位置、时间关系和详情跳转。
- 所有写操作必须通过后端命令、状态机、版本号和审计日志完成。
- 甘特图不得直接改写航班、机组、归档、规则或 actual 数据。

这份文档继续沿用原文件名，是为了保持开发计划中的链接稳定；内容口径以本版为准。

## 2. P0 验收目标

固定种子航班 `NX9001`，关联两名飞行员。排班员能完成以下闭环：

1. 航班结束后，任务池、归档列表和甘特图都显示 `未归档`。
2. 排班员从 `Post-flight Archive` 进入归档详情。
3. 归档详情展示航班信息、归档截止时间、关联飞行员列表和每人表单状态。
4. 排班员保存第一名飞行员归档表单后，航班变为 `部分归档`。
5. 排班员保存全部飞行员归档表单后，航班自动变为 `已归档`。
6. 超过 24 小时未完成整班归档时，任务池、归档列表和甘特图显示 `逾期未归档`。
7. 甘特图点击航班块只能打开只读详情或跳转归档详情，编辑能力由归档详情和后端权限控制。

## 3. 权限边界

| 角色 | 能力 |
| --- | --- |
| `DISPATCHER` | 可录入、保存和确认飞后归档表单 |
| `OPS_MANAGER` | 可查看归档状态、归档详情和逾期情况，表单只读 |
| `PILOT` | 不进入后台归档录入，只能通过 `/api/pilot/me/*` 查看本人归档摘要 |
| `ADMIN` | 可维护账号和系统配置，不参与业务归档录入 |

飞行员本人数据范围必须使用 `PILOT + sys_user.crew_id` 双层权限。飞行员端接口不得接受前端传入的任意 `crewId` 作为数据范围。

## 4. 时间安全门禁

- 数据库存储和 API 瞬时时间统一使用 UTC 字段，例如 `archiveDeadlineAtUtc`、`actualDutyStartUtc`。
- 展示时区只影响 UI 文本，不影响规则计算、归档截止、审计和报表统计口径。
- 任务池、归档详情、归档表单、甘特图、报表预览都必须使用统一时间组件。
- 禁止业务组件直接调用 `new Date()`、`toLocaleString()`、`toISOString().slice()`、`Date.parse()` 或字符串切片处理时间。
- 每次进入归档开发主线前后必须执行 `npm.cmd run check:time`。

## 5. 数据模型

### FlightArchiveCase

- `archiveCaseId`
- `flightId`
- `archiveStatus`: `Unarchived / PartiallyArchived / Archived / Overdue`
- `archiveDeadlineAtUtc`
- `completedAtUtc`
- `revision`
- `createdAtUtc`
- `updatedAtUtc`

### CrewArchiveForm

- `formId`
- `archiveCaseId`
- `crewId`
- `formStatus`: `Pending / Completed`
- `actualDutyStartUtc`
- `actualDutyEndUtc`
- `actualFdpStartUtc`
- `actualFdpEndUtc`
- `flyingHour`
- `noFlyingHourFlag`
- `revision`
- `savedBy`
- `savedAtUtc`

## 6. 接口顺序

1. `GET /api/archive/cases`
   - 归档队列和筛选。
   - 返回窗口、状态、逾期、航班号、飞行员摘要和权限摘要。

2. `GET /api/archive/cases/{archiveCaseId}`
   - 返回航班信息、归档截止、关联飞行员列表、表单状态和当前用户可操作性。

3. `PUT /api/archive/forms/{formId}`
   - 保存单个飞行员归档表单。
   - 必须带 `expectedRevision`。
   - 保存成功返回 updated form、updated case、affected ids、affected window、rule summary 和 auditLogId。

4. `GET /api/gantt-timeline`
   - 甘特态势展示投影。
   - 返回 `archiveCaseId`、`archiveStatus`、`archiveDeadlineAtUtc`、`crewArchiveSummary`、`canOpenArchiveDetail`。

5. `/api/pilot/me/*`
   - 飞行员端本人数据接口。
   - 只按登录用户绑定的 `crew_id` 返回本人归档摘要、本人例外/CDR 和本人状态记录。

## 7. 前端页面与组件

- `ArchiveEntryPage`
  - 归档列表、状态筛选、逾期筛选、航班/日期/crew 筛选。

- `ArchiveDetailDrawer`
  - 航班详情、归档截止时间、状态摘要、关联飞行员列表、审计摘要。

- `CrewArchiveForm`
  - 录入 `actual duty start/end`、`actual fdp start/end`、`flyingHour`、`noFlyingHourFlag`。
  - 保存前显示 UTC 与当前展示时区确认文本。

- 甘特展示适配层
  - 只读态势展示。
  - 渲染底座固定为 `vis-timeline` 官方 `Timeline` 实例，不从零自研甘特渲染引擎。
  - 显示归档状态角标、风险状态、业务块时间关系、缩放/平移和详情跳转。
  - Timeline 初始化、items/groups/options 映射和事件细节必须封装在时间线适配层内，不得泄漏到业务页面。

## 8. 开发顺序

1. 完成时间安全门禁与统一时间组件。
2. 建 `FlightArchiveCase / CrewArchiveForm` 模型、状态枚举、状态机和迁移。
3. 做归档队列 API 与 `ArchiveEntryPage`。
4. 做归档详情 API 与 `ArchiveDetailDrawer`。
5. 做单人归档表单保存、`expectedRevision` 和局部刷新。
6. 做全部飞行员完成后的整班自动归档。
7. 做 24 小时逾期状态与提醒。
8. 接入甘特态势展示投影和详情跳转。
9. 发布 `ArchiveUpdated / ArchiveCompleted` 领域事件。
10. 接 actual duty、actual FDP、actual violations、累计小时、block time 和 AACM 待报送清单刷新入口。
11. 接飞行员端本人归档摘要。

## 9. Playwright 验收

- `UAT-AR-001`: 航班结束后，归档列表显示 `未归档`。
- `UAT-AR-002`: 甘特图同步显示同一航班的 `未归档` 状态。
- `UAT-AR-003`: 排班员从归档列表进入归档详情，看到全部关联飞行员。
- `UAT-AR-004`: 保存第一名飞行员后，航班变为 `部分归档`。
- `UAT-AR-005`: 无 `FLYING_HOUR` 时，勾选显式标记后该飞行员表单视为完成。
- `UAT-AR-006`: 全部飞行员完成后，航班自动变为 `已归档`。
- `UAT-AR-007`: 超过 24 小时未完成时，任务池、归档列表和甘特图显示 `逾期未归档`。
- `UAT-AR-008`: 运行经理只能只读查看归档详情，不能编辑表单。
- `UAT-AR-009`: 飞行员不能访问后台归档录入。
- `UAT-AR-010`: 飞行员 `/api/pilot/me/*` 只返回当前 `crew_id` 本人数据。
- `UAT-AR-011`: 切换 `UTC / UTC+8` 后，归档详情、归档表单、甘特图和报表预览时间文本同步变化，底层状态不变。

## 10. 非目标

- 一期不做甘特拖拽改航班时间。
- 一期不做甘特跨行拖拽改机组。
- 一期不做甘特直接编辑归档表单。
- 一期不把甘特控件作为业务事实源。
- 旧 zip、`apps/web/src/imports`、`gantt-task-react-main` 和第三方示例只可作为视觉或技术 spike 参考，不可作为功能需求来源。

