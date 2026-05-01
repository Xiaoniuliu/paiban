# Phase 3 Readiness Gate A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the final Phase 3 readiness gate against expected `409 Conflict` business rejections and prove the UI, backend contract, and F12-equivalent signals stay aligned.

**Architecture:** Extend the existing Playwright smoke coverage with three focused protected-action scenarios: flight task, flight operations master data, and draft rostering. Treat the browser tests as the primary gate, and only make minimal contract-alignment fixes if a scenario fails.

**Tech Stack:** Playwright, Vite React frontend, Spring Boot backend, Maven integration tests, existing `framework.spec.ts` smoke suite

---

## File Structure

- Modify: `apps/web/e2e/framework.spec.ts`
  Responsibility: Add or update the real-click Gate A scenarios and F12-equivalent capture.
- Modify: `docs/superpowers/plans/2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md`
  Responsibility: Record pass/fail evidence for the last readiness gate.
- Possibly modify: `apps/web/src/app/pages/FlightTaskPage.tsx`
  Responsibility: Only if the Gate A flight-task scenario exposes wrong enablement or wrong error surfacing.
- Possibly modify: `apps/web/src/app/pages/FlightOperationsPages.tsx`
  Responsibility: Only if the Gate A run-data scenario exposes wrong action/load error handling.
- Possibly modify: `apps/web/src/app/pages/DraftRosteringPage.tsx`
  Responsibility: Only if the Gate A draft-rostering scenario exposes read-only or domain-message regressions.
