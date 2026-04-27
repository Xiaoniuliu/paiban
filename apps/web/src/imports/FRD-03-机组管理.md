# FRD-03：机组资源中心

> 使用边界：本文件为旧包/历史导入材料，仅可参考前端视觉、布局密度和交互样式；不得作为正式功能需求、菜单、权限、API、数据模型、算法或验收依据。正式口径以仓库根目录主 FRD、PRD、ARCHITECTURE、DEV Plan 和专项开发文档为准。

**版本**: V1.0
**日期**: 2026-04-15
**状态**: 待评审
**模块编号**: 03
**依赖顺序**: 第二（排班核心资源）

---

## 1. 模块概述

### 1.1 功能简介
机组资源中心负责管理飞行员和空乘人员档案，包括人员基本信息、资质证照、培训记录、飞行时长统计等。是排班系统的核心资源模块。

### 1.2 用户角色
| 角色 | 权限 |
|------|------|
| 管理员 (admin) | 全部权限 |
| 排班员 (roster) | 可查看、编辑、分配 |
| 机组人员 (crew) | 仅查看个人档案 |
| 签派员 (oc) | 可查看机组档案 |
| 监控员 (monitor) | 只读权限 |

### 1.3 数据来源
参考 `index.html` 中的"机组资源中心"模块

---

## 2. 功能清单

### 2.1 机组信息与查询

| 功能 | 说明 |
|------|------|
| 机组分页列表 | 支持分页、排序、筛选 |
| 快速筛选 | 按类型（机长/副驾/替补）、状态、基地 |
| 关键字搜索 | 搜索工号、姓名 |
| 导出机组 | 导出 Excel 格式 |
| 批量操作 | 选中后支持批量删除、批量导出 |

**筛选工具栏：**

| 控件 | 类型 | 说明 |
|------|------|------|
| 机组类型 | 下拉多选 | 机长(captain)、副驾驶(copilot)、替补(standby) |
| 状态 | 下拉多选 | 飞行执勤、Standby、休息、培训 |
| 基地 | 下拉单选 | 全部、澳门 |
| 关键字搜索 | 文本输入 | 搜索工号、姓名 |
| 搜索按钮 | 按钮 | 触发搜索 |
| 重置按钮 | 按钮 | 恢复默认筛选条件 |

**列表展示：**

| 列名 | 宽度 | 说明 |
|------|------|------|
| 复选框 | 40px | 全选/单选 |
| 序号 | 50px | 序号 |
| 工号 | 80px | 机组工号 |
| 姓名 | 100px | 机组姓名 |
| 类型 | 80px | 机长/副驾/替补 |
| 资质等级 | 80px | leader/route/standby |
| 累计飞行(28天) | 120px | XXh / 190h 格式 |
| 7天执勤 | 100px | XXh / 55h 格式 |
| 模拟机 | 80px | 当月模拟机时长 |
| 地面培训 | 80px | 当月培训时长 |
| 值班 | 80px | 当月值班时长 |
| 状态 | 100px | 飞行执勤/Standby/休息/培训 |
| 最近休息 | 80px | 上次休息时长 |
| 合规状态 | 80px | 正常/告警/违规 |
| 操作 | 150px | 查看、编辑、删除 |

### 2.2 机组档案管理

| 功能 | 说明 |
|------|------|
| 新增机组 | 录入基本信息、资质信息 |
| 编辑机组 | 修改基本信息、资质信息 |
| 删除机组 | 逻辑删除，校验是否有关联排班 |
| 查看详情 | 展示完整档案信息 |

**机组基本信息字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 工号 | 文本 | 是 | 唯一标识，如 C1, FO1 |
| 姓名 | 文本 | 是 | 真实姓名 |
| 性别 | 单选 | 是 | 男/女 |
| 出生日期 | 日期 | 是 | 年满18岁 |
| 类型 | 下拉 | 是 | 机长 / 副驾驶 / 替补 |
| 资质等级 | 下拉 | 是 | leader(队长) / route(航线) / standby(替补) |
| 基地 | 下拉 | 是 | 所属基地，如澳门 |
| 入职日期 | 日期 | 是 | 入职时间 |
| 手机号 | 文本 | 是 | 紧急联系方式 |
| 邮箱 | 文本 | 否 | 邮箱地址 |
| 紧急联系人 | 文本 | 是 | 姓名+关系+电话 |
| 备注 | 文本 | 否 | 备注信息 |

### 2.3 资质证照管理

| 功能 | 说明 |
|------|------|
| 执照管理 | 执照类型、编号、有效期 |
| 体检管理 | 体检类型、有效期 |
| 语言能力 | 语言等级、考试日期、有效期 |
| 机型签注 | 授权机型，如 B737/B747 |
| 资质预警 | 过期前30天自动提醒 |

**法规依据：**
- AC025：航空运营人飞行员执照与评级规范
- ANRM 8th Schedule：航空人员执照规范第八附表
- PART D：航空人员训练与资质规范D部分
- AC/PEL/004R02：航空人员体检规范
- AC/PEL/002R01：语言能力规范

#### 2.3.1 执照类型

