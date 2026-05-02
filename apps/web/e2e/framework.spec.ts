import { expect, type Page, test } from '@playwright/test';

async function login(page: Page, username = 'dispatcher01', expectedHeading = '总览') {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '飞行员排班系统' })).toBeVisible();
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('Admin123!');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.getByRole('button', { name: /退出|Sign Out/ })).toBeVisible();
  await page.locator('select').filter({ has: page.locator('option[value="zh-CN"]') }).first().selectOption('zh-CN');
  await expect(page.getByRole('heading', { level: 1, name: expectedHeading })).toBeVisible();
}

test('unauthenticated users see the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '飞行员排班系统' })).toBeVisible();
  await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
});

test('dispatcher can login and read crew and rule data', async ({ page, request }) => {
  const token = await apiLogin(request);
  const batchId = await apiCreateBatch(request, token, `E2E-READ-${Date.now()}`);
  const taskCode = `E2EREAD${Date.now()}`.slice(-14);
  await apiCreateTask(request, token, batchId, taskCode, uniqueTaskWindow(3));

  await login(page);

  await page.getByRole('button', { name: '航班运行中心' }).click();
  await page.getByRole('button', { name: '航班计划' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '航班计划' })).toBeVisible();
  await expect(page.getByText(taskCode)).toBeVisible();

  await page.getByRole('button', { name: '机组资源中心' }).click();
  await page.getByRole('button', { name: '机组信息' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '机组信息' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'CPT001', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'FO001', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '排班工作台' }).click();
  await page.getByRole('button', { name: '航班视图' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '航班视图' })).toBeVisible();
  await expect(page.getByTestId('gantt-timeline')).toBeVisible();

  await page.getByRole('button', { name: '规则中心' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '规则目录' })).toBeVisible();
  await expect(page.getByText('规则目录').nth(1)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'operationalRulesPageTitle' })).toHaveCount(0);
  await expect(page.getByText('P0 强制启用').first()).toBeVisible();
});

test('rule recent-hit context links open validation issue handling', async ({ page }) => {
  await page.route(/\/api\/rules\/R-E2E-001\/recent-hits$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          hitId: 9001,
          ruleId: 'R-E2E-001',
          severity: 'P1',
          status: 'OPEN',
          targetType: 'TASK',
          targetId: 8801,
          crewId: null,
          taskId: 8801,
          timelineBlockId: null,
          evidenceWindowStartUtc: '2026-05-03T01:00:00Z',
          evidenceWindowEndUtc: '2026-05-03T05:00:00Z',
          message: 'E2E context link should open issue handling',
          recommendedAction: 'Review issue handling context',
          createdAtUtc: '2026-05-01T08:00:00Z',
          taskCode: 'NX8801',
          route: 'MFM-TPE',
          crewCode: null,
          crewName: null,
        }],
      }),
    });
  });
  await page.route(/\/api\/rules$/, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 9001,
          ruleId: 'R-E2E-001',
          titleZh: 'E2E 最近命中规则',
          titleEn: 'E2E Recent Hit Rule',
          ruleCategory: 'FDP',
          severityDefault: 'P1',
          sourceSection: 'FOM',
          sourceClause: 'E2E',
          sourcePage: 12,
          phaseCode: 'PHASE_3',
          activeFlag: true,
          applicability: 'ALL',
          descriptionZh: '用于校验最近命中跳转',
          descriptionEn: 'Checks recent-hit context link',
          triggerSummaryZh: '触发后应进入问题处理',
          triggerSummaryEn: 'Should open issue handling',
          handlingMethodZh: '打开问题处理模块',
          handlingMethodEn: 'Open issue handling',
          exceptionAllowed: false,
          pdfDeeplink: null,
          versionStatus: 'ACTIVE',
          catalogEntryType: 'EXECUTABLE',
          displayRuleCode: 'R-E2E-001',
          sourceRuleIds: null,
          effectiveFromUtc: null,
          effectiveToUtc: null,
          hitCount: 1,
          latestHitAtUtc: '2026-05-01T08:00:00Z',
          activationLocked: false,
        }],
      }),
    });
  });

  await login(page);
  await page.goto('/rule-center/recent-hits');
  await expect(page.getByRole('heading', { level: 1, name: '最近命中' })).toBeVisible();
  await expect(page.getByTestId('rule-detail-drawer')).toHaveCount(0);
  await page.getByRole('cell', { name: 'R-E2E-001', exact: true }).click();
  await expect(page.getByTestId('rule-detail-drawer')).toBeVisible();
  await expect(page.getByText('E2E context link should open issue handling')).toBeVisible();
  await page.getByRole('link', { name: '打开关联现场' }).click();
  await expect(page).toHaveURL(/\/validation-center\/violation-handling/);
  await expect(page.getByRole('heading', { level: 1, name: '违规处理' })).toBeVisible();
});

