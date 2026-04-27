# 飞行员排班系统开发实施计划（1-4期）

## 1. 文档定位

本文件用于指导飞行员排班系统从架构落地到 1-4 期实施开发，重点回答以下问题：

- 系统采用什么技术架构最稳妥
- 开发顺序如何执行“先搭框架，再填模块”
- 1-4 期每一期交付哪些一级入口、父子菜单和功能点
- 数据库如何按 MySQL 8.0 设计核心逻辑表
- 如何通过 TDD 和 Playwright 建立稳定的测试与验收机制

本文件是研发、测试、产品和项目经理共用的开发基线。

## 2. 架构基线

### 2.1 总体建议

建议一期到二期采用 `模块化单体 + CQRS-lite + 事件驱动内核 + 甘特态势展示适配层`。

原因：

- 当前系统复杂点在规则、状态流、时间轴和业务闭环，不在微服务拆分
- 一期需要稳定落地，不适合先引入分布式事务和跨服务联调复杂度
- 模块化单体可以先保证业务闭环，三期以后再评估服务拆分

### 2.2 技术栈建议

| 层 | 建议技术 | 说明 |
| --- | --- | --- |
| 前端 | React + TypeScript + Vite | 企业后台开发效率高，适合任务池、表单、详情抽屉和态势展示场景 |
| 甘特图底座 | `vis-timeline` 官方 `Timeline` + 展示适配层 | 一期只做态势展示和详情跳转，直接使用官方时间轴能力，不手写甘特渲染引擎，不把业务写操作耦合到甘特控件 |
| 前端状态 | TanStack Query + Zustand | 查询状态和工作台局部状态分离 |
| 表单 | React Hook Form + Zod | 适合按钮/输入框级校验与测试 |
| 后端 | Spring Boot 3 + Java 17 | 企业级后端基线，适合复杂规则、事务、权限、审计、归档和长期维护 |
| 数据库 | MySQL 8.0 | 统一使用 InnoDB 与 utf8mb4 |
| 缓存/异步 | Redis + BullMQ | 通知、投影刷新、异步计算 |
| 自动化测试 | JUnit 5 / Spring Boot Test / Playwright | 后端集成测试与前端 E2E 验收 |

当前实现决策：

- 后端已确定为 `Spring Boot 3 + Java 17`，不再采用 NestJS。
- 前端继续采用 `React + TypeScript + Vite`。旧浅色设计包和 `apps/web/src/imports` 历史文件仅用于参考浅色主题、布局密度、侧边栏展开/折叠和二级菜单视觉效果，不得复用其中的功能需求、菜单文字、角色权限、API、数据模型、算法能力或验收口径。
- 认证采用 `Spring Security + JWT + BCrypt`。
- 首批业务角色为 `DISPATCHER / OPS_MANAGER / PILOT`，另保留 `ADMIN` 作为系统管理角色。
- 默认展示语言为中文，默认展示时区为 `UTC+8`，数据库时间继续统一存储为 UTC。

### 2.3 开发端口规范

本地开发环境端口固定如下：

| 服务 | 端口 | 说明 |
| --- | ---: | --- |
| 前端开发服务 | `5180` | React + Vite 本地开发端口 |
| 后端开发服务 | `8088` | API、本地管理接口与调试端口 |

要求：

- 前后端联调文档、环境变量、Playwright 配置统一使用以上端口
- 新增本地工具页或代理时，不得占用 `5180` 与 `8088`
- 若后续接入网关，网关端口单独定义，不覆盖前后端基础端口
- 当前 Windows 中文路径下 `mvn spring-boot:run` 可能出现启动类解析问题；本地后端推荐先 `mvn package -DskipTests`，再 `java -jar target/pilot-roster-api-0.1.0-SNAPSHOT.jar`。

### 2.3 核心架构原则

1. `先框架，后模块`
2. `先测试，后实现`
3. `业务写模型` 与 `查询读模型` 分离
4. `统一时间块模型` 与 `统一 Overlay 模型`
5. `所有关键状态显式建模`
6. `所有关键动作可追溯`

### 2.4 后端模块划分

后端按模块化单体组织，模块边界尽量清晰：

- `auth-admin`
- `crew`
- `task-plan`
- `roster`
- `rule-engine`
- `validation`
- `exception-cdr`
- `archive`
- `pilot-report`
- `notification`
- `reporting`

每个模块统一四层：

- `api`
- `application`
- `domain`
- `repository`

### 2.4 移动端支持策略

系统必须支持移动端，但采用分角色差异化策略：

- `桌面优先`：
  - Dashboard
  - Flight Operations Center
  - Crew Resources Center
  - Rostering Workbench
  - Rule Center
  - Exception Reporting Center
  - Statistics Reports
  - Admin
- `移动端优先/兼容`：
  - Pilot Portal
  - 运行经理的轻量审批、查看与提醒

实施口径：

- 一期不做原生 App
- 一期采用 `响应式 Web`
- 排班工作台以桌面端为主，不要求在手机端完成复杂拖拽排班
- 飞行员端必须在手机浏览器中可用，后续可再封装到企业容器或钉钉

### 2.5 前端模块划分

前端按页面与共享能力组织：

