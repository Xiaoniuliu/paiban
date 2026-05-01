# Phase 3 Workbench Boundary Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the workbench navigation and page boundaries so Phase 3 grows on clean module seams instead of the old Legacy/Pages.tsx structure.

**Architecture:** Rename the old Legacy group back to a formal `排班工作台`, keep only flight view, crew view, and draft rostering inside it, migrate archive into the validation module, and split workbench/validation pages out of the legacy page switch. Keep timeline display-only, but refresh its shell so it feels like a formal observation page rather than an old workbench leftover.

**Tech Stack:** React, TypeScript, React Router-style route config, Tailwind/Shadcn UI, vis-timeline, Playwright

---

## File Structure

### Navigation and routes

- Modify: `apps/web/src/app/menu.ts`
- Modify: `apps/web/src/app/routes/moduleRoutes.ts`
- Create: `apps/web/src/app/routes/workbenchRoutes.ts`
- Create: `apps/web/src/app/routes/validationRoutes.ts`

### Workbench pages

- Modify: `apps/web/src/app/pages/Pages.tsx`
- Create: `apps/web/src/app/pages/workbench/WorkbenchLayoutPage.tsx`
- Create: `apps/web/src/app/pages/workbench/WorkbenchFlightViewPage.tsx`
- Create: `apps/web/src/app/pages/workbench/WorkbenchCrewViewPage.tsx`
- Create: `apps/web/src/app/pages/workbench/components/WorkbenchTimelineCard.tsx`
- Create: `apps/web/src/app/pages/workbench/hooks/useWorkbenchTimeline.ts`

### Draft rostering

- Modify: `apps/web/src/app/pages/DraftRosteringPage.tsx`
- Create: `apps/web/src/app/pages/draft-rostering/components/DraftTaskQueue.tsx`
- Create: `apps/web/src/app/pages/draft-rostering/components/AssignmentEntryButton.tsx`
- Create: `apps/web/src/app/pages/draft-rostering/hooks/useDraftRosteringTasks.ts`
- Create: `apps/web/src/app/pages/draft-rostering/hooks/useAssignmentDrawerFlow.ts`

### Validation and archive

- Modify: `apps/web/src/app/pages/Pages.tsx`
- Create: `apps/web/src/app/pages/validation/IssueHandlingPage.tsx`
- Create: `apps/web/src/app/pages/validation/PublishResultsPage.tsx`
- Create: `apps/web/src/app/pages/validation/PublishExportPage.tsx`
- Create: `apps/web/src/app/pages/validation/archive/ArchiveEntryPage.tsx`

### Timeline shell and copy

- Modify: `apps/web/src/app/components/timeline/GanttTimeline.tsx`
- Modify: `apps/web/src/app/components/timeline/GanttTimeline.css`
- Modify: `apps/web/src/app/i18n.ts`

### Regression coverage

- Modify: `apps/web/e2e/framework.spec.ts`

## Task 1: Lock the new information architecture in menu and routes

**Files:**
- Modify: `apps/web/src/app/menu.ts`
- Modify: `apps/web/src/app/routes/moduleRoutes.ts`
- Create: `apps/web/src/app/routes/workbenchRoutes.ts`
- Create: `apps/web/src/app/routes/validationRoutes.ts`
- Modify: `apps/web/src/app/i18n.ts`

- [ ] **Step 1: Add failing route/menu expectations to Playwright**

Update `apps/web/e2e/framework.spec.ts` with assertions that:

```ts
await expect(page.getByRole('button', { name: '排班工作台' })).toBeVisible();
await expect(page.getByRole('link', { name: '待排航班' })).toHaveCount(0);
await expect(page.getByRole('link', { name: '校验与发布' })).toHaveCount(0);
await expect(page.getByRole('link', { name: '运行日调整' })).toHaveCount(0);
await expect(page.getByRole('link', { name: '飞后归档' })).toHaveCount(1);
```

- [ ] **Step 2: Run the focused Playwright spec and confirm it fails on current navigation**

Run: `npx playwright test e2e/framework.spec.ts -g "workbench navigation" --project=chromium`

Expected: FAIL because the old menu structure still exposes removed workbench entries or lacks the new archive placement.

- [ ] **Step 3: Split route config and rebuild menu ownership**

