# 飞行员排班系统 FRD

## 1. 文档信息

| 项目   | 内容                                              |
| ---- | ----------------------------------------------- |
| 文档名称 | 飞行员排班系统 FRD                                     |
| 文档定位 | 单一主 FRD，合并规则需求与系统需求                             |
| 版本   | v0.3 Draft                                      |
| 适用对象 | 业务、运行、产品、研发、测试、合规                               |
| 主要来源 | [FOM Chapter 7.pdf](</D:/paiban2/FOM Chapter 7.pdf>) |
| 文档目标 | 作为后续完成排班系统的主需求基线                                |
| 关联产品设计 | [PRD_Pilot_Rostering_System_Product_Design.md](</D:/paiban2/PRD_Pilot_Rostering_System_Product_Design.md>) |

## 2. 项目背景

公司为澳门货运航空公司，当前需要建设一套面向飞行员的排班系统。系统必须以疲劳管理、飞行时间限制、休息限制和合规留痕为核心，不仅能支持计划排班，还要支持运行日调整、待命呼出、跨时区任务、机长裁量、减休和 AACM 报送留痕。

本系统按四期推进：一期先完成“人工编排 + 自动校验 + 例外闭环 + 合规归档”的完整闭环；二期补齐运行治理和规则接管；当前已进入三期，主线是完整规则引擎与工作台效率增强；半自动辅助排班和更深的智能化能力保留到四期。

## 3. 建设目标

### 3.1 业务目标

- 把飞行员排班从 Excel / 人工经验迁移到可追溯系统。
- 在班表发布前识别法规违规、疲劳风险和记录缺口。
- 把所有可例外场景转为标准化流程，而不是口头处理。
- 为 AACM 检查、内部审计和运行复盘提供证据链。

### 3.2 系统目标

- 支持航班计划导入、任务编排、休息插入、待命安排、调机安排。
- 支持规则实时计算和全量复核。
- 支持发布前拦截、运行中例外、以及航班结束后 24 小时内由排班员在飞后归档工作区完成飞行员归档表单录入并自动归档；甘特图同步展示归档状态并提供详情跳转。
- 支持中英文界面切换、时区可追溯，以及 `UTC / UTC+8` 展示切换。

### 3.3 成功标准

- 排班员可在一个工作台完成编排、校验、处理风险和提交发布。
- 排班员可在航班结束后 24 小时内通过飞后归档工作区逐个完成飞行员归档表单；甘特图可显示未归档、部分归档、已归档和逾期状态。
- 飞行部相关人员能直观看到班表风险总览、即将超限人员和待处理例外。
- 运行经理能在系统内代录 PIC 对 Discretion 和 Reduced Rest 的决策结果，并保留对应记录。
- 运行经理和授权排班员能在系统内导出 CDR、累计小时、AACM 待报送清单。

## 4. 范围

### 4.1 In Scope

- 飞行员主数据
- 航班计划导入
- 飞行 duty、ground duty、simulator、standby、positioning 排班
- Rule Engine 校验
- 告警、违规、例外流程
- 排班发布与通知
- 飞后记录与报表
- AACM 报送清单
- 飞行员移动端访问与状态申报

### 4.2 Out of Scope

- 乘务员排班
- 机务排班
- 自动优化排班算法
- 薪资和津贴
- 财务和差旅结算

## 5. 角色与职责

| 角色                             | 职责                             |
| ------------------------------ | ------------------------------ |
| 排班员 Crew Controller            | 导入航班、编排机组、处理规则告警、发起例外、在航班结束后 24 小时内通过飞后归档工作区录入飞行员实际 duty / FDP 归档表单并完成飞后归档，查看基础合规结果 |
| 运行经理 Flight Operations Manager | 审核班表、处理高风险、发布班表、监督例外、代录 PIC 决策结果，导出合规报表并跟踪 AACM 报送 |
| 飞行员 Flight Crew                | 查看个人班表、休息、DDO、通知，查看本人相关例外和 PIC 决策记录 |
| 系统管理员 Admin                    | 系统管理角色，维护账号、字典、参数、权限、机场时区和用户偏好，不属于三类业务角色 |

## 6. 业务原则

1. 所有班表必须先有结构化数据，再有规则结果，再进入发布。
2. 系统不隐藏违规，所有违规都必须显示 Rule ID、规则分类、来源条款、页码、证据和建议动作；若同一对象命中多条规则，必须全部展示。
3. 草稿允许保存，但发布必须完成校验闭环。
4. 例外不是消除违规，而是把违规转入有审批、有记录、有时限的流程。
5. 页面必须同时支持按航班和按飞行员两种视角。
6. 所有时间计算必须保留时区、当地时间和身体钟参考。
7. 系统必须支持中英文切换，且不改变业务规则口径。
8. 系统必须统一以 UTC 存储时间，并支持 `UTC / UTC+8` 两种展示时区切换。
9. 书写规范、日期格式、字符集和测试数据编码必须全系统一致。

## 7. 规则层级与判定标准

### 7.1 规则来源优先级

| 层级              | 说明              |
| --------------- | --------------- |
| AACM overlay    | 后续澳门民航局额外要求     |
| Company overlay | 公司内部运营政策、审批口径   |
| FOM Chapter 7   | 当前主规则母本         |
| System default  | 仅在法规未明确时使用的缺省配置 |

### 7.2 判定等级

| 等级              | 含义        | 系统行为         |
| --------------- | --------- | ------------ |
| `BLOCK`         | 数据错误或结构缺失 | 不能发布，必须补数    |
| `NON_COMPLIANT` | 明确违反法规/制度 | 不能发布，需调整或走例外 |
| `ALERT`         | 疲劳风险或治理提醒 | 可继续，但必须提示    |
| `INFO`          | 说明性结果     | 仅展示          |

### 7.3 发布门槛

班表发布前必须满足：

- 无 `BLOCK`
- 无未闭环 `NON_COMPLIANT`
- 所有例外完成 PIC 决策记录或代录
- 所有必需 CDR 已生成

### 7.4 系统规则分类

为支撑产品展示和交互，系统在 FOM 原文基础上对规则做三类产品化整理。该分类不是 FOM Chapter 7 的正式原文分类，而是基于 [FOM Chapter 7.pdf](</D:/paiban2/FOM Chapter 7.pdf>) `7.1.5.2 / Page 9` 中 `must / will` 与 `should / may` 的语义层级，再结合系统处理方式形成。

| 分类 | 颜色 | 说明 | 默认系统动作 |
| --- | --- | --- | --- |
| `硬校验` | 红色 | 系统必须计算并直接影响排班合法性 | 重点提示，必要时阻断发布 |
| `告警/留痕` | 橙色 | 系统不一定拦截，但必须提示并记录 | 允许继续处理，但必须留痕 |
| `治理提醒` | 蓝色 | 偏治理、趋势和组织义务提醒 | 进入提示、趋势分析和治理闭环 |

说明：

- 规则分类和判定等级 `BLOCK / NON_COMPLIANT / ALERT / INFO` 是两个独立维度。
- 规则分类主要用于页面颜色和交互提示。
- 判定等级主要用于动作控制、发布门槛和流程分流。

## 8. 术语与计算口径

| 术语              | 定义                                             |
| --------------- | ---------------------------------------------- |
| Home Base       | 飞行员通常开始和结束计划 duty 的基地                          |
| Duty            | 任何为公司执行的连续任务，包括飞行、待命、调机、培训、地面 duty             |
| Duty Period     | 单段连续 duty                                      |
| Duty Cycle      | 两次 DDO 之间的一系列 duty periods                     |
| FDP             | 自要求报到执行飞行起至最终 on-chocks / engines off 或离开操纵位为止 |
| Flight Time     | 机轮开始移动为起飞至最终停稳的时间                              |
| Sector          | 从推出到下一次停入机位的单段飞行                               |
| Positioning     | 机组按公司要求进行空中或地面转移                               |
| Traveling       | 从休息地点到报到地点的交通                                  |
| Standby         | 待命，机组不执勤但受公司约束                                 |
| Rest Period     | 下一次 FDP 前的休息期                                  |
| Recovery Period | 长 duty cycle 且发生时差失调后返 base 的恢复期               |
| DDO             | Domestic Day Off，基地完整休息日                       |
| EXB             | Away from base 的 Extended Break                |
| LNP             | 0100-0659 home base time                       |
| WOCL            | 0200-0559 body clock time                      |
| Local Night     | 当地 2200-0800 中连续 8 小时                          |
| Acclimatized    | 处于适应状态                                         |
| Unacclimatized  | 非适应状态                                          |

## 9. 核心输入数据

### 9.1 飞行员主数据

- crew\_id
- name
- role
- aircraft qualification
- home base
- acclimatization status
- body clock reference
- normal commute minutes
- external employment flag

### 9.2 duty / flight 数据

- duty\_id
- duty\_type
- scheduled report time
- actual report time
- scheduled finish time
- actual finish time
- departure / arrival airport
- departure / arrival timezone
- STD / STA / ATD / ATA
- scheduled / actual block time
- sectors count
- relief total
- relief facility type
- augmented crew count
- standby mode
- callout time
- accommodation type

### 9.3 累计上下文

- rolling flight hours 28d
- rolling flight hours 12m
- rolling duty hours 7d / 14d / 28d
- consecutive duty days
- DDO pattern
- previous duty duration
- previous rest duration
- last recovery reduction date

## 10. 系统派生字段

系统必须自动计算以下派生数据：