- `app-shell`
- `dashboard`
- `flight-operations-center`
- `crew-status`
- `rostering-workbench`
- `rule-center`
- `exceptions-cdr`
- `statistics-reports`
- `admin`
- `pilot-portal`
- `shared-components`
- `timeline-adapter`

### 2.6 甘特态势展示适配层

一期甘特图底座固定为 `vis-timeline` 官方 `Timeline` 实例，参考官方 React 示例实现航空态势时间线。不允许业务代码直接耦合 Timeline 初始化、items/groups/options 映射或事件细节，必须增加展示适配层：

- `TimelineViewAdapter`
- `TimelineGroupMapper`
- `TimelineItemMapper`
- `OverlayRenderer`
- `TimelineActionAdapter`

适配层只负责读取查询投影、展示业务块、状态角标、时间标签、缩放/平移和详情跳转；不得直接提交排班、机组、归档或规则写操作。

### 2.7 数据与事件架构

采用 `CQRS-lite`：

- 写入：改真实业务表
- 查询：读投影表
- 同库，不拆独立读库

核心内部事件：

- `TaskPlanImported`
- `RosterDraftChanged`
- `VersionSubmitted`
- `VersionApproved`
- `VersionReturned`
- `ExceptionApproved`
- `ArchiveUpdated`
- `ArchiveCompleted`
- `PilotReportSubmitted`
- `PilotReportResolved`

### 2.8 国际化与时区策略

#### 语言

- 首版支持：
  - `zh-CN`
  - `en-US`
- 静态界面文案优先使用前端资源文件，不落库
- 动态字典类数据需支持：
  - `name_zh`
  - `name_en`

#### 时区

- 数据库存储时间统一使用 `UTC`
- 前端展示允许用户切换：
  - `UTC`
  - `UTC+8`
- 业务规则计算继续保留：
  - 存储 UTC
  - 计算时使用对象所属业务时区
  - 展示时按用户选择的显示时区输出
- 时间安全护栏必须先于正式甘特图开发完成：
  - 前端统一通过 `TimeDisplayContext`、`useTimeFormatter()`、`Timestamp`、`DateOnly`、`TimeRange`、`GanttTimeLabel`、`TimezoneBadge` 展示时间
  - 业务组件不得直接使用 `new Date()`、`toLocaleString()`、`toISOString().slice()`、`Date.parse()` 或字符串切片处理时间
  - 后端 API 瞬时时间字段必须使用 `*Utc` 语义后缀，禁止新增 `startTime`、`dateTime`、`time` 等无语义字段名
  - 甘特布局计算统一使用 UTC epoch milliseconds，展示时区切换只更新文本，不改变块位置、规则计算、审计和状态流转
  - actual duty / FDP、归档、例外、PIC 决策、运行日调整等安全表单必须显示输入解释时区，并在保存前展示 UTC 与当前展示时区确认信息
  - 本地和 CI 必须执行 `npm.cmd run check:time`

### 2.9 书写、日期与字符集一致性规范

#### 书写规范一致性

系统开发、文档、接口、页面文案必须遵循统一规范：

- 数据库表名、列名统一使用 `snake_case`
- 前端 TypeScript 对象字段统一使用 `camelCase`
- API 对外字段统一使用 `camelCase`
- 枚举值统一使用英文大写或帕斯卡命名，不混用中英文字面量
- 页面按钮、字段标签、提示语必须从统一语言资源中读取，不允许散落硬编码
- 同一业务对象名称在全系统保持一致，例如：
  - `Flight`
  - `Rest`
  - `DDO`
  - `Recovery`
  - `Standby`
  - `Positioning`
  - `Archive`

#### 日期时间展示一致性

前端所有页面必须复用统一日期时间格式化工具，不允许各页面各自格式化。

标准格式固定为：

| 场景 | 格式 | 说明 |
| --- | --- | --- |
| 日期 | `YYYY-MM-DD` | 列表、筛选、表单日期字段 |
| 日期时间 | `YYYY-MM-DD HH:mm` | 工作台、侧栏、明细页 |
| 含时区日期时间 | `YYYY-MM-DD HH:mm (UTC)` / `YYYY-MM-DD HH:mm (UTC+8)` | 需要明确展示时区时使用 |
| 日期区间 | `YYYY-MM-DD ~ YYYY-MM-DD` | 筛选条件、范围摘要 |
| 时间区间 | `YYYY-MM-DD HH:mm ~ YYYY-MM-DD HH:mm` | 归档、例外、影响区间 |

要求：

- 同一用户在同一时刻切换 `UTC / UTC+8` 后，全站展示同步变化
- 列表页、甘特图侧栏、弹窗、导出预览使用同一套格式
- 规则计算结果中的时间展示必须与工作台明细口径一致

#### 字符集一致性

由于系统同时包含中文与英文，字符集必须统一：

- 数据库字符集：`utf8mb4`
- 数据库排序规则：统一选定一套 `utf8mb4` 排序规则，不允许库表混用
- 应用接口编码：`UTF-8`
- 前端源码、语言资源、测试夹具文件：`UTF-8`
- Markdown、JSON、CSV、导出模板统一按 `UTF-8` 处理
- 面向 Excel 的 CSV 导出建议使用 `UTF-8 with BOM`

#### 测试数据字符集要求

测试数据必须与客户端字符集策略一致：