Implement the new route modules and update the menu shape:

```ts
// apps/web/src/app/routes/workbenchRoutes.ts
export const workbenchRoutes: AppRoute[] = [
  route('rostering-workbench', '/rostering-workbench/flight-view', 'workbench-flight-view', workbenchFlightViewPage),
  route('rostering-workbench', '/rostering-workbench/crew-view', 'workbench-crew-view', workbenchCrewViewPage),
  route('rostering-workbench', '/rostering-workbench/draft-rostering', 'draft-rostering', draftRosteringPage),
];
```

```ts
// apps/web/src/app/menu.ts
{
  id: 'menu-workbench',
  icon: LayoutGrid,
  roles: operationsRoles,
  children: [
    { id: 'workbench-flight-view', roles: operationsRoles },
    { id: 'workbench-crew-view', roles: operationsRoles },
    { id: 'draft-rostering', roles: operationsRoles },
  ],
}
```

- [ ] **Step 4: Add compatibility routes for removed workbench entries**

Route old entry points into formal destinations:

```ts
route('rostering-workbench', '/rostering-workbench/unassigned-tasks', 'workbench-unassigned-tasks', workbenchRedirectPage),
route('rostering-workbench', '/rostering-workbench/draft-versions', 'workbench-draft-versions', workbenchRedirectPage),
route('rostering-workbench', '/rostering-workbench/archive-entry', 'workbench-archive-entry', workbenchRedirectPage),
route('rostering-workbench', '/rostering-workbench/run-day-adjustments', 'workbench-run-day-adjustments', workbenchRetiredPage),
```

- [ ] **Step 5: Re-run the focused Playwright spec**

Run: `npx playwright test e2e/framework.spec.ts -g "workbench navigation" --project=chromium`

Expected: PASS for menu visibility and formal archive placement.

## Task 2: Split workbench display pages out of Pages.tsx

**Files:**
- Modify: `apps/web/src/app/pages/Pages.tsx`
- Create: `apps/web/src/app/pages/workbench/WorkbenchLayoutPage.tsx`
- Create: `apps/web/src/app/pages/workbench/WorkbenchFlightViewPage.tsx`
- Create: `apps/web/src/app/pages/workbench/WorkbenchCrewViewPage.tsx`
- Create: `apps/web/src/app/pages/workbench/components/WorkbenchTimelineCard.tsx`
- Create: `apps/web/src/app/pages/workbench/hooks/useWorkbenchTimeline.ts`

- [ ] **Step 1: Add a failing regression that no removed workbench page is rendered from Pages.tsx**

Add a test assertion around the retired workbench views:

```ts
await page.goto('/rostering-workbench/unassigned-tasks');
await expect(page).toHaveURL(/draft-rostering/);
await expect(page.getByText('待排航班')).toHaveCount(0);
```

- [ ] **Step 2: Run the focused regression and confirm legacy rendering still leaks through**

Run: `npx playwright test e2e/framework.spec.ts -g "legacy workbench redirect" --project=chromium`

Expected: FAIL because the current page switch still renders legacy workbench content instead of redirect/retire behavior.

- [ ] **Step 3: Extract display-only workbench pages and hook**

Move timeline page logic into focused files:

```tsx
// apps/web/src/app/pages/workbench/WorkbenchFlightViewPage.tsx
export function WorkbenchFlightViewPage(props: PageProps) {
  return <WorkbenchLayoutPage {...props} viewMode="FLIGHT" />;
}
```