- effective report time
- effective finish time
- effective FDP duration
- effective duty duration
- time zone difference
- local start band
- preceding rest band
- LNP encroachment
- WOCL crossing
- duty cycle elapsed hours
- recovery required flag
- reduced rest flag
- extended FDP flag
- ULR flag
- split duty flag

## 11. 端到端业务流程

### 11.1 月度计划排班

1. 导入未来一个月或一周的航班计划。
2. 系统拆分航段、识别机型、匹配时区。
3. 排班员在工作台为 flight / standby / positioning 分配机组。
4. 系统实时计算 FDP、rest、累计小时、LNP、DDO、recovery。
5. 排班员根据右侧规则栏调整。
6. 运行经理审核后发布。
7. 飞行员收到个人班表通知。

### 11.2 运行日改班

1. 运行日发生延误、取消、换机或待命呼出。
2. 排班员在运行日调度页修改报到、STD、机组或休息安排。
3. 系统重算所有受影响机组的 FDP、rest、后续班表影响。
4. 如超限但允许例外，系统提供发起例外入口。
5. PIC 作最终决策，系统生成 CDR。

### 11.3 飞后归档

1. 航班结束后，任务池、归档列表和甘特图时间轴将该航班标记为 `未归档`。
2. 排班员在航班结束后 24 小时内从归档列表、任务提醒或甘特详情跳转进入飞后归档详情。
3. 系统展示该航班关联飞行员列表，以及每名飞行员当前归档状态。
4. 排班员逐个打开飞行员归档表单，录入 `actual duty start/end` 与 `actual fdp start/end`。
5. 系统自动计算 `DUTY / FDP / FLYING_HOUR`；若该飞行员无 `FLYING_HOUR`，则由排班员显式标记“无 FLYING_HOUR”。
6. 单个飞行员保存后，系统先更新该飞行员归档状态，并将航班整体状态更新为 `部分归档` 或保持当前状态。
7. 当该航班关联飞行员全部完成各自表单后，系统自动将该航班转为 `已归档`。
8. 系统回算 actual duty / actual FDP / actual violations，并更新累计小时、block time 统计和归档记录。
9. 达报送阈值的事件进入 AACM 报送清单；超过 24 小时仍未完成的航班标记为 `逾期未归档`。

## 12. 功能模块

### 12.0 全局菜单、语言与时区框架

系统左侧导航必须支持“一级直接入口”和“父菜单 + 子菜单”两种形态。旧浅色前端设计包和 `apps/web/src/imports` 下的历史导入文件仅用于参考布局样式、侧边栏展开/折叠效果、二级菜单呈现方式、浅色主题和视觉密度；不得作为功能需求、菜单命名、角色权限、API、数据模型、算法能力或验收范围来源。正式菜单命名、菜单层级、业务入口和功能需求必须以本 FRD、PRD、架构文档和专项开发文档为准。菜单名称、页面标题、按钮、字段标签、空状态、错误提示、确认弹窗、导出预览文案均必须支持 `zh-CN / en-US` 两套语言资源，禁止在页面组件中散落硬编码中文或英文。顶部全局栏必须固定提供语言切换与展示时区切换，切换后当前页面、侧栏、弹窗、甘特图块、列表、报表预览和移动端页面同步刷新。

中英文显示模式固定为：

- 中文界面只显示中文菜单与中文页面标题。
- 英文界面只显示英文菜单与英文页面标题。
- 不允许在实际界面中使用 `英文 / 中文`、`中文 / English` 这类拼接显示。
- 本文档菜单表使用中英文两列只是为了定义同一菜单 key 的双语文案，不代表界面同时展示两种语言。

正式菜单结构如下：

| 菜单 key | 中文父菜单 | English parent menu | 中文子菜单 | English submenu | 主要角色 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| `dashboard` | 首页 | Dashboard | 一级直接入口 | Direct entry | DISPATCHER、OPS_MANAGER、ADMIN | 首页不再展开子菜单；总览、今日航班、风险告警等作为首页内卡片或页内入口 |
| `flight-operations` | 航班运行中心 | Flight Operations Center | 航班计划、运行资料 | Flight Plan、Operations Data | DISPATCHER、OPS_MANAGER、ADMIN | 承接航班计划导入、航班池、字段映射、导入校验、航班列表、航线、飞机和机场时区 |
| `crew-resources` | 机组资源中心 | Crew Resources Center | 机组信息、状态时间线、外部工作 | Crew Information、Status Timeline、External Work | DISPATCHER、OPS_MANAGER(只读)、ADMIN、PILOT(本人只读) | 以飞行员主数据、资质、飞行小时、执勤日历和计划状态块为核心 |
| `rostering-workbench` | 排班工作台 | Rostering Workbench | 航班视图、机组视图、待排航班、校验与发布、运行日调整、飞后归档 | Flight View、Crew View、Unassigned Flights、Validation & Publish、Run-day Adjustments、Post-flight Archive | DISPATCHER、OPS_MANAGER、ADMIN | 一期桌面优先，甘特图双视图、待排航班、校验发布和飞后归档必须保留 |

排班工作台一期收口以基础业务闭环为准：待排航班、保存草稿、基础校验与发布、发布后运行日调整和飞后归档。二期完成规则命中池雏形、发布门槛、同一机组时间重叠、航班与状态块冲突、规则中心展示和最近命中。当前已进入三期，完整法规规则校验按三期规则引擎推进，见 [PHASE3_RULE_ENGINE_BACKLOG.md](</D:/paiban2/PHASE3_RULE_ENGINE_BACKLOG.md>)；FDP/FTL、preceding rest、DDO 34h + local nights、连续 duty、28 天累计、跨时区 recovery、Standby、Positioning、Discretion/CDR/AACM 等仍不得伪装为已完成。
| `rule-center` | 规则中心 | Rule Center | 一级直接入口 | Direct entry | DISPATCHER、OPS_MANAGER、ADMIN | 规则目录、规则版本、FOM 来源引用和规则试算在规则中心页内承载，不再展开空泛子菜单 |
| `exceptions-reporting` | 例外报送中心 | Exception Reporting Center | 例外申请、CDR / AACM | Exception Requests、CDR / AACM | DISPATCHER、OPS_MANAGER、ADMIN | Service Disruption、Commander's Discretion、Reduced Rest、CDR 台账和 AACM 报送闭环 |
| `reports` | 统计报表 | Statistics Reports | 一级直接入口 | Direct entry | DISPATCHER、OPS_MANAGER、ADMIN | 统计图表、机组小时、执勤休息、DDO/Recovery、归档报表、数据导出和导出历史在统计报表页内承载 |
| `admin` | 系统设置 | Admin | 基础配置、账号管理、角色权限、规则配置、字典管理、机场与时区、导入映射、通知模板、用户偏好 | Basic Config、Account Management、Role & Permission、Rule Config、Dictionary、Airport & Timezone、Import Mapping、Notification Template、User Preference | ADMIN | 承接系统参数、权限、字典、偏好、时区、通知和导入映射 |
| `pilot-portal` | 飞行员端 | Pilot Portal | 我的班表、我的提醒、状态申报、我的历史、我的偏好 | My Roster、My Alerts、Status Report、My History、My Preferences | PILOT、ADMIN | 手机浏览器必须可用，沿用全局语言与时区偏好 |

说明：`Legacy Reference` 可作为开发期内部视觉参考入口保留，但不得进入正式业务菜单、正式权限树或用户验收范围。`apps/web/src/imports` 与旧 zip 中的旧 FRD、旧架构、旧 API、旧自动排班、旧权限编码和旧技术栈描述均视为历史参考，不得被搬入正式需求。

飞行员本人数据范围：

- 飞行员权限必须采用两层模型：`hasRole(PILOT)` 控制是否可进入飞行员端，`belongsToCurrentCrew(record)` 控制具体数据是否属于当前登录用户绑定的 `sys_user.crew_id`。
- 后端必须按 `hasRole(PILOT) && belongsToCurrentCrew(record)` 执行飞行员数据访问；前端隐藏菜单、按钮或筛选项只做体验，不是安全边界。
- `PILOT` 角色只能查看与登录用户绑定 `sys_user.crew_id` 对应飞行员相关的数据，包括个人班表、本人提醒、本人状态申报、本人历史、本人相关规则命中、本人相关例外/CDR/PIC 决策记录和本人相关归档摘要。
- 飞行员端接口必须以后端当前登录用户解析出的 `crew_id` 作为数据范围来源，不得信任前端传入的任意 `crewId`。
- 若 `PILOT` 用户没有绑定 `crew_id`，系统必须拒绝进入飞行员端业务数据并提示账号未关联飞行员档案。
- `PILOT` 不得通过 URL、查询参数、导出接口或接口 ID 枚举访问其他飞行员数据；后端必须返回 `403` 或等价无权限响应。
- `ADMIN` 可维护账号与飞行员档案绑定关系，但不得绕过业务权限参与飞行员端个人业务操作。

全局语言与时区功能需求：

- 登录页、应用壳、一级入口、父菜单、子菜单、页面标题、表单、按钮、状态标签、告警文案、导出文件标题必须支持 `zh-CN / en-US`，并按当前语言单语显示。
- 业务数据中涉及名称的字段应优先支持 `name_zh / name_en` 或等价双语字段；枚举值存储必须使用稳定英文代码，展示时再按语言资源翻译。
- 所有时间字段底层按 UTC 存储，页面展示可切换 `UTC / UTC+8`。
- 时间展示必须使用统一格式化工具，含时区日期时间显示为 `YYYY-MM-DD HH:mm (UTC)` 或 `YYYY-MM-DD HH:mm (UTC+8)`。
- 展示时区切换不得改变规则计算、状态流转、审计记录、归档截止时间和报表统计口径。
- 用户语言与展示时区偏好应保存到用户偏好表；未登录时登录页可临时切换语言，登录后以用户偏好为准。
- Playwright 验收必须覆盖至少一个桌面页面和一个移动端页面的中英切换、`UTC / UTC+8` 切换、菜单文案同步和时间格式同步。