- 单元测试、集成测试、Playwright 夹具统一使用 `UTF-8`
- 测试数据必须覆盖：
  - 纯中文
  - 纯英文
  - 中英混合
  - 含时区切换后的日期展示
- 不允许测试只覆盖英文假数据
- 导入测试文件必须验证中文、英文、混合文本在前端与导出文件中的一致性

## 3. 开发方法与测试策略

### 3.1 开发方法

开发方式固定为：

1. 先搭本期框架
2. 先写测试
3. 再实现最小功能
4. 通过测试后重构
5. 补 E2E
6. 再做业务验收

### 3.2 TDD 执行规则

每个功能开发顺序固定：

1. 写用户故事
2. 写按钮/输入框级验收标准
3. 先写失败测试
4. 实现最小代码
5. 重构
6. 补 Playwright

### 3.3 测试分层

| 层级 | 范围 | 工具 |
| --- | --- | --- |
| 单元测试 | 规则计算、状态机、时间计算 | Vitest |
| 组件测试 | 按钮、表单、侧栏、列表、时间块 | RTL + Vitest |
| 集成测试 | API、权限、数据库、事务、投影刷新 | 后端测试框架 |
| E2E | 核心业务闭环 | Playwright |

### 3.4 Playwright 范围

Playwright 必须覆盖：

- 登录与角色权限
- 主工作台双视图
- 草稿保存与发布
- 经理确认与打回
- 例外申请与审批
- 飞后归档：任务池和归档列表标记、归档详情打开、逐个录入飞行员表单、单人保存局部刷新、整班自动归档、逾期提示、运行经理只读；甘特图同步展示状态并支持详情跳转
- 飞行员状态申报
- 核心报表筛选与导出

飞后归档专项用例与开发流程见 [PHASE1_GANTT_ARCHIVE_WORKFLOW.md](</D:/paiban2/PHASE1_GANTT_ARCHIVE_WORKFLOW.md>)。该专项为一期 P0 验收范围，所有影响归档状态、actual 数据、规则复算和 AACM 清单的功能必须同步更新对应 Playwright 用例；甘特图只验收状态展示和详情跳转。

排班工作台一期收口口径见 [PHASE1_ROSTERING_WORKBENCH_CLOSURE.md](</D:/paiban2/PHASE1_ROSTERING_WORKBENCH_CLOSURE.md>)。二期规则接管口径见 [PHASE2_RULE_VALIDATION_CLOSURE.md](</D:/paiban2/PHASE2_RULE_VALIDATION_CLOSURE.md>)。三期完整规则引擎待办见 [PHASE3_RULE_ENGINE_BACKLOG.md](</D:/paiban2/PHASE3_RULE_ENGINE_BACKLOG.md>)。一期完成基础发布门槛、发布后锁定、运行日调整入口和飞后归档闭环；二期完成规则命中池雏形、发布门槛、同一机组时间重叠、航班与状态块冲突、规则中心展示和最近命中；FDP/FTL、preceding rest、DDO 34h + local nights、连续 duty、28 天累计、跨时区 recovery、Standby、Positioning、Discretion/CDR/AACM 等完整法规计算统一进入三期规则引擎。

### 3.5 验收颗粒度

#### 按钮级

- 按钮是否显示
- 谁可见
- 谁可点
- 点击后动作是否正确
- 成功/失败提示是否正确
- 是否写入审计日志

#### 输入框级

- 标签是否正确
- 默认值是否正确
- 占位是否正确
- 是否必填
- 校验提示是否正确
- 保存后是否持久化
- 回显是否正确
- 中英文切换后标签和提示是否同步正确
- `UTC / UTC+8` 切换后时间显示是否同步正确

#### 列表级

- 默认排序
- 默认筛选
- 空状态
- 点击行为
- 搜索/过滤结果
- 日期列格式是否与全站一致
- 中英文字段是否无乱码

#### 甘特图级

- 时间块是否正确渲染
- Overlay 是否正确渲染
- 点击是否打开正确侧栏
- 状态刷新是否局部生效
- 视图切换是否保留上下文
- 时区切换后时间轴标签是否同步刷新
- 中英文切换后块标签与侧栏文案是否一致

## 4. 核心逻辑表结构设计（MySQL 8.0）

### 4.1 表设计约定

- 数据库：`MySQL 8.0`
- 引擎：`InnoDB`
- 字符集：`utf8mb4`
- 主键统一为 `bigint` 或 `varchar(64)`，视业务主键是否外部可读
- 时间字段统一存 `UTC`
- 审计字段统一包含：
  - `created_at`
  - `created_by`
  - `updated_at`
  - `updated_by`

### 4.2 `sys_user`

系统用户表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `user_id` | varchar(64) PK | 系统用户唯一标识 |
| `login_name` | varchar(100) | 登录账号 |
| `display_name` | varchar(100) | 显示名称 |
| `role_code` | varchar(50) | 角色编码，如 `DISPATCHER` / `OPS_MANAGER` / `PILOT` / `ADMIN` |
| `crew_id` | varchar(64) nullable | 若该用户对应飞行员，则关联飞行员主档 |
| `status` | varchar(20) | 用户状态，启用/停用 |
| `created_at` | datetime | 创建时间（UTC） |
| `created_by` | varchar(64) | 创建人 |
| `updated_at` | datetime | 修改时间（UTC） |
| `updated_by` | varchar(64) | 修改人 |

