# vis-timeline 时间轴与甘特图安装接入

## vis-timeline item content rule

- Before changing Gantt/timeline item text, range item content, or React item templates, check the official example first:
  https://visjs.github.io/vis-timeline/examples/timeline/other/usingReact16.html
- Use the official `content` field for simple item text.
- If React content is required, use official `template(item, element)` or `visibleFrameTemplate(item, element)`.
- Do not wrap item text in custom DOM and then override `.vis-item-content`, `.vis-item-overflow`, `transform`, item width, item height, or range item positioning with CSS.
- Do not force text centering, clipping, or width expansion by taking over vis-timeline internal item layout.
- Business code may change item mapping, class names, colors, tooltips, toolbar, and click handling, but vis-timeline should own range item text positioning.
- Any internal vis-timeline CSS override must document the problem, why the official API is not enough, the smallest affected selector, and the rollback path.

## 官方参考

- vis-timeline React 示例：
  [React 16 Components in templates](https://visjs.github.io/vis-timeline/examples/timeline/other/usingReact16.html)
- vis-timeline Timeline 文档：
  [Timeline documentation](https://visjs.github.io/vis-timeline/docs/timeline/)

当前项目的时间轴和甘特图统一使用 `vis-timeline` 官方 `Timeline` 实例，不再使用 ECharts custom series 自绘。

## 安装

前端依赖：

```powershell
cd D:\paiban2\apps\web
npm.cmd install vis-timeline
```

当前项目已经安装 `vis-timeline`，版本定义在 [apps/web/package.json](D:/paiban2/apps/web/package.json)。

## 项目接入位置

- 甘特组件入口：
  [GanttTimeline.tsx](D:/paiban2/apps/web/src/app/components/timeline/GanttTimeline.tsx)
- 甘特样式：
  [GanttTimeline.css](D:/paiban2/apps/web/src/app/components/timeline/GanttTimeline.css)
- 工作台页面接入：
  [Pages.tsx](D:/paiban2/apps/web/src/app/pages/Pages.tsx)
- 前端接口：
  [api.ts](D:/paiban2/apps/web/src/app/lib/api.ts)
- 后端接口：
  [GanttTimelineController.java](D:/paiban2/apps/api/src/main/java/com/pilotroster/archive/GanttTimelineController.java)

## 接入要求

- 时间轴和甘特图都使用 `vis-timeline` 官方 `Timeline` 实例。
- React 组件只保留薄包装层：挂载 DOM 容器、传入 `items / groups / options`、监听官方事件并销毁实例。
- 业务代码不得散落 Timeline 初始化、数据映射或事件细节，统一封装在 `GanttTimeline.tsx` 内。
- 甘特图只读取 `/api/gantt-timeline` 投影数据，不作为业务事实写入口。
- 所有业务时间仍按 UTC 存储和传输；`UTC / UTC+8` 切换只影响 Timeline 标签和展示文本，不改变业务时间。

## 本地验证

前端：

```powershell
cd D:\paiban2\apps\web
npm.cmd run build
```

后端：

```powershell
cd D:\paiban2\apps\api
mvn.cmd -q "-Dtest=ArchiveIntegrationTests,AuthIntegrationTests" test
```

如果需要联调启动：

```powershell
cd D:\paiban2\apps\api
mvn.cmd spring-boot:run -Dspring-boot.run.arguments=--server.port=18088
```

```powershell
cd D:\paiban2\apps\web
$env:VITE_API_TARGET='http://localhost:18088'
npm.cmd run dev
```

默认前端地址是 `http://127.0.0.1:5180`。如果本机未占用/未保留 `8088`，也可以不设置 `VITE_API_TARGET`，前端会默认代理到 `http://localhost:8088`。