```tsx
// apps/web/src/app/pages/workbench/components/WorkbenchTimelineCard.tsx
export function WorkbenchTimelineCard({ activeView, viewMode, workbench, t }: Props) {
  return (
    <Card className="flex h-[calc(100vh-6.5rem)] min-h-[30rem] flex-col overflow-hidden rounded-lg">
      <WorkbenchCardHeader activeView={activeView} t={t} />
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        <WorkbenchTimelineBody viewMode={viewMode} workbench={workbench} t={t} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Reduce Pages.tsx to compatibility exports only**

Keep `Pages.tsx` as a thin re-export/transition layer:

```tsx
export { WorkbenchFlightViewPage } from './workbench/WorkbenchFlightViewPage';
export { WorkbenchCrewViewPage } from './workbench/WorkbenchCrewViewPage';
```

Remove the legacy branches for unassigned tasks, draft versions, run-day adjustments, and archive entry from the main workbench page switch.

- [ ] **Step 5: Re-run the redirect regression**

Run: `npx playwright test e2e/framework.spec.ts -g "legacy workbench redirect" --project=chromium`

Expected: PASS with redirects or retired behavior instead of legacy page rendering.

## Task 3: Promote archive into validation and retire the old workbench flow

**Files:**
- Modify: `apps/web/src/app/pages/Pages.tsx`
- Create: `apps/web/src/app/pages/validation/archive/ArchiveEntryPage.tsx`
- Create: `apps/web/src/app/routes/validationRoutes.ts`
- Modify: `apps/web/src/app/i18n.ts`

- [ ] **Step 1: Add a failing browser test for the new archive entry point**

Add a Playwright scenario:

```ts
await page.goto('/validation-center/archive-entry');
await expect(page.getByRole('heading', { name: '飞后归档' })).toBeVisible();
await expect(page.getByRole('link', { name: '飞后归档' })).toBeVisible();
```

- [ ] **Step 2: Run the focused archive spec and confirm it fails**

Run: `npx playwright test e2e/framework.spec.ts -g "archive entry" --project=chromium`

Expected: FAIL because archive still belongs to the old workbench route path or page shell.

- [ ] **Step 3: Move archive into the validation page tree**

Create a formal archive page module:

```tsx
// apps/web/src/app/pages/validation/archive/ArchiveEntryPage.tsx
export function ArchiveEntryPage(props: PageProps) {
  return (
    <ValidationModuleShell
      activeView={props.activeView}
      title={props.t('workbenchArchiveEntryTitle')}
      description={props.t('workbenchArchiveEntryDescription')}
    >
      <ArchiveEntryPanel {...props} />
    </ValidationModuleShell>
  );
}
```

- [ ] **Step 4: Wire old workbench archive routes into the new destination**

Use route-level redirect semantics so `/rostering-workbench/archive-entry` becomes a compatibility alias of `/validation-center/archive-entry`.

- [ ] **Step 5: Re-run the focused archive spec**

Run: `npx playwright test e2e/framework.spec.ts -g "archive entry" --project=chromium`

Expected: PASS with the new validation-owned archive page.

## Task 4: Refresh the timeline shell without breaking display-only boundaries

**Files:**
- Modify: `apps/web/src/app/components/timeline/GanttTimeline.tsx`
- Modify: `apps/web/src/app/components/timeline/GanttTimeline.css`
- Modify: `apps/web/src/app/i18n.ts`
- Modify: `apps/web/src/app/pages/workbench/components/WorkbenchTimelineCard.tsx`

- [ ] **Step 1: Add a failing browser assertion for the formalized timeline shell**

Add a Playwright check that the workbench timeline renders formal shell copy and no business action drawer opens on click:

```ts
await expect(page.getByTestId('timeline-status-legend')).toBeVisible();
await expect(page.getByText('旧工作台')).toHaveCount(0);
await page.getByTestId('gantt-timeline').click({ position: { x: 40, y: 40 } });
await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
await expect(page.getByTestId('archive-drawer')).toHaveCount(0);
```

- [ ] **Step 2: Run the focused timeline display spec**

Run: `npx playwright test e2e/framework.spec.ts -g "display-only" --project=chromium`

Expected: FAIL if the current shell copy or styling still reflects the old workbench presentation or if any legacy interaction leaks back in.

- [ ] **Step 3: Refresh the timeline shell copy and layout**

Keep vis-timeline usage unchanged, but modernize the shell:

```tsx
<div className={`gantt-timeline-shell gantt-timeline-${viewMode.toLowerCase()}`} data-testid="gantt-timeline">
  <div className="gantt-timeline-header">
    <div>
      <div className="gantt-timeline-title">{viewMode === 'FLIGHT' ? t('validationOpenFlightView') : t('validationOpenCrewView')}</div>
      <div className="gantt-timeline-subtitle">{t('timelineDisplayOnlyNote')}</div>
    </div>
    <div className="gantt-timeline-legend" data-testid="timeline-status-legend">...</div>
  </div>