| 执照类型 | 代码 | 有效期 | 续期要求 | 法规依据 |
|----------|------|--------|----------|----------|
| CPL (商用飞行员执照) | CPL | 5年 | 提前1个月申请续期 | ANRM 8th Schedule Part B |
| ATPL (航线运输飞行员执照) | ATPL | 5年 | 提前1个月申请续期 | ANRM 8th Schedule Part B |

**执照字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 执照类型 | 下拉 | 是 | CPL/ATPL |
| 执照编号 | 文本 | 是 | 执照唯一编号 |
| 颁发机构 | 文本 | 是 | 民航局 |
| 颁发日期 | 日期 | 是 | 执照颁发日期 |
| 有效日期 | 日期 | 是 | 执照到期日期 |
| 法规依据 | 文本 | 否 | ANRM 8th Schedule Part B |
| 附件 | 上传 | 否 | 执照扫描件（PDF/JPG） |

#### 2.3.2 健康检查

| 检查类型 | 代码 | 有效期 | 续期要求 | 法规依据 |
|----------|------|--------|----------|----------|
| I类体检 | CLASS_I | 12个月 | 可由民航局酌情延长最多45天 | AC/PEL/004R02 |
| II类体检 | CLASS_II | 12个月 | 可由民航局酌情延长最多45天 | AC/PEL/004R02 |

**体检字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 体检类型 | 下拉 | 是 | I类/II类 |
| 体检机构 | 文本 | 是 | 体检医院 |
| 主检医师 | 文本 | 是 | 主检医师姓名 |
| 体检日期 | 日期 | 是 | 体检执行日期 |
| 有效日期 | 日期 | 是 | 体检到期日期 |
| 体检结果 | 单选 | 是 | 合格/不合格/待定 |
| 限制条款 | 文本 | 否 | 如"佩戴矫正镜片" |
| 延长批准 | 布尔 | 否 | 是否获得延长批准 |
| 延长天数 | 数字 | 否 | 最多45天 |
| 法规依据 | 文本 | 否 | AC/PEL/004R02 |
| 附件 | 上传 | 否 | 体检报告扫描件 |

#### 2.3.3 语言能力

| 等级 | 代码 | 有效期 | 续期要求 | 法规依据 |
|------|------|--------|----------|----------|
| Level 4 | L4 | 3年 | 考试前至少5个工作日申请 | AC/PEL/002R01 |
| Level 5 | L5 | 6年 | 考试前至少5个工作日申请 | AC/PEL/002R01 |

**语言能力字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 语言等级 | 下拉 | 是 | Level 4/Level 5 |
| 考试成绩 | 文本 | 是 | 考试成绩 |
| 考试日期 | 日期 | 是 | 考试日期 |
| 有效日期 | 日期 | 是 | 到期日期 |
| 法规依据 | 文本 | 否 | AC/PEL/002R01 |
| 附件 | 上传 | 否 | 语言证书扫描件 |

### 2.4 培训记录管理

| 功能 | 说明 |
|------|------|
| 培训列表 | 按人员筛选 |
| 新增培训 | 记录培训内容、时长、成绩 |
| 培训提醒 | 定期培训到期提醒 |

#### 2.4.1 角色定义

| 角色代码 | 角色名称 | 说明 |
|----------|----------|------|
| CP | Captain | 机长 |
| CP(RHS) | Captain (Right-Hand Seat) | 右座机长 |
| LTC | Line Training Captain | 航线训练机长 |
| I-SIM | Instructor - Simulator | 模拟机教员 |
| I/E-SIM | Instructor/Examiner - Simulator | 模拟机教员/检查员 |
| I/E-SIM&A/C | Instructor/Examiner SIM & Aircraft | 模拟机及飞机教员/检查员 |

#### 2.4.2 机长(CP)复训项目

| 训练项目 | 训练类型 | 有效期 | 法规依据 | 备注 |
|----------|----------|--------|----------|------|
| RT/PC 熟练度检查 | SIM | 6个月 | AC025 6.3 | 与仪表/类型等级续期集成 |
| Instrument Approach Proficiency | SIM | 6个月 | AC025 6.5 | 需包含NDB、VOR、LOC或ILS后进近 |
| OTE 航线检查 | Ground School | 1年 | Part D 2.13 | - |
| Security Training | Ground School | 1年 | - | 与OTE合并 |
| Area/Route/Aerodrome Competence | Ground School | 1年 | AC025 6.6 | 可在OTE期间重新验证 |
| Dangerous Goods | Ground School | 2年 | - | 与OTE合并 |
| Safety Management System | Ground School | 1年 | - | 与OTE合并 |
| Annual CRM Training | Ground School | 1年 | AC025 6.9 | 不使用LOFT时需每年完成 |
| 3 Years CRM Training | Ground School | 3年 | AC025 6.9 | 完整CRM课程的主要要素 |
| Annual Emergency&Safety Equipment | Ground School | 1年 | AC025 6.8 | - |
| 3 Years Emergency&Safety Equipment | Ground School | 3年 | AC025 6.8 | 每3年需包含实际的操作 |
| Annual Line Check | Flight | 1年 | AC025 6.4 | 考试员坐jump seat |
| 90 Day's Recency | Flight | 90天 | AC025 6.10 | 前90天内需完成至少3次起飞和3次着陆 |