### 12.1 Crew 主数据模块

#### 目标

维护所有参与排班计算的飞行员基础属性。

`机组资源中心 > 机组信息` 必须是聚合维护页，而不是单一只读列表。页面以内部分页承载 `人员档案 / 资质与执照 / 小时与限制 / 执勤日历`：

- 人员档案可维护员工号、姓名、岗位/等级、基地、主机型、适应状态、身体钟时区、通勤分钟数、可排状态和启用状态。
- 资质与执照可维护机型资质、教员/检查员资质、有效期、启用状态和到期提示来源。
- 小时与限制先展示已有滚动字段和 actual-only 口径：7/14/28 天 duty、28 天 flight、12 个月 flight、单次 FDP actual 追踪。完整规则计算仍由三期规则引擎接管。
- 执勤日历从排班块、状态块和外部工作限制汇总展示，不能在该页绕过正式排班、运行日调整或状态时间线直接修改业务事实。

`机组资源中心 > 外部工作` 是独立维护入口，用于维护外部工作、外部飞行记录、请假、不可用时间和公司外部任务。外部工作保存后应进入机组可用性视图，并可在机组视图甘特中作为限制/占位块展示。

#### 功能

- 新增/编辑飞行员档案
- 维护 home base 生效时间
- 维护机型和岗位资格
- 维护 acclimatization 相关状态
- 维护通勤时长和住宿约束
- 录入外部工作与外部飞行记录
- 展示累计 duty / flight / DDO / rest 概况
- 机组信息、详情、资质、飞行小时、执勤日历、状态时间线和外部工作相关入口必须支持 `zh-CN / en-US`
- 所有证照有效期、体检到期、培训日期、飞行/执勤累计周期必须按用户选择的 `UTC / UTC+8` 展示，计算口径保持 UTC 与业务时区不变

#### 关键页面字段

- 员工编号
- 姓名
- 角色
- 基地
- 主机型
- 资格有效期
- 当前适应状态
- 最近 recovery
- 正常通勤分钟数

### 12.2 航班计划导入模块

#### 目标

把航班计划、地面任务、训练和待命统一转成待排航班。

`航班运行中心 > 航班计划` 承载计划导入和航班池维护：导入批次、批次历史、字段映射、导入校验入口，以及可查询、可新增、可编辑、可取消的航班池。已发布或已归档航班不允许在航班池直接改时间或取消，必须提示进入 `排班工作台 > 运行日调整`。

`航班运行中心 > 运行资料` 必须是可维护台账，页内至少包含 `航班 / 航线 / 机场时区 / 飞机资料` 四类：

- 航班：维护航班号、任务类型、航线、STD/STA、机型/飞机、所需机组、状态和来源状态。
- 航线：维护出发/到达机场、标准飞行时长、时差、是否跨时区、启用状态。
- 机场时区：维护 IATA、中文名、英文名、IANA 时区、UTC 偏移、国家/地区、启用状态。
- 飞机资料：维护机号、机型、机队、基地、状态、座位/业载等基础字段。

删除策略统一为停用优先；已被航班、排班、归档或规则证据引用的主数据不得物理删除。

#### 功能

- 批量导入 flight legs
- 自动拆航段
- 匹配机场时区
- 导入 simulator / ground duty / course duty
- 导入 positioning / standby 任务
- 标识长航段和疑似 augmented 需求
- 航班计划和运行资料相关入口必须支持 `zh-CN / en-US`，页内可承载导入批次、任务池、字段映射、批次历史和导入校验能力
- 所有导入时间、计划起止时间、任务池筛选时间必须支持 `UTC / UTC+8` 展示切换

### 12.3 排班工作台

#### 目标

支持按航班和按机组双视角编排。

#### 工作台承载能力

- 支持按航班和按机组双视角切换
- 支持以甘特图时间轴展示 Flight / Positioning / Standby / Rest / DDO / Recovery / Training 等业务块
- 支持在同一工作台上下文查看待排航班、规则结果、归档状态和操作入口；业务修改通过任务池、表单、详情抽屉和校验与发布完成
- 支持筛选、重算、提交审核和发布
- 支持查看 Rule hits、多条规则详情、规则分类标签、Severity、章节引用和 PDF 跳转
- 支持查看航班归档状态和关联飞行员归档状态
- 支持从工作台直接进入飞后归档详情；表单录入以飞后归档工作区为主
- 甘特图时间轴、块标签、侧栏、筛选器、按钮和状态标签必须支持 `zh-CN / en-US`
- 甘特图刻度、块起止时间、详情侧栏、运行日调整和归档详情入口必须支持 `UTC / UTC+8` 展示切换，且不改变规则计算

说明：

- 本阶段不在 FRD 中写死主工作台的页面布局。
- 页面排布可在原型和前端实现阶段细化，但上述工作台能力必须保留。

#### 主要动作

- 通过排班/运行日调整表单指派 PIC / FO / Relief
- 通过排班/运行日调整表单插入 rest / EXB / DDO / recovery
- 通过排班/运行日调整表单插入 positioning
- 通过排班/运行日调整表单调整报到时间
- 通过排班/运行日调整表单替换机组
- 通过例外流程发起例外
- 标记并查看 `未归档 / 部分归档 / 已归档 / 逾期未归档` 航班
- 点击航班色块打开只读详情或跳转对应归档详情
- 在飞后归档工作区逐个录入飞行员归档表单并局部刷新航班归档状态

#### 甘特图态势展示 P0 约束

- 甘特图是排班和归档状态的态势展示视图，不作为排班事实编辑器，不直接写入航班、机组、归档或规则结果。
- 业务修改必须通过任务池、排班/运行日调整表单、归档详情、归档表单、例外流程和校验与发布提交后端命令。
- 航班结束后，系统必须生成或激活 `FlightArchiveCase`，并在甘特航班块上用色块标识归档状态：`Unarchived / Partially Archived / Overdue` 统一显示未归档色块，`Archived` 显示已归档色块；色块不替换航班主状态颜色。
- 点击甘特航班块可打开只读详情或跳转到对应归档详情；是否可编辑由归档详情和后端权限返回控制。
- 飞后归档工作区必须展示航班信息、归档截止时间、关联飞行员列表、每名飞行员 `CrewArchiveForm` 状态，并提供进入单个飞行员归档表单的入口。
- 单个飞行员保存后，只局部刷新该飞行员表单状态、航班整体归档状态、甘特块归档色块和规则摘要，不得全量重载整个月排班数据。
- 全部关联飞行员完成后，系统自动将该航班转为 `Archived`，并触发 actual duty、actual FDP、actual violations、累计小时、block time 和 AACM 待报送清单刷新。
- 超过 24 小时仍未整班完成时，任务池、归档详情和甘特块都必须显示 `Overdue`；逾期不阻止继续录入，但必须保留逾期提示和审计。

### 12.4 校验与发布

#### 目标

集中查看所有规则命中结果。

#### 页面原型

```text
+----------------------------------------------------------------------------------+
| 过滤：日期 | Crew | Flight | Rule ID | 分类 | Severity | 状态 | 是否可例外        |
+----------------------------------------------------------------------------------+
| 对象             | Rule Hits                       | Severity      | 结果              | 动作       |
| Duty CV123/C001  | RG-FDP-006 / RG-REST-004       | NON_COMPLIANT | FDP超限 + Rest不足 | 查看 / 例外 |
| Duty --/C002     | RG-LNP-003                     | NON_COMPLIANT | 夜航连续超限       | 查看       |
| Crew C008        | RG-POS-003                     | ALERT         | 通勤过长           | 查看       |
+----------------------------------------------------------------------------------+
| 下方详情：逐条规则说明 / 输入快照 / 计算结果 / 来源章节 / 条款 / 页码 / 建议动作 |
+----------------------------------------------------------------------------------+
```

#### 功能

- 按 Rule ID、crew、flight、severity 过滤
- 按规则分类过滤
- 查看证据字段
- 查看来源章节 / 条款 / 页码
- 支持 PDF 跳转
- 一键跳转例外申请
- 导出违规清单
- 校验与发布页面的问题列表、规则命中、处理状态、发布动作和导出能力必须支持 `zh-CN / en-US`
- 规则证据中的时间快照必须同时保留 UTC 原值和当前展示时区文本

### 12.5 规则中心

#### 目标

集中展示系统当前生效的全部规则、来源引用和版本状态。

#### 页面原型

```text
+------------------------------------------------------------------------------------------------------+
| 过滤：Rule ID | 分类 | 默认Severity | 章节 | 条款 | 状态 | 关键词                                  |
+------------------------------------------------------------------------------------------------------+
| Rule ID     | 规则名       | 分类     | 默认Severity | 来源章节 | 条款       | 页码 | 版本 | 状态 |
| RG-FDP-006  | FDP 超限     | 硬校验   | NON_COMPLIANT | 7.1.11  | 7.1.11.2   | 14  | v1   | 生效 |
| RG-POS-003  | 通勤过长提醒 | 治理提醒 | ALERT         | 7.1.17  | 7.1.17.3   | 22  | v1   | 生效 |
+------------------------------------------------------------------------------------------------------+
| 右侧详情：规则说明 / 触发条件 / 处理方式 / 是否可例外 / PDF 跳转 / 最近命中案例                     |
+------------------------------------------------------------------------------------------------------+
```