飞行员本人数据范围：

- 飞行员权限固定采用两层模型：`hasRole(PILOT)` 控制入口，`belongsToCurrentCrew(record)` 控制具体数据归属。
- 后端必须按 `hasRole(PILOT) && belongsToCurrentCrew(record)` 执行飞行员端数据访问；前端隐藏菜单或按钮不是安全边界。
- `PILOT` 用户必须绑定 `crew_id` 后才能访问飞行员端业务数据。
- 飞行员端 API 必须从当前登录用户解析 `crew_id`，不得信任前端传入的任意 `crewId`、`crewIds` 或筛选参数。
- 飞行员端优先使用 `/me` 风格接口：`/api/pilot/me/roster`、`/api/pilot/me/alerts`、`/api/pilot/me/history`、`/api/pilot/me/archive-summary`、`/api/pilot/me/exceptions-cdr`、`/api/pilot/me/status-reports`。
- 所有个人班表、提醒、状态申报、历史、本人归档摘要、本人相关规则命中、本人相关例外/CDR/PIC 决策记录查询都必须按该 `crew_id` 过滤。
- 飞行员访问其他飞行员 ID、归档表单、规则命中或历史记录时必须返回 `403` 或等价无权限响应。
- Playwright 必须覆盖飞行员尝试访问他人数据被拒绝的回归场景。

### 4.3 `user_preference`

用户个性化偏好表，用于中英文切换与显示时区切换。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `user_id` | varchar(64) PK | 关联 `sys_user.user_id` |
| `language_code` | varchar(10) | 界面语言，固定支持 `zh-CN` / `en-US` |
| `display_timezone_mode` | varchar(20) | 显示时区模式，固定支持 `UTC` / `UTC_PLUS_8` |
| `date_format` | varchar(30) | 日期显示格式，可扩展 |
| `time_format` | varchar(20) | 时间显示格式，可扩展 |
| `updated_at` | datetime | 偏好更新时间（UTC） |
| `updated_by` | varchar(64) | 更新人 |

### 4.4 `airport_dictionary`

机场与时区字典。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `airport_code` | varchar(10) PK | 机场三字码/四字码 |
| `airport_name_zh` | varchar(200) | 机场中文名 |
| `airport_name_en` | varchar(200) | 机场英文名 |
| `timezone_code` | varchar(50) | IANA 时区编码 |
| `utc_offset_std` | varchar(10) | 标准时区偏移说明 |
| `country_code` | varchar(10) | 国家/地区代码 |
| `status` | varchar(20) | 启用状态 |

### 4.5 `crew_member`

飞行员主档。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `crew_id` | varchar(64) PK | 飞行员唯一标识 |
| `employee_no` | varchar(50) | 员工编号 |
| `name_zh` | varchar(100) | 中文姓名 |
| `name_en` | varchar(100) | 英文姓名 |
| `base_code` | varchar(20) | 所属基地 |
| `crew_role_code` | varchar(50) | 飞行岗位，如 PIC / FO / Relief |
| `rank_code` | varchar(50) | 技术等级 |
| `primary_aircraft_type` | varchar(50) | 主机型 |
| `acclimatization_status` | varchar(30) | 当前适应状态 |
| `body_clock_timezone` | varchar(50) | 身体钟参考时区 |
| `normal_commute_minutes` | int | 正常通勤时长 |
| `external_employment_flag` | tinyint(1) | 是否存在外部工作 |
| `availability_status` | varchar(30) | 当前可排状态 |
| `status` | varchar(20) | 主档状态 |
| `created_at` | datetime | 创建时间（UTC） |
| `created_by` | varchar(64) | 创建人 |
| `updated_at` | datetime | 修改时间（UTC） |
| `updated_by` | varchar(64) | 修改人 |

### 4.6 `crew_qualification`

飞行员资质表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `qualification_id` | bigint PK | 资质记录主键 |
| `crew_id` | varchar(64) | 关联飞行员 |
| `qualification_type` | varchar(50) | 资质类型，如 aircraft / instructor / check |
| `qualification_code` | varchar(50) | 资质编码 |
| `effective_from` | datetime | 生效时间（UTC） |
| `effective_to` | datetime | 失效时间（UTC） |
| `status` | varchar(20) | 当前状态 |

### 4.7 `task_plan_import_batch`

导入批次表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `batch_id` | varchar(64) PK | 导入批次号 |
| `batch_type` | varchar(50) | 批次类型，如 FLIGHT / TRAINING / STANDBY |
| `source_name` | varchar(200) | 来源文件或来源系统说明 |
| `batch_status` | varchar(30) | 批次状态：IMPORTED / PARTIAL / REJECTED |
| `total_count` | int | 总记录数 |
| `accepted_count` | int | 入池条数 |
| `pending_fix_count` | int | 待修正条数 |
| `rejected_count` | int | 拒绝条数 |
| `imported_at_utc` | datetime | 导入时间（UTC） |
| `imported_by` | varchar(64) | 导入人 |

### 4.8 `task_plan_item`