**培训记录字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 人员角色 | 下拉 | 是 | CP/CP(RHS)/LTC/I-SIM/I/E-SIM/I/E-SIM&A/C |
| 训练项目 | 下拉 | 是 | 对应角色的训练项目 |
| 训练类型 | 下拉 | 是 | SIM/Ground School/Flight |
| 训练日期 | 日期 | 是 | 训练完成日期 |
| 有效日期 | 日期 | 是 | 训练有效期截止 |
| 训练地点 | 文本 | 否 | 训练实施地点 |
| 教员 | 文本 | 否 | 训练教员姓名 |
| 训练结果 | 下拉 | 是 | 通过/未通过 |
| 法规依据 | 文本 | 否 | 相关法规条款 |
| 备注 | 文本 | 否 | 其他信息 |

### 2.5 飞行时长统计

| 统计项 | 说明 |
|--------|------|
| 28天飞行时长 | 当前周期飞行小时数 / 上限(190小时) |
| 14天飞行时长 | 当前周期飞行小时数 / 上限(95小时) |
| 7天执勤时长 | 当前周期执勤小时数 / 上限(55小时) |
| 本月时长 | 当月累计飞行时长 |
| 本周时长 | 本周累计飞行时长 |
| 累计飞行次数 | 本周期飞行班次 |
| 模拟机时长 | 本周期模拟机训练小时数 |
| 地面培训时长 | 本周期地面培训小时数 |
| Standby次数 | 本周期待命次数 |
| Standby时长 | 本周期待命总小时数 |
| 跨时区时长 | 跨时区飞行时长（需从上限中扣除8小时） |

**飞行时长周期：**

| 周期 | 上限 | 说明 |
|------|------|------|
| 28天 | 190小时 | 民航局规定上限 |
| 28天（跨时区） | 182小时 | 跨时区飞行减少8小时 |
| 14天 | 95小时 | 民航局规定上限 |
| 14天（跨时区） | 87小时 | 跨时区飞行减少8小时 |
| 7天 | 55小时 | 民航局规定上限 |
| 7天（跨时区） | 47小时 | 跨时区飞行减少8小时 |

**跨时区航线识别：**

| 航线 | 时差 | 是否跨时区 |
|------|------|------------|
| 澳门→台北 | 0小时 | 否 |
| 澳门→首尔 | +1小时 | 否 |
| 澳门→新加坡 | +0小时 | 否 |
| 澳门→大阪 | +1小时 | 否 |
| 澳门→迪拜 | +4小时 | 否 |
| 澳门→洛杉矶 | -16小时 | 是 |
| 澳门→纽约 | -13小时 | 是 |

> 根据民航局规定，跨时区飞行（时差≥6小时）时，28天最大飞行时间减少8小时。

### 2.6 执勤日历

| 功能 | 说明 |
|------|------|
| 月视图 | 展示本月执勤日历 |
| 执勤详情 | 点击查看某日执勤详情 |
| 休息标记 | 标记休息日、请假等 |

---

## 3. 资质状态计算规则

### 3.1 分级预警状态

| 预警等级 | 提前天数 | 颜色标识 | 说明 |
|----------|----------|----------|------|
| 紧急 | 7天内过期 | 🔴 红色 | 立即处理 |
| 警告 | 15天内过期 | 🟠 橙色 | 尽快处理 |
| 提醒 | 30天内过期 | 🟡 黄色 | 提前准备 |
| 超期预警 | 30-60天 | 🟠 橙色 | 超过30天但不到60天 |
| 正常 | 30天以上 | 🟢 绿色 | 正常状态 |
| 已过期 | 已过有效期 | 🔴 红色 | 需立即处理 |

### 3.2 飞行时长预警规则

| 预警等级 | 剩余可飞时长 | 颜色标识 |
|----------|--------------|----------|
| 安全 | > 20小时 | 绿色 |
| 提醒 | 10-20小时 | 黄色 |
| 警告 | 5-10小时 | 橙色 |
| 紧急 | < 5小时 | 红色 |
| 超限 | 已超限 | 红色+阻断 |

### 3.3 90天Recency规则

```javascript
function calculateRecencyStatus(lastFlightDate, takeoffs, landings) {
    const today = new Date();
    const lastFlight = new Date(lastFlightDate);
    const diffDays = Math.ceil((today - lastFlight) / (1000 * 60 * 60 * 24));

    if (diffDays > 90) {
        return { status: 'expired', message: '90天Recency已过期' };
    } else if (takeoffs < 3 || landings < 3) {
        return { status: 'warning', message: '90天内起降次数不足' };
    } else if (diffDays > 80) {
        return { status: 'attention', message: '90天Recency即将过期' };
    } else {
        return { status: 'valid', message: '90天Recency有效' };
    }
}
```

### 3.4 Conduct 10 Checks规则