#### 功能

- 按 Rule ID、分类、章节、版本状态、关键词过滤
- 查看规则说明、触发条件、处理方式
- 查看来源章节、条款、页码
- 直接跳转 [FOM Chapter 7.pdf](</D:/paiban2/FOM Chapter 7.pdf>) 对应页
- 查看当前规则版本和历史版本
- 从 Rule ID 反查最近命中案例
- 规则目录、版本、FOM 来源引用、最近命中和规则试算等页内入口必须支持 `zh-CN / en-US`
- 规则生效时间、失效时间、最近命中时间必须按 `UTC / UTC+8` 展示，底层版本时间保持 UTC

### 12.6 例外报送中心 模块

#### 目标

对 Service Disruption、Commander's Discretion、Reduced Rest 建立闭环。

#### 页面原型

```text
+----------------------------------------------------------------------------------+
| 例外申请单                                                                       |
+----------------------------------------------------------------------------------+
| 命中规则: RG-DISC-006 | RG-REST-004                                     |
| Flight: CV123                  Crew: C001 / C002                              |
| 类型: [FDP Extension] [Reduced Rest] [Service Disruption]                        |
| 发起人: xxx                   角色: Flight Ops Manager                            |
| 原因: [文本框]                                                                  |
| 延长小时: [ ]                 减休小时: [ ]                                       |
| 来源引用: 章节 / 条款 / 页码 / PDF 跳转                                           |
| 自动判断: 是否可例外 / 是否需AACM报送 / 是否必须CDR                               |
| [提交 PIC 决策代录] [取消]                                                     |
+----------------------------------------------------------------------------------+
```

#### 功能

- 发起例外申请
- 校验请求人资格
- 逐条展示被覆盖规则及来源引用
- 运行经理代录 PIC 批准 / 拒绝 / 部分批准结果
- 自动生成 CDR
- 自动判断是否需 7 天内报 AACM
- 归档请求理由和 PIC 决策记录
- 例外申请与 CDR / AACM 相关入口必须支持 `zh-CN / en-US`
- 例外影响区间、PIC 决策时间、CDR 提交期限和 AACM 报送期限必须支持 `UTC / UTC+8` 展示切换

### 12.7 运行日调度模块

#### 目标

支持延误、取消、待命呼出和替班。

#### 页面原型

```text
+----------------------------------------------------------------------------------+
| 运行日控制台：日期 / 当前机场 / 航班状态                                         |
+----------------------------------------------------------------------------------+
| 左侧：受影响航班          | 中间：替补机组候选        | 右侧：连锁影响与风险      |
| - 延误                    | - 可用PIC                | - FDP是否超限            |
| - 取消                    | - 可用FO                 | - 后续rest是否不足       |
| - 待命呼出                | - 待命池                 | - 是否需例外             |
+----------------------------------------------------------------------------------+
```

#### 功能

- 调整 STD / STA / report time
- 待命呼出
- 候选机组筛选
- 连锁影响分析
- 实时发起例外
- 运行日调整页面必须跟随全局语言与展示时区，延误、取消、待命呼出和替班时间不得各自格式化

### 12.8 发布与通知模块

#### 功能

- 发布前全量校验
- 班表版本化
- 飞行员通知
- 发布日志
- 通知标题、通知正文模板和发布确认弹窗必须支持 `zh-CN / en-US`
- 发布日志、通知发送时间、阅读时间必须支持 `UTC / UTC+8` 展示切换

### 12.9 合规报表模块

#### 报表

- 28 天飞行小时报表
- 12 个月飞行小时报表
- 7/14/28 天 duty 报表
- Rest / DDO / recovery 报表
- CDR 台账
- AACM 待报送清单
- Block time 偏差报表
- 统计图表、数据导出、导出历史和专项报表等页内入口必须支持 `zh-CN / en-US`
- 报表筛选区、表头、导出文件标题、导出字段名和导出预览必须支持语言切换
- 报表周期、生成时间、导出时间、业务时间字段必须支持 `UTC / UTC+8` 展示切换，导出文件需明确时区标识

### 12.10 飞后归档模块

#### 目标

支持排班员通过 `Post-flight Archive`、归档详情和飞后归档表单，在航班结束后 24 小时内逐个完成关联飞行员归档表单，并自动形成整航班归档状态。甘特图仅同步展示归档状态并提供详情跳转。

#### 功能

- 在任务池、归档列表和甘特图上标记 `未归档 / 部分归档 / 已归档 / 逾期未归档` 航班
- 点击归档列表或甘特航班块打开航班归档详情
- 展示该航班关联飞行员列表和每名飞行员当前归档状态
- 为每名飞行员提供独立归档表单
- 录入 `actual duty start/end` 与 `actual fdp start/end`
- 自动计算 `DUTY / FDP / FLYING_HOUR`
- 对无 `FLYING_HOUR` 的飞行员提供显式标记，且该状态计入完成
- 单个飞行员保存后局部刷新航班归档状态
- 全部飞行员完成后自动将整航班转为 `已归档`
- 对超 24 小时未完成的航班给出逾期提示
- 归档完成后自动回算 actual duty / actual FDP / actual violations
- 归档完成后更新累计小时、block time 统计和 AACM 待报送清单

#### 入口、权限和刷新边界

- `Post-flight Archive`、归档详情和飞后归档表单是飞后归档主操作区；甘特图航班块仅作为状态展示和详情跳转入口。
- `DISPATCHER` 可在归档详情内录入、保存和确认飞行员归档表单。
- `OPS_MANAGER` 可查看航班归档状态、飞行员归档详情和逾期情况，但归档表单为只读。
- `PILOT` 不进入后台甘特归档录入，只能在飞行员端查看本人相关记录。
- `ADMIN` 不参与业务归档录入。
- 归档表单保存接口必须返回受影响航班、受影响飞行员、受影响时间窗口、更新后的航班归档状态和审计记录 ID，前端据此做局部刷新。
- 归档实际数据写入 actual 层，不覆盖 published planned 层；运行日调整继续写 adjustment 层。

## 13. 规则明细

### 13.1 基础定义与状态规则

| Rule ID       | 规则                               | 系统要求                         |
| ------------- | -------------------------------- | ---------------------------- |
| `RG-BASE-001` | Home Base 必填                     | 无 home base 不允许进入排班          |
| `RG-BASE-002` | 当前适应状态必填                         | 无 acclimatization 状态无法算 FDP  |
| `RG-BASE-003` | 时区信息必填                           | 飞行/调机/休息相关事件必须带时区            |
| `RG-BASE-004` | 飞后 30 分钟计入 duty                  | 每次飞行自动加 post-flight 30 分钟    |
| `RG-BASE-005` | >3h 时差转 unacclimatized           | 自动更新状态                       |
| `RG-BASE-006` | 48h 内返 base 可恢复 acclimatized     | 自动恢复                         |
| `RG-BASE-007` | >48h 返 base 需 recovery 才恢复       | 未 recovery 不得当作 acclimatized |
| `RG-BASE-008` | 单次 DDO 至少 34h 且 2 个 local nights | 否则 DDO 无效                    |
| `RG-BASE-009` | EXB 至少 30h                       | 不足则 EXB 无效                   |
| `RG-BASE-010` | 统计周口径统一                          | 按 Macao 或配置基准计算              |

### 13.2 报到与结束时间规则

| Rule ID       | 规则                                      | 系统要求       |
| ------------- | --------------------------------------- | ---------- |
| `RG-TIME-001` | Flight report 默认 `STD - 60 min`         | 可被更早通知覆盖   |
| `RG-TIME-002` | Positioning report 默认 `STD - 60 min`    | 可被更早通知覆盖   |
| `RG-TIME-003` | Effective report 取计划/实际较晚者              | 自动计算       |
| `RG-TIME-004` | 无后续 duty 时飞行计划 rest 起点 = `STA + 30 min` | 自动计算       |
| `RG-TIME-005` | 实际 rest 起点 = `ATA + 30 min` 或更晚异常结束值    | 自动计算       |
| `RG-TIME-006` | Other duty 结束即 finish                   | 自动计算       |
| `RG-TIME-007` | 长期机场流程延迟触发提醒                            | 给治理告警      |
| `RG-TIME-008` | 时间顺序合法性                                 | 结束早于开始直接拦截 |

### 13.3 标准 FDP 规则

#### Table A Acclimatized

| Start Band |  1 |     2 |    3 |     4 |  5 |     6 |   7 | 8+ |
| ---------- | -: | ----: | ---: | ----: | -: | ----: | --: | -: |
| 0700-0759  | 13 | 12.25 | 11.5 | 10.75 | 10 |  9.25 |   9 |  9 |
| 0800-1259  | 14 | 13.25 | 12.5 | 11.75 | 11 | 10.25 | 9.5 |  9 |
| 1300-1759  | 13 | 12.25 | 11.5 | 10.75 | 10 |  9.25 |   9 |  9 |
| 1800-2159  | 12 | 11.25 | 10.5 |  9.75 |  9 |     9 |   9 |  9 |
| 2200-0659  | 11 | 10.25 |  9.5 |     9 |  9 |     9 |   9 |  9 |

#### Table B Unacclimatized

| Rest Band |    1 |     2 |    3 |     4 |  5 |    6 | 7+ |
| --------- | ---: | ----: | ---: | ----: | -: | ---: | -: |
| Up to 18h |   13 | 12.25 | 11.5 | 10.75 | 10 | 9.25 |  9 |
| 18-30h    | 11.5 |    11 | 10.5 |  9.75 |  9 |    9 |  9 |
| Over 30h  |   13 | 12.25 | 11.5 | 10.75 | 10 | 9.25 |  9 |