- Possibly modify: `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
  Responsibility: Only if the Gate A assignment rejection path surfaces generic instead of domain-specific feedback.
- Possibly modify: `apps/api/src/test/java/com/pilotroster/task/TaskPlanControllerIntegrationTests.java`
  Responsibility: Only if the Gate A flight-task path discovers backend contract drift that needs a regression test.
- Possibly modify: `apps/api/src/test/java/com/pilotroster/flightops/OperationsMasterDataIntegrationTests.java`
  Responsibility: Only if the Gate A run-data path discovers backend contract drift that needs a regression test.
- Possibly modify: `apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java`
  Responsibility: Only if the Gate A draft-rostering path discovers backend contract drift that needs a regression test.

## Task 1: Add flight-task protected-action Gate A scenario

**Files:**
- Modify: `apps/web/e2e/framework.spec.ts`
- Test: `apps/web/e2e/framework.spec.ts`

- [x] **Step 1: Write the failing browser test for protected flight-task actions**

Add a focused scenario beside the existing timeline smoke:

```ts
test('flight task protected actions surface expected 409 domain feedback', async ({ page }) => {
  await login(page);

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const conflictResponses: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() === 409 && response.url().includes('/api/task-plan/items/')) {
      conflictResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await page.goto('/task-plan/flight-list');
  await expect(page.getByRole('heading', { level: 1, name: '航班计划' })).toBeVisible();
  await expect(page.getByText('NX8801')).toBeVisible();

  await page.getByRole('button', { name: '删除航班' }).first().click();
  await page.getByRole('button', { name: '确认' }).click();

  await expect(page.getByText(/保存失败|cannot be deleted|下游/)).toBeVisible();
  expect(conflictResponses.length).toBeGreaterThan(0);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(requestFailures).toEqual([]);
});
```

- [x] **Step 2: Run the single test to verify it fails or exposes the current contract**

Run:

```bash
npx playwright test e2e/framework.spec.ts -g "flight task protected actions surface expected 409 domain feedback" --project=chromium
```

Expected:

- Either `PASS`, proving the gate already holds
- Or `FAIL` with a concrete mismatch such as wrong button enablement, missing domain text, or unexpected console/request failure

- [x] **Step 3: Make the minimal implementation change if the scenario fails**

If the failure is a UI contract mismatch, keep the edit as narrow as possible. The most likely minimal shape is:

```ts
catch ((nextError: unknown) => {
  setActionError(apiErrorMessage(nextError, t('saveFailed')));
})
```

or

```ts
disabled={!item.canDelete}
title={!item.canDelete ? t('taskProtectedReason') : undefined}
```

Do not refactor unrelated task-page structure during this step.

- [x] **Step 4: Rerun the same Playwright test until it passes**

Run:

```bash
npx playwright test e2e/framework.spec.ts -g "flight task protected actions surface expected 409 domain feedback" --project=chromium
```

Expected:

- PASS
- No console error
- No pageerror
- No requestfailed entries outside the intended protected action

- [ ] **Step 5: Commit**

Not executed in this workspace batch. Changes remain in the current dirty worktree for user review.

```bash
git add apps/web/e2e/framework.spec.ts apps/web/src/app/pages/FlightTaskPage.tsx apps/api/src/test/java/com/pilotroster/task/TaskPlanControllerIntegrationTests.java
git commit -m "test: gate protected flight task conflicts"
```

## Task 2: Add run-data protected-action Gate A scenario

**Files:**
- Modify: `apps/web/e2e/framework.spec.ts`
- Possibly modify: `apps/web/src/app/pages/FlightOperationsPages.tsx`
- Possibly modify: `apps/web/src/app/pages/useFlightOperationsManagement.ts`
- Test: `apps/web/e2e/framework.spec.ts`

- [x] **Step 1: Write the failing browser test for protected run-data mutation**

Add a focused scenario that proves protected route / airport / aircraft actions are either disabled with a reason or surface a clean `409` without blanking the page:

```ts
test('flight operations protected mutations keep table state and show domain feedback', async ({ page }) => {
  await login(page);

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const unexpectedFailures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => unexpectedFailures.push(`${request.method()} ${request.url()}`));

  await page.goto('/flight-operations/route-management');
  await expect(page.getByRole('heading', { level: 1, name: '运行资料' })).toBeVisible();
  await expect(page.getByText('MFM-TPE')).toBeVisible();

  const protectedDelete = page.getByRole('button', { name: '删除' }).first();
  await expect(protectedDelete).toBeDisabled();
  await expect(protectedDelete).toHaveAttribute('title', /引用|cannot/i);
  await expect(page.getByText('MFM-TPE')).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(unexpectedFailures).toEqual([]);
});
```

- [x] **Step 2: Run the single test to verify current behavior**

Run:

```bash
npx playwright test e2e/framework.spec.ts -g "flight operations protected mutations keep table state and show domain feedback" --project=chromium
```

Expected:

- Either PASS directly
- Or FAIL with a specific disabled-state, title, or action-error regression

- [x] **Step 3: Apply the smallest fix if the scenario fails**

If a run-data action still collapses into load failure or loses its disabled reason, use the smallest local correction:

```ts
{actionError && (
  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
    {actionError}
  </div>
)}
```

or

```ts
const canDelete = !protectedRouteCodes.has(route.routeCode);
```

Do not restructure the module again unless the failure makes it unavoidable.

- [x] **Step 4: Rerun the scenario and confirm page state survives the rejection path**

Run:

```bash
npx playwright test e2e/framework.spec.ts -g "flight operations protected mutations keep table state and show domain feedback" --project=chromium
```

Expected:

- PASS
- Protected controls match backend rule
- Loaded table remains visible after the attempted protected path

- [ ] **Step 5: Commit**

Not executed in this workspace batch. Changes remain in the current dirty worktree for user review.

```bash
git add apps/web/e2e/framework.spec.ts apps/web/src/app/pages/FlightOperationsPages.tsx apps/web/src/app/pages/useFlightOperationsManagement.ts apps/api/src/test/java/com/pilotroster/flightops/OperationsMasterDataIntegrationTests.java
git commit -m "test: gate protected run data conflicts"
```

## Task 3: Add draft-rostering protected-action Gate A scenario

**Files:**
- Modify: `apps/web/e2e/framework.spec.ts`
- Possibly modify: `apps/web/src/app/pages/DraftRosteringPage.tsx`
- Possibly modify: `apps/web/src/app/components/assignment/AssignmentDrawer.tsx`
- Test: `apps/web/e2e/framework.spec.ts`

- [x] **Step 1: Write the failing browser test for read-only open and ineligible save**

Cover both inspection-mode open and a protected save path:

```ts
test('draft rostering protected flows preserve read-only open and domain rejection messaging', async ({ page, browser }) => {
  const manager = await browser.newPage({ baseURL: 'http://127.0.0.1:5180' });
  await login(manager, 'manager01', '总览');
  await manager.goto('/rostering-workbench/draft-rostering');
  await manager.getByRole('button', { name: /查看|打开/ }).first().click();
  await expect(manager.getByTestId('assignment-drawer')).toBeVisible();
  await expect(manager.getByText(/只读|ROLE_READ_ONLY|read-only/i)).toBeVisible();
  await manager.close();

  await login(page);
  await page.goto('/rostering-workbench/draft-rostering');
  await page.getByRole('button', { name: /打开|编辑/ }).first().click();
  await expect(page.getByTestId('assignment-drawer')).toBeVisible();
  await page.getByTestId('assignment-save').click();
  await expect(page.getByText(/TIME_CONFLICT|CREW_UNAVAILABLE|not eligible/i)).toBeVisible();
});
```

- [x] **Step 2: Run the single test to verify the current protected behavior**

Run:

```bash
npx playwright test e2e/framework.spec.ts -g "draft rostering protected flows preserve read-only open and domain rejection messaging" --project=chromium
```

Expected:

- Either PASS directly
- Or FAIL with a clear regression such as disabled read-only open, generic fallback text, or drawer instability

- [x] **Step 3: Apply the smallest fix if the scenario fails**

Keep the fix narrow to contract alignment. The likely minimal shapes are:

```ts
disabled={!task.canOpenAssignment}
```

and

```ts
setError(apiErrorMessage(nextError, t('assignmentSaveFailed')))
```

or preserving read-only text from the backend:

```ts
const readOnlyReason = detail.readOnlyReason;
```

Avoid changing assignment semantics during this step.

- [x] **Step 4: Rerun the same Playwright scenario and confirm the drawer stays stable**

Run:

```bash
npx playwright test e2e/framework.spec.ts -g "draft rostering protected flows preserve read-only open and domain rejection messaging" --project=chromium
```

Expected:

- PASS
- manager/admin inspection still opens when allowed
- dispatcher rejection surfaces domain-level reasoning
- no runtime error appears in the captured window

- [ ] **Step 5: Commit**

Not executed in this workspace batch. Changes remain in the current dirty worktree for user review.

```bash
git add apps/web/e2e/framework.spec.ts apps/web/src/app/pages/DraftRosteringPage.tsx apps/web/src/app/components/assignment/AssignmentDrawer.tsx apps/api/src/test/java/com/pilotroster/assignment/AssignmentIntegrationTests.java
git commit -m "test: gate protected draft rostering conflicts"
```

## Task 4: Run the full Gate A bundle and update readiness evidence

**Files:**
- Modify: `docs/superpowers/plans/2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md`
- Test: `apps/web/e2e/framework.spec.ts`

- [x] **Step 1: Run the three focused browser scenarios together**

Run:

```bash
npx playwright test e2e/framework.spec.ts -g "protected|display-only" --project=chromium
```

Expected:

- All Gate A scenarios pass
- No uncaught browser runtime failures appear in the protected-action windows

- [x] **Step 2: Run the narrow regression suite for touched backend/frontend contracts**

Run:

```bash
mvn.cmd -f apps\api\pom.xml "-Dtest=TaskPlanControllerIntegrationTests,OperationsMasterDataIntegrationTests,AssignmentIntegrationTests" test
```

Expected:

- BUILD SUCCESS
- No failures or errors in the protected-contract integration tests

- [x] **Step 3: Run frontend verification**

Run:

```bash
npm run build
npm run check:i18n
```

Expected:

- `vite build` passes
- `check:i18n` passes
- existing chunk-size warning may remain, but no new build failure is introduced

- [x] **Step 4: Update the readiness task directory with the final Gate A evidence**

Record the final result in:

```md
- [x] Verify F12 Network matches visible page message for expected 409.
- Passed: `npx playwright test e2e/framework.spec.ts -g "protected|display-only" --project=chromium`
- Evidence: flight task conflict, run-data protection, and draft-rostering protected flows all matched backend contract and produced no unexpected console/page/request errors.
```

- [ ] **Step 5: Commit**

Not executed in this workspace batch. Changes remain in the current dirty worktree for user review.

```bash
git add docs/superpowers/plans/2026-05-01-phase-3-preflight-strict-cleanup-task-directory.md apps/web/e2e/framework.spec.ts
git commit -m "docs: record phase 3 readiness gate evidence"
```

## Self-Review

- Spec coverage: covered all three protected paths from the readiness spec, plus final evidence recording.
- Placeholder scan: no `TBD`, `TODO`, or “implement later” placeholders remain.
- Type consistency: file paths, test names, and command targets match the existing repo structure and current smoke-test location.