| 项目 | 说明 |
|------|------|
| 要求 | 12个月内完成10次检查 |
| 计算方式 | 滚动计算12个月 |
| 状态 | 完成≥10次为正常，否则预警 |

---

## 4. 界面原型

### 4.1 机组信息页

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│      ✈                              全球通货运排班系统                           │
│                            GLOBAL CREW SCHEDULING                                │
│                                                                                  │
├──────────────┬────────────────────────────────────────────────────────────────────┤
│              │                                                                     │
│  📊 首页     │   机组资源中心 > 机组信息                                            │
│              │   ─────────────────────────────────────────────────────────────   │
│  👥 机组资源中心│                                                                     │
│    ├机组信息│   机组类型：[☐机长 ☐副驾驶 ☐替补]  状态：[▼全部]  基地：[▼澳门] │
│    ├资质证照│   关键字：____________________  [搜索] [重置]                     │
│    └培训记录│                                                [新增] [导入] [导出] [刷新] │
│              │   ─────────────────────────────────────────────────────────────   │
│  ✈ 航班运行中心 │   ☐ 全选  序号 │ 工号 │ 姓名 │类型│资质│累计飞行│7天执勤│...│操作 │
│    ├航班列表│   ──────────────────────────────────────────────────────────────── │
│    ├航线管理 │   ☐    1  │ C001 │ 张三 │机长│队长│42h/190h│52h/55h│...│查看 编辑 删除 │
│    └飞机档案│   ☐    2  │ C002 │ 李四 │机长│队长│42h/190h│52h/55h│...│查看 编辑 删除 │
│              │   ☐    3  │ C003 │ 王五 │机长│队长│40h/190h│50h/55h│...│查看 编辑 删除 │
│  📅 排班管理 │   ...                                                                     │
│              │                        < 1 2 ... 11 >   每页[20▼]条  共11条       │
│  ✅ 校验与发布│                                                                     │
│    ├校验规则│                                                                     │
│    ├问题处理│                                                                     │
│    └报告导出│                                                                     │
│              │                                                                     │
│  📊 统计报表│                                                                     │
│    ├统计报表│                                                                     │
│    └数据导出│                                                                     │
│              │                                                                     │
│  ⚙️ 系统设置│                                                                     │
│    ├基础配置│                                                                     │
│    ├账号管理│                                                                     │
│    └规则配置│                                                                     │
└──────────────┴────────────────────────────────────────────────────────────────────┘
```

### 4.2 新增/编辑机组弹窗

```
┌───────────────────────────────────────────────────────────────┐
│ 新增机组                                                    [×]    │
├───────────────────────────────────────────────────────────────┤
│ 【基本信息】                                                       │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ 工号：[C008__] *│  │ 姓名：[________] *│                    │
│  └─────────────────┘  └─────────────────┘                       │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ 性别：[○男 ●女]│  │ 出生日期：[____] *│                    │
│  └─────────────────┘  └─────────────────┘                       │
│ 【职位信息】                                                       │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │机组类型：[▼机长]│  │ 资质等级：[▼队长]│                    │
│  └─────────────────┘  └─────────────────┘                       │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ 基地：[▼澳门__]│  │ 入职日期：[____] *│                    │
│  └─────────────────┘  └─────────────────┘                       │
│ 【联系方式】                                                       │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ 手机：[________] *│  │ 邮箱：[________] │                    │
│  └─────────────────┘  └─────────────────┘                       │
│  ┌───────────────────────────────────────┐                      │
│  │ 紧急联系人：[____] 关系：[__] 电话：[________]            │
│  └───────────────────────────────────────┘                      │
│                                                               │
│                              [取消]  [确定]                   │
└───────────────────────────────────────────────────────────────┘
```

### 4.3 机组详情页

```
┌───────────────────────────────────────────────────────────────┐
│ 机组详情                                              [返回列表]  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ 【基本信息】                  │  │ 【飞行时长统计】             │  │
│  │ 工号：C001                     │  │ 28天飞行：42h / 190h [███░░]│  │
│  │ 姓名：张三                     │  │ 7天执勤：52h / 55h   [█████░]│  │
│  │ 类型：机长                      │  │ 本月班次：13次                │  │
│  │ 资质等级：队长                  │  │ 模拟机：2h                    │  │
│  │ 基地：澳门                      │  │ 地面培训：4h                  │  │
│  │ 状态：飞行执勤                  │  └─────────────────────────────┘  │
│  │ 入职：2020-01-15              │                                    │
│  └─────────────────────────────┘                                    │
│                                                               │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ 【证照信息】                  │  │ 【体检信息】                  │  │
│  │ 执照类型：航线执照           │  │ 体检类型：I类                 │  │
│  │ 执照编号：A12345678         │  │ 体检机构：民航医院            │  │
│  │ 有效期：2027-01-15 (有效)   │  │ 有效期：2026-08-15 (有效)   │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 【培训记录】                              [+ 新增培训]       │    │
│  │ ─────────────────────────────────────────────────────────── │    │
│  │ 类型    │ 课程       │ 日期      │ 时长 │ 下次培训        │    │
│  │ 模拟机  │ B737复训   │ 2026-03  │ 4h   │ 2026-09       │    │
│  │ 地面   │ 应急培训   │ 2026-02  │ 8h   │ 2026-08       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 【执勤日历】  2026年4月                                     │    │
│  │ ◀  [周一] [周二] [周三] [周四] [周五] [周六] [周日]  ▶    │    │
│  │   [班]    [班]    [班]    [休]    [班]    [班]    [班]   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                               │
│                               [编辑]  [删除]  [资质预警设置]          │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. 数据结构