| Rule ID      | 规则                         | 系统要求                     |
| ------------ | -------------------------- | ------------------------ |
| `RG-FDP-001` | Acclimatized 用 Table A     | 自动取 start band 和 sectors |
| `RG-FDP-002` | Unacclimatized 用 Table B   | 自动取 preceding rest band  |
| `RG-FDP-003` | 缺航段数不得计算                   | 直接 `BLOCK`               |
| `RG-FDP-004` | 缺起始时间 band 不得计算            | 直接 `BLOCK`               |
| `RG-FDP-005` | 缺 preceding rest band 不得计算 | 直接 `BLOCK`               |
| `RG-FDP-006` | FDP 不得超过允许上限               | 超限即 `NON_COMPLIANT`      |
| `RG-FDP-007` | 两人制 >9h 或夜间 >8h 需增员        | 未增员不允许发布                 |
| `RG-FDP-008` | Reduced Rest 后不可直接按普通表放行   | 必须进入特殊判断                 |

### 13.4 Extended FDP / Relief 规则

| Rule ID      | 规则                                                     | 系统要求             |
| ------------ | ------------------------------------------------------ | ---------------- |
| `RG-EXT-001` | 无 relief crew qualification 或 facility 不得 extended FDP | 不允许放行            |
| `RG-EXT-002` | relief <3h 不得延长                                        | 不允许 extended FDP |
| `RG-EXT-003` | bunk 延长 = relief/2，封顶 18h                              | 自动计算             |
| `RG-EXT-004` | seat 延长 = relief/3，封顶 15h                              | 自动计算             |
| `RG-EXT-005` | controls 连续不得 >8h                                      | 超限违规             |
| `RG-EXT-006` | 超 8h 前必须有至少 1h complete relief                         | 超限违规             |
| `RG-EXT-007` | 单 FDP 内 controls 累计不得 >10h                             | 超限违规             |
| `RG-EXT-008` | 可计 relief 最大值不得超过 `actual block - 1h`                  | 自动校验             |
| `RG-EXT-009` | 非计划地停休息仅在满足条件时可计 relief                                | 条件不满足则不计         |
| `RG-EXT-010` | 完成 relief 后余下航段如不再承担 duty，可按 positioning 处理            | 自动支持             |
| `RG-EXT-011` | 为长航段增员时必须提供 seat 或 bunk                                | 不满足不允许发布         |

### 13.5 ULR 规则

| Rule ID      | 规则                                | 系统要求                 |
| ------------ | --------------------------------- | -------------------- |
| `RG-ULR-001` | 两人制机型 + 3 名及以上飞行员 + 时差 >=6h = ULR | 自动识别                 |
| `RG-ULR-002` | ULR 不使用普通 Table A/B               | 独立口径                 |
| `RG-ULR-003` | 3 pilots 最大 13h                   | 超限违规                 |
| `RG-ULR-004` | 4 pilots 最大 18h                   | 超限违规                 |
| `RG-ULR-005` | 最多计划 2 sectors                    | 第 3 段仅 disruption 允许 |
| `RG-ULR-006` | 每多一段减 45 分钟                       | 自动计算                 |
| `RG-ULR-007` | 每名机组 total relief >=3h            | 少于即违规                |
| `RG-ULR-008` | ULR relief facility 必须为 bunk      | 不满足即违规               |

### 13.6 Split Duty 规则

| Rule ID        | 规则                                       | 系统要求   |
| -------------- | ---------------------------------------- | ------ |
| `RG-SPLIT-001` | 中间休息小于 minimum rest 视为 split duty        | 自动识别   |
| `RG-SPLIT-002` | <3h 不延长                                  | 自动计算 0 |
| `RG-SPLIT-003` | 3-10h 延长一半                               | 自动计算   |
| `RG-SPLIT-004` | 休息前后各段 <=10h                             | 超限违规   |
| `RG-SPLIT-005` | 总 FDP <=18h                              | 超限违规   |
| `RG-SPLIT-006` | 不得和 augmented extension 叠加               | 直接违规   |
| `RG-SPLIT-007` | split rest 不含地面流程和 travel                | 自动剔除   |
| `RG-SPLIT-008` | <6h 时需 quiet / comfortable / non-public  | 缺条件违规  |
| `RG-SPLIT-009` | >6h 或覆盖夜间 >=3h 时需 suitable accommodation | 缺条件违规  |
| `RG-SPLIT-010` | 机上地面休息必须同时满足 6 项条件                       | 否则无效   |

### 13.7 Late Finish / Early Start 规则

| Rule ID      | 规则                                                  | 系统要求     |
| ------------ | --------------------------------------------------- | -------- |
| `RG-LNP-001` | 仅适用于 acclimatized flight crew 且非纯 ground duty cycle | 自动筛选     |
| `RG-LNP-002` | disruption 延入 LNP 的 FDP 不适用                         | 自动排除     |
| `RG-LNP-003` | 连续 LNP duties <=3                                   | 超限违规     |
| `RG-LNP-004` | 任意 6 天内 LNP duties <=4                              | 超限违规     |
| `RG-LNP-005` | 提供住宿且 15 分钟可达时 0659 可按 0559 处理                      | 自动口径转换   |
| `RG-LNP-006` | 连续 LNP 序列前一日 2100 前必须脱 duty                         | 不满足违规    |
| `RG-LNP-007` | 连续 3 次或 7 天内 >3 次后需 48h + 2 local nights            | 不满足违规    |
| `RG-LNP-008` | overnight 模式最多 5 连续、前置 36h、单班 <=8h、结束后 free >=63h   | 任一不满足即违规 |

### 13.8 Mixed Duty / Simulator / Ground 规则

| Rule ID      | 规则                                       | 系统要求 |
| ------------ | ---------------------------------------- | ---- |
| `RG-MIX-001` | 飞前其他公司任务计入后续 FDP                         | 自动叠加 |
| `RG-MIX-002` | 管理飞行员飞前 office duty 计入 duty              | 自动计入 |
| `RG-MIX-003` | office duty 必须留实际完成记录                    | 缺失告警 |
| `RG-MIX-004` | 同一 duty 内 simulator 全额计入后续 FDP           | 自动计算 |
| `RG-MIX-005` | trainee simulator 计 sector，Instructor 不计 | 自动区分 |

### 13.9 Traveling / Positioning / Standby / Delayed Reporting 规则

| Rule ID       | 规则                                                           | 系统要求       |
| ------------- | ------------------------------------------------------------ | ---------- |
| `RG-POS-001`  | 普通 traveling 不计 duty                                         | 仅展示        |
| `RG-POS-002`  | 去非通常机场的超额 travel 计 positioning                               | 自动转化       |
| `RG-POS-003`  | 正常通勤 >90 分钟给疲劳提醒                                             | Alert      |
| `RG-POS-004`  | delayed report 用 planned/actual 更严格 band                     | 自动计算       |
| `RG-POS-005`  | 延误 >=4h 时，从原 report 后第 4 小时算 FDP                             | 自动计算       |
| `RG-POS-006`  | 10h 以上提前通知且未再打扰，可计为 rest                                     | 自动支持       |
| `RG-POS-007`  | positioning 全额计 duty                                         | 自动计入       |
| `RG-POS-008`  | positioning 默认不计 sector                                      | 特殊场景除外     |
| `RG-POS-009`  | positioning 后休息不足而要用 split duty 时，positioning 必须计 sector     | 否则违规       |
| `RG-POS-010`  | 第 7 天只允许 positioning 回 base                                  | 安排飞行则违规    |
| `RG-STBY-001` | standby 起止和类型必填                                              | 否则 `BLOCK` |
| `RG-STBY-002` | standby 最长 12h                                               | 超限违规       |
| `RG-STBY-003` | callout 后 standby 截止于报到点                                     | 自动结束       |
| `RG-STBY-004` | airport standby 从 standby start 算 FDP                        | 自动计算       |
| `RG-STBY-005` | home standby acclimatized 用更严格 band 算                        | 自动计算       |
| `RG-STBY-006` | home standby unacclimatized 按 Table B 算                      | 自动计算       |
| `RG-STBY-007` | report 晚于 standby start 4h 及以上，从第 4 小时点算 FDP                 | 自动计算       |
| `RG-STBY-008` | standby callout 总 duty = standby(max 4h) + FDP + post-flight | 自动计算       |

### 13.10 Rest / Recovery / DDO 规则