统一任务池表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `task_id` | varchar(64) PK | 任务唯一标识 |
| `batch_id` | varchar(64) nullable | 所属导入批次 |
| `task_type` | varchar(50) | `FLIGHT / TRAINING / SIMULATOR / GROUNDDUTY / STANDBY / POSITIONING / MANUALBLOCK` |
| `task_code` | varchar(100) | 航班号或任务编码 |
| `title_zh` | varchar(200) | 中文标题 |
| `title_en` | varchar(200) | 英文标题 |
| `dep_airport_code` | varchar(10) nullable | 起点机场 |
| `arr_airport_code` | varchar(10) nullable | 落地机场 |
| `start_at_utc` | datetime | 开始时间（UTC） |
| `end_at_utc` | datetime | 结束时间（UTC） |
| `aircraft_type` | varchar(50) nullable | 机型 |
| `required_crew_pattern` | varchar(100) nullable | 所需机组构成 |
| `task_status` | varchar(30) | 待排/已排/取消等 |
| `source_status` | varchar(30) | 导入结果：ACCEPTED / PENDING_FIX / REJECTED |

### 4.9 `roster_version`

排班版本表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `version_id` | varchar(64) PK | 版本唯一标识 |
| `source_version_id` | varchar(64) nullable | 来源版本，用于新草稿继承 |
| `version_no` | varchar(50) | 可读版本号 |
| `version_status` | varchar(30) | `Draft / PendingApproval / Published / Returned / Withdrawn / Superseded` |
| `scope_start_date` | date | 本版本覆盖的开始日期 |
| `scope_end_date` | date | 本版本覆盖的结束日期 |
| `scope_base_code` | varchar(20) nullable | 本版本主要基地范围 |
| `submitted_at` | datetime nullable | 提交审核时间 |
| `approved_at` | datetime nullable | 确认时间 |
| `published_at` | datetime nullable | 发布时间 |
| `created_at` | datetime | 创建时间 |
| `created_by` | varchar(64) | 创建人 |
| `approved_by` | varchar(64) nullable | 确认人 |

### 4.10 `timeline_block`

统一时间块表，是甘特图主数据来源。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `block_id` | varchar(64) PK | 时间块唯一标识 |
| `version_id` | varchar(64) | 所属排班版本 |
| `block_type` | varchar(50) | `Flight / Rest / DDO / Recovery / Training / Simulator / Standby / Positioning / GroundDuty / ManualBlock` |
| `source_type` | varchar(50) | 来源对象类型 |
| `source_id` | varchar(64) | 来源对象 ID |
| `crew_id` | varchar(64) nullable | 关联飞行员 |
| `flight_id` | varchar(64) nullable | 关联航班 |
| `start_at_utc` | datetime | 块开始时间（UTC） |
| `end_at_utc` | datetime | 块结束时间（UTC） |
| `label_zh` | varchar(200) | 中文展示标签 |
| `label_en` | varchar(200) | 英文展示标签 |
| `short_label_zh` | varchar(100) | 中文短标签 |
| `short_label_en` | varchar(100) | 英文短标签 |
| `display_order` | int | 同组内显示顺序 |
| `block_status` | varchar(30) | 基础块状态 |
| `is_deleted` | tinyint(1) | 是否逻辑删除 |

### 4.11 `overlay`

统一叠层表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `overlay_id` | varchar(64) PK | 叠层唯一标识 |
| `overlay_type` | varchar(30) | `Risk / Archive / Exception` |
| `overlay_level` | varchar(50) | 各类型具体级别 |
| `target_type` | varchar(30) | 目标对象类型，如 TIMELINE_BLOCK / FLIGHT_SUMMARY / CREW_SUMMARY |
| `target_id` | varchar(64) | 目标对象 ID |
| `label_zh` | varchar(100) | 中文标签 |
| `label_en` | varchar(100) | 英文标签 |
| `short_label_zh` | varchar(50) | 中文短标签 |
| `short_label_en` | varchar(50) | 英文短标签 |
| `icon_key` | varchar(50) | 前端图标键值 |
| `overlay_status` | varchar(30) | 轻量通用状态 |
| `effective_at` | datetime | 生效时间 |
| `expired_at` | datetime nullable | 失效时间 |

### 4.12 `evaluation_result`

规则结果汇总表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `evaluation_id` | varchar(64) PK | 规则结果汇总主键 |
| `object_type` | varchar(30) | 被校验对象类型 |
| `object_id` | varchar(64) | 被校验对象 ID |
| `version_id` | varchar(64) nullable | 所属版本 |
| `overall_status` | varchar(30) | 汇总结果状态 |
| `highest_severity` | varchar(30) | 最高严重级别 |
| `hit_count` | int | 命中条数 |
| `is_exception_allowed` | tinyint(1) | 是否允许例外 |
| `evaluated_at` | datetime | 计算时间 |

### 4.13 `violation_hit`

单条规则命中表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `hit_id` | varchar(64) PK | 规则命中主键 |
| `evaluation_id` | varchar(64) | 关联汇总结果 |
| `rule_id` | varchar(50) | 规则编码 |
| `rule_category` | varchar(30) | 硬校验/告警留痕/治理提醒 |
| `severity` | varchar(30) | BLOCK/NON_COMPLIANT/ALERT/INFO |
| `message_zh` | varchar(500) | 中文结果说明 |
| `message_en` | varchar(500) | 英文结果说明 |
| `source_section` | varchar(50) | 来源章节 |
| `source_clause` | varchar(50) | 来源条款 |
| `source_page` | varchar(20) | 来源页码 |
| `evidence_json` | json | 证据快照 |