### 5.1 机组表 (crew)

| 字段 | 类型 | 说明 |
|------|------|------|
| crew_id | bigint | 主键 |
| crew_code | varchar(20) | 工号，唯一 |
| crew_name | varchar(50) | 姓名 |
| gender | char(1) | 性别：0男 1女 |
| birth_date | date | 出生日期 |
| crew_type | varchar(20) | 类型：captain/copilot/standby |
| qualification_level | varchar(20) | 资质等级：leader/route/standby |
| base | varchar(50) | 基地 |
| hire_date | date | 入职日期 |
| phone | varchar(20) | 联系电话 |
| emergency_contact | varchar(100) | 紧急联系人 |
| emergency_phone | varchar(20) | 紧急联系电话 |
| email | varchar(100) | 邮箱 |
| flight_hours_28d | decimal(10,2) | 28天飞行时长（小时） |
| flight_hours_14d | decimal(10,2) | 14天飞行时长（小时） |
| flight_hours_7d | decimal(10,2) | 7天飞行时长（小时） |
| flight_count | int | 本周期飞行次数 |
| sim_hours | decimal(5,2) | 模拟机时长 |
| ground_training_hours | decimal(5,2) | 地面培训时长 |
| standby_count | int | Standby次数 |
| standby_hours | decimal(5,2) | Standby时长 |
| last_rest_end | datetime | 最近休息结束时间 |
| compliance_status | varchar(20) | 合规状态：normal/warning/violation |
| status | char(1) | 状态：0正常 1禁用 |
| remark | varchar(500) | 备注 |
| create_by | varchar(64) | 创建者 |
| create_time | datetime | 创建时间 |
| update_by | varchar(64) | 更新者 |
| update_time | datetime | 更新时间 |

### 5.2 执照表 (crew_license)

| 字段 | 类型 | 说明 |
|------|------|------|
| license_id | bigint | 主键 |
| crew_id | bigint | 机组ID，关联crew表 |
| license_type | varchar(20) | 执照类型：CPL/ATPL |
| license_no | varchar(100) | 执照编号 |
| issuing_authority | varchar(200) | 颁发机构 |
| issue_date | date | 颁发日期 |
| expiry_date | date | 有效日期 |
| renew_advance_days | int | 续期提前天数，默认30天 |
| regulation_reference | varchar(200) | 法规依据 |
| attachment_url | varchar(500) | 附件URL |
| status | varchar(20) | 状态：valid/attention/warning/urgent/expired |
| remark | varchar(500) | 备注 |
| create_by | varchar(64) | 创建者 |
| create_time | datetime | 创建时间 |
| update_by | varchar(64) | 更新者 |
| update_time | datetime | 更新时间 |

### 5.3 体检表 (crew_medical)

| 字段 | 类型 | 说明 |
|------|------|------|
| medical_id | bigint | 主键 |
| crew_id | bigint | 机组ID，关联crew表 |
| medical_no | varchar(50) | 体检编号 |
| medical_type | varchar(20) | 体检类型：CLASS_I/CLASS_II/FIRST/ADDITIONAL |
| exam_date | date | 体检日期 |
| exam_hospital | varchar(200) | 体检机构 |
| chief_physician | varchar(50) | 主检医师 |
| exam_result | char(1) | 结果：0合格 1不合格 2待定 |
| restriction | varchar(500) | 限制条款 |
| valid_from | date | 有效起始日期 |
| valid_to | date | 有效截止日期 |
| extension_approved | bit | 是否获得延长批准 |
| extension_days | int | 延长天数，最多45天 |
| regulation_reference | varchar(200) | 法规依据：AC/PEL/004R02 |
| attachment_url | varchar(500) | 附件URL |
| status | varchar(20) | 状态：valid/attention/warning/urgent/expired |
| remark | varchar(500) | 备注 |
| create_by | varchar(64) | 创建者 |
| create_time | datetime | 创建时间 |
| update_by | varchar(64) | 更新者 |
| update_time | datetime | 更新时间 |

### 5.4 语言能力表 (crew_language)

| 字段 | 类型 | 说明 |
|------|------|------|
| language_id | bigint | 主键 |
| crew_id | bigint | 机组ID，关联crew表 |
| proficiency_level | varchar(20) | 语言等级：Level 4/Level 5 |
| exam_result | varchar(50) | 考试成绩 |
| exam_date | date | 考试日期 |
| expiry_date | date | 有效日期 |
| next_exam_advance_days | int | 下次考试申请提前天数 |
| regulation_reference | varchar(200) | 法规依据：AC/PEL/002R01 |
| attachment_url | varchar(500) | 附件URL |
| status | varchar(20) | 状态：valid/attention/warning/urgent/expired |
| create_by | varchar(64) | 创建者 |
| create_time | datetime | 创建时间 |
| update_by | varchar(64) | 更新者 |
| update_time | datetime | 更新时间 |

