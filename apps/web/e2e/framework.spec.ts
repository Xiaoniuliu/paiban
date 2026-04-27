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

test('UAT-GA-001 to UAT-GA-010 dispatcher archives seed flight from the gantt drawer', async ({ page }) => {
  await login(page);
  await page.locator('select').filter({ has: page.locator('option[value="en-US"]') }).first().selectOption('en-US');
  await page.getByLabel('Display Timezone').selectOption('UTC+8');
  await page.goto('/rostering-workbench/flight-view');
  await expect(page.getByRole('heading', { level: 1, name: 'Flight View' })).toBeVisible();
  await expect(page.locator('.gantt-timeline-canvas .vis-current-time')).toBeVisible();
  await expect(page.getByTestId('timeline-status-legend')).toContainText('Unarchived');
  await expect(page.getByTestId('timeline-next-window')).toHaveCount(0);
  await expect(page.getByTestId('gantt-timeline')).toBeVisible();
  await clickSeedTimelineBlock(page);
  await expect(page.getByTestId('archive-drawer')).toBeVisible();
  await expect(page.getByTestId('archive-case-status')).toContainText('Unarchived');
  await expect(page.locator('[data-testid^="archive-crew-row-"]')).toHaveCount(2);

  await page.getByTestId('archive-form-flying-hour').fill('255');
  await page.getByTestId('archive-form-save').click();
  await expect(page.getByTestId('archive-case-status')).toContainText('Partially Archived');

  await page.locator('[data-testid^="archive-crew-row-"]').nth(1).click();
  await page.getByTestId('archive-form-no-flying-hour').check();
  await page.getByTestId('archive-form-save').click();
  await expect(page.getByTestId('archive-case-status')).toContainText('Archived');

  await page.getByRole('button', { name: 'Close' }).first().click();
  await page.getByLabel('Display Timezone').selectOption('UTC');
  await expect(page.getByText(/\(UTC\)/).first()).toBeVisible();
});

async function clickSeedTimelineBlock(page: Page) {
  const item = page
    .locator('.gantt-timeline-canvas .vis-item.gantt-timeline-item')
    .filter({ hasText: 'NX9001' })
    .first();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await item.isVisible().catch(() => false)) {
      await item.click();
      return;
    }
    await panTimelineForward(page);
  }
  await expect(item).toBeVisible();
  await item.click();
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