### 4.14 `exception_record`

例外记录表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `exception_id` | varchar(64) PK | 例外唯一标识 |
| `version_id` | varchar(64) | 所属版本 |
| `object_type` | varchar(30) | 例外主对象类型 |
| `object_id` | varchar(64) | 例外主对象 ID |
| `exception_type` | varchar(50) | 例外类型 |
| `hit_rule_ids` | json | 被覆盖规则列表 |
| `request_reason` | text | 发起原因 |
| `exception_status` | varchar(30) | `Pending / Approved / Rejected / Closed` |
| `requested_by` | varchar(64) | 发起人 |
| `requested_at` | datetime | 发起时间 |
| `decided_by` | varchar(64) nullable | 处理人 |
| `decided_at` | datetime nullable | 处理时间 |
| `decision_comment` | text nullable | 决策说明 |

### 4.15 `flight_archive_case`

航班归档任务表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `archive_case_id` | varchar(64) PK | 航班归档任务 ID |
| `flight_id` | varchar(64) | 归档对应航班 |
| `archive_status` | varchar(30) | `Unarchived / PartiallyArchived / Archived / Overdue` |
| `archive_deadline_at_utc` | datetime | 归档截止时间（UTC） |
| `archived_at_utc` | datetime nullable | 整班正式归档时间（UTC） |
| `completed_count` | int | 已完成飞行员人数 |
| `total_count` | int | 关联飞行员总数 |
| `created_at` | datetime | 创建时间 |

### 4.16 `crew_archive_form`

单飞行员归档表单。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `form_id` | varchar(64) PK | 归档表单主键 |
| `archive_case_id` | varchar(64) | 所属航班归档任务 |
| `flight_id` | varchar(64) | 关联航班 |
| `crew_id` | varchar(64) | 关联飞行员 |
| `actual_duty_start_utc` | datetime | 实际 duty 开始时间 |
| `actual_duty_end_utc` | datetime | 实际 duty 结束时间 |
| `actual_fdp_start_utc` | datetime | 实际 FDP 开始时间 |
| `actual_fdp_end_utc` | datetime | 实际 FDP 结束时间 |
| `duty_duration_minutes` | int | 系统计算的 duty 时长 |
| `fdp_duration_minutes` | int | 系统计算的 FDP 时长 |
| `flying_hour_minutes` | int nullable | 系统计算的飞行时长 |
| `no_flying_hour_flag` | tinyint(1) | 是否显式标记无飞行时长 |
| `form_status` | varchar(40) | `Not Started / Entered / No Flying Hour Confirmed / Completed` |
| `entered_by` | varchar(64) | 录入人 |
| `entered_at_utc` | datetime | 录入时间（UTC） |
| `confirmed_at_utc` | datetime nullable | 完成确认时间（UTC） |

### 4.17 `pilot_status_report`

飞行员状态申报表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `report_id` | varchar(64) PK | 申报主键 |
| `crew_id` | varchar(64) | 关联飞行员 |
| `report_type` | varchar(30) | `Fatigue / Unfit / PersonalConflict` |
| `report_content` | text | 申报内容 |
| `related_flight_id` | varchar(64) nullable | 受影响航班 |
| `report_status` | varchar(30) | `PendingReview / Resolved` |
| `reported_at` | datetime | 提交时间 |
| `reported_by` | varchar(64) | 提交人 |
| `resolved_at` | datetime nullable | 处理时间 |
| `resolved_by` | varchar(64) nullable | 处理人 |
| `resolution_note` | text nullable | 处理说明 |

### 4.18 `notification_record`

通知记录表。

| 列名 | 类型 | 作用 |
| --- | --- | --- |
| `notification_id` | varchar(64) PK | 通知主键 |
| `recipient_user_id` | varchar(64) | 接收人 |
| `notification_type` | varchar(50) | 通知类型 |
| `title_zh` | varchar(200) | 中文标题 |
| `title_en` | varchar(200) | 英文标题 |
| `content_zh` | text | 中文内容 |
| `content_en` | text | 英文内容 |
| `channel_code` | varchar(30) | `IN_APP / DINGTALK` |
| `related_object_type` | varchar(30) | 关联对象类型 |
| `related_object_id` | varchar(64) | 关联对象 ID |
| `send_status` | varchar(30) | 发送状态 |
| `sent_at` | datetime nullable | 发送时间 |
| `read_at` | datetime nullable | 阅读时间 |

## 5. 开发顺序：先搭框架，再填模块

### 5.1 框架优先顺序

所有开发先按下面 8 个框架能力启动：

1. 应用壳、一级入口与父子菜单框架
2. 权限框架
3. 数据模型与数据库迁移框架
4. 状态机框架
5. 事件总线与投影刷新框架
6. 甘特态势展示适配层
7. 统一表单/侧栏/列表框架
8. 测试框架与 Playwright 基线
9. 响应式布局与移动端适配框架
10. `zh-CN / en-US` 语言资源框架与 `UTC / UTC+8` 展示时区框架

旧浅色前端设计包和 `apps/web/src/imports` 历史文件只用于参考布局样式、菜单展开效果、浅色主题和视觉密度；菜单 key、菜单文案、父子层级、功能需求、API、权限、数据模型和验收范围必须按当前 FRD、PRD、架构文档和专项开发文档实现。