### 5.5 机型签注表 (crew_aircraft_type)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| crew_id | bigint | 机组ID |
| aircraft_type | varchar(20) | 机型，如 B737/B747/A330 |
| authorized_date | date | 授权日期 |
| expire_date | date | 有效期（如有） |
| status | varchar(20) | 状态 |

### 5.6 培训记录表 (crew_training)

| 字段 | 类型 | 说明 |
|------|------|------|
| training_id | bigint | 主键 |
| crew_id | bigint | 机组ID，关联crew表 |
| crew_role | varchar(20) | 人员角色：CP/CP(RHS)/LTC/I-SIM/I/E-SIM/I/E-SIM&A/C |
| training_item | varchar(100) | 训练项目 |
| training_type | varchar(20) | 训练类型：SIM/Ground School/Flight |
| training_date | date | 训练日期 |
| expiry_date | date | 有效日期 |
| training_location | varchar(200) | 训练地点 |
| instructor | varchar(100) | 教员 |
| result | varchar(20) | 结果：通过/未通过 |
| regulation_reference | varchar(200) | 法规依据 |
| remark | varchar(500) | 备注 |
| status | varchar(20) | 状态：valid/attention/warning/urgent/expired |
| create_by | varchar(64) | 创建者 |
| create_time | datetime | 创建时间 |
| update_by | varchar(64) | 更新者 |
| update_time | datetime | 更新时间 |

### 5.7 90天Recency记录表 (crew_recency)

| 字段 | 类型 | 说明 |
|------|------|------|
| recency_id | bigint | 主键 |
| crew_id | bigint | 机组ID，关联crew表 |
| last_flight_date | date | 最后飞行日期 |
| takeoffs | int | 起飞次数 |
| landings | int | 着陆次数 |
| status | varchar(20) | 状态：valid/attention/warning/expired |
| create_by | varchar(64) | 创建者 |
| create_time | datetime | 创建时间 |
| update_by | varchar(64) | 更新者 |
| update_time | datetime | 更新时间 |

### 5.8 Conduct 10 Checks记录表 (crew_conduct_checks)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| crew_id | bigint | 机组ID，关联crew表 |
| tests_count | int | 12个月内完成的检查次数 |
| cycle_start_date | date | 统计周期起始日 |
| cycle_end_date | date | 统计周期结束日 |
| last_test_date | date | 最后一次测试日期 |
| status | varchar(20) | 状态：valid/warning |
| create_by | varchar(64) | 创建者 |
| create_time | datetime | 创建时间 |
| update_by | varchar(64) | 更新者 |
| update_time | datetime | 更新时间 |

### 5.9 飞行时长表 (crew_flight_hours)

| 字段 | 类型 | 说明 |
|------|------|------|
| hours_id | bigint | 主键 |
| crew_id | bigint | 机组ID，关联crew表 |
| period_start | date | 统计周期起始日 |
| hours_28d | decimal(10,2) | 28天飞行时长（小时） |
| hours_14d | decimal(10,2) | 14天飞行时长（小时） |
| hours_7d | decimal(10,2) | 7天飞行时长（小时） |
| hours_month | decimal(10,2) | 本月飞行时长（小时） |
| hours_week | decimal(10,2) | 本周飞行时长（小时） |
| hours_cross_timezone | decimal(10,2) | 跨时区飞行时长（小时） |
| updated_time | datetime | 最后更新时间 |

---

## 6. API 接口

### 6.1 机组资源中心

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/list | GET | 机组分页列表（支持筛选、搜索、排序） |
| /api/crew/{id} | GET | 机组详情 |
| /api/crew | POST | 新增机组 |
| /api/crew | PUT | 修改机组 |
| /api/crew/{id} | DELETE | 删除机组 |
| /api/crew/export | GET | 导出机组Excel |
| /api/crew/import | POST | 导入机组Excel |
| /api/crew/{id}/status | PUT | 修改机组状态 |
| /api/crew/stats/{id} | GET | 获取飞行时长统计 |
| /api/crew/calendar/{id} | GET | 获取执勤日历 |

### 6.2 执照管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/license/list | GET | 执照列表（按机组ID筛选） |
| /api/crew/license/{id} | GET | 执照详情 |
| /api/crew/license | POST | 新增执照 |
| /api/crew/license | PUT | 修改执照 |
| /api/crew/license/{id} | DELETE | 删除执照 |

### 6.3 体检管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/medical/list | GET | 体检记录列表 |
| /api/crew/medical/{id} | GET | 体检记录详情 |
| /api/crew/medical | POST | 新增体检记录 |
| /api/crew/medical | PUT | 修改体检记录 |
| /api/crew/medical/{id} | DELETE | 删除体检记录 |
| /api/crew/medical/expiring | GET | 获取即将到期体检列表 |
| /api/crew/medical/warnings | GET | 获取体检预警列表 |
| /api/crew/medical/urgent | GET | 获取7天内过期体检 |
| /api/crew/medical/status/{crewId} | GET | 获取机组体检状态 |

