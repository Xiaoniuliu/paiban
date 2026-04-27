# 飞行员排班系统当前架构

## 当前技术基线

- 后端：Spring Boot 3 + Java 17。
- 前端：React 18 + TypeScript + Vite。
- 数据库：MySQL 8.x，当前本机验证版本为 MySQL 8.4。
- 数据迁移：Flyway，迁移脚本位于 `apps/api/src/main/resources/db/migration`。
- 认证：Spring Security + JWT + BCrypt。
- 前端端口：`5180`。
- 后端端口：`8088`。
- 数据库存储时间：UTC。
- 前端默认展示时区：UTC+8，可切换 UTC。
- 前端默认语言：中文，可切换 English。

## 工程结构

```text
apps/
  api/   Spring Boot 后端服务
  web/   React/Vite 前端应用
```

后端当前模块：

- `auth`：JWT 登录、当前用户、角色权限。
- `crew`：飞行员基础数据查询。
- `rule`：规则目录查询。
- `system`：健康检查。

前端当前框架：

- App Shell：侧边栏、顶部栏、用户菜单、语言切换、时区切换。
- Login：真实调用 `/api/auth/login`，保存 JWT。
- API client：统一附带 `Authorization: Bearer <token>`，401 自动回登录。
- 页面骨架：Dashboard、Flight Operations Center、Crew Resources Center、Rostering Workbench、Rule Center、Exception Reporting Center、Statistics Reports、Admin、Pilot Portal。
- 菜单支持“有子菜单分组”和“一级直接入口”两种形态；菜单 key、文案和业务层级以 `FRD_Pilot_Rostering_System_Master.md` 为准。
- 旧浅色前端设计包和 `apps/web/src/imports` 历史文件仅用于参考浅色主题、布局密度、侧边栏展开/折叠效果和二级菜单视觉呈现，不作为功能需求、菜单命名、角色权限、API、数据模型、算法能力或验收来源。
- Legacy Reference 可作为开发期内部视觉参考入口保留，但不得进入正式业务菜单、权限树或验收范围。
- 前端必须补齐 `zh-CN / en-US` 语言资源覆盖，父菜单、子菜单、页面标题、按钮、字段、提示、状态标签和导出预览均不得硬编码单语言文案。
- 前端必须通过统一时间格式化工具支持 `UTC / UTC+8` 展示切换，切换只影响展示，不影响后端 UTC 存储和规则计算。

## 时间安全架构约束

- 数据库与 API 的瞬时时间统一按 UTC 存储和传输；新增字段必须使用 `*Utc` 语义后缀，例如 `startUtc`、`endUtc`、`archiveDeadlineAtUtc`、`actualDutyStartUtc`。
- 航班、机场、航线保留业务所属 IANA 时区；规则计算、归档截止、状态流转、审计日志和报表统计使用 UTC 与业务时区，不使用前端展示时区。
- 前端时间展示必须经过 `TimeDisplayProvider`、`useTimeFormatter()` 或统一时间组件：`Timestamp`、`DateOnly`、`TimeRange`、`GanttTimeLabel`、`TimezoneBadge`。
- 业务页面、甘特块、侧栏、表格、表单、报表预览不得直接调用 `new Date()`、`toLocaleString()`、`toISOString().slice()`、`Date.parse()` 或字符串切片处理时间。
- 甘特图布局只使用 UTC epoch milliseconds。切换 `UTC / UTC+8` 后，甘特块绝对位置不变，只更新时间轴标签、详情侧栏和报表展示文本。
- actual duty / FDP、归档、例外、PIC 决策、运行日调整等安全相关表单必须显示输入解释时区，保存前转换为 UTC，并展示 UTC 与当前展示时区的确认文本。
- 前端门禁必须执行 `npm.cmd run check:time`；未通过时间安全检查的新模块不得进入业务开发或验收。

## 甘特图态势展示与飞后归档架构约束