### 5.2 模块填充顺序

框架完成后，再按业务闭环顺序填模块：

1. `Dashboard`
2. `Flight Operations Center`
3. `Crew Resources Center`
4. `Rostering Workbench`
5. `Rule Center`
6. `Exception Reporting Center`
7. `Statistics Reports`
8. `Pilot Portal`
9. `Admin`

## 6. 1-4 期实施计划

### 6.1 Phase 1：核心运行闭环

#### 目标

完成最小可试运行版本。

#### 交付菜单

- `Dashboard`：direct entry
- `Flight Operations Center`：Flight Plan、Operations Data
- `Crew Resources Center`：Crew Information、Status Timeline、External Work
- `Rostering Workbench`：Flight View、Crew View、Unassigned Flights、Validation & Publish、Run-day Adjustments、Post-flight Archive
- `Rule Center`：direct entry；page contains Rule Catalog、Rule Versions、FOM References、Rule Trial
- `Exception Reporting Center`：Exception Requests、CDR / AACM
- `Statistics Reports`：direct entry；page contains Statistics、Crew Hours、Duty & Rest、DDO/Recovery、Archive Reports、Data Export、Export History
- `Admin`：Basic Config、Account Management、Role & Permission、Rule Config、Dictionary、Airport & Timezone、Import Mapping、Notification Template、User Preference
- `Pilot Portal`：My Roster、My Alerts、Status Report、My History、My Preferences

一期框架验收必须先完成：

- 父菜单与子菜单展开/折叠交互
- 角色级菜单过滤
- 合规查看、规则命中、报表导出和 AACM 跟踪按业务能力归属到 `DISPATCHER / OPS_MANAGER`，不得新增独立合规登录角色
- `zh-CN / en-US` 切换后一级入口、父菜单、子菜单、页面标题和主要按钮同步切换
- `UTC / UTC+8` 切换后列表、甘特图、侧栏和报表预览中的时间同步刷新

#### 移动端交付范围

- 飞行员端一期必须支持手机浏览器访问：
  - `My Roster`
  - `My Alerts`
  - `状态申报`
- 运行经理一期在移动端只要求支持：
  - 查看待经理确认列表
  - 查看关键风险摘要
- 排班员工作台一期仍以桌面端为主

#### 开发顺序

1. 搭应用壳、权限、测试框架
2. 先完成时间安全护栏：统一时间上下文、统一时间组件、甘特展示时间轴工具、`check:time` 静态门禁和基础测试
3. 建主数据、任务池、版本、时间块、Overlay 表
4. 完成任务池、排班/运行日调整表单和详情抽屉
5. 完成规则中心和校验与发布
6. 完成草稿、发布、经理确认
7. 完成例外闭环
8. 完成飞后归档闭环
9. 接入甘特态势展示
10. 完成飞行员端与状态申报

#### 飞后归档专项开发顺序

飞后归档闭环必须先从 `Post-flight Archive`、归档详情和飞后归档表单落地；甘特图只同步展示状态并提供详情跳转。

0. 先跑通时间安全门禁：任务池、归档详情、表单、甘特展示和报表预览只允许通过统一时间组件展示，`npm.cmd run check:time` 必须通过。
1. 建 `FlightArchiveCase / CrewArchiveForm` 数据模型、状态枚举和状态机。
2. 完成 `Post-flight Archive` 归档队列、筛选、逾期标记和归档详情入口。
3. 实现归档详情与飞行员归档表单，桌面端右侧抽屉或详情页，移动端全屏抽屉。
4. 实现单个飞行员表单保存后的局部刷新，刷新范围由后端返回的 affected window 和 affected ids 决定。
5. 实现全部飞行员完成后的整班自动归档。
6. 实现超过 24 小时未完成的 `Overdue` 状态与提醒。
7. 扩展甘特投影 DTO，将 `archiveStatus`、`archiveDeadlineAtUtc`、`crewArchiveSummary`、`canOpenArchiveDetail` 返回给前端，并在甘特块上展示归档角标和跳转事件。
8. 接入 actual duty、actual FDP、actual violations、累计小时、block time、AACM 待报送清单和报表刷新。

权限边界：`DISPATCHER` 可录入和确认；`OPS_MANAGER` 只读；`PILOT` 不进入后台归档录入，只通过 `/api/pilot/me/*` 查看本人摘要；`ADMIN` 不参与业务归档。

#### 一期按钮/输入框级验收示例

| 页面 | 元素 | 验收要求 |
| --- | --- | --- |
| Dashboard | `刷新按钮` | 点击后重新加载未分配航班和待处理规则 |
| Flight Operations Center | `导入按钮` | 仅排班员/运行经理可见，导入成功后出现批次结果 |
| Crew Resources Center | `基地输入框` | 必填，保存后可回显 |
| Workbench | `保存草稿按钮` | 有草稿变更时可点击，保存前必须弹复核面板 |
| Workbench | `发布按钮` | 仅无红色风险且例外闭环后可提交经理确认 |
| Workbench | `归档角标` | 展示对应航班归档状态，点击后跳转归档详情 |
| Workbench | `未归档航班色块` | 点击后打开只读详情或跳转归档详情，编辑能力由归档详情权限控制 |
| Post-flight Archive | `归档详情飞行员行` | 展示每名关联飞行员归档状态，保存单人表单后局部刷新 |
| Archive Form | `actual duty start/end` | 必填，开始时间必须早于结束时间 |
| Archive Form | `actual fdp start/end` | 必填，开始时间必须早于结束时间 |
| Archive Form | `无 FLYING_HOUR` 复选框 | 勾选后结果区显示“无飞行时长” |
| Pilot Portal | `状态申报按钮` | 飞行员可发起 Fatigue / Unfit / PersonalConflict |
| Pilot Portal(Mobile) | `提交按钮` | 在手机宽度下可点击、无遮挡、提交后返回成功提示 |
| Pilot Portal(Mobile) | `日期切换按钮` | 在手机宽度下可正确切换个人班表日期 |