| Rule ID       | 规则                                                              | 系统要求                |
| ------------- | --------------------------------------------------------------- | ------------------- |
| `RG-REST-001` | 时差 <6h：minimum rest = `max(previous duty, 11h)`                 | 自动计算                |
| `RG-REST-002` | earned rest 恰为 11h 且有住宿时可减 1h                                   | 自动支持                |
| `RG-REST-003` | 酒店往返总 travel >1h 的超额部分补回                                        | 自动补回                |
| `RG-REST-004` | 前序 duty >18h 时后续 rest 必含 1 local night                          | 不满足违规               |
| `RG-REST-005` | 时差 >=6h 且 72h 内：取 previous duty / 8h sleep opportunity / 14h 最大 | 自动计算                |
| `RG-REST-006` | 时差 >=6h 且 72h 后：改按最后休息地当地夜间算                                    | 自动计算                |
| `RG-REST-007` | 可用 `max(previous duty, 34h)` 替代                                 | 系统支持替代口径            |
| `RG-REST-008` | reduced rest 后又 extended FDP，后续 rest 不得再 reduced                | 超限违规                |
| `RG-REST-009` | unacclimatized 在 14 天内 18-30h band 最多 3 连续或累计 4 次               | 超限违规                |
| `RG-REST-010` | 达阈值后同 14 天内 EXB 至少 34h                                          | 不满足违规               |
| `RG-REST-011` | standby callout 后 minimum rest 由 standby + completed duty 决定    | 自动计算                |
| `RG-REST-012` | away from base 应提供 suitable accommodation                       | 缺失提醒或违规             |
| `RG-REC-001`  | duty cycle >48h 且返 base 时 unacclimatized，适用 recovery            | 自动识别                |
| `RG-REC-002`  | recovery 可包含 rest 和 DDO                                         | 自动组合                |
| `RG-REC-003`  | 跨 >=6 时区时 recovery 中首个 DDO 不计入 DDO 达标                           | 自动排除                |
| `RG-REC-004`  | recovery reduction 仅限 roster stability                          | 不符合目的不得减            |
| `RG-REC-005`  | 28 天内最多 1 次 recovery reduction                                  | 超次违规                |
| `RG-REC-006`  | 原 recovery <4 DDO 不得 reduction                                  | 直接违规                |
| `RG-REC-007`  | 公司可减 1 DDO                                                      | 系统支持                |
| `RG-REC-008`  | 经机组同意最多再减 1 DDO                                                 | 总减幅不得 >2            |
| `RG-DDO-001`  | 连续 duty 不得超过 6 天                                                | 第 7 天仅可 positioning |
| `RG-DDO-002`  | 第 7 天回 base 后至少 2 连续 DDO                                        | 不满足违规               |
| `RG-DDO-003`  | 任意连续 14 天必须出现 2 连续 DDO                                          | 不满足违规               |
| `RG-DDO-004`  | 3 个四周周期平均 DDO >=8                                               | 不满足违规               |

#### Table X

| Duty Cycle Length | 4 Zones | 5 Zones | 6 Zones | 7 Zones | 8-12 Zones |
| ----------------- | ------: | ------: | ------: | ------: | ---------: |
| 48 to 72 Hours    |   1 DDO |   1 DDO |  2 DDOs |  2 DDOs |     2 DDOs |
| 72 to 96 Hours    |  3 DDOs |  3 DDOs |  3 DDOs |  3 DDOs |     3 DDOs |
| 96 to 120 Hours   |  3 DDOs |  4 DDOs |  4 DDOs |  4 DDOs |     4 DDOs |
| 120 to 144 Hours  |  3 DDOs |  4 DDOs |  5 DDOs |  5 DDOs |     5 DDOs |
| Over 144 Hours    |  3 DDOs |  4 DDOs |  5 DDOs |  6 DDOs |     6 DDOs |

### 13.11 飞行小时、Duty 小时与记录规则

| Rule ID         | 规则                                         | 系统要求    |
| --------------- | ------------------------------------------ | ------- |
| `RG-HOUR-001`   | rolling 28 天 flight <=100h                 | 超限违规    |
| `RG-HOUR-002`   | 12 个月至上月底 flight <=900h                    | 超限违规    |
| `RG-HOUR-003`   | 7 天 duty <=55h                             | 超限违规    |
| `RG-HOUR-004`   | 已开始 rostered duty 因不可预见延误可放宽到 60h          | Alert   |
| `RG-HOUR-005`   | 为回 base positioning 可再超最多 10h              | Alert   |
| `RG-HOUR-006`   | 14 天 duty <=95h                            | 超限违规    |
| `RG-HOUR-007`   | 28 天 duty <=190h                           | 超限违规    |
| `RG-HOUR-008`   | 每出现一次 6h+ 时差 FDP，28 天 allowable duty 再减 8h | 自动扣减    |
| `RG-HOUR-009`   | standby 默认全额计入 cumulative duty             | 自动计算    |
| `RG-HOUR-010`   | 特定 standby 场景按半额计入                         | 自动计算    |
| `RG-HOUR-011`   | 连续 28 天不飞不待命，可不带入旧 duty；回归前 28 天仍需记录       | 自动支持    |
| `RG-RECLOG-001` | duty / rest 记录缺失不得归档或发布                    | `BLOCK` |
| `RG-RECLOG-002` | DDO 记录缺失给告警                                | Alert   |
| `RG-RECLOG-003` | 每条 duty 必须记录开始、结束、岗位功能                     | `BLOCK` |
| `RG-RECLOG-004` | daily / 28d / 12m flying totals 必须可追溯      | `BLOCK` |
| `RG-RECLOG-005` | 记录保留至少 12 个月                               | 治理要求    |
| `RG-RECLOG-006` | CDR 保留至少 12 个月                             | 治理要求    |
| `RG-RECLOG-007` | block time 必须反映可实现运行时间                     | 持续偏差提醒  |
| `RG-RECLOG-008` | 2 个月 15% 航班超计划 15 分钟以上必须调整 block time      | 超阈值违规   |
| `RG-RECLOG-009` | 触发 PIC discretion 的 sector 必须纳入月度复核        | 自动汇总    |

### 13.12 Service Disruption / Commander's Discretion 规则

| Rule ID       | 规则                                        | 系统要求             |
| ------------- | ----------------------------------------- | ---------------- |
| `RG-DISC-001` | 仅适用于已开始 rostered FDP 后发生的不可预见情况           | 不满足不得发起          |
| `RG-DISC-002` | 不得预先排入班表                                  | 发现即违规            |
| `RG-DISC-003` | 必须为不可预见运行情况                               | 非此场景不得用          |
| `RG-DISC-004` | 公司请求人必须为授权角色                              | 非授权不允许提交         |
| `RG-DISC-005` | PIC 拥有最终决定权                               | 系统必须保留 PIC 决策记录  |
| `RG-DISC-006` | 普通延长 FDP 最多 +3h                           | 超限违规，除 emergency |
| `RG-DISC-007` | augmented / split / reduced-rest 后最多再 +2h | 超限违规，除 emergency |
| `RG-DISC-008` | reduced rest discretion 不适用于 recovery     | 不允许              |
| `RG-DISC-009` | reduced rest 后房间可用时间不得少于 10h              | 不满足违规            |
| `RG-DISC-010` | 每次 discretion 必须生成 CDR                    | 否则 `BLOCK`       |
| `RG-DISC-011` | 公司请求必须有书面记录                               | 否则违规             |
| `RG-DISC-012` | 延长 >2h 或减休 >1h 需在 7 天内报 AACM              | 自动进入报送清单         |

## 14. 数据对象

| 对象               | 说明      | 关键字段                                            |
| ---------------- | ------- | ----------------------------------------------- |
| CrewMember       | 飞行员主数据  | crew\_id, role, base, qualification             |
| Roster           | 班表头     | roster\_id, period, version, status             |
| RosterLine       | 班表行     | roster\_line\_id, crew\_id, duty\_id            |
| DutyPeriod       | 连续 duty | duty\_id, start\_utc, end\_utc, type                      |
| FlightDutyPeriod | 飞行 duty | fdp\_id, report\_utc, finish\_utc, sectors                |
| Sector           | 单航段     | sector\_id, dep, arr, std, sta, block           |
| FlightArchiveCase | 航班归档任务 | archive\_case\_id, flight\_id, roster\_version\_id, archive\_status, archive\_deadline\_at\_utc, archived\_at\_utc, revision |
| CrewArchiveForm | 飞行员归档表单 | form\_id, archive\_case\_id, flight\_id, crew\_id, actual\_duty\_start\_utc, actual\_duty\_end\_utc, actual\_fdp\_start\_utc, actual\_fdp\_end\_utc, duty\_duration, fdp\_duration, flying\_hour, no\_flying\_hour\_flag, form\_status, entered\_by, entered\_at\_utc, confirmed\_at\_utc, revision |
| StandbyDuty      | 待命      | standby\_id, mode, start\_utc, end\_utc, callout\_utc          |
| PositioningDuty  | 调机      | positioning\_id, start\_utc, end\_utc, mode               |
| RestPeriod       | 休息      | rest\_id, start\_utc, end\_utc, accommodation             |
| RecoveryPeriod   | 恢复期     | recovery\_id, start\_utc, end\_utc, required\_ddo         |
| DDORecord        | DDO 记录  | ddo\_id, start\_utc, end\_utc, valid\_flag                |
| RuleCatalog      | 规则目录    | rule\_id, rule\_name, rule\_category, severity\_default |
| RuleReference    | 规则来源引用 | rule\_id, source\_document, source\_section, source\_clause, source\_page, pdf\_deeplink |
| RuleVersion      | 规则版本    | rule\_id, version, status, effective\_from, derived\_from\_fom\_language |
| EvaluationResult | 规则结果汇总 | evaluation\_id, object\_id, overall\_status, hit\_count |
| ViolationHit     | 单条规则命中 | hit\_id, evaluation\_id, rule\_id, rule\_category, severity, message, source\_section, source\_clause, source\_page |
| ExceptionRequest | 例外申请    | request\_id, type, reason                       |
| PICDecision      | PIC 决策  | decision\_id, status, comment                   |
| CDRRecord        | CDR 记录  | cdr\_id, related\_request\_id, report\_required |
| AuditLog         | 审计日志    | actor, action, timestamp\_utc                        |

### 14.1 技术架构基线

系统实施建议采用以下架构基线：

