# DHTMLX Gantt 甘特图制作与设计技能

> 使用边界：本文件为旧包/历史导入材料，仅可参考甘特图视觉密度和交互样式；不得作为正式技术选型、功能需求、API、数据模型、算法或验收依据。当前正式甘特底座以主 FRD 和 ARCHITECTURE 中的“`vis-timeline` 官方 `Timeline` + 展示适配层”为准。

> 基于 DHTMLX Gantt v9.1 官方文档与 GitHub 仓库研究生成
> 来源：dhtmlx.com、docs.dhtmlx.com、github.com/DHTMLX/gantt
> 生成日期：2026-04-16

---

## 一、概述

DHTMLX Gantt 是一个开源 JavaScript 甘特图库（GPL v2），提供丰富的配置选项和事件处理机制，支持高度定制。

### 核心能力矩阵

| 能力 | GPL 标准版 | PRO 版 |
|------|-----------|--------|
| 任务 CRUD + 树形结构 | ✅ | ✅ |
| 4 种依赖链接类型 | ✅ | ✅ |
| 拖拽调整日期/工期 | ✅ | ✅ |
| 7 种预定义皮肤 | ✅ | ✅ |
| 时间刻度自定义 | ✅ | ✅ |
| 自动调度 | ❌ | ✅ |
| 关键路径 | ❌ | ✅ |
| 资源管理 | ❌ | ✅ |
| 基线/截止日期标记 | ❌ | ✅ |
| 撤销/重做 | ❌ | ✅ |
| Excel/Project 导出 | ❌ | ✅ |

---

## 二、初始化与基础配置

### 2.1 引入文件

```html
<!-- 引入 CSS 和 JS -->
<link rel="stylesheet" href="dhtmlxgantt.css" type="text/css">
<script src="dhtmlxgantt.js"></script>
```

### 2.2 基础初始化

```html
<div id="gantt_here" style="width:100%; height:100vh;"></div>
```

```js
// 1. 设置日期格式（必须在 init 之前）
gantt.config.date_format = "%Y-%m-%d %H:%i";

// 2. 配置列（左侧表格）
gantt.config.columns = [
    { name: "text",       label: "任务名称",  tree: true, width: "*", resize: true },
    { name: "start_date", label: "开始时间", align: "center" },
    { name: "duration",   label: "工期",     align: "center" },
    { name: "add",       label: "",         width: 40 }  // 添加按钮
];

// 3. 配置时间刻度（顶部 X 轴）
gantt.config.scales = [
    { unit: "month", step: 1, format: "%F, %Y" },   // 上层：月
    { unit: "day",   step: 1, format: "%j, %D" }    // 下层：日
];

// 4. 初始化
gantt.init("gantt_here");

// 5. 加载数据
gantt.parse({
    data: [
        { id: 1, text: "项目 #1", start_date: null, duration: null, parent: 0, progress: 0, open: true },
        { id: 2, text: "任务 #1", start_date: "2025-04-01 00:00", duration: 5, parent: 1, progress: 1 },
        { id: 3, text: "任务 #2", start_date: "2025-04-06 00:00", duration: 2, parent: 1, progress: 0.5 }
    ],
    links: [
        { id: 1, source: 2, target: 3, type: "0" }  // finish-to-start
    ]
});
```

### 2.3 关键配置项

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `date_format` | 日期解析格式 | `"%Y-%m-%d %H:%i"` |
| `columns` | 左侧表格列定义 | 数组，每项含 name/label/width/tree |
| `scales` | 时间刻度配置 | unit/step/format |
| `scale_height` | 刻度区域高度 | `60`（像素） |
| `row_height` | 每行高度 | `40`（像素） |
| `grid_width` | 左侧表格宽度 | `500`（像素） |
| `auto_types` | 自动转换项目/任务类型 | `true` |
| `fit_tasks` | 自动扩展时间范围 | `true` |
| `open_tree_initially` | 初始展开所有树节点 | `true` |
| `show_chart` | 显示时间轴区域 | `true` |
| `show_grid` | 显示左侧网格 | `true` |

---

## 三、列（Grid Columns）配置

### 3.1 默认列

默认包含 4 列：`text`（任务名）、`start_date`（开始时间）、`duration`（工期）、`add`（添加按钮）

### 3.2 常用列配置