### 6.4 语言能力管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/language/list | GET | 语言能力列表 |
| /api/crew/language/{id} | GET | 语言能力详情 |
| /api/crew/language | POST | 新增语言能力 |
| /api/crew/language | PUT | 修改语言能力 |
| /api/crew/language/{id} | DELETE | 删除语言能力 |

### 6.5 机型签注

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/{crewId}/aircraft-type/list | GET | 签注列表 |
| /api/crew/aircraft-type | POST | 新增签注 |
| /api/crew/aircraft-type | PUT | 修改签注 |
| /api/crew/aircraft-type/{id} | DELETE | 删除签注 |

### 6.6 培训记录管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/training/list | GET | 培训记录列表 |
| /api/crew/training/{id} | GET | 培训记录详情 |
| /api/crew/training | POST | 新增培训记录 |
| /api/crew/training | PUT | 修改培训记录 |
| /api/crew/training/{id} | DELETE | 删除培训记录 |

### 6.7 90天Recency

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/recency/{crewId} | GET | 获取90天Recency状态 |
| /api/crew/recency | POST | 记录/更新90天Recency |
| /api/crew/recency/check | POST | 校验90天Recency |

### 6.8 Conduct 10 Checks

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/conduct-checks/{crewId} | GET | 获取Conduct 10 Checks状态 |
| /api/crew/conduct-checks | POST | 记录检查次数 |
| /api/crew/conduct-checks/stats | GET | 获取统计信息 |

### 6.9 资质预警

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/qualification/warnings | GET | 获取所有资质预警列表 |
| /api/crew/qualification/expiring | GET | 获取30天内即将过期资质 |
| /api/crew/qualification/urgent | GET | 获取7天内过期资质 |
| /api/crew/qualification/check | POST | 批量校验证资有效性 |

### 6.10 飞行时长

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/hours/{crewId} | GET | 获取机组飞行时长统计 |
| /api/crew/hours/{crewId}/detail | GET | 获取飞行时长详情 |
| /api/crew/hours/record | POST | 手动录入飞行记录 |
| /api/crew/hours/record/{id} | PUT | 修改飞行记录 |
| /api/crew/hours/record/{id} | DELETE | 删除飞行记录 |
| /api/crew/hours/warnings | GET | 获取飞行时长预警列表 |
| /api/crew/hours/check/{crewId} | GET | 校验机组飞行时长合规性 |
| /api/crew/hours/batchUpdate | POST | 批量更新飞行时长（从排班同步） |
| /api/crew/hours/records | GET | 获取机组飞行记录明细 |
| /api/crew/hours/records/export | GET | 导出飞行记录 |

### 6.11 附件上传

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/crew/qualification/upload | POST | 上传资质附件 |
| /api/crew/qualification/attachment/{id} | GET | 下载资质附件 |

---

## 7. 业务流程

### 7.1 新增机组流程

```
管理员点击"新增机组"
    ↓
弹出机组档案表单弹窗
    ↓
填写基本信息（工号、姓名、性别、出生日期）
    ↓
选择职位信息（机组类型、资质等级、基地、入职日期）
    ↓
填写联系方式（手机、邮箱、紧急联系人）
    ↓
系统校验：
  - 工号唯一性
  - 手机号格式（11位数字）
  - 必填项非空
  - 出生日期需年满18岁
    ↓
校验通过 → 保存档案
    ↓
自动创建关联的资质证照、体检、培训记录（空记录）
    ↓
返回成功提示
    ↓
刷新机组信息
```

### 7.2 资质预警流程

```
系统每日自动检查资质到期
    ↓
发现30天内到期
    ↓
发送预警通知（站内信/短信）
    ↓
更新预警列表
    ↓
提醒管理员和处理人
```

### 7.3 排班资质校验流程

```
排班时选择机组
    ↓
系统自动校验资质：
  - 执照是否有效
  - 体检是否有效（考虑延长批准）
  - 语言能力是否有效
  - 机型是否匹配
  - 相关复训是否在有效期内
  - 90天Recency是否满足
    ↓
有资质问题 → 禁止排班，提示原因
    ↓
资质全部通过 → 允许排班
```

### 7.4 飞行时长自动汇总流程

```
每日凌晨定时任务触发
    ↓
从排班表中汇总各机组飞行时长
    ↓
计算各周期飞行时长：
  - 28天 = sum(近28天所有航班飞行时长)
  - 14天 = sum(近14天所有航班飞行时长)
  - 7天 = sum(近7天所有航班飞行时长)
    ↓
计算跨时区飞行时长（时差≥6小时的航线）
    ↓
更新 crew_flight_hours 表
    ↓
触发飞行时长预警检查
```

### 7.5 90天Recency校验流程