test('sidebar groups can collapse to parent-only navigation', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('button', { name: '总览' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '首页' })).toBeVisible();
  await expect(page.getByRole('button', { name: '航班运行中心' })).toBeVisible();
  await expect(page.getByRole('button', { name: '机组资源中心' })).toBeVisible();
});

test('pilot role only sees pilot portal and admin can see admin', async ({ page }) => {
  await login(page, 'pilot01', '我的班表');
  await expect(page.getByRole('button', { name: '飞行员端' })).toBeVisible();
  await expect(page.getByRole('button', { name: '首页' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '例外与 CDR' })).toHaveCount(0);
  await page.getByRole('button', { name: '退出' }).click();

  await login(page, 'admin');
  await expect(page.getByRole('button', { name: '系统设置' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Legacy Reference' })).toHaveCount(0);
});

test('language and timezone switches update visible shell text', async ({ page }) => {
  await login(page);

  await page.getByLabel('语言').selectOption('en-US');
  await expect(page.getByRole('complementary').getByText('Pilot Rostering System')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flight Operations Center' })).toBeVisible();
  await page.getByRole('button', { name: 'Flight Operations Center' }).click();
  await expect(page.getByRole('button', { name: 'Flight Plan' })).toBeVisible();
  await expect(page.getByRole('button', { name: '航班运行中心' })).toHaveCount(0);

  await page.getByLabel('Timezone').selectOption('UTC');
  await expect(page.getByText(/\(UTC\)/).first()).toBeVisible();
  await page.getByLabel('Language').selectOption('zh-CN');
  await page.getByLabel('展示时区').selectOption('UTC+8');
});

test('routing keeps the active submenu after refresh and blocks unauthorized URLs', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '航班运行中心' }).click();
  await page.getByRole('button', { name: '航班计划' }).click();
  await expect(page).toHaveURL(/\/flight-operations\/flight-plan$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '航班计划' })).toBeVisible();

  await page.getByRole('button', { name: '退出' }).click();
  await login(page, 'pilot01', '我的班表');
  await page.goto('/exceptions-cdr/pic-decisions');
  await expect(page.getByRole('heading', { level: 1, name: 'PIC 决策' })).toBeVisible();
  await expect(page.getByText('当前账号无权访问该页面。').first()).toBeVisible();
});

test('flight operations and formal submenu framework are visible', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('button', { name: '航班运行中心' })).toBeVisible();
  await page.getByRole('button', { name: '航班运行中心' }).click();
  await expect(page.getByRole('button', { name: '航班计划' })).toBeVisible();
  await expect(page.getByRole('button', { name: '运行资料' })).toBeVisible();
  await expect(page.getByRole('button', { name: '机场与时区' })).toHaveCount(0);
});