```js
gantt.config.columns = [
    { name: "wbs",        label: "WBS",      width: 60, template: gantt.getWBSCode },
    { name: "text",       label: "任务名称",  tree: true, width: "*", resize: true },
    { name: "start_date", label: "开始",     align: "center", width: 100 },
    { name: "end_date",   label: "结束",     align: "center", width: 100 },
    { name: "duration",   label: "工期",     align: "center", width: 80 },
    { name: "progress",   label: "进度",     align: "center", width: 80,
      template: function(task) { return Math.round(task.progress * 100) + "%"; } },
    { name: "holder",     label: "负责人",   align: "center", width: 100,
      template: function(task) { return task.holder || "—"; } },
    { name: "add",        label: "",         width: 40 }
];
```

### 3.3 列属性说明

| 属性 | 说明 |
|------|------|
| `name` | 数据字段名，或预设值 `"add"`/`"wbs"` |
| `label` | 列头显示文本 |
| `width` | 列宽，`"*"` 表示自动填充 |
| `tree` | 是否为树形展开列（仅 `text` 列设为 `true`） |
| `resize` | 是否允许拖拽调整宽度 |
| `align` | 单元格文本对齐 `"left"`/`"center"`/`"right"` |
| `min_width` | 最小列宽 |
| `max_width` | 最大列宽 |
| `template` | 自定义渲染函数，接收 task 对象 |

### 3.4 自定义列模板示例

```js
// 带颜色的优先级列
gantt.config.columns = [
    // ... 其他列
    {
        name: "priority",
        label: "优先级",
        width: 80,
        template: function(task) {
            const colors = { high: "#ff6b6b", medium: "#ffd93d", low: "#6bcb77" };
            const p = task.priority || "low";
            return `<span style="color:${colors[p]};font-weight:bold">${p.toUpperCase()}</span>`;
        }
    }
];
```

---

## 四、时间刻度（Scales）配置

### 4.1 基础刻度

```js
// 单刻度：按月显示
gantt.config.scales = [
    { unit: "month", step: 1, format: "%F, %Y" }  // "April, 2026"
];

// 双刻度：上层月 + 下层日
gantt.config.scales = [
    { unit: "month", step: 1, format: "%M %Y" },
    { unit: "day",   step: 1, format: "%j, %D" }  // "16, Thu"
];
```

### 4.2 常用刻度单位

`year` | `quarter` | `month` | `week` | `day` | `hour` | `minute`

### 4.3 季度刻度

```js
gantt.config.scales = [
    { unit: "quarter", step: 1, format: function(date) {
        const q = Math.floor(date.getMonth() / 3) + 1;
        return "Q" + q + " " + date.getFullYear();
    }},
    { unit: "month", step: 1, format: "%M" }
];
```

### 4.4 自定义时间单位

```js
// 定义自定义单位：双周（bi-week）
gantt.date.biweek_start = function(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());  // 回到周日
    return d;
};

gantt.date.add_biweek = function(date, inc) {
    return gantt.date.add(date, inc * 14, "day");
};

gantt.config.scales = [
    { unit: "month", step: 1, format: "%M %Y" },
    { unit: "biweek", step: 1, format: "%d %M" }
];
```

### 4.5 工作时间感知刻度（v9.1 新特性）

```js
// 设置工作时间段（8:00-12:00, 13:00-17:00）
gantt.config.scales = [
    { unit: "month", step: 1, format: "%F, %Y" },
    { unit: "day", step: 1, format: "%d", projection: { source: "fixedHours" } }
];

// 固定列宽（像素）
gantt.config.scales = [
    { unit: "month", step: 1, format: "%F, %Y", column_width: 120 },
    { unit: "day",   step: 1, format: "%j",    column_width: 60 }
];
```

---

## 五、任务与依赖管理

### 5.1 任务数据结构

```js
{
    id: 1,                    // 唯一 ID（必需）
    text: "任务名称",          // 任务文本
    start_date: Date,         // 开始时间
    end_date: Date,          // 结束时间（可选）
    duration: 5,              // 工期（天数）
    parent: 0,                // 父任务 ID（0 表示根）
    progress: 0.5,            // 进度 0~1
    open: true,               // 是否展开（项目节点）
    type: "task",             // 类型："task" | "project" | "milestone"
    color: "#FF0000",         // 自定义颜色
    holder: "张三",           // 自定义字段
    // ... 其他自定义字段
}
```

### 5.2 依赖链接类型