### 6.2 Phase 2：运行与治理增强

#### 目标

把系统从“能跑”提升到“可稳定运营、可追溯、可治理”。

#### 交付菜单增强

- `Flight Operations Center`：批次历史、字段映射
- `Crew Resources Center`：状态时间线、外部工作与限制态
- `Flight Operations Center`：航线时区维护、飞机档案维护、机场时区字典
- `Rostering Workbench`：运行日调整增强、规则重算、版本历史面板
- `Rostering Workbench`：校验问题处理、批量处理、发布确认
- `Rule Center`：版本历史、最近命中、规则试算
- `Exception Reporting Center`：AACM 报送清单、CDR 台账
- `Statistics Reports`：小时、DDO、Recovery、Exception、Archive、Block 偏差报表
- `Admin`：通知模板、导入映射配置
- `Pilot Portal`：My History
- 全局：用户偏好持久化、导出文件双语标题、导出时区标识

#### 移动端增强

- 运行经理移动端支持：
  - 待经理确认详情
  - 例外审批详情
  - 关键通知查看

### 6.3 Phase 3：效率增强

#### 目标

降低人工操作成本，提高排班效率。

#### 交付菜单增强

- `Rostering Workbench`：批量调整、影响模拟、推荐机组
- `Statistics Reports`：治理趋势
- `Pilot Portal`：个人统计视图

#### 移动端增强

- 飞行员端增加：
  - 个人统计摘要
  - 更完整的历史查询

### 6.4 Phase 4：集成与智能化

#### 目标

把系统升级为可持续扩展的排班平台。

#### Phase 4A：运营资料与机组资源补齐

当前阶段先落地运营资料底座，不新增完整规则引擎和半自动排班推荐：

- `Flight Operations Center / Flight Plan`：导入批次、批次历史、导入校验入口、字段映射入口和航班池 CRUD。
- `Flight Operations Center / Operations Data`：航班、航线、机场时区、飞机资料四类台账，支持新增、编辑和停用。
- `Crew Resources Center / Crew Information`：人员档案、资质/执照、小时与限制、执勤日历四个页内 tabs。
- `Crew Resources Center / External Work`：外部工作、外部飞行、请假、不可用时间和外部任务台账，后续投影到机组可用性和甘特占位。
- 删除策略统一为停用优先，已被排班、归档、规则命中引用的数据不得物理删除。
- 小时与限制只展示已有滚动字段与 actual-only 单次 FDP 追踪；完整法规计算仍等待规则目录核对后进入规则引擎阶段。

#### 交付菜单增强

- `Flight Operations Center`：外部系统接入
- `Rostering Workbench`：半自动辅助排班、方案比较
- `Statistics Reports`：高级分析
- `Admin`：集成配置
- `Pilot Portal / Notification`：深化通知联动

#### 移动端增强

- 深化钉钉/企业容器适配
- 增加移动端通知跳转深链

## 7. 分期测试与验收要求

### 7.1 Phase 1

- Playwright 跑通：
  - 导入任务 -> 排班 -> 校验 -> 提交发布 -> 经理确认
  - 规则命中 -> 发起例外 -> 审批
  - 归档列表/任务提醒 -> 归档详情 -> 单人录入 -> 局部刷新 -> 整班归档 -> 逾期提示；甘特同步展示状态并可跳转详情
  - 运行经理查看归档详情 -> 表单只读
  - 飞行员端 -> `/api/pilot/me/*` 仅本人班表/提醒/历史/归档摘要可见 -> 访问他人数据返回无权限
  - 未绑定 `crew_id` 的飞行员账号 -> 飞行员端提示账号未关联飞行员档案
  - 飞行员申报 -> 后台处理 -> 飞行员收到结果

### 7.2 Phase 2

- 运行日改班链路稳定
- 版本历史可追溯
- 报表筛选与导出正确
- 导入异常可修正、可重试

### 7.3 Phase 3

- 批量能力不破坏一二期状态流
- 推荐与模拟结果可解释

### 7.4 Phase 4

- 外部系统同步不破坏核心闭环
- 高级分析口径与基础数据一致

## 8. Definition of Done

每个功能完成必须同时满足：

- 代码实现完成
- 单元测试通过
- 组件测试通过
- 集成测试通过
- Playwright 相关场景通过
- 审计日志已覆盖
- 权限校验已覆盖
- 影响甘特图的数据变更已覆盖投影字段、局部刷新和跨模块一致性
- 已确认未把旧 zip 或 `apps/web/src/imports` 历史文件中的功能、API、算法、权限或验收口径带入正式实现
- 文档已同步更新