test('dispatcher timeline is display-only and does not open business drawers', async ({ page }) => {
  await login(page);

  const diagnostics = collectBrowserDiagnostics(page);
  const archiveSyncRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/archive/sync')) {
      archiveSyncRequests.push(request.url());
    }
  });

  await page.goto('/rostering-workbench/flight-view');
  await expect(page.getByRole('heading', { level: 1, name: '航班视图' })).toBeVisible();
  await expect(page.locator('.gantt-timeline-canvas .vis-current-time')).toBeVisible();
  const legend = page.getByTestId('timeline-status-legend');
  await expect(legend).toBeVisible();
  await expect(legend.getByText('待排')).toBeVisible();
  await expect(legend.getByText('草稿已排')).toBeVisible();
  await expect(legend.getByText('已发布')).toBeVisible();
  await expect(legend.getByText('需复核')).toHaveCount(0);
  await expect(page.getByTestId('gantt-timeline')).toBeVisible();
  await clickFirstTimelineBlockIfPresent(page);
  await expect(page.getByTestId('archive-drawer')).toHaveCount(0);
  await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
  expect(archiveSyncRequests).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('workbench navigation is reduced to formal entries and archive lives under validation', async ({ page }) => {
  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  await page.getByRole('button', { name: '排班工作台' }).click();
  await expect(page.getByRole('button', { name: '航班视图' })).toBeVisible();
  await expect(page.getByRole('button', { name: '机组视图' })).toBeVisible();
  await expect(page.getByRole('button', { name: '草稿排班' })).toBeVisible();
  await expect(page.getByRole('button', { name: '待排航班' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '校验与发布' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '运行日调整' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '飞后归档' })).toHaveCount(0);

  await page.getByRole('button', { name: '校验与问题处理' }).click();
  await expect(page.getByRole('button', { name: '结果导出' })).toHaveCount(0);
  await page.getByRole('button', { name: '发布结果' }).click();
  await expect(page).toHaveURL(/\/validation-center\/release-gates$/);
  await expect(page.getByRole('heading', { level: 1, name: '发布结果' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导出航班 CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导出机组 CSV' })).toBeVisible();

  await page.getByRole('button', { name: '飞后归档' }).click();
  await expect(page).toHaveURL(/\/validation-center\/archive-entry$/);
  await expect(page.getByRole('heading', { level: 1, name: '飞后归档' })).toBeVisible();
  await expect(page.getByTestId('archive-drawer')).toHaveCount(0);

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('removed workbench routes remain compatible without legacy archive ownership', async ({ page }) => {
  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  await page.goto('/rostering-workbench/unassigned-tasks');
  await expect(page.getByRole('heading', { level: 1, name: '待排航班' })).toBeVisible();
  await expect(page.getByText('草稿排班队列')).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.goto('/rostering-workbench/draft-versions');
  await expect(page.getByTestId('workbench-retired-publish')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '校验与发布' })).toBeVisible();
  await expect(page.getByText('校验与发布已迁出排班工作台')).toBeVisible();
  await expect(page.getByRole('button', { name: '发布' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '打开发布结果模块' })).toHaveAttribute('href', '/validation-center/release-gates');
  await page.waitForLoadState('networkidle');

  await page.goto('/validation-center/export');
  await expect(page.getByTestId('validation-export-handoff')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '结果导出' })).toBeVisible();
  await expect(page.getByText('结果导出已合并到发布结果')).toBeVisible();
  await expect(page.getByRole('button', { name: '导出航班 CSV' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '打开发布结果模块' })).toHaveAttribute('href', '/validation-center/release-gates');
  await page.waitForLoadState('networkidle');

  await page.goto('/rostering-workbench/archive-entry');
  await expect(page.getByTestId('workbench-retired-archive')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '飞后归档' })).toBeVisible();
  await expect(page.getByText('飞后归档已迁出排班工作台')).toBeVisible();
  await expect(page.getByTestId('archive-drawer')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '打开飞后归档模块' })).toHaveAttribute('href', '/validation-center/archive-entry');
  await page.waitForLoadState('networkidle');

  await page.goto('/rostering-workbench/run-day-adjustments');
  await expect(page.getByRole('heading', { level: 1, name: '运行日调整' })).toBeVisible();
  await expect(page.getByTestId('workbench-retired-run-day')).toBeVisible();
  await expect(page.getByText('运行日调整已退出排班工作台')).toBeVisible();
  await expect(page.getByTestId('gantt-timeline')).toHaveCount(0);
  await page.waitForLoadState('networkidle');

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('timeline rule-hit marker is a current read-only projection', async ({ page }) => {
  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  await page.route('**/api/gantt-timeline**', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    const withRuleHit = {
      ...payload,
      data: payload.data.map((block: Record<string, unknown>) => ({
        ...block,
        ruleHitCount: 2,
        ruleHitSummary: 'R-FDP-001, R-REST-002',
        ruleHitCodes: ['R-FDP-001', 'R-REST-002'],
      })),
    };
    await route.fulfill({ response, json: withRuleHit });
  });

  await page.goto('/rostering-workbench/flight-view');
  await expect(page.getByTestId('gantt-timeline')).toBeVisible();
  await expect(page.locator('.gantt-timeline-rule-hit-badge').first()).toBeVisible();
  await clickFirstRuleHitTimelineItem(page);
  const readonlyDetail = page.getByTestId('timeline-readonly-detail');
  await expect(readonlyDetail).toBeVisible();
  await expect(readonlyDetail.getByText('R-FDP-001, R-REST-002')).toBeVisible();
  await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
  await expect(page.getByTestId('archive-drawer')).toHaveCount(0);

  await page.unroute('**/api/gantt-timeline**');
  await page.route('**/api/gantt-timeline**', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    const withoutRuleHit = {
      ...payload,
      data: payload.data.map((block: Record<string, unknown>) => ({
        ...block,
        ruleHitCount: null,
        ruleHitSummary: null,
        ruleHitCodes: null,
      })),
    };
    await route.fulfill({ response, json: withoutRuleHit });
  });
  await page.reload();
  await expect(page.getByTestId('gantt-timeline')).toBeVisible();
  await expect(page.locator('.gantt-timeline-rule-hit-badge')).toHaveCount(0);

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('flight task protected actions keep downstream rows read-only without F12 errors', async ({ page }) => {
  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  await page.goto('/flight-operations/flight-plan');
  await expect(page.getByRole('heading', { level: 1, name: '航班计划' })).toBeVisible();

  const publishedRow = page.locator('tbody tr').filter({ hasText: 'NX8801' }).first();
  await expect(publishedRow).toContainText('已发布');
  await expect(publishedRow.getByRole('button', { name: '查看详情' })).toBeVisible();
  await expect(publishedRow.getByRole('button', { name: '删除航班' })).toHaveCount(0);
  await expect(publishedRow.getByRole('button', { name: '编辑' })).toHaveCount(0);

  await publishedRow.getByRole('button', { name: '查看详情' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存' })).toHaveCount(0);

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('flight task delete removes a clean unassigned row without F12 errors', async ({ page, request }) => {
  const token = await apiLogin(request);
  const batchId = await apiCreateBatch(request, token, `E2E-DELETE-${Date.now()}`);
  const taskCode = `E2EDEL${Date.now()}`.slice(-12);
  await apiCreateTask(request, token, batchId, taskCode);

  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  await page.goto('/flight-operations/flight-plan');
  await expect(page.getByRole('heading', { level: 1, name: '航班计划' })).toBeVisible();
  await page.getByPlaceholder('搜索航班号、航线、任务类型或状态').fill(taskCode);

  const deletableRow = page.locator('tbody tr').filter({ hasText: taskCode }).first();
  await expect(deletableRow.getByRole('button', { name: '删除航班' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await deletableRow.getByRole('button', { name: '删除航班' }).click();

  await expect(page.locator('tbody tr').filter({ hasText: taskCode })).toHaveCount(0);
  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('flight operations protected mutations keep table state and domain reason visible', async ({ page }) => {
  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  await page.goto('/flight-operations/routes');
  await expect(page.getByRole('heading', { level: 1, name: '航线管理' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '航线资料' })).toBeVisible();

  const protectedRouteRow = page.locator('tbody tr').filter({ hasText: 'MFM-TPE' }).first();
  await expect(protectedRouteRow).toBeVisible();
  await expect(protectedRouteRow.getByRole('button', { name: '编辑' })).toBeDisabled();
  await expect(protectedRouteRow.getByRole('button', { name: '删除' })).toBeDisabled();
  await expect(protectedRouteRow.locator('span[title*="引用"]').first()).toBeVisible();
  await expect(page.getByText('MFM-TPE')).toBeVisible();

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('draft rostering keeps manager read-only and dispatcher editable on a clean unassigned task', async ({ page, browser, request }) => {
  const token = await apiLogin(request);
  const batchId = await apiCreateBatch(request, token, `E2E-DRAFT-${Date.now()}`);
  const taskCode = `E2EDRAFT${Date.now()}`.slice(-14);
  await apiCreateTask(request, token, batchId, taskCode, uniqueTaskWindow(0));

  const manager = await browser.newPage({ baseURL: 'http://127.0.0.1:5180' });
  await login(manager, 'manager01');
  await manager.waitForTimeout(300);
  const managerDiagnostics = collectBrowserDiagnostics(manager);

  await manager.goto('/rostering-workbench/draft-rostering');
  await expect(manager.getByRole('heading', { level: 1, name: '草稿排班' })).toBeVisible();
  const managerRow = manager.locator('tbody tr').filter({ hasText: taskCode }).first();
  await managerRow.getByRole('button', { name: '排班' }).click();
  await expect(manager.getByTestId('assignment-drawer')).toBeVisible();
  await expect(manager.getByText('当前任务不可在排班抽屉编辑。')).toBeVisible();
  await expect(manager.getByTestId('assignment-save')).toBeDisabled();
  expect(managerDiagnostics.consoleErrors).toEqual([]);
  expect(managerDiagnostics.pageErrors).toEqual([]);
  expect(managerDiagnostics.requestFailures).toEqual([]);
  expect(managerDiagnostics.unexpectedResponses).toEqual([]);
  await manager.close();

  await login(page);
  await page.waitForTimeout(300);
  const dispatcherDiagnostics = collectBrowserDiagnostics(page);

  await page.goto('/rostering-workbench/draft-rostering');
  await expect(page.getByRole('heading', { level: 1, name: '草稿排班' })).toBeVisible();
  const dispatcherRow = page.locator('tbody tr').filter({ hasText: taskCode }).first();
  await expect(dispatcherRow.getByTestId(/draft-context-/)).toContainText('暂无问题');
  await expect(dispatcherRow.getByTestId(/draft-context-/)).toContainText('尚未保存草稿');
  await dispatcherRow.getByRole('button', { name: '排班' }).click();
  await expect(page.getByTestId('assignment-drawer')).toBeVisible();
  await expect(page.getByTestId('assignment-draft-context')).toContainText('暂无问题');
  await expect(page.getByTestId('assignment-draft-context')).toContainText('尚未保存草稿');
  await expect(page.getByText('当前任务不可在排班抽屉编辑。')).toHaveCount(0);
  await expect(page.getByText('该航班已进入飞后归档，请从飞后归档处理。')).toHaveCount(0);
  await page.getByTestId('assignment-pic-select').selectOption({ index: 1 });
  await page.getByTestId('assignment-fo-select').selectOption({ index: 1 });
  const picCrewId = await selectedSelectValue(page, 'assignment-pic-select');
  const foCrewId = await selectedSelectValue(page, 'assignment-fo-select');
  await page.getByTestId('assignment-save').click();
  await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
  const updatedRow = page.locator('tbody tr').filter({ hasText: taskCode }).first();
  await expect(updatedRow).toContainText('草稿已排');
  await expect(updatedRow.getByTestId(/draft-context-/)).toContainText('最近保存');
  await expect(updatedRow.getByRole('button', { name: '调整' })).toBeVisible();

  await updatedRow.getByRole('button', { name: '调整' }).click();
  await expect(page.getByTestId('assignment-drawer')).toBeVisible();
  await expect(page.getByTestId('assignment-pic-select')).toHaveValue(picCrewId);
  await expect(page.getByTestId('assignment-fo-select')).toHaveValue(foCrewId);
  await page.getByTestId('assignment-additional-add').click();
  await expect(page.getByTestId('assignment-additional-crew-0')).toBeVisible();
  await page.getByRole('button', { name: '移除人员' }).click();
  await expect(page.getByTestId('assignment-additional-crew-0')).toHaveCount(0);
  await page.getByTestId('assignment-additional-add').click();
  const extraCrewId = await selectFirstDifferentCrewOption(page, 'assignment-additional-crew-0', [picCrewId, foCrewId]);
  await page.getByTestId('assignment-save').click();
  await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);

  const adjustedRow = page.locator('tbody tr').filter({ hasText: taskCode }).first();
  await expect(adjustedRow).toContainText('草稿已排');
  await adjustedRow.getByRole('button', { name: '调整' }).click();
  await expect(page.getByTestId('assignment-drawer')).toBeVisible();
  await expect(page.getByTestId('assignment-additional-crew-0')).toHaveValue(extraCrewId);
  await page.getByTestId('assignment-clear-draft').click();
  await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
  const clearedRow = page.locator('tbody tr').filter({ hasText: taskCode }).first();
  await expect(clearedRow).toContainText('待排');
  await expect(clearedRow.getByTestId(/draft-context-/)).toContainText('最近回退');
  await expect(clearedRow.getByRole('button', { name: '排班' })).toBeVisible();
  expect(dispatcherDiagnostics.consoleErrors).toEqual([]);
  expect(dispatcherDiagnostics.pageErrors).toEqual([]);
  expect(dispatcherDiagnostics.requestFailures).toEqual([]);
  expect(dispatcherDiagnostics.unexpectedResponses).toEqual([]);
});

test('issue handling opens assignment drawer without taking over issue resolution workflow', async ({ page, request }) => {
  const token = await apiLogin(request);
  const batchId = await apiCreateBatch(request, token, `E2E-ISSUE-${Date.now()}`);
  const taskCode = `E2EISSUE${Date.now()}`.slice(-14);
  const window = uniqueTaskWindow(1);
  const taskId = await apiCreateTask(request, token, batchId, taskCode, window);

  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  await page.route('**/api/rostering-workbench/validation-publish/issues', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: {
        success: true,
        data: {
          rosterVersionNo: 'DRAFT-E2E',
          rosterVersionStatus: 'DRAFT',
          blockedCount: 1,
          warningCount: 0,
          issues: [{
            id: `e2e-${taskId}`,
            hitId: null,
            taskId,
            crewId: null,
            timelineBlockId: null,
            targetType: 'TASK',
            targetId: taskId,
            taskCode,
            route: 'MFM-SIN',
            startUtc: window.scheduledStartUtc,
            endUtc: window.scheduledEndUtc,
            severity: 'BLOCK',
            ruleId: 'TASK_STATUS_BLOCKED',
            ruleTitle: 'Task status is blocked',
            message: 'Open assignment context from issue handling.',
            actionType: 'STATUS_REPAIR',
            status: 'OPEN',
            evidenceWindowStartUtc: window.scheduledStartUtc,
            evidenceWindowEndUtc: window.scheduledEndUtc,
          }],
        },
      },
    });
  });

  await page.goto('/validation-center/violation-handling');
  await expect(page.getByRole('heading', { level: 1, name: '违规处理' })).toBeVisible();
  await expect(page.getByRole('cell', { name: taskCode })).toBeVisible();
  await page.getByTestId('issue-handling-detail').getByRole('button', { name: '处理排班' }).click();
  await expect(page.getByTestId('assignment-drawer')).toBeVisible();
  await expect(page.getByTestId('issue-handling-detail')).toBeVisible();
  await expect(page.getByTestId('assignment-issue-summary')).toHaveCount(0);
  await expect(page).toHaveURL(/\/validation-center\/violation-handling$/);

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

test('draft rostering blocks save when a selected candidate is ineligible', async ({ page, request }) => {
  const token = await apiLogin(request);
  const batchId = await apiCreateBatch(request, token, `E2E-INELIGIBLE-${Date.now()}`);
  const taskCode = `E2EINEL${Date.now()}`.slice(-14);
  const taskId = await apiCreateTask(request, token, batchId, taskCode, uniqueTaskWindow(2));

  await login(page);
  const diagnostics = collectBrowserDiagnostics(page);

  let ineligiblePicCrewId = '';
  await page.route(`**/api/assignments/tasks/${taskId}`, async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    const firstPicCandidate = payload.data.picCandidates[0];
    ineligiblePicCrewId = String(firstPicCandidate.id);
    await route.fulfill({
      response,
      json: {
        ...payload,
        data: {
          ...payload.data,
          selectedPicCrewId: firstPicCandidate.id,
          picCandidates: payload.data.picCandidates.map((candidate: Record<string, unknown>) => (
            candidate.id === firstPicCandidate.id
              ? { ...candidate, eligibleForAssignment: false, eligibilityReasonCodes: ['CREW_INACTIVE'] }
              : candidate
          )),
        },
      },
    });
  });

  await page.goto('/rostering-workbench/draft-rostering');
  await expect(page.getByRole('heading', { level: 1, name: '草稿排班' })).toBeVisible();
  const row = page.locator('tbody tr').filter({ hasText: taskCode }).first();
  await row.getByRole('button', { name: '排班' }).click();
  await expect(page.getByTestId('assignment-drawer')).toBeVisible();
  await expect(page.getByTestId('assignment-pic-select')).toHaveValue(ineligiblePicCrewId);
  await expect(page.getByTestId('assignment-pic-select')).toContainText('非在册');
  await page.getByTestId('assignment-fo-select').selectOption({ index: 1 });
  await expect(page.getByTestId('assignment-save')).toBeDisabled();
  const ineligibleOptionDisabled = await page.getByTestId('assignment-pic-select').evaluate((element, value) => {
    const option = Array.from((element as HTMLSelectElement).options).find((item) => item.value === value);
    return option?.disabled ?? false;
  }, ineligiblePicCrewId);
  expect(ineligibleOptionDisabled).toBe(true);

  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.requestFailures).toEqual([]);
  expect(diagnostics.unexpectedResponses).toEqual([]);
});

async function clickFirstTimelineBlockIfPresent(page: Page) {
  const item = page
    .locator('.gantt-timeline-canvas .vis-item.gantt-timeline-item')
    .first();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await item.isVisible().catch(() => false)) {
      await item.click({ force: true });
      return;
    }
    await panTimelineForward(page);
  }
}

async function clickFirstRuleHitTimelineItem(page: Page) {
  const items = page.locator('.gantt-timeline-canvas .vis-item:has(.gantt-timeline-rule-hit-badge)');
  const count = await items.count();
  for (let index = 0; index < count; index += 1) {
    const box = await items.nth(index).boundingBox();
    if (!box || box.width <= 0 || box.height <= 0) continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (await page.getByTestId('timeline-readonly-detail').isVisible().catch(() => false)) return;
  }
  throw new Error('No clickable timeline rule-hit item found.');
}

async function panTimelineForward(page: Page) {
  const centerPanel = page.locator('.gantt-timeline-canvas .vis-panel.vis-center').first();
  const box = await centerPanel.boundingBox();
  if (!box) return;
  const y = box.y + box.height * 0.45;
  await page.mouse.move(box.x + box.width * 0.78, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.18, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(700);
}

async function selectedSelectValue(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((element) => (element as HTMLSelectElement).value);
}

async function selectFirstDifferentCrewOption(page: Page, testId: string, excludedValues: string[]) {
  const select = page.getByTestId(testId);
  const value = await select.evaluate((element, excluded) => {
    const options = Array.from((element as HTMLSelectElement).options);
    const match = options.find((option) => option.value !== '' && !option.disabled && !excluded.includes(option.value));
    if (!match) throw new Error('No eligible non-duplicate crew option found.');
    return match.value;
  }, excludedValues);
  await select.selectOption(value);
  return value;
}

function uniqueTaskWindow(offset: number) {
  const start = new Date(Date.UTC(2026, 4, 10, 0, 0, 0));
  start.setUTCMinutes(start.getUTCMinutes() + ((Date.now() % 100000) * 6) + (offset * 360));
  const end = new Date(start);
  end.setUTCMinutes(end.getUTCMinutes() + 255);
  return {
    scheduledStartUtc: start.toISOString(),
    scheduledEndUtc: end.toISOString(),
  };
}

function collectBrowserDiagnostics(
  page: Page,
  isExpectedResponse: (response: import('@playwright/test').Response) => boolean = () => false,
  isExpectedConsoleError: (message: string) => boolean = () => false,
) {
  const diagnostics = {
    consoleErrors: [] as string[],
    pageErrors: [] as string[],
    requestFailures: [] as string[],
    unexpectedResponses: [] as string[],
  };
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!isExpectedConsoleError(text)) {
        diagnostics.consoleErrors.push(text);
      }
    }
  });
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const errorText = failure?.errorText ?? '';
    if (errorText === 'net::ERR_ABORTED' || errorText.includes('NS_BINDING_ABORTED')) return;
    diagnostics.requestFailures.push(`${request.method()} ${request.url()} ${errorText}`.trim());
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !isExpectedResponse(response)) {
      diagnostics.unexpectedResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return diagnostics;
}

async function apiLogin(request: import('@playwright/test').APIRequestContext, username = 'dispatcher01', password = 'Admin123!') {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data.token as string;
}

async function apiCreateBatch(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  batchNo: string,
) {
  const response = await request.post('/api/task-plan/batches', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      batchNo,
      sourceName: 'Playwright',
      status: 'IMPORTED',
      importedAtUtc: '2026-05-01T00:00:00Z',
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data.id as number;
}

async function apiCreateTask(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  batchId: number,
  taskCode: string,
  window: { scheduledStartUtc: string; scheduledEndUtc: string } = {
    scheduledStartUtc: '2026-05-10T01:00:00Z',
    scheduledEndUtc: '2026-05-10T05:15:00Z',
  },
) {
  const response = await request.post('/api/task-plan/items', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      batchId,
      taskCode,
      taskType: 'FLIGHT',
      titleZh: taskCode,
      titleEn: taskCode,
      departureAirport: 'MFM',
      arrivalAirport: 'SIN',
      scheduledStartUtc: window.scheduledStartUtc,
      scheduledEndUtc: window.scheduledEndUtc,
      sectorCount: 1,
      aircraftType: 'A330',
      aircraftNo: `B-${taskCode}`,
      requiredCrewPattern: 'PIC+FO',
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data.id as number;
}