```js
gantt.config.links = {
    finish_to_start: "0",   // A 结束后 B 开始（默认）
    start_to_start: "1",    // A 开始后 B 开始
    finish_to_finish: "2",   // A 结束后 B 结束
    start_to_finish: "3"     // A 开始后 B 结束
};

// 创建链接
gantt.addLink({ id: 1, source: 2, target: 3, type: "0" });

// 删除链接
gantt.deleteLink(linkId);
```

### 5.3 自动调度（PRO）

```js
// 启用插件
gantt.plugins({ auto_scheduling: true });

// 启用自动调度
gantt.config.auto_scheduling = {
    enabled: true,
    gap_behavior: "compress",      // "preserve" | "compress"
    apply_constraints: true,
    move_projects: true,
    show_constraints: false
};
```

### 5.4 拖拽从属任务

```js
// 移动任务时同步移动所有后继任务
gantt.attachEvent("onTaskDrag", function(id, mode, task, original) {
    var diff = task.start_date - original.start_date;
    gantt.eachSuccessor(function(child) {
        child.start_date = new Date(+child.start_date + diff);
        child.end_date   = new Date(+child.end_date + diff);
        gantt.refreshTask(child.id, true);
    });
});
```

### 5.5 任务时间约束（PRO）

```js
// 约束类型：ASAP（越早越好）、ALAP（越晚越好）、SNET（必须开始于）、FNLT（必须结束于）等
gantt.config.constraint_types = [
    { label: "As Soon As Possible", value: "ASAP" },
    { label: "As Late As Possible", value: "ALAP" },
    { label: "Start No Earlier Than", value: "SNET" },
    { label: "Start No Later Than", value: "SNLT" },
    { label: "Finish No Earlier Than", value: "FNET" },
    { label: "Finish No Later Than", value: "FNLT" },
    { label: "Must Start On", value: "MSO" },
    { label: "Must Finish On", value: "MFO" }
];
```

---

## 六、样式与皮肤

### 6.1 预定义皮肤（8 种）

```js
gantt.skin = "dark";     // 默认 Terrace
// 可选：dark | material | contrast_black | contrast_white |
//       skyblue | meadow | broadway
```

### 6.2 CSS 变量自定义（v9.0+）

```css
:root {
    /* 主题 */
    --dhx-gantt-theme: terrace;

    /* 字体 */
    --dhx-gantt-font-family: Inter, Helvetica, Arial, sans-serif;
    --dhx-gantt-font-size: 14px;

    /* 刻度 */
    --dhx-gantt-scale-background: #8E8E8E;
    --dhx-gantt-scale-color: #FFF;
    --dhx-gantt-base-colors-border: #DFE0E1;

    /* 任务 */
    --dhx-gantt-task-background: #3db9d3;
    --dhx-gantt-task-color: #FFFFFF;
    --dhx-gantt-project-background: #7C9900;

    /* 选中 */
    --dhx-gantt-base-colors-select: #EFF3FF;

    /* 链接 */
    --dhx-gantt-link-color: #555;
}
```

### 6.3 关键 CSS 选择器

| 区域 | 选择器 | 说明 |
|------|--------|------|
| 网格容器 | `.gantt_grid` | 左侧表格容器 |
| 网格表头 | `.gantt_grid_scale` `.gantt_grid_head_cell` | 列头 |
| 网格行 | `.gantt_row` `.gantt_row.odd` | 奇偶行 |
| 时间轴容器 | `.gantt_task_scale` | 顶部刻度 |
| 任务条 | `.gantt_task_line` | 任务条形 |
| 项目条 | `.gantt_task_line.gantt_project` | 项目条 |
| 任务文本 | `.gantt_task_content` | 任务条内文字 |
| 链接线 | `.gantt_task_link` `.gantt_link_arrow` | 依赖箭头 |
| 周末高亮 | `.gantt-timeline__cell--weekend` | 周末单元格 |

### 6.4 自定义任务条样式

```css
/* 隐藏任务条内文字 */
.gantt_task_line .gantt_task_content { display: none; }

/* 右侧显示标签 */
.gantt_task_line { position: relative; }
.gantt_task_line::after {
    content: attr(data-task-text);
    position: absolute;
    left: 100%;
    margin-left: 8px;
    white-space: nowrap;
}
```

### 6.5 模板函数设置样式