- 排班工作台甘特图底座固定为 `vis-timeline` 官方 `Timeline` 实例，直接参考官方 React 示例：https://visjs.github.io/vis-timeline/examples/timeline/other/usingReact16.html 。安装与接入说明见 [VIS_TIMELINE_INSTALL.md](</D:/paiban2/VIS_TIMELINE_INSTALL.md>)；业务代码不得直接耦合 Timeline 初始化、数据映射或事件细节。
- 甘特图读取后端查询投影，不作为事实源；任务、机组、规则、例外、归档等模块均通过后端命令修改业务写模型。
- 飞后归档主操作区是 `Post-flight Archive`、归档详情和飞后归档表单。甘特航班色块只展示状态并提供详情跳转。
- 航班结束后，后端生成或激活 `FlightArchiveCase`，甘特投影返回 `archiveStatus`、`archiveDeadlineAtUtc`、`crewArchiveSummary`、`canOpenArchiveDetail`。
- `DISPATCHER` 可在归档详情录入；`OPS_MANAGER` 只读；`PILOT` 不进入后台甘特归档录入；`ADMIN` 不参与业务归档。
- 单个飞行员归档表单保存后，后端返回 affected window 和 affected ids，前端据此局部刷新归档详情和甘特状态展示。
- 专项开发流程和 Playwright 验收见 [PHASE1_GANTT_ARCHIVE_WORKFLOW.md](</D:/paiban2/PHASE1_GANTT_ARCHIVE_WORKFLOW.md>)。

## 角色权限

首批业务角色只做菜单级和接口级权限，另保留系统管理角色：

| 角色 | 用途 |
| --- | --- |
| `DISPATCHER` | 排班员 |
| `OPS_MANAGER` | 运行经理 |
| `PILOT` | 飞行员 |
| `ADMIN` | 系统管理员，仅用于账号、权限、字典、参数、机场时区等系统治理 |

## 飞行员本人数据范围

- 飞行员权限采用两层模型：`hasRole(PILOT)` 控制入口和能力，`belongsToCurrentCrew(record)` 控制记录归属。
- 后端必须按 `hasRole(PILOT) && belongsToCurrentCrew(record)` 执行飞行员端数据访问；前端隐藏菜单、按钮或字段不是安全边界。
- `PILOT` 用户必须通过 `sys_user.crew_id` 绑定唯一飞行员主档；飞行员端所有业务接口从认证上下文解析该 `crew_id`。
- 飞行员端优先使用 `/me` 风格接口，例如 `/api/pilot/me/roster`、`/api/pilot/me/alerts`、`/api/pilot/me/history`、`/api/pilot/me/archive-summary`、`/api/pilot/me/exceptions-cdr`、`/api/pilot/me/status-reports`。
- 飞行员端不得信任前端传入的 `crewId` 作为数据范围。即使 URL 或查询参数带有其他飞行员 ID，后端也必须按当前用户绑定 `crew_id` 过滤或返回 `403`。
- `PILOT` 可查看本人班表、提醒、状态申报、历史、本人相关规则命中、本人相关例外/CDR/PIC 决策记录和本人相关归档摘要。
- `PILOT` 不得访问后台甘特归档录入、全量校验、全量报表、其他飞行员档案或其他飞行员归档表单。
- 未绑定 `crew_id` 的 `PILOT` 账号不得返回业务数据，前端应显示账号未关联飞行员档案。
- `ADMIN` 只维护账号与飞行员档案绑定关系，不因此获得飞行员端业务代操作权限。

种子账号初始密码统一为 `Admin123!`：

- `dispatcher01`
- `manager01`
- `pilot01`
- `admin`

## 本地启动

后端推荐使用 jar 方式启动。当前中文路径下 `mvn spring-boot:run` 可能出现启动类解析问题。

```powershell
cd D:\paiban2\apps\api
mvn package -DskipTests
java -jar .\target\pilot-roster-api-0.1.0-SNAPSHOT.jar
```

前端启动：

```powershell
cd D:\paiban2\apps\web
npm install
npm run dev
```

访问：

- 前端：http://127.0.0.1:5180
- 后端健康检查：http://localhost:8088/api/health

## 验证命令

```powershell
mvn test
cd D:\paiban2\apps\web
npm run check:time
npm run check:i18n
npm run build
npm run test:e2e
```


