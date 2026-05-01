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

test('dispatcher can login and read crew and rule data', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '航班运行中心' }).click();
  await page.getByRole('button', { name: '航班计划' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '航班计划' })).toBeVisible();
  await expect(page.getByText('NX9001')).toBeVisible();

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
});

test('sidebar groups can collapse to parent-only navigation', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('button', { name: '总览' })).toBeVisible();
  await page.getByRole('button', { name: '首页' }).click();
  await expect(page.getByRole('button', { name: '总览' })).toHaveCount(0);
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
  await expect(page.getByRole('button', { name: 'Task Plan Center' })).toBeVisible();
  await page.getByRole('button', { name: 'Task Plan Center' }).click();
  await expect(page.getByRole('button', { name: 'Import Batches' })).toBeVisible();
  await expect(page.getByRole('button', { name: '任务计划中心' })).toHaveCount(0);

  await page.getByLabel('Timezone').selectOption('UTC');
  await expect(page.getByText(/\(UTC\)/).first()).toBeVisible();
  await page.getByLabel('Language').selectOption('zh-CN');
  await page.getByLabel('展示时区').selectOption('UTC+8');
});

test('routing keeps the active submenu after refresh and blocks unauthorized URLs', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '任务计划中心' }).click();
  await page.getByRole('button', { name: '导入批次' }).click();
  await expect(page).toHaveURL(/\/task-plan\/import-batches$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '导入批次' })).toBeVisible();

  await page.getByRole('button', { name: '退出' }).click();
  await login(page, 'pilot01', '我的班表');
  await page.goto('/exceptions-cdr/pic-decisions');
  await expect(page.getByRole('heading', { level: 1, name: 'PIC 决策' })).toBeVisible();
  await expect(page.getByText('当前账号无权访问该页面。').first()).toBeVisible();
});

test('flight operations and formal submenu framework are visible', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('button', { name: '航班运行基础' })).toBeVisible();
  await page.getByRole('button', { name: '航班运行基础' }).click();
  await page.getByRole('button', { name: '机场与时区' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '机场与时区' })).toBeVisible();
});

test('dispatcher timeline is display-only and does not open business drawers', async ({ page }) => {
  await login(page);

  const diagnostics = collectBrowserDiagnostics(page);

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
  await expect(page.getByRole('heading', { level: 1, name: '校验与发布' })).toBeVisible();
  await expect(page.getByText('发布结果')).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.goto('/rostering-workbench/archive-entry');
  await expect(page.getByRole('heading', { level: 1, name: '飞后归档' })).toBeVisible();
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
  await apiCreateTask(request, token, batchId, taskCode);

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
  await page.getByTestId('assignment-save').click();
  await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
  const updatedRow = page.locator('tbody tr').filter({ hasText: taskCode }).first();
  await expect(updatedRow).toContainText('草稿已排');
  await expect(updatedRow.getByTestId(/draft-context-/)).toContainText('最近保存');
  await expect(updatedRow.getByRole('button', { name: '调整' })).toBeVisible();
  expect(dispatcherDiagnostics.consoleErrors).toEqual([]);
  expect(dispatcherDiagnostics.pageErrors).toEqual([]);
  expect(dispatcherDiagnostics.requestFailures).toEqual([]);
  expect(dispatcherDiagnostics.unexpectedResponses).toEqual([]);
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
      scheduledStartUtc: '2026-05-10T01:00:00Z',
      scheduledEndUtc: '2026-05-10T05:15:00Z',
      sectorCount: 1,
      aircraftType: 'A330',
      aircraftNo: `B-${taskCode}`,
      requiredCrewPattern: 'PIC+FO',
    },
  });
  expect(response.ok()).toBeTruthy();
}