```
飞行员执行飞行任务后
    ↓
记录本次飞行的起降次数
    ↓
更新90天Recency记录
    ↓
系统计算：
  - 最后飞行日期
  - 90天内总起降次数
  - 剩余有效天数
    ↓
排班时自动校验Recency状态
    ↓
如有异常 → 提示并阻止排班
```

---

## 8. 异常处理

| 场景 | 处理方式 |
|------|----------|
| 工号重复 | 提示"工号已存在"，不允许保存 |
| 手机号重复 | 提示"手机号已存在"，不允许保存 |
| 删除有排班关联的机组 | 提示"该机组有排班记录，无法删除" |
| 证照已过期 | 禁止新增，提示"证照已过期" |
| 证照30天内到期 | 黄色预警提示，可继续保存 |
| 体检过期后仍排班 | 弹出警告，管理员可强制确认 |
| 90天Recency过期后安排飞行 | 阻止排班，提示"需重新完成90天Recency要求" |
| Conduct 10 Checks不足安排任务 | 提示"12个月内已完成X/10次检查，需再完成Y次" |
| 导入Excel格式错误 | 提示具体错误行和原因 |
| 飞行时长超过上限 | 红色阻断，排班系统禁止分配更多航班 |
| 跨时区飞行时长未扣除 | 系统自动从28天上限中扣除8小时 |

---

## 9. 权限控制

### 9.1 按钮权限

| 权限标识 | 说明 |
|----------|------|
| crew:crew:add | 新增机组 |
| crew:crew-edit | 编辑机组 |
| crew:crew:remove | 删除机组 |
| crew:crew:export | 导出机组 |
| crew:crew:import | 导入机组 |
| crew:license:add | 新增执照 |
| crew:license:edit | 编辑执照 |
| crew:license:remove | 删除执照 |
| crew:license:upload | 上传附件 |
| crew:medical:add | 新增体检 |
| crew:medical:edit | 编辑体检 |
| crew:medical:remove | 删除体检 |
| crew:medical:export | 导出体检记录 |
| crew:language:add | 新增语言能力 |
| crew:language:edit | 编辑语言能力 |
| crew:language:remove | 删除语言能力 |
| crew:training:add | 新增培训 |
| crew:training:edit | 编辑培训 |
| crew:training:remove | 删除培训 |
| crew:recency:edit | 编辑90天Recency |
| crew:conduct:edit | 编辑Conduct 10 Checks |
| crew:hours:view | 查看飞行时长 |
| crew:hours:edit | 编辑飞行时长 |
| crew:hours:record | 录入飞行记录 |
| crew:hours:export | 导出飞行时长 |

### 9.2 数据权限

| 角色 | 数据权限 |
|------|----------|
| admin | 全部机组数据 |
| roster | 全部机组数据（只读部分字段） |
| crew | 仅本人数据（全读，只读） |
| oc | 本航线机组数据 |
| monitor | 全部（只读） |

---

## 10. 验收标准

### 10.1 功能验收

- [ ] 机组信息分页、筛选、搜索正常
- [ ] 新增机组保存成功
- [ ] 编辑机组保存成功
- [ ] 删除机组成功（逻辑删除）
- [ ] 证照增删改查正常
- [ ] 体检增删改查正常
- [ ] 语言能力增删改查正常
- [ ] 机型签注增删改查正常
- [ ] 培训记录增删改查正常
- [ ] 飞行时长统计正确
- [ ] 执勤日历显示正确
- [ ] 资质预警功能正常
- [ ] 90天Recency校验正常
- [ ] Conduct 10 Checks滚动计算正常
- [ ] Excel导入导出正常

### 10.2 界面验收

- [ ] 列表布局整齐，横向滚动正常
- [ ] 状态标签颜色区分清晰（绿/黄/橙/红）
- [ ] 时长进度条显示正确
- [ ] 翻页组件正常
- [ ] 表单校验提示清晰
- [ ] 法规依据字段正确显示

### 10.3 性能要求

| 指标 | 要求 |
|------|------|
| 首屏加载 | < 1秒 |
| 筛选查询 | < 500ms |
| 排序切换 | < 500ms |
| 分页切换 | < 300ms |
| 证照列表加载 | < 500ms |
| 证照保存 | < 500ms |
| 附件上传(5MB) | < 3s |
| 批量校验(100条) | < 2s |
| 预警计算 | < 1s |
| 时长统计加载 | < 500ms |
| 批量汇总(11人) | < 5s |

---

## 11. 待确认事项

- [ ] 机组编制数量是否可配置（当前11人）？
- [ ] 是否需要支持附件上传（证照扫描件）？
- [ ] 资质预警是否需要微信/短信通知？
- [ ] 是否需要支持批量编辑功能？
- [ ] 体检预警是否需要自动发送邮件/短信通知？
- [ ] 是否支持体检到期自动拦截排班？
- [ ] Conduct 10 Checks的滚动计算是否需要自动清理过期记录？
- [ ] 是否需要对接民航局执照系统自动校验？

---

## 12. 后续依赖

- 机组资源中心是排班工作台的核心数据源
- 机组资质状态被校验与发布能力引用
- 机组飞行时长被统计报表模块引用
- 资质过期自动预警被校验与发布能力引用