```js
// 根据进度设置不同颜色
gantt.templates.task_class = function(start, end, task) {
    if (task.progress > 0.8) return "task-high-progress";
    if (task.progress > 0.5) return "task-medium-progress";
    return "task-low-progress";
};

// 周末高亮
gantt.templates.timeline_cell_class = function(task, date) {
    if (date.getDay() === 0 || date.getDay() === 6) {
        return "gantt-timeline__cell--weekend";
    }
    return "";
};
```

### 6.6 自定义皮肤（进阶）

```bash
# 从源码构建自定义皮肤
# 1. 复制现有皮肤目录
cp -r codebase/sources/less/src/themes/terrace \
       codebase/sources/less/src/themes/custom

# 2. 修改 variables.less 中的变量
```

```css
/* 3. 在 :root[data-gantt-theme='custom'] 中定义 */
:root[data-gantt-theme='custom'] {
    --dhx-gantt-theme: custom;
    --dhx-gantt-task-background: #FF6B6B;
    --dhx-gantt-project-background: #4ECDC4;
}
```

---

## 七、高级元素

### 7.1 添加工具提示（Tooltip）

```js
gantt.plugins({ tooltip: true });

gantt.templates.tooltip_text = function(start, end, task) {
    return `<b>任务：</b>${task.text}<br>` +
           `<b>开始：</b>${gantt.templates.format_date(start)}<br>` +
           `<b>工期：</b>${task.duration} 天<br>` +
           `<b>进度：</b>${Math.round(task.progress * 100)}%`;
};
```

### 7.2 添加基线（Baseline，PRO）

```js
gantt.plugins({ baseline: true });

gantt.config.baselines = {
    render: "bar"  // "bar" | "skeleton"
};

// 通过 addTaskLayer 添加基线渲染
gantt.addTaskLayer(function(task) {
    if (task.baseline) {
        var el = document.createElement("div");
        el.className = "gantt_baseline";
        el.style.cssText = "...";
        return el;
    }
    return false;
});
```

### 7.3 当前日期标记线（Marker）

```js
gantt.plugins({ marker: true });

gantt.plugins({
    marker: true
});

gantt.config.marker = {
    date_formatter: function(date) {
        return gantt.templates.format_date(date);
    }
};

// 添加"今天"标记
var today = new Date();
gantt.addMarker({
    start_date: today,
    css: "today_marker",
    text: "今天"
});
```

### 7.4 自定义任务层（PRO）

```js
// 添加自定义显示元素（如里程碑标记）
gantt.addTaskLayer(function(task) {
    if (task.type === "milestone") {
        var el = document.createElement("div");
        el.className = "milestone_marker";
        el.innerHTML = "◆";
        return el;
    }
    return false;
});
```

---

## 八、事件系统

### 8.1 常用事件

| 事件 | 触发时机 | 典型用途 |
|------|----------|----------|
| `onBeforeTaskChanged` | 任务拖拽前，可取消 | 验证、权限控制 |
| `onTaskDrag` | 任务拖拽中（每帧） | 同步移动从属任务 |
| `onAfterTaskDrag` | 任务拖拽结束后 | 保存历史、触发计算 |
| `onTaskClick` | 点击任务 | 打开详情弹窗 |
| `onTaskDblClick` | 双击任务 | 打开任务编辑表单 |
| `onLinkClick` | 点击链接 | 编辑链接属性 |
| `onLinkDblClick` | 双击链接 | 编辑滞后量（lag） |
| `onGanttScroll` | 滚动时 | 动态加载更多数据 |
| `onBeforeAutoSchedule` | 自动调度前 | 自定义调度逻辑 |
| `onParse` | 数据解析前 | 数据预处理 |

### 8.2 任务变更监听

```js
gantt.attachEvent("onAfterTaskDrag", function(id, mode, e) {
    var modes = gantt.config.drag_mode;
    if (mode === modes.move || mode === modes.resize) {
        console.log("任务 " + id + " 已更新");
        // 保存到服务器
        saveTaskToServer(gantt.getTask(id));
    }
});

// 阻止特定任务拖拽
gantt.attachEvent("onBeforeTaskDrag", function(id, mode, e) {
    var task = gantt.getTask(id);
    if (task.status === "locked") return false;  // 锁定任务不可拖拽
    return true;
});
```

---

## 九、国际化与本地化

### 9.1 配置中文环境