</div>
```

- [ ] **Step 4: Re-run the focused timeline display spec**

Run: `npx playwright test e2e/framework.spec.ts -g "display-only" --project=chromium`

Expected: PASS, with no regression in display-only behavior.

## Task 5: Recompose draft rostering internals so Phase 3 can grow there, not in workbench

**Files:**
- Modify: `apps/web/src/app/pages/DraftRosteringPage.tsx`
- Create: `apps/web/src/app/pages/draft-rostering/components/DraftTaskQueue.tsx`
- Create: `apps/web/src/app/pages/draft-rostering/components/AssignmentEntryButton.tsx`
- Create: `apps/web/src/app/pages/draft-rostering/hooks/useDraftRosteringTasks.ts`
- Create: `apps/web/src/app/pages/draft-rostering/hooks/useAssignmentDrawerFlow.ts`

- [ ] **Step 1: Add a failing regression that draft rostering remains the only edit entry**

Add a Playwright assertion:

```ts
await page.goto('/rostering-workbench/draft-rostering');
await expect(page.getByRole('button', { name: /打开排班|调整排班/ })).toBeVisible();
await page.goto('/rostering-workbench/flight-view');
await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
```

- [ ] **Step 2: Run the draft entry regression and confirm the baseline**

Run: `npx playwright test e2e/framework.spec.ts -g "draft rostering entry" --project=chromium`

Expected: PASS or partial fail; record whether refactoring draft internals introduces any entry regression.

- [ ] **Step 3: Extract queue and drawer flow into dedicated draft-rostering files**

Move task loading and drawer flow into focused hooks/components:

```ts
export function useDraftRosteringTasks(api: ApiClient, t: TFunction) {
  const [tasks, setTasks] = useState<DraftRosteringTask[]>([]);
  const refresh = useCallback(() => api.draftRosteringTasks().then((response) => setTasks(response.tasks)), [api]);
  return { tasks, refresh };
}
```

```tsx
export function DraftTaskQueue({ tasks, onOpenAssignment, t }: Props) {
  return <table className="w-full min-w-[760px] text-sm">...</table>;
}
```

- [ ] **Step 4: Re-run the draft entry regression**

Run: `npx playwright test e2e/framework.spec.ts -g "draft rostering entry" --project=chromium`

Expected: PASS, with no new edit entry outside draft rostering.

## Task 6: Run the full navigation/workbench regression gate

**Files:**
- Modify: `apps/web/e2e/framework.spec.ts`
- Modify: `docs/superpowers/plans/2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md`

- [ ] **Step 1: Add the final end-to-end gate cases**

Ensure `apps/web/e2e/framework.spec.ts` covers:

```ts
test('workbench keeps only three formal entries', async ({ page }) => { ... });
test('removed workbench routes redirect or retire cleanly', async ({ page }) => { ... });
test('archive is reachable from validation center', async ({ page }) => { ... });
test('timeline remains display-only with no business drawers', async ({ page }) => { ... });
```

- [ ] **Step 2: Run frontend verification**

Run: `npm run build`
Expected: PASS

Run: `npm run check:i18n`
Expected: PASS

- [ ] **Step 3: Run the navigation/workbench Playwright gate**

Run: `npx playwright test e2e/framework.spec.ts -g "workbench|archive|display-only|redirect" --project=chromium`

Expected: PASS

- [ ] **Step 4: Update the task directory and verification notes**

Record this gate in:

```md
- [x] Workbench boundary rebuild complete
- [x] Archive moved under validation center
- [x] Old workbench routes redirect or retire cleanly
- [x] Timeline display-only shell refreshed
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/menu.ts apps/web/src/app/routes apps/web/src/app/pages apps/web/src/app/components/timeline apps/web/src/app/i18n.ts apps/web/e2e/framework.spec.ts docs/superpowers/plans/2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md
git commit -m "refactor: rebuild workbench boundaries for phase 3"
```

## Self-Review

- Spec coverage: menu/route rebuild, workbench split, archive migration, timeline shell refresh, and real-click/F12 regression are all covered by Tasks 1-6.
- Placeholder scan: removed generic TODO language; each task names concrete files, commands, and expected outcomes.
- Type consistency: all route/view names match the current route naming pattern and preserve the formal `draft-rostering`, `workbench-flight-view`, `workbench-crew-view`, and `validation-center` seams.