- 前端：`React + TypeScript + Vite`
- 甘特图底座：一期固定使用 `vis-timeline` 官方 `Timeline` 实例实现航空态势时间线；具体 Timeline 初始化、items/groups/options 映射和事件细节不得泄漏到业务模块，业务写操作不得直接依赖甘特控件能力。
- 后端：`Spring Boot 3 + Java 17` 模块化单体
- 数据库：`MySQL 8.0`
- 缓存与异步：`Redis`
- 开发方式：`TDD`
- E2E 验收：`Playwright`

当前框架期认证与权限基线：

- 认证方式：`Spring Security + JWT + BCrypt`
- 首批业务角色：`DISPATCHER` 排班员、`OPS_MANAGER` 运行经理、`PILOT` 飞行员；系统管理角色：`ADMIN`
- 框架期只做菜单级与接口级权限，不做按钮级细权限
- 默认语言：中文，可切换 English
- 默认展示时区：UTC+8，可切换 UTC；底层数据继续按 UTC 存储

设计原则：

- 一期到二期不采用微服务，优先保证规则、状态流和主工作台闭环稳定
- 数据层采用 `业务写模型 + 查询投影表` 的 `CQRS-lite` 方式
- 不允许业务代码直接依赖第三方甘特图库，必须通过适配层封装

本地开发端口规范：

- 前端开发服务：`5180`
- 后端开发服务：`8088`

### 14.2 国际化与时区支持

#### 国际化

- 界面语言首版固定支持：
  - `zh-CN`
  - `en-US`
- 静态界面文案优先使用前端资源文件管理
- 一级入口、父菜单、子菜单、面包屑、页面标题、按钮、表单标签、placeholder、校验提示、空状态、错误提示、确认弹窗、状态标签、报表表头和导出文件标题均必须接入统一语言资源
- 前端不得以硬编码方式在组件内直接写死中文或英文业务文案；确需临时文案时必须登记到语言资源并补齐双语
- 角色权限菜单必须保存稳定菜单 key，展示层按 `zh-CN / en-US` 翻译，不得用展示文案作为权限判断依据
- 动态字典类数据应支持：
  - `name_zh`
  - `name_en`
- 用户偏好应持久化保存语言选择；未配置时默认 `zh-CN`

#### 时区

- 数据库存储时间统一为 `UTC`
- 页面展示支持用户切换：
  - `UTC`
  - `UTC+8`
- 用户偏好应持久化保存展示时区；未配置时默认 `UTC+8`
- 规则计算必须保留：
  - 存储时间
  - 展示时间
  - 业务所属时区
  - 身体钟参考时区
- 机场、航线、航班任务必须保留业务所属 IANA 时区；展示时区仅影响用户界面输出，不影响跨时区、FDP、Rest、DDO、Recovery、归档截止等计算

#### 日期时间展示规范

前端必须使用统一日期时间格式化规范：

- 日期：`YYYY-MM-DD`
- 日期时间：`YYYY-MM-DD HH:mm`
- 含时区日期时间：`YYYY-MM-DD HH:mm (UTC)` 或 `YYYY-MM-DD HH:mm (UTC+8)`
- 日期区间：`YYYY-MM-DD ~ YYYY-MM-DD`

要求：

- 工作台、侧栏、弹窗、列表、报表预览采用同一格式化策略
- 切换 `UTC / UTC+8` 后，全站前端展示同步变化
- 展示时区切换不改变规则计算口径

#### 时间安全门禁

时间处理按航空安全高风险项管理，任何一期新模块未通过时间安全检查不得合入。

- 后端 API 中所有瞬时时间字段必须使用明确 UTC 语义后缀，例如 `startUtc`、`endUtc`、`archiveDeadlineAtUtc`、`actualDutyStartUtc`；禁止新增 `startTime`、`dateTime`、`time` 这类无语义字段名。
- 航班、机场、航线必须保留业务所属 IANA 时区，例如 `departureTimezone`、`arrivalTimezone`；业务时区用于规则、证据和航空语义，不等同于用户展示时区。
- 前端展示时间必须通过 `TimeDisplayContext`、`useTimeFormatter()` 或统一时间组件完成，包括 `Timestamp`、`DateOnly`、`TimeRange`、`GanttTimeLabel`、`TimezoneBadge`。
- 页面、甘特块、侧栏、表格、表单、报表和导出预览不得直接调用 `new Date()`、`toLocaleString()`、`toISOString().slice()`、`Date.parse()` 或通过字符串切片取小时分钟。
- 甘特图布局计算只能基于 UTC epoch milliseconds；切换 `UTC / UTC+8` 后甘特块绝对位置不变，只更新时间轴标签、块详情和侧栏展示文本。
- actual duty / FDP、归档、例外、PIC 决策、运行日调整等安全相关表单必须明确当前输入解释时区，保存前转换为 UTC，并在确认区同时显示 UTC 与当前展示时区文本。
- 前端质量门禁必须包含 `npm.cmd run check:time`；该检查与 `check:i18n`、构建和 Playwright 一起作为框架与甘特开发的基础验收。

#### 字符集规范

- 数据库统一字符集：`utf8mb4`
- 接口统一编码：`UTF-8`
- 前端源码、语言资源、导入模板、测试夹具统一使用 `UTF-8`
- 面向 Excel 的 CSV 导出建议使用 `UTF-8 with BOM`
- 中英文字段在导入、展示、导出过程不得出现乱码或截断

### 14.3 逻辑表结构设计

详细逻辑表设计、列名与字段作用说明见：

- [DEV_Plan_Pilot_Rostering_System_1-4_Phases.md](</D:/paiban2/DEV_Plan_Pilot_Rostering_System_1-4_Phases.md>)

本系统实施阶段的核心逻辑表至少包括：

- `sys_user`
- `user_preference`
- `airport_dictionary`
- `crew_member`
- `crew_qualification`
- `task_plan_import_batch`
- `task_plan_item`
- `roster_version`
- `timeline_block`
- `overlay`
- `evaluation_result`
- `violation_hit`
- `exception_record`
- `flight_archive_case`
- `crew_archive_form`
- `pilot_status_report`
- `notification_record`

## 15. 状态流转

### 15.1 Roster 状态

| 状态                | 说明      |
| ----------------- | ------- |
| Draft             | 草稿，可编辑  |
| Under Review      | 提交审核    |
| Exception Pending | 存在待处理例外 |
| Approved          | 可发布     |
| Published         | 已生效     |
| Archived          | 已归档     |

### 15.2 Exception 状态

| 状态        | 说明       |
| --------- | -------- |
| Draft     | 未提交      |
| Submitted | 已提交待 PIC 决策代录 |
| Approved  | PIC 已批准，运行经理已代录 |
| Rejected  | PIC 已拒绝，运行经理已代录 |
| Reported  | 已报 AACM  |

### 15.3 归档状态

| 状态 | 说明 |
| --- | --- |
| Unarchived | 航班结束后尚未开始归档 |
| Partially Archived | 部分飞行员已完成归档表单 |
| Archived | 该航班关联飞行员全部完成归档表单，整航班已正式归档 |
| Overdue | 超过 24 小时仍未完成整航班归档 |

### 15.4 飞行员归档表单状态

| 状态 | 说明 |
| --- | --- |
| Not Started | 尚未录入该飞行员归档表单 |
| Entered | 已录入时间字段，待最终完成 |
| No Flying Hour Confirmed | 已显式标记无 `FLYING_HOUR`，且视为已完成 |
| Completed | 已完成该飞行员归档表单 |

## 16. 权限矩阵

| 功能       | 排班员 | 运行经理 | 飞行员 | 系统管理员 |
| -------- | --: | ---: | --: | ----: |
| 维护飞行员档案  |  只读 |   只读 | 只读本人 |   是 |
| 导入航班     |   是 |    是 |   否 |   是 |
| 编排班表     |   是 |    是 |   否 |   否 |
| 查看全量校验结果 |   是 |    是 | 仅本人相关 |   是 |
| 发起例外     |   是 |    是 |   否 |   否 |
| PIC 决策代录 |   否 |    是 | 仅查看本人相关 |   否 |
| 发布班表     |   否 |    是 |   否 |   否 |
| 飞后归档录入与确认 |   是 |   只读 |   否 |   否 |
| 飞行员端个人数据访问 |   否 |    否 | 仅本人 `crew_id` |   账号绑定维护 |
| 导出报表     |   是 |    是 |   否 |   是 |
| 系统配置、账号和权限 |   否 |    否 |   否 |   是 |

## 17. 通知需求

系统必须支持：

- 排班发布通知
- 班表变更通知
- 待命呼出通知
- PIC 待决策通知
- CDR 生成通知
- AACM 报送截止提醒
- 即将超限提醒
- 飞后归档待录入提醒
- 飞后部分归档提醒
- 飞后归档逾期提醒

## 18. 接口需求

### 18.1 输入接口

- 航班计划导入
- 机场与时区字典
- 飞行员主数据
- 飞后归档表单手工录入
- 飞后数据补充导入（非主流程）
- CDR / discretion 导入

### 18.2 甘特态势展示与飞后归档接口约束

- 甘特投影查询必须返回航班块归档字段：`archiveCaseId`、`archiveStatus`、`archiveDeadlineAtUtc`、`crewArchiveSummary`、`canOpenArchiveDetail`、`archiveReadOnlyReason`。
- 航班归档详情接口必须返回航班信息、关联飞行员列表、每名飞行员 `CrewArchiveForm` 状态、归档截止时间和当前用户可操作性。
- 单个飞行员归档表单保存接口必须带 `expectedRevision`，防止并发覆盖。
- 保存成功必须返回更新后的飞行员表单、航班归档状态、受影响时间窗口、受影响航班/飞行员 ID、规则摘要和审计记录 ID。
- 运行经理调用保存接口必须返回无权限或只读错误，不得静默成功。

