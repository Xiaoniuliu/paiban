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

  await page.getByRole('button', { name: '任务计划中心' }).click();
  await page.getByRole('button', { name: '导入批次' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '导入批次' })).toBeVisible();
  await expect(page.getByText('BATCH-2026-05-W1')).toBeVisible();
  await expect(page.getByText('NX9001')).toBeVisible();

  await page.getByRole('button', { name: '机组与状态' }).click();
  await page.getByRole('button', { name: '机组列表' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '机组列表' })).toBeVisible();
  await expect(page.getByText('CPT001')).toBeVisible();
  await expect(page.getByText('FO001')).toBeVisible();

  await page.getByRole('button', { name: '排班工作台' }).click();
  await page.getByRole('button', { name: '航班视图' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '航班视图' })).toBeVisible();
  await expect(page.getByTestId('gantt-timeline')).toBeVisible();

  await page.getByRole('button', { name: '规则中心' }).click();
  await page.getByRole('button', { name: '规则目录' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '规则目录' })).toBeVisible();
  await expect(page.getByText('FDP_STD_A')).toBeVisible();
});

test('sidebar groups can collapse to parent-only navigation', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('button', { name: '总览' })).toBeVisible();
  await page.getByRole('button', { name: '首页' }).click();
  await expect(page.getByRole('button', { name: '总览' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '任务计划中心' })).toBeVisible();
  await expect(page.getByRole('button', { name: '机组与状态' })).toBeVisible();
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
  await expect(page.getByTestId('timeline-status-legend')).toBeVisible();
  await expect(page.getByTestId('gantt-timeline')).toBeVisible();
  await clickFirstTimelineBlockIfPresent(page);
  await expect(page.getByTestId('archive-drawer')).toHaveCount(0);
  await expect(page.getByTestId('assignment-drawer')).toHaveCount(0);
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

test('flight task protected delete surfaces expected 409 domain feedback', async ({ page }) => {
  await login(page);
  const diagnostics = collectBrowserDiagnostics(page, (response) => {
    return response.status() === 409
      && response.request().method() === 'DELETE'
      && response.url().includes('/api/task-plan/items/');
  }, (message) => message.includes('409 (Conflict)'));
  const expectedConflicts: string[] = [];
  let protectedTaskId: number | null = null;

  await page.route('**/api/task-plan/items', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    const nextPayload = {
      ...payload,
      data: payload.data.map((item: { id: number; taskCode: string; status: string }) => {
        if (item.taskCode !== 'NX9001') return item;
        protectedTaskId = item.id;
        return { ...item, status: 'UNASSIGNED' };
      }),
    };
    await route.fulfill({ response, json: nextPayload });
  });
  page.on('response', (response) => {
    if (protectedTaskId !== null
      && response.status() === 409
      && response.request().method() === 'DELETE'
      && response.url().endsWith(`/api/task-plan/items/${protectedTaskId}`)) {
      expectedConflicts.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await page.goto('/flight-operations/flight-plan');
  await expect(page.getByRole('heading', { level: 1, name: '航班计划' })).toBeVisible();
  await page.getByPlaceholder('搜索航班号、航线、任务类型或状态').fill('NX9001');

  const protectedRow = page.locator('tbody tr').filter({ hasText: 'NX9001' }).first();
  await expect(protectedRow.getByRole('button', { name: '删除航班' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await protectedRow.getByRole('button', { name: '删除航班' }).click();

  await expect(page.getByText('Flights already entered downstream flow cannot be deleted')).toBeVisible();
  expect(expectedConflicts.length).toBeGreaterThan(0);
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

test('draft rostering protected flows preserve read-only open and 409 domain feedback', async ({ page, browser }) => {
  const manager = await browser.newPage({ baseURL: 'http://127.0.0.1:5180' });
  await login(manager, 'manager01');
  await manager.waitForTimeout(300);
  const managerDiagnostics = collectBrowserDiagnostics(manager);

  await manager.goto('/rostering-workbench/draft-rostering');
  await expect(manager.getByRole('heading', { level: 1, name: '草稿排班' })).toBeVisible();
  const managerRow = manager.locator('tbody tr').filter({ hasText: 'NX9001' }).first();
  await managerRow.getByRole('button', { name: '排班' }).click();
  await expect(manager.getByTestId('assignment-drawer')).toBeVisible();
  await expect(manager.getByText('当前任务不可在排班抽屉编辑。')).toBeVisible();
  await expect(manager.getByText('该航班已进入飞后归档，请从飞后归档处理。')).toBeVisible();
  await expect(manager.getByTestId('assignment-save')).toBeDisabled();
  expect(managerDiagnostics.consoleErrors).toEqual([]);
  expect(managerDiagnostics.pageErrors).toEqual([]);
  expect(managerDiagnostics.requestFailures).toEqual([]);
  expect(managerDiagnostics.unexpectedResponses).toEqual([]);
  await manager.close();

  await login(page);
  await page.waitForTimeout(300);
  const dispatcherDiagnostics = collectBrowserDiagnostics(page, (response) => {
    return response.status() === 409
      && response.request().method() === 'PUT'
      && response.url().includes('/api/assignments/tasks/')
      && response.url().endsWith('/draft');
  }, (message) => message.includes('409 (Conflict)'));
  const expectedConflicts: string[] = [];

  await page.route('**/api/assignments/tasks/*', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    const makeEligible = (candidate: { eligibleForAssignment?: boolean; eligibilityReasonCodes?: string[] }) => ({
      ...candidate,
      eligibleForAssignment: true,
      eligibilityReasonCodes: [],
    });
    await route.fulfill({
      response,
      json: {
        ...payload,
        data: {
          ...payload.data,
          canEdit: true,
          canClearDraft: false,
          readOnlyReason: null,
          picCandidates: payload.data.picCandidates.map(makeEligible),
          foCandidates: payload.data.foCandidates.map(makeEligible),
          additionalCandidates: payload.data.additionalCandidates.map(makeEligible),
        },
      },
    });
  });
  page.on('response', (response) => {
    if (response.status() === 409
      && response.request().method() === 'PUT'
      && response.url().includes('/api/assignments/tasks/')
      && response.url().endsWith('/draft')) {
      expectedConflicts.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await page.goto('/rostering-workbench/draft-rostering');
  await expect(page.getByRole('heading', { level: 1, name: '草稿排班' })).toBeVisible();
  const dispatcherRow = page.locator('tbody tr').filter({ hasText: 'NX9001' }).first();
  await dispatcherRow.getByRole('button', { name: '排班' }).click();
  await expect(page.getByTestId('assignment-drawer')).toBeVisible();
  await expect(page.getByTestId('assignment-save')).toBeEnabled();
  await page.getByTestId('assignment-save').click();

  await expect(page.getByText('Archived flights must be handled from Archive Entry')).toBeVisible();
  expect(expectedConflicts.length).toBeGreaterThan(0);
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
  page.on('requestfailed', (request) => diagnostics.requestFailures.push(`${request.method()} ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && !isExpectedResponse(response)) {
      diagnostics.unexpectedResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return diagnostics;
}