```js
gantt.config.date_format = "%Y-%m-%d %H:%i";
gantt.config.months_short = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
gantt.config.months_full = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
gantt.config.days_min = ["日","一","二","三","四","五","六"];

// 自定义 label
gantt.locale.labels = {
    label: "任务名称",
    start: "开始时间",
    end: "结束时间",
    duration: "工期",
    add_task: "添加任务",
    save_btn: "保存",
    cancel_btn: "取消",
    delete_btn: "删除"
};
```

---

## 十、性能优化

### 10.1 大数据集优化

```js
// 启用智能渲染（只渲染可见区域）
gantt.config.smart_rendering = true;

// 设置合适的容器尺寸
gantt.config.autosize = "y";           // 自动适应高度
gantt.config.autosize_min_width = 800; // 最小宽度

// 分页加载
gantt.config branch_loading = true;    // 动态加载子任务
```

### 10.2 无限滚动

```js
gantt.attachEvent("onGanttScroll", function(left, top) {
    var state = gantt.getState();
    var lastVisible = state.max_date;

    // 检测是否滚动到了最右边
    if (left > gantt.$task_data.offsetWidth - 500) {
        // 扩展日期范围并加载更多数据
        gantt.config.end_date = gantt.date.add(gantt.config.end_date, 30, "day");
        loadMoreData();
    }
});
```

---

## 十一、与主流框架集成

### 11.1 React

```tsx
import Gantt from '@dhtmlx/trial-react-gantt';
import '@dhtmlx/trial-react-gantt/dist/react-gantt.css';

const config = {
    grid_width: 500,
    scale_height: 90,
    scales: [
        { unit: "year",  step: 1, date: "%Y" },
        { unit: "month", step: 1, date: "%M" },
        { unit: "day",   step: 1, date: "%d" }
    ]
};

<Gantt tasks={tasks} links={links} config={config} />
```

### 11.2 Vue.js

参考官方 Vue 集成指南：`docs.dhtmlx.com/gantt/integrations/vue/`

---

## 十二、完整示例：航空机组排班工作台

```js
// 初始化
gantt.config.date_format = "%Y-%m-%d %H:%i";
gantt.config.scale_height = 60;
gantt.config.row_height = 40;
gantt.config.auto_types = true;
gantt.config.fit_tasks = true;
gantt.config.open_tree_initially = true;
gantt.plugins({ tooltip: true, marker: true });

// 刻度：按月 + 按日
gantt.config.scales = [
    { unit: "month", step: 1, format: "%Y年%M月" },
    { unit: "day",   step: 1, format: "%j日" }
];

// 列配置
gantt.config.columns = [
    { name: "text",       label: "航班/任务",   tree: true, width: 200, resize: true },
    { name: "crew",      label: "机组",         width: 100,
      template: function(t) { return t.crew_name || "—"; } },
    { name: "start_date", label: "开始",        align: "center", width: 90 },
    { name: "end_date",   label: "结束",        align: "center", width: 90 },
    { name: "duration",   label: "天数",        align: "center", width: 60 },
    { name: "progress",   label: "进度",        align: "center", width: 70,
      template: function(t) { return Math.round(t.progress * 100) + "%"; } },
    { name: "status",     label: "状态",        width: 80,
      template: function(t) {
          const s = t.cert_status || "valid";
          const m = { expired: "已过期", urgent: "紧急", warning: "警示", valid: "正常" };
          return m[s] || s;
      }},
    { name: "add",        label: "",            width: 40 }
];

// 今日标记
var today = new Date();
gantt.addMarker({
    start_date: today,
    css: "today_marker",
    text: "今天"
});

// 任务样式
gantt.templates.task_class = function(start, end, task) {
    var status = task.cert_status || "valid";
    return "task-status-" + status;
};

// 初始化
gantt.init("gantt_here");
gantt.parse({ data: taskData, links: linkData });
```

---

## 十三、参考资源

| 资源 | 链接 |
|------|------|
| 官方文档 | https://docs.dhtmlx.com/gantt/ |
| GitHub 仓库 | https://github.com/DHTMLX/gantt |
| 在线示例 | https://docs.dhtmlx.com/gantt/samples/ |
| 视频教程 | https://dhtmlx.com/blog/category/video/ |
| PRO 功能演示 | https://dhtmlx.com/docs/products/dhtmlxGantt/pro-features.shtml |
| AI 主题构建器博客 | https://dhtmlx.com/blog/implementing-ai-driven-theme-builder-dhtmlx-gantt/ |
| React 集成指南 | https://docs.dhtmlx.com/gantt/integrations/react/quick-start/ |