### 18.3 飞行员端本人数据接口约束

- 飞行员端所有查询接口必须从认证上下文读取当前 `user_id`，再解析绑定的 `crew_id`，并以该 `crew_id` 作为唯一数据范围。
- 飞行员端优先使用 `/me` 风格接口：`/api/pilot/me/roster`、`/api/pilot/me/alerts`、`/api/pilot/me/history`、`/api/pilot/me/archive-summary`、`/api/pilot/me/exceptions-cdr`、`/api/pilot/me/status-reports`。
- 飞行员端个人班表、提醒、状态申报、个人历史、本人归档摘要、本人例外/CDR/PIC 决策记录不得接受前端传入的任意 `crewId` 作为查询范围。
- 若接口路径需要业务 ID，后端必须校验该 ID 对应记录是否关联当前飞行员 `crew_id`；不关联时返回 `403` 或等价无权限响应。
- 飞行员端导出或下载能力若后续开放，也必须限定为本人数据，不得导出全量或其他飞行员数据。
- 飞行员状态申报只能为当前绑定 `crew_id` 创建记录，不允许代他人申报。
- 如飞行员端展示个人时间线或归档摘要，只能返回当前 `crew_id` 的单人只读投影，不得返回全量机组行、校验与发布或其他飞行员归档表单。

### 18.4 输出接口

- 班表导出
- 合规报表导出
- AACM 报送清单导出
- 飞行员个人班表导出

## 19. 非功能需求

| 编号        | 要求                           |
| --------- | ---------------------------- |
| `NFR-001` | 所有时间计算必须带时区和本地时间展示           |
| `NFR-002` | 所有规则结果必须可追溯到 Rule ID、规则分类、来源章节、条款、页码和版本 |
| `NFR-003` | 所有关键操作必须写入 audit log         |
| `NFR-004` | 规则校验需支持交互式使用                 |
| `NFR-005` | 支持中英文界面切换与术语展示              |
| `NFR-006` | duty / rest / CDR 至少保留 12 个月 |
| `NFR-007` | 班表版本必须可回放                    |
| `NFR-008` | 规则版本变更必须可追踪                  |
| `NFR-009` | 桌面端必须支持规则引用跳转到 PDF 对应页      |
| `NFR-010` | 系统必须统一以 UTC 存储时间，并支持 `UTC / UTC+8` 展示切换 |
| `NFR-011` | 飞行员端必须支持手机浏览器访问与操作          |
| `NFR-012` | 排班工作台桌面优先，移动端不要求完成复杂拖拽编排   |
| `NFR-013` | 数据库统一采用 `MySQL 8.0`          |
| `NFR-014` | 开发过程必须采用 TDD                |
| `NFR-015` | 端到端回归测试必须采用 Playwright      |
| `NFR-016` | 本地开发默认端口固定为前端 `5180`、后端 `8088` |
| `NFR-017` | 数据库、接口、前端资源和测试夹具字符集必须统一 |
| `NFR-018` | 前端日期、日期时间和区间展示格式必须全站一致 |
| `NFR-019` | 切换 `UTC / UTC+8` 后全站展示时间必须同步刷新 |
| `NFR-020` | 测试数据必须覆盖中文、英文和中英混合字符集场景 |
| `NFR-021` | 一级入口、父菜单、子菜单、页面标题、按钮、字段和提示必须统一走 `zh-CN / en-US` 语言资源 |
| `NFR-022` | 旧浅色设计包和 `apps/web/src/imports` 历史文件只用于布局样式、展开效果、浅色主题和视觉密度参考，不得作为正式功能、菜单、权限、API、数据模型、算法或验收来源 |

## 20. 完成系统的实施分期

### Phase 1 核心运行闭环

- Dashboard：direct entry
- Flight Operations Center：Flight Plan、Operations Data
- Crew Resources Center：Crew Information、Status Timeline、External Work
- Rostering Workbench：Flight View、Crew View、Unassigned Flights、Validation & Publish、Run-day Adjustments、Post-flight Archive
- Rule Center：direct entry；page contains Rule Catalog、Rule Versions、FOM References、Rule Trial
- Exception Reporting Center：Exception Requests、CDR / AACM
- Statistics Reports：direct entry；page contains Statistics、Crew Hours、Duty & Rest、DDO/Recovery、Archive Reports、Data Export、Export History
- Admin：Basic Config、Account Management、Role & Permission、Rule Config、Dictionary、Airport & Timezone、Import Mapping、Notification Template、User Preference
- Pilot Portal：My Roster、My Alerts、Status Report、My History、My Preferences
- 全局：一级入口、父子菜单展开/折叠、角色级菜单权限、`zh-CN / en-US` 切换、`UTC / UTC+8` 展示切换
- 草稿 / 发布 / 经理确认
- 例外最小闭环
- 飞后归档最小闭环
- 飞行员端最小闭环
- 移动端支持飞行员班表、提醒与状态申报

### Phase 2 运行与治理增强

- 运行日改班
- 版本历史与版本对比
- 统计报表首批治理报表
- AACM 报送清单与 CDR 台账
- 导入质量治理
- 运行经理移动端查看与审批增强

### Phase 3 效率增强

- 完整规则引擎首批落地与试算转正式
- FDP / FTL、rest、DDO、Recovery、Standby、Positioning、Discretion / CDR / AACM 等规则计算增强
- 批量调整工具
- 影响模拟
- 候选机组推荐
- 工作台效率增强
- 治理趋势报表
- 飞行员端个人统计摘要

### Phase 4 集成与智能化

- 外部系统接入
- 半自动辅助排班
- 方案比较
- 高级分析
- 深化通知联动
- 移动端企业容器/钉钉集成增强

详细父菜单-子菜单开发计划、测试策略、表结构设计和甘特飞后归档专项流程见：

- [DEV_Plan_Pilot_Rostering_System_1-4_Phases.md](</D:/paiban2/DEV_Plan_Pilot_Rostering_System_1-4_Phases.md>)
- [PHASE1_GANTT_ARCHIVE_WORKFLOW.md](</D:/paiban2/PHASE1_GANTT_ARCHIVE_WORKFLOW.md>)
- [PHASE2_RULE_VALIDATION_CLOSURE.md](</D:/paiban2/PHASE2_RULE_VALIDATION_CLOSURE.md>)

## 21. 验收场景

1. 正常两人制日间 2 sectors 可成功发布。
2. 两人制夜间长航段未增员时被系统拦截。
3. Unacclimatized crew 正确使用 Table B。
4. Extended FDP with bunk 正确计算且不超 18h。
5. ULR 三人制 14h 被判超限。
6. Split duty 4 小时 rest 正确延长 2 小时。
7. Home standby 4 小时后呼出，正确从第 4 小时起算 FDP。
8. 第 7 天安排飞行 duty，被拦截；改成 positioning 回 base 可通过。
9. 28 天 flight >100h 时发布失败。
10. Service disruption 发起 FDP extension，PIC 批准后自动生成 CDR。
11. 延长 >2h 或减休 >1h 自动进入 AACM 报送清单。
12. 未归档航班在任务池、归档列表和甘特图上被正确标记，排班员从归档详情逐个录入飞行员归档表单。
13. 同一 duty 同时命中多条规则时，工作台、校验与发布和例外页均显示全部命中规则。
14. 规则中心可从 Rule ID 跳转到对应 PDF 页，并显示章节、条款、页码和当前版本。
15. 某个飞行员无 `FLYING_HOUR` 时，`Duty/FDP` 必录，显式标记后该表单仍视为完成。
16. 单个飞行员保存后，航班状态更新为 `部分归档`，但整航班不立即变为已归档。
17. 当该航班关联飞行员全部完成表单后，系统自动将整航班转为 `已归档`。
18. 超过 24 小时未完成整航班归档时，系统维持 `Overdue` 状态并给出提示。
19. 运行经理从甘特图或归档列表进入归档详情时只能查看，不可编辑飞行员归档表单。
20. 飞行员端可在手机浏览器中完成查看班表、查看提醒与状态申报。
21. 飞行员端 `/api/pilot/me/*` 只返回当前登录用户绑定 `crew_id` 的本人数据。
22. 飞行员尝试访问他人归档表单、例外/CDR 或业务 ID 时，后端返回 `403` 或等价无权限响应。
23. 未绑定 `crew_id` 的飞行员账号进入飞行员端时提示账号未关联飞行员档案。
24. 系统支持 `中文 / English` 切换，页面主要标签与提示同步切换。
25. 系统支持 `UTC / UTC+8` 展示切换，且不影响底层 UTC 存储与规则计算。
26. 列表、侧栏、弹窗、报表预览中的日期时间格式全站一致。
27. 中文、英文和中英混合数据在导入、展示、导出过程中无乱码。

## 22. 本文档使用方式

- 本 FRD 是后续产品原型、详细设计、开发任务拆分和测试用例编写的唯一主文档。
- 后续若新增 AACM 或公司 overlay，应直接在本 FRD 的规则章节扩展，不再拆独立规则文档。
- 页面和流程如果发生变化，也应在本文件更新，不另行维护第二套需求版本。
- 开发期的详细实施顺序、技术架构和表结构设计以 [DEV_Plan_Pilot_Rostering_System_1-4_Phases.md](</D:/paiban2/DEV_Plan_Pilot_Rostering_System_1-4_Phases.md>) 为补充执行文档。


