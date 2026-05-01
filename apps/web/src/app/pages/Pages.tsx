import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Archive,
  Clock,
  FileCheck2,
  Pencil,
  Plane,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';
import type { ApiClient } from '../lib/api';
import {
  addUtcHours,
  displayDateTimeLocalToUtcIso,
  nowUtc,
  resizeUtcWindowAroundCenter,
  toDisplayDateTimeLocal,
  toUtcIsoString,
  utcEpochMs,
} from '../lib/time';
import { viewTitleKey } from '../i18n';
import type {
  ArchiveCase,
  ArchiveCaseDetail,
  AssignmentRole,
  AssignmentTaskDetail,
  AircraftRegistry,
  AirportDictionary,
  CreateRunDayAdjustmentRequest,
  CreateCrewStatusBlockRequest,
  CrewMember,
  CrewQualification,
  CrewStatusBlockType,
  DisplayTimezone,
  FlightRoute,
  GanttTimelineBlock,
  Language,
  RunDayAdjustment,
  RunDayAdjustmentType,
  SaveAssignmentDraftRequest,
  SaveCrewArchiveFormRequest,
  TaskPlanImportBatch,
  TaskPlanItem,
  TimelineBlock,
  ViewId,
} from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { DataTableShell, EmptyState, FilterBar, PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import { defaultGanttWindow, GanttTimeline } from '../components/timeline/GanttTimeline';
import { ArchiveDrawer } from '../components/archive/ArchiveDrawer';
import { AssignmentDrawer } from '../components/assignment/AssignmentDrawer';
import type { PageProps } from './pageTypes';
export {
  AccessDeniedPage,
  AdminPage,
  DashboardPage,
  ExceptionsCdrPage,
  LegacyReferencePage,
  PilotPortalPage,
  ReportsPage,
  ValidationCenterPage,
} from './StaticPages';
export {
  LegacyRuleCenterPage,
  RuleCenterPage,
} from './RuleCenterPages';
export { FlightOperationsPage } from './FlightOperationsPages';
export { FlightTaskPage } from './FlightTaskPage';
export { CrewInformationPage } from './CrewInformationPage';
export { CrewStatusTimelinePage } from './CrewStatusTimelinePage';
export { IssueHandlingPage } from './IssueHandlingPage';
export { PublishExportPage, PublishResultPage } from './PublishResultPage';
const timelineQueryDays = 62;

export function RosteringWorkbenchPage(props: PageProps) {
  switch (props.activeView) {
    case 'workbench-flight-view':
      return <WorkbenchFlightViewPage {...props} />;
    case 'workbench-crew-view':
      return <WorkbenchCrewViewPage {...props} />;
    case 'workbench-unassigned-tasks':
      return <WorkbenchUnassignedTasksPage {...props} />;
    case 'workbench-draft-versions':
      return <WorkbenchDraftVersionsPage {...props} />;
    case 'workbench-run-day-adjustments':
      return <WorkbenchRunDayAdjustmentsPage {...props} />;
    case 'workbench-archive-entry':
      return <WorkbenchArchiveEntryPage {...props} />;
    default:
      return <WorkbenchFlightViewPage {...props} />;
  }
}

export function WorkbenchFlightViewPage(props: PageProps) {
  return <WorkbenchTimelinePage {...props} viewMode="FLIGHT" />;
}

export function WorkbenchCrewViewPage(props: PageProps) {
  return <WorkbenchTimelinePage {...props} viewMode="CREW" />;
}

function WorkbenchTimelinePage({
  activeView,
  api,
  t,
  viewMode,
}: PageProps & { viewMode: 'FLIGHT' | 'CREW' }) {
  const workbench = useWorkbenchTimeline(api, t, viewMode);
  const assignment = useAssignmentFlow(api, t, workbench.reloadTimeline);

  return (
    <Card className="flex h-[calc(100vh-6.5rem)] min-h-[30rem] flex-col gap-3 overflow-hidden rounded-lg">
      <WorkbenchCardHeader activeView={activeView} t={t} />
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        <div className="mb-3 shrink-0 text-sm text-muted-foreground"><Timestamp value={nowUtc()} /></div>
        <WorkbenchTimelineBody
          viewMode={viewMode}
          workbench={workbench}
          t={t}
          onAssignmentBlockClick={assignment.openAssignmentTask}
        />
      </CardContent>
      <WorkbenchArchiveDrawer workbench={workbench} t={t} />
      <WorkbenchAssignmentDrawer assignment={assignment} t={t} />
    </Card>
  );
}

export function WorkbenchUnassignedTasksPage({ activeView, api, t }: PageProps) {
  const { items, loading, error, reload } = useTaskPlanItems(api, t);
  const assignment = useAssignmentFlow(api, t, reload);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Plane}
        title={t(viewTitleKey[activeView])}
        description={t('taskPlanDescription')}
      />
      {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
      {!loading && !error && (
        <TaskPlanItemsTable
          items={items}
          t={t}
          emptyTitle={t(viewTitleKey[activeView])}
          emptyDescription={t('noData')}
          onOpenAssignment={assignment.openAssignmentTask}
        />
      )}
      <WorkbenchAssignmentDrawer assignment={assignment} t={t} />
    </div>
  );
}

export function WorkbenchDraftVersionsPage({ activeView, api, t }: PageProps) {
  const { items, loading, error, reload } = useTaskPlanItems(api, t);
  const assignment = useAssignmentFlow(api, t, reload);
  const draftItems = useMemo(() => (
    items
      .filter((item) => item.status === 'ASSIGNED_DRAFT')
      .sort((left, right) => utcEpochMs(left.scheduledStartUtc) - utcEpochMs(right.scheduledStartUtc))
  ), [items]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileCheck2}
        title={t(viewTitleKey[activeView])}
        description={t('workbenchDescription')}
      />
      <Card className="rounded-lg" data-testid="publish-result-entry">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base">{t('publishResultsActionTitle')}</CardTitle>
              <CardDescription>{t('publishResultsWorkbenchRedirect')}</CardDescription>
            </div>
            <Button asChild type="button" size="sm">
              <a href="/validation-center/release-gates">{t('openPublishResults')}</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('publishResultsWorkbenchNote')}
        </CardContent>
      </Card>
      {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
      {!loading && (
        <div className="space-y-4">
          <Card className="rounded-lg" data-testid="issue-handling-entry">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-base">{t('validationIssues')}</CardTitle>
                  <CardDescription>{t('issueHandlingDescription')}</CardDescription>
                </div>
                <Button asChild type="button" size="sm" variant="outline">
                  <a href="/validation-center/violation-handling">{t('openIssueHandling')}</a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t('issueHandlingRefreshHint')}
            </CardContent>
          </Card>
          <Card className="rounded-lg" data-testid="draft-task-list">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('validationDraftAssigned')}</CardTitle>
              <CardDescription>{t('draftVersionActionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      {[t('taskPool'), t('route'), t('start'), t('end'), t('status'), t('actions')].map((column) => (
                        <th key={column} className="whitespace-nowrap px-3 py-3 font-medium">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {draftItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6">
                          <EmptyState
                            title={t('validationDraftAssigned')}
                            description={t('noData')}
                          />
                        </td>
                      </tr>
                    ) : (
                      draftItems.map((item) => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap px-3 py-3 font-medium">{item.taskCode}</td>
                          <td className="whitespace-nowrap px-3 py-3">{routeLabel(item)}</td>
                          <td className="whitespace-nowrap px-3 py-3"><Timestamp value={item.scheduledStartUtc} /></td>
                          <td className="whitespace-nowrap px-3 py-3"><Timestamp value={item.scheduledEndUtc} /></td>
                          <td className="whitespace-nowrap px-3 py-3"><TaskStatusBadge status={item.status} t={t} /></td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => assignment.openAssignmentTask(item.id)}
                            >
                              {t('assignmentAdjust')}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {error && <div className="text-sm text-destructive">{error}</div>}
      <WorkbenchAssignmentDrawer assignment={assignment} t={t} />
    </div>
  );
}

function ValidationMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

export function WorkbenchRunDayAdjustmentsPage({ activeView, api, t, timezone }: PageProps) {
  const { items, loading, error, reload } = useTaskPlanItems(api, t);
  const workbench = useWorkbenchTimeline(api, t, 'CREW');
  const [adjustments, setAdjustments] = useState<RunDayAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(true);
  const [adjustmentError, setAdjustmentError] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [applyingAdjustmentId, setApplyingAdjustmentId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [form, setForm] = useState<RunDayAdjustmentForm>(() => emptyRunDayAdjustmentForm());
  const runDayControlRef = useRef<HTMLDivElement | null>(null);
  const runDayImpactRef = useRef<HTMLDivElement | null>(null);

  const loadAdjustments = useCallback(() => {
    let active = true;
    setAdjustmentsLoading(true);
    setAdjustmentError('');
    api.runDayAdjustments()
      .then((nextAdjustments) => {
        if (active) setAdjustments(nextAdjustments);
      })
      .catch(() => {
        if (active) setAdjustmentError(t('runDayAdjustmentLoadError'));
      })
      .finally(() => {
        if (active) setAdjustmentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  useEffect(() => loadAdjustments(), [loadAdjustments]);

  const selectTask = useCallback((item: TaskPlanItem) => {
    setSelectedTaskId(item.id);
    setForm(runDayAdjustmentFormForTask(item, timezone));
    workbench.setTimelineWindow(runDayImpactWindowForTask(item));
    setSaveMessage('');
  }, [timezone, workbench.setTimelineWindow]);

  const previewTaskImpact = useCallback((item: TaskPlanItem) => {
    selectTask(item);
    window.setTimeout(() => {
      runDayImpactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }, [selectTask]);

  const startCrewReplacement = useCallback((item: TaskPlanItem) => {
    const replacementDefaults = runDayCrewReplacementDefaults(item, workbench.blocks);
    setSelectedTaskId(item.id);
    setForm({
      ...runDayAdjustmentFormForTask(item, timezone),
      adjustmentType: 'CREW_REPLACEMENT',
      assignmentRole: replacementDefaults.assignmentRole,
      fromCrewId: replacementDefaults.fromCrewId,
    });
    workbench.setTimelineWindow(runDayImpactWindowForTask(item));
    setSaveMessage('');
    window.setTimeout(() => {
      runDayControlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [timezone, workbench.blocks, workbench.setTimelineWindow]);

  useEffect(() => {
    if (selectedTaskId == null && items.length > 0) {
      selectTask(items[0]);
    }
  }, [items, selectTask, selectedTaskId]);

  const selectedTask = useMemo(() => (
    items.find((item) => item.id === selectedTaskId) ?? items[0] ?? null
  ), [items, selectedTaskId]);
  const selectedAdjustment = selectedTask
    ? adjustments.find((adjustment) => adjustment.taskId === selectedTask.id) ?? null
    : null;

  useEffect(() => {
    if (!selectedTask) return;
    workbench.setTimelineWindow(runDayImpactWindowFromForm(selectedTask, form, timezone));
  }, [
    form.effectiveEndLocal,
    form.effectiveStartLocal,
    form.proposedEndLocal,
    form.proposedStartLocal,
    selectedTask,
    timezone,
    workbench.setTimelineWindow,
  ]);

  useEffect(() => {
    if (!selectedTask || form.adjustmentType !== 'CREW_REPLACEMENT' || form.fromCrewId) return;
    const replacementDefaults = runDayCrewReplacementDefaults(selectedTask, workbench.blocks);
    if (!replacementDefaults.fromCrewId) return;
    setForm((current) => ({
      ...current,
      assignmentRole: replacementDefaults.assignmentRole,
      fromCrewId: replacementDefaults.fromCrewId,
    }));
  }, [form.adjustmentType, form.fromCrewId, selectedTask, workbench.blocks]);

  const affectedRows = useMemo(() => (
    items.slice(0, 12).map((item) => {
      const latestAdjustment = adjustments.find((adjustment) => adjustment.taskId === item.id);
      return [
        <button
          type="button"
          className="font-medium text-left hover:text-primary"
          onClick={() => selectTask(item)}
        >
          {item.taskCode}
        </button>,
        routeLabel(item),
        <Timestamp value={item.scheduledStartUtc} />,
        latestAdjustment ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant="outline">{runDayAdjustmentTypeLabel(latestAdjustment.adjustmentType, t)}</Badge>
            <Badge variant={latestAdjustment.status === 'APPLIED' ? 'default' : 'outline'}>{runDayAdjustmentStatusLabel(latestAdjustment.status, t)}</Badge>
            {latestAdjustment.proposedStartUtc ? <Timestamp value={latestAdjustment.proposedStartUtc} /> : t('runDayNoTimeChange')}
          </span>
        ) : (
          <span className="text-muted-foreground">{t('runDayNoDraft')}</span>
        ),
        <TaskStatusBadge status={item.status} t={t} />,
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedTaskId === item.id ? 'default' : 'outline'}
            onClick={() => previewTaskImpact(item)}
          >
            {t('runDayPreviewImpact')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => startCrewReplacement(item)}
          >
            {t('runDayOpenAssignment')}
          </Button>
        </div>,
      ];
    })
  ), [adjustments, items, previewTaskImpact, selectedTaskId, startCrewReplacement, t]);

  const adjustmentRows = useMemo(() => (
    adjustments.map((adjustment) => ([
      <span className="font-medium">{adjustment.taskCode}</span>,
      adjustment.route,
      <Badge variant="outline">{runDayAdjustmentTypeLabel(adjustment.adjustmentType, t)}</Badge>,
      adjustment.proposedStartUtc ? <Timestamp value={adjustment.proposedStartUtc} /> : t('runDayNoTimeChange'),
      <Badge variant={adjustment.status === 'APPLIED' ? 'default' : 'outline'}>{runDayAdjustmentStatusLabel(adjustment.status, t)}</Badge>,
      <Timestamp value={adjustment.createdAtUtc} />,
      adjustment.status === 'DRAFT' ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={applyingAdjustmentId === adjustment.id}
          onClick={() => applyRunDayAdjustment(adjustment.id)}
        >
          {applyingAdjustmentId === adjustment.id ? `${t('saving')}...` : t('runDayApplyAdjustment')}
        </Button>
      ) : (
        <span className="text-muted-foreground">{t('runDayApplied')}</span>
      ),
    ]))
  ), [adjustments, applyingAdjustmentId, t]);

  const saveRunDayAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTask) return;
    setSavingAdjustment(true);
    setAdjustmentError('');
    setSaveMessage('');
    try {
      const payload: CreateRunDayAdjustmentRequest = {
        taskId: selectedTask.id,
        adjustmentType: form.adjustmentType,
        proposedStartUtc: displayDateTimeLocalToUtcIso(form.proposedStartLocal, timezone),
        proposedEndUtc: displayDateTimeLocalToUtcIso(form.proposedEndLocal, timezone),
        fromCrewId: form.fromCrewId ? Number(form.fromCrewId) : null,
        toCrewId: form.toCrewId ? Number(form.toCrewId) : null,
        assignmentRole: form.assignmentRole,
        effectiveStartUtc: displayDateTimeLocalToUtcIso(form.effectiveStartLocal, timezone),
        effectiveEndUtc: displayDateTimeLocalToUtcIso(form.effectiveEndLocal, timezone),
        reason: form.reason.trim(),
      };
      const saved = await api.createRunDayAdjustment(payload);
      setAdjustments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSaveMessage(t('runDayAdjustmentSaved'));
    } catch {
      setAdjustmentError(t('runDayAdjustmentSaveError'));
    } finally {
      setSavingAdjustment(false);
    }
  };

  async function applyRunDayAdjustment(adjustmentId: number) {
    setApplyingAdjustmentId(adjustmentId);
    setAdjustmentError('');
    setSaveMessage('');
    try {
      const applied = await api.applyRunDayAdjustment(adjustmentId);
      setAdjustments((current) => current.map((item) => (
        item.id === applied.id ? applied : item
      )));
      reload();
      workbench.reloadTimeline();
      setSaveMessage(t('runDayAdjustmentApplied'));
    } catch {
      setAdjustmentError(t('runDayAdjustmentApplyError'));
    } finally {
      setApplyingAdjustmentId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Clock}
        title={t(viewTitleKey[activeView])}
        description={t('runDayAdjustmentDescription')}
      />
      {(error || adjustmentError || workbench.error) && (
        <div className="text-sm text-destructive">{error || adjustmentError || workbench.error}</div>
      )}
      {saveMessage && <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{saveMessage}</div>}
      <Card ref={runDayControlRef} className="rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('runDayAdjustmentControl')}</CardTitle>
          <CardDescription>{t('runDayAdjustmentControlDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 lg:grid-cols-5" onSubmit={saveRunDayAdjustment}>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t('taskPool')}</span>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                disabled={loading || savingAdjustment || items.length === 0}
                value={selectedTask?.id ?? ''}
                onChange={(event) => {
                  const item = items.find((candidate) => candidate.id === Number(event.target.value));
                  if (item) selectTask(item);
                }}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.taskCode} {routeLabel(item)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t('runDayAdjustmentType')}</span>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                disabled={!selectedTask || savingAdjustment}
                value={form.adjustmentType}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  adjustmentType: event.target.value as RunDayAdjustmentType,
                }))}
              >
                {runDayAdjustmentTypes.map((type) => (
                  <option key={type} value={type}>{runDayAdjustmentTypeLabel(type, t)}</option>
                ))}
              </select>
            </label>
            {form.adjustmentType === 'CREW_REPLACEMENT' && (
              <>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">{t('runDayFromCrew')}</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    disabled={!selectedTask || savingAdjustment}
                    value={form.fromCrewId}
                    onChange={(event) => setForm((current) => ({ ...current, fromCrewId: event.target.value }))}
                  >
                    <option value="">{t('assignmentSelectPlaceholder')}</option>
                    {workbench.crewRows.map((crew) => (
                      <option key={crew.id} value={crew.id}>{crew.crewCode} {crew.nameEn}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">{t('runDayToCrew')}</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    disabled={!selectedTask || savingAdjustment}
                    value={form.toCrewId}
                    onChange={(event) => setForm((current) => ({ ...current, toCrewId: event.target.value }))}
                  >
                    <option value="">{t('assignmentSelectPlaceholder')}</option>
                    {workbench.crewRows.map((crew) => (
                      <option key={crew.id} value={crew.id}>{crew.crewCode} {crew.nameEn}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">{t('assignmentAdditionalRole')}</span>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    disabled={!selectedTask || savingAdjustment}
                    value={form.assignmentRole}
                    onChange={(event) => setForm((current) => ({ ...current, assignmentRole: event.target.value as AssignmentRole }))}
                  >
                    {assignmentRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">{t('runDayEffectiveStart')}</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    disabled={!selectedTask || savingAdjustment}
                    type="datetime-local"
                    value={form.effectiveStartLocal}
                    onChange={(event) => setForm((current) => ({ ...current, effectiveStartLocal: event.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">{t('runDayEffectiveEnd')}</span>
                  <input
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    disabled={!selectedTask || savingAdjustment}
                    type="datetime-local"
                    value={form.effectiveEndLocal}
                    onChange={(event) => setForm((current) => ({ ...current, effectiveEndLocal: event.target.value }))}
                  />
                </label>
              </>
            )}
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t('start')}</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                disabled={!selectedTask || savingAdjustment}
                type="datetime-local"
                value={form.proposedStartLocal}
                onChange={(event) => setForm((current) => ({ ...current, proposedStartLocal: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t('end')}</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                disabled={!selectedTask || savingAdjustment}
                type="datetime-local"
                value={form.proposedEndLocal}
                onChange={(event) => setForm((current) => ({ ...current, proposedEndLocal: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{t('runDayReason')}</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                disabled={!selectedTask || savingAdjustment}
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              />
            </label>
            <div className="flex flex-wrap items-end gap-2 lg:col-span-5">
              <Button type="submit" disabled={!selectedTask || savingAdjustment || !form.reason.trim()}>
                {savingAdjustment ? `${t('saving')}...` : t('runDaySaveDraft')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedTask}
                onClick={() => selectedTask && startCrewReplacement(selectedTask)}
              >
                {t('runDayOpenAssignment')}
              </Button>
              <Button asChild type="button" variant="outline">
                <a href="/exceptions-cdr/exception-requests">{t('validationOpenException')}</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <DataTableShell
          columns={[t('taskPool'), t('route'), t('start'), t('runDayLatestDraft'), t('status'), t('actions')]}
          rows={affectedRows}
          emptyState={<EmptyState title={t(viewTitleKey[activeView])} description={t('noData')} />}
        />
        <div ref={runDayImpactRef}>
          <RunDayImpactPanel
            form={form}
            selectedAdjustment={selectedAdjustment}
            selectedTask={selectedTask}
            workbench={workbench}
            t={t}
          />
        </div>
      </div>
      {(adjustmentsLoading || loading) && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
      <DataTableShell
        columns={[t('taskPool'), t('route'), t('runDayAdjustmentType'), t('runDayProposedStart'), t('status'), t('runDayCreatedAt'), t('actions')]}
        rows={adjustmentRows}
        emptyState={<EmptyState title={t('runDayAdjustmentHistory')} description={t('runDayNoDraft')} />}
      />
      <Card className="flex h-[28rem] flex-col overflow-hidden rounded-lg">
        <CardHeader className="shrink-0 px-4 py-3">
          <CardTitle>{t('runDayImpactTimeline')}</CardTitle>
          <CardDescription>{t('runDayImpactTimelineDescription')}</CardDescription>
          <div>
            <Button asChild size="sm" variant="outline">
              <a href="/rostering-workbench/crew-view">{t('runDayOpenFullCrewView')}</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3">
          <RunDayImpactTimeline
            form={form}
            selectedTask={selectedTask}
            timezone={timezone}
            workbench={workbench}
            t={t}
          />
        </CardContent>
      </Card>
      <WorkbenchArchiveDrawer workbench={workbench} t={t} />
    </div>
  );
}

export function WorkbenchArchiveEntryPage({ activeView, api, t }: PageProps) {
  const workbench = useWorkbenchTimeline(api, t, 'CREW', defaultArchiveEntryWindow);
  const [archiveCases, setArchiveCases] = useState<ArchiveCase[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveQueueFilter>('OPEN');

  const loadArchiveCases = useCallback(() => {
    let active = true;
    setArchiveLoading(true);
    setArchiveError('');
    api.syncArchiveState()
      .then(() => api.archiveCases())
      .then((cases) => {
        if (active) setArchiveCases(cases);
      })
      .catch(() => {
        if (active) setArchiveError(t('archiveQueueLoadError'));
      })
      .finally(() => {
        if (active) setArchiveLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  useEffect(() => loadArchiveCases(), [loadArchiveCases]);
  useEffect(() => {
    if (workbench.archiveDetail) loadArchiveCases();
  }, [loadArchiveCases, workbench.archiveDetail?.archiveCase.revision]);

  const filteredArchiveCases = useMemo(() => (
    archiveCases.filter((archiveCase) => archiveCaseMatchesFilter(archiveCase, archiveFilter))
  ), [archiveCases, archiveFilter]);
  const archiveMetrics = useMemo(() => ({
    open: archiveCases.filter((archiveCase) => archiveCase.archiveStatus !== 'Archived').length,
    overdue: archiveCases.filter((archiveCase) => archiveCase.archiveStatus === 'Overdue').length,
    partial: archiveCases.filter((archiveCase) => archiveCase.archiveStatus === 'PartiallyArchived').length,
    archived: archiveCases.filter((archiveCase) => archiveCase.archiveStatus === 'Archived').length,
  }), [archiveCases]);
  const archiveRows = useMemo(() => (
    filteredArchiveCases.map((archiveCase) => ([
      <Button
        type="button"
        variant="ghost"
        className="h-auto justify-start px-0 py-0 font-semibold"
        onClick={() => workbench.openArchiveCase(archiveCase.id)}
      >
        {archiveCase.taskCode}
      </Button>,
      archiveCase.route,
      <ArchiveStatusBadge status={archiveCase.archiveStatus} t={t} />,
      <Timestamp value={archiveCase.archiveDeadlineAtUtc} />,
      archiveCaseProgress(archiveCase),
      <Button type="button" size="sm" variant="outline" onClick={() => workbench.openArchiveCase(archiveCase.id)}>
        {t('archiveOpenDetail')}
      </Button>,
    ]))
  ), [filteredArchiveCases, t, workbench]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Archive}
        title={t(viewTitleKey[activeView])}
        description={t('archiveQueueDescription')}
      />
      {(archiveError || workbench.error) && <div className="text-sm text-destructive">{archiveError || workbench.error}</div>}
      <Card className="rounded-lg">
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ValidationMetric label={t('archiveMetricOpen')} value={archiveMetrics.open} tone={archiveMetrics.open > 0 ? 'text-warning' : undefined} />
            <ValidationMetric label={t('archiveMetricOverdue')} value={archiveMetrics.overdue} tone={archiveMetrics.overdue > 0 ? 'text-destructive' : undefined} />
            <ValidationMetric label={t('archiveMetricPartial')} value={archiveMetrics.partial} />
            <ValidationMetric label={t('archiveMetricArchived')} value={archiveMetrics.archived} tone="text-success" />
          </div>
          <div className="flex flex-wrap gap-2">
            {archiveQueueFilters.map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={archiveFilter === filter ? 'default' : 'outline'}
                onClick={() => setArchiveFilter(filter)}
              >
                {archiveQueueFilterLabel(filter, t)}
              </Button>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={loadArchiveCases} disabled={archiveLoading}>
              <RefreshCw className="h-4 w-4" />
              {t('refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>
      {archiveLoading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
      {!archiveLoading && !archiveError && (
        <DataTableShell
          columns={[t('taskPool'), t('route'), t('archiveStatus'), t('archiveDeadline'), t('archiveCrewSummary'), t('actions')]}
          rows={archiveRows}
          emptyState={<EmptyState title={t(viewTitleKey[activeView])} description={t('archiveQueueEmptyDescription')} />}
        />
      )}
      <WorkbenchArchiveDrawer workbench={workbench} t={t} />
    </div>
  );
}

const runDayAdjustmentTypes: RunDayAdjustmentType[] = [
  'DELAY',
  'CANCEL',
  'STANDBY_CALLOUT',
  'CREW_REPLACEMENT',
  'REST_INSERT',
];

const assignmentRoles: AssignmentRole[] = ['PIC', 'FO', 'RELIEF', 'EXTRA'];

interface RunDayAdjustmentForm {
  adjustmentType: RunDayAdjustmentType;
  proposedStartLocal: string;
  proposedEndLocal: string;
  fromCrewId: string;
  toCrewId: string;
  assignmentRole: AssignmentRole;
  effectiveStartLocal: string;
  effectiveEndLocal: string;
  reason: string;
}

function emptyRunDayAdjustmentForm(): RunDayAdjustmentForm {
  return {
    adjustmentType: 'DELAY',
    proposedStartLocal: '',
    proposedEndLocal: '',
    fromCrewId: '',
    toCrewId: '',
    assignmentRole: 'PIC',
    effectiveStartLocal: '',
    effectiveEndLocal: '',
    reason: '',
  };
}

function runDayAdjustmentFormForTask(item: TaskPlanItem, timezone: DisplayTimezone): RunDayAdjustmentForm {
  return {
    adjustmentType: 'DELAY',
    proposedStartLocal: toDisplayDateTimeLocal(item.scheduledStartUtc, timezone),
    proposedEndLocal: toDisplayDateTimeLocal(item.scheduledEndUtc, timezone),
    fromCrewId: '',
    toCrewId: '',
    assignmentRole: 'PIC',
    effectiveStartLocal: toDisplayDateTimeLocal(item.scheduledStartUtc, timezone),
    effectiveEndLocal: toDisplayDateTimeLocal(item.scheduledEndUtc, timezone),
    reason: '',
  };
}

function runDayAdjustmentTypeLabel(type: RunDayAdjustmentType, t: (key: string) => string) {
  const key = `runDayAdjustmentType${type}`;
  const label = t(key);
  return label === key ? type : label;
}

function runDayAdjustmentStatusLabel(status: string, t: (key: string) => string) {
  const key = `runDayAdjustmentStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function runDayImpactWindowForTask(item: TaskPlanItem): TimelineWindow {
  return {
    windowStartUtc: toUtcIsoString(addUtcHours(item.scheduledStartUtc, -12)),
    windowEndUtc: toUtcIsoString(addUtcHours(item.scheduledEndUtc, 12)),
  };
}

function runDayCrewReplacementDefaults(item: TaskPlanItem, blocks: GanttTimelineBlock[]) {
  const taskBlocks = blocks
    .filter((block) => block.flightId === item.id && block.crewId != null)
    .sort((left, right) => (
      Number(left.displayOrder ?? 9999) - Number(right.displayOrder ?? 9999)
      || Number(left.blockId) - Number(right.blockId)
    ));
  const preferredBlock = taskBlocks.find((block) => block.assignmentRole === 'PIC')
    ?? taskBlocks.find((block) => block.assignmentRole === 'FO')
    ?? taskBlocks[0];
  return {
    assignmentRole: preferredBlock?.assignmentRole ?? 'PIC',
    fromCrewId: preferredBlock?.crewId ? String(preferredBlock.crewId) : '',
  };
}

function RunDayImpactPanel({
  form,
  selectedAdjustment,
  selectedTask,
  workbench,
  t,
}: {
  form: RunDayAdjustmentForm;
  selectedAdjustment: RunDayAdjustment | null;
  selectedTask: TaskPlanItem | null;
  workbench: WorkbenchTimelineState;
  t: (key: string) => string;
}) {
  const candidateCrew = workbench.crewRows.slice(0, 5);
  const currentAssignments = useMemo(() => (
    selectedTask
      ? runDayTaskBlocks(workbench.blocks, selectedTask.id)
      : []
  ), [selectedTask, workbench.blocks]);
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('runDayImpactPreview')}</CardTitle>
        <CardDescription>{selectedTask ? selectedTask.taskCode : t('runDayNoSelection')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!selectedTask && <EmptyState title={t('runDayImpactPreview')} description={t('runDayNoSelection')} />}
        {selectedTask && (
          <>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('route')}</span>
                <span className="text-right">{routeLabel(selectedTask)}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('start')}</span>
                <span className="text-right"><Timestamp value={selectedTask.scheduledStartUtc} /></span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('end')}</span>
                <span className="text-right"><Timestamp value={selectedTask.scheduledEndUtc} /></span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('status')}</span>
                <TaskStatusBadge status={selectedTask.status} t={t} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('runDayProposedWindow')}</span>
                <span className="text-right">
                  {form.proposedStartLocal && form.proposedEndLocal
                    ? `${form.proposedStartLocal.replace('T', ' ')} - ${form.proposedEndLocal.replace('T', ' ')}`
                    : t('runDayNoTimeChange')}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-2 font-medium">{t('assignmentCurrent')}</div>
              <div className="flex flex-wrap gap-2">
                {currentAssignments.map((block) => (
                  <Badge key={block.blockId} variant="outline">
                    {block.assignmentRole ?? t('dutyStatusFLIGHT')} {block.crewCode} {block.crewName}
                  </Badge>
                ))}
                {currentAssignments.length === 0 && <span className="text-muted-foreground">{t('noData')}</span>}
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-2 font-medium">{t('runDayLatestDraft')}</div>
              {selectedAdjustment ? (
                <div className="space-y-1 text-muted-foreground">
                  <div>{runDayAdjustmentTypeLabel(selectedAdjustment.adjustmentType, t)}</div>
                  <div>{selectedAdjustment.proposedStartUtc ? <Timestamp value={selectedAdjustment.proposedStartUtc} /> : t('runDayNoTimeChange')}</div>
                  <div>{selectedAdjustment.reason}</div>
                </div>
              ) : (
                <div className="text-muted-foreground">{t('runDayNoDraft')}</div>
              )}
            </div>
            <div>
              <div className="mb-2 font-medium">{t('runDayCandidateCrew')}</div>
              <div className="flex flex-wrap gap-2">
                {candidateCrew.map((crew) => (
                  <Badge key={crew.id} variant="outline">{crew.crewCode} {crew.nameEn}</Badge>
                ))}
                {candidateCrew.length === 0 && <span className="text-muted-foreground">{t('noData')}</span>}
              </div>
            </div>
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-warning">
              {t('runDayRuleNote')}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RunDayImpactTimeline({
  form,
  selectedTask,
  timezone,
  workbench,
  t,
}: {
  form: RunDayAdjustmentForm;
  selectedTask: TaskPlanItem | null;
  timezone: DisplayTimezone;
  workbench: WorkbenchTimelineState;
  t: (key: string) => string;
}) {
  const impactData = useMemo(() => (
    selectedTask
      ? buildRunDayImpactTimelineData(selectedTask, form, timezone, workbench.blocks, workbench.crewRows)
      : { blocks: [] as GanttTimelineBlock[], crewRows: [] as CrewMember[] }
  ), [form, selectedTask, timezone, workbench.blocks, workbench.crewRows]);

  if (!selectedTask) {
    return <EmptyState title={t('runDayImpactTimeline')} description={t('runDayNoSelection')} />;
  }

  if (workbench.showBlockingLoading) {
    return <div className="text-sm text-muted-foreground">{t('loading')}...</div>;
  }

  if (workbench.error) {
    return <div className="text-sm text-destructive">{workbench.error}</div>;
  }

  return (
    <GanttTimeline
      blocks={impactData.blocks}
      crewRows={impactData.crewRows}
      viewMode="CREW"
      windowStartUtc={workbench.timelineWindow.windowStartUtc}
      windowEndUtc={workbench.timelineWindow.windowEndUtc}
      t={t}
      onWindowChange={workbench.setTimelineWindow}
      onFlightBlockClick={workbench.openArchiveDrawer}
      onAssignmentBlockClick={() => undefined}
    />
  );
}

function buildRunDayImpactTimelineData(
  selectedTask: TaskPlanItem,
  form: RunDayAdjustmentForm,
  timezone: DisplayTimezone,
  blocks: GanttTimelineBlock[],
  crewRows: CrewMember[]
) {
  const selectedTaskBlocks = runDayTaskBlocks(blocks, selectedTask.id);
  const crewIds = new Set<number>();
  for (const block of selectedTaskBlocks) {
    if (block.crewId != null) crewIds.add(block.crewId);
  }
  for (const crewId of [form.fromCrewId, form.toCrewId]) {
    if (crewId) crewIds.add(Number(crewId));
  }

  const impactWindow = runDayImpactWindowFromForm(selectedTask, form, timezone);
  const impactBlocks = blocks.filter((block) => {
    if (block.flightId === selectedTask.id) return true;
    if (block.crewId == null || !crewIds.has(block.crewId)) return false;
    return rangesOverlap(block.startUtc, block.endUtc, impactWindow.windowStartUtc, impactWindow.windowEndUtc);
  });
  const visibleCrewIds = new Set(impactBlocks.map((block) => block.crewId).filter((id): id is number => id != null));
  for (const crewId of crewIds) visibleCrewIds.add(crewId);
  return {
    blocks: impactBlocks,
    crewRows: crewRows.filter((crew) => visibleCrewIds.has(crew.id)),
  };
}

function runDayTaskBlocks(blocks: GanttTimelineBlock[], taskId: number) {
  return blocks
    .filter((block) => block.flightId === taskId && block.crewId != null)
    .sort((left, right) => (
      Number(left.displayOrder ?? 9999) - Number(right.displayOrder ?? 9999)
      || Number(left.blockId) - Number(right.blockId)
    ));
}

function runDayImpactWindowFromForm(selectedTask: TaskPlanItem, form: RunDayAdjustmentForm, timezone: DisplayTimezone): TimelineWindow {
  const window = runDayImpactWindowForTask(selectedTask);
  const instants = [
    selectedTask.scheduledStartUtc,
    selectedTask.scheduledEndUtc,
    tryParseRunDayLocalInstant(form.proposedStartLocal, timezone),
    tryParseRunDayLocalInstant(form.proposedEndLocal, timezone),
    tryParseRunDayLocalInstant(form.effectiveStartLocal, timezone),
    tryParseRunDayLocalInstant(form.effectiveEndLocal, timezone),
  ].filter((value): value is string => Boolean(value));
  if (instants.length === 0) return window;
  const startMs = Math.min(...instants.map((value) => utcEpochMs(value)));
  const endMs = Math.max(...instants.map((value) => utcEpochMs(value)));
  return {
    windowStartUtc: toUtcIsoString(startMs - 12 * 60 * 60 * 1000),
    windowEndUtc: toUtcIsoString(endMs + 12 * 60 * 60 * 1000),
  };
}

function tryParseRunDayLocalInstant(value: string, timezone: DisplayTimezone) {
  if (!value) return null;
  try {
    return displayDateTimeLocalToUtcIso(value, timezone);
  } catch {
    return null;
  }
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return utcEpochMs(startA) < utcEpochMs(endB) && utcEpochMs(endA) > utcEpochMs(startB);
}

type ArchiveQueueFilter = 'ALL' | 'OPEN' | 'Unarchived' | 'PartiallyArchived' | 'Overdue' | 'Archived';

const archiveQueueFilters: ArchiveQueueFilter[] = ['OPEN', 'Unarchived', 'PartiallyArchived', 'Overdue', 'Archived', 'ALL'];

function archiveCaseMatchesFilter(archiveCase: ArchiveCase, filter: ArchiveQueueFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'OPEN') return archiveCase.archiveStatus !== 'Archived';
  return archiveCase.archiveStatus === filter;
}

function archiveQueueFilterLabel(filter: ArchiveQueueFilter, t: (key: string) => string) {
  if (filter === 'ALL') return t('archiveFilterAll');
  if (filter === 'OPEN') return t('archiveFilterOpen');
  return statusLabel(filter, t);
}

type WorkbenchTimelineState = ReturnType<typeof useWorkbenchTimeline>;
type TimelineWindow = {
  windowStartUtc: string;
  windowEndUtc: string;
};

function timelineQueryWindow(windowStartUtc: string, windowEndUtc: string): TimelineWindow {
  const centerMs = (utcEpochMs(windowStartUtc) + utcEpochMs(windowEndUtc)) / 2;
  return resizeUtcWindowAroundCenter(
    toUtcIsoString(centerMs),
    toUtcIsoString(centerMs),
    timelineQueryDays,
  );
}

function useWorkbenchTimeline(
  api: ApiClient,
  t: (key: string) => string,
  viewMode: 'FLIGHT' | 'CREW',
  initialWindow = defaultGanttWindow,
) {
  const initialTimelineWindow = useMemo(() => initialWindow(), [initialWindow]);
  const [blocks, setBlocks] = useState<GanttTimelineBlock[]>([]);
  const [crewRows, setCrewRows] = useState<CrewMember[]>([]);
  const [timelineWindow, setTimelineWindow] = useState(initialTimelineWindow);
  const [queryWindow, setQueryWindow] = useState(() => (
    timelineQueryWindow(initialTimelineWindow.windowStartUtc, initialTimelineWindow.windowEndUtc)
  ));
  const [archiveDetail, setArchiveDetail] = useState<ArchiveCaseDetail | null>(null);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [crewLoading, setCrewLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [timelineReloadKey, setTimelineReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setCrewLoading(true);
    setError('');
    api.crewMembers()
      .then((crewData) => {
        if (active) setCrewRows(crewData);
      })
      .catch(() => {
        if (active) setError(t('workbenchLoadError'));
      })
      .finally(() => {
        if (active) setCrewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  useEffect(() => {
    let active = true;
    setTimelineLoaded(false);
    setError('');
    api.syncArchiveState()
      .then(() => api.ganttTimeline({
        windowStartUtc: queryWindow.windowStartUtc,
        windowEndUtc: queryWindow.windowEndUtc,
        viewMode,
      }))
      .then((timelineBlocks) => {
        if (!active) return;
        setBlocks(timelineBlocks);
      })
      .catch(() => {
        if (active) {
          setError(t('workbenchLoadError'));
        }
      })
      .finally(() => {
        if (active) setTimelineLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [api, t, queryWindow.windowEndUtc, queryWindow.windowStartUtc, timelineReloadKey, viewMode]);

  const reloadTimeline = useCallback(() => {
    setQueryWindow(timelineQueryWindow(timelineWindow.windowStartUtc, timelineWindow.windowEndUtc));
    setTimelineReloadKey((current) => current + 1);
  }, [timelineWindow.windowEndUtc, timelineWindow.windowStartUtc]);

  const updateTimelineWindow = useCallback((nextWindow: TimelineWindow) => {
    setTimelineWindow(nextWindow);
  }, []);

  const openArchiveCase = useCallback((archiveCaseId: number | null) => {
    if (!archiveCaseId) return;
    setError('');
    api.syncArchiveState()
      .then(() => api.archiveCase(archiveCaseId))
      .then(setArchiveDetail)
      .catch(() => setError(t('archiveLoadError')));
  }, [api, t]);

  const openArchiveDrawer = useCallback((block: GanttTimelineBlock) => {
    openArchiveCase(block.archiveCaseId);
  }, [openArchiveCase]);

  const saveArchiveForm = async (formId: number, payload: SaveCrewArchiveFormRequest) => {
    setSaving(true);
    try {
      const result = await api.saveArchiveForm(formId, payload);
      const nextForms = archiveDetail?.crewForms.map((form) => (
        form.id === result.crewArchiveForm.id ? result.crewArchiveForm : form
      )) ?? [result.crewArchiveForm];
      setArchiveDetail({ archiveCase: result.archiveCase, crewForms: nextForms });
      setBlocks((current) => current.map((block) => {
        if (block.archiveCaseId !== result.archiveCase.id) return block;
        return {
          ...block,
          archiveStatus: result.archiveCase.archiveStatus,
          archiveDeadlineAtUtc: result.archiveCase.archiveDeadlineAtUtc,
          crewArchiveSummary: summarizeCrewArchive(nextForms),
          canEditArchive: result.archiveCase.canEditArchive,
          archiveReadOnlyReason: result.archiveCase.archiveReadOnlyReason,
        };
      }));
    } finally {
      setSaving(false);
    }
  };

  const showBlockingLoading = !timelineLoaded && crewLoading && blocks.length === 0 && crewRows.length === 0;
  const showTimeline = !showBlockingLoading;

  return {
    archiveDetail,
    blocks,
    crewRows,
    error,
    openArchiveCase,
    openArchiveDrawer,
    reloadTimeline,
    saving,
    saveArchiveForm,
    setArchiveDetail,
    setTimelineWindow: updateTimelineWindow,
    showBlockingLoading,
    showTimeline,
    timelineWindow,
  };
}

function WorkbenchCardHeader({
  activeView,
  t,
}: {
  activeView: ViewId;
  t: (key: string) => string;
}) {
  return (
    <CardHeader className="shrink-0 px-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>{t(viewTitleKey[activeView])}</CardTitle>
          <CardDescription>{t('workbenchDescription')}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

function WorkbenchTimelineBody({
  onAssignmentBlockClick,
  viewMode,
  workbench,
  t,
}: {
  onAssignmentBlockClick?: (taskId: number) => void;
  viewMode: 'FLIGHT' | 'CREW';
  workbench: WorkbenchTimelineState;
  t: (key: string) => string;
}) {
  return (
    <>
      {workbench.showBlockingLoading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
      {workbench.error && <div className="text-sm text-destructive">{workbench.error}</div>}
      {workbench.showTimeline && !workbench.error && (
        <GanttTimeline
          blocks={workbench.blocks}
          crewRows={workbench.crewRows}
          viewMode={viewMode}
          windowStartUtc={workbench.timelineWindow.windowStartUtc}
          windowEndUtc={workbench.timelineWindow.windowEndUtc}
          t={t}
          onWindowChange={workbench.setTimelineWindow}
          onFlightBlockClick={workbench.openArchiveDrawer}
          onAssignmentBlockClick={(block) => {
            if (block.flightId != null) {
              onAssignmentBlockClick?.(block.flightId);
            }
          }}
        />
      )}
    </>
  );
}

function WorkbenchArchiveDrawer({ workbench, t }: { workbench: WorkbenchTimelineState; t: (key: string) => string }) {
  if (!workbench.archiveDetail) return null;
  return (
    <ArchiveDrawer
      detail={workbench.archiveDetail}
      saving={workbench.saving}
      t={t}
      onClose={() => workbench.setArchiveDetail(null)}
      onSave={workbench.saveArchiveForm}
    />
  );
}

type AssignmentFlowState = ReturnType<typeof useAssignmentFlow>;

function useAssignmentFlow(api: ApiClient, t: (key: string) => string, onSaved?: () => void) {
  const [assignmentDetail, setAssignmentDetail] = useState<AssignmentTaskDetail | null>(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');

  const openAssignmentTask = useCallback((taskId: number) => {
    setAssignmentError('');
    setAssignmentDetail(null);
    api.assignmentTask(taskId)
      .then(setAssignmentDetail)
      .catch(() => setAssignmentError(t('assignmentLoadError')));
  }, [api, t]);

  const closeAssignment = useCallback(() => {
    setAssignmentDetail(null);
    setAssignmentError('');
  }, []);

  const saveAssignmentDraft = useCallback(async (payload: SaveAssignmentDraftRequest) => {
    if (!assignmentDetail) return;
    setAssignmentSaving(true);
    setAssignmentError('');
    try {
      const result = await api.saveAssignmentDraft(assignmentDetail.task.id, payload);
      setAssignmentDetail((current) => current
        ? {
            ...current,
            task: result.task,
            selectedPicCrewId: payload.picCrewId,
            selectedFoCrewId: payload.foCrewId,
            timelineBlocks: result.timelineBlocks,
          }
        : current);
      onSaved?.();
      closeAssignment();
    } catch {
      setAssignmentError(t('assignmentSaveError'));
    } finally {
      setAssignmentSaving(false);
    }
  }, [api, assignmentDetail, closeAssignment, onSaved, t]);

  const clearAssignmentDraft = useCallback(async () => {
    if (!assignmentDetail) return;
    setAssignmentSaving(true);
    setAssignmentError('');
    try {
      await api.clearAssignmentDraft(assignmentDetail.task.id);
      onSaved?.();
      closeAssignment();
    } catch {
      setAssignmentError(t('assignmentClearDraftError'));
    } finally {
      setAssignmentSaving(false);
    }
  }, [api, assignmentDetail, closeAssignment, onSaved, t]);

  return {
    assignmentDetail,
    assignmentError,
    assignmentSaving,
    clearAssignmentDraft,
    closeAssignment,
    openAssignmentTask,
    saveAssignmentDraft,
  };
}

function WorkbenchAssignmentDrawer({ assignment, t }: { assignment: AssignmentFlowState; t: (key: string) => string }) {
  if (!assignment.assignmentDetail) {
    return assignment.assignmentError ? <div className="text-sm text-destructive">{assignment.assignmentError}</div> : null;
  }
  return (
    <AssignmentDrawer
      detail={assignment.assignmentDetail}
      saving={assignment.assignmentSaving}
      error={assignment.assignmentError}
      t={t}
      onClearDraft={assignment.clearAssignmentDraft}
      onClose={assignment.closeAssignment}
      onSave={assignment.saveAssignmentDraft}
    />
  );
}

function useTaskPlanItems(api: ApiClient, t: (key: string) => string) {
  const [items, setItems] = useState<TaskPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.taskPlanItems()
      .then((taskItems) => {
        if (active) setItems(taskItems);
      })
      .catch(() => {
        if (active) setError(t('taskPlanLoadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  useEffect(() => reload(), [reload]);

  return { error, items, loading, reload };
}

function TaskPlanItemsTable({
  emptyDescription,
  emptyTitle,
  items,
  onOpenAssignment,
  t,
}: {
  emptyDescription: string;
  emptyTitle: string;
  items: TaskPlanItem[];
  onOpenAssignment: (taskId: number) => void;
  t: (key: string) => string;
}) {
  if (items.length === 0) {
    return (
      <Card className="rounded-lg">
        <CardContent className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {[t('taskPool'), t('route'), t('start'), t('end'), t('sectors'), t('status'), t('assignmentOpen')].map((column) => (
                  <th key={column} className="px-4 py-3 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  data-testid={`task-plan-row-${item.id}`}
                  onClick={() => onOpenAssignment(item.id)}
                >
                  <td className="px-4 py-3 font-medium">{item.taskCode}</td>
                  <td className="px-4 py-3">{routeLabel(item)}</td>
                  <td className="px-4 py-3"><Timestamp value={item.scheduledStartUtc} /></td>
                  <td className="px-4 py-3"><Timestamp value={item.scheduledEndUtc} /></td>
                  <td className="px-4 py-3">{item.sectorCount}</td>
                  <td className="px-4 py-3"><TaskStatusBadge status={item.status} t={t} /></td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={item.status === 'UNASSIGNED' ? 'default' : 'outline'}
                      data-testid={`assignment-open-${item.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenAssignment(item.id);
                      }}
                    >
                      {item.status === 'UNASSIGNED' ? t('assignmentOpen') : t('assignmentAdjust')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function buildDraftVersionRows(items: TaskPlanItem[], t: (key: string) => string) {
  if (items.length === 0) return [];
  const firstTask = items[0];
  return [
    [
      <span className="font-medium">{t('saveDraft')}</span>,
      <Badge>Draft</Badge>,
      items.length,
      <Timestamp value={firstTask.scheduledStartUtc} />,
    ],
    [
      <span className="font-medium">{t('submitValidation')}</span>,
      <Badge variant="outline">Ready</Badge>,
      items.filter((item) => item.status !== 'Archived').length,
      <Timestamp value={firstTask.scheduledEndUtc} />,
    ],
  ];
}

function uniqueArchiveBlocks(blocks: GanttTimelineBlock[]) {
  const byArchiveCaseId = new Map<number, GanttTimelineBlock>();
  for (const block of blocks) {
    if (block.archiveCaseId == null) continue;
    const existing = byArchiveCaseId.get(block.archiveCaseId);
    if (!existing || utcEpochMs(block.startUtc) < utcEpochMs(existing.startUtc)) {
      byArchiveCaseId.set(block.archiveCaseId, block);
    }
  }
  return Array.from(byArchiveCaseId.values()).sort((a, b) => (
    utcEpochMs(a.startUtc) - utcEpochMs(b.startUtc)
    || a.displayLabel.localeCompare(b.displayLabel)
  ));
}

function statusLabel(status: GanttTimelineBlock['archiveStatus'], t: (key: string) => string) {
  if (!status) return t('archiveStatusPlanned');
  return t(`archiveStatus${status}`);
}

function taskStatusLabel(status: string, t: (key: string) => string) {
  const key = `taskStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function TaskStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  return (
    <span className={`workbench-status-badge ${taskStatusClassName(status)}`}>
      {taskStatusLabel(status, t)}
    </span>
  );
}

function taskStatusClassName(status: string) {
  if (status === 'UNASSIGNED') return 'workbench-status-unassigned';
  if (status === 'ASSIGNED_DRAFT') return 'workbench-status-draft';
  if (status === 'VALIDATION_FAILED' || status === 'BLOCKED') return 'workbench-status-blocked';
  if (status === 'NEEDS_REVIEW' || status === 'WARNING') return 'workbench-status-warning';
  return 'workbench-status-assigned';
}

function ArchiveStatusBadge({ status, t }: { status: GanttTimelineBlock['archiveStatus']; t: (key: string) => string }) {
  return <Badge variant={status === 'Overdue' ? 'destructive' : 'outline'}>{statusLabel(status, t)}</Badge>;
}

function archiveProgress(block: GanttTimelineBlock) {
  const { completed, noFlyingHourConfirmed, total } = block.crewArchiveSummary;
  return `${completed + noFlyingHourConfirmed}/${total}`;
}

function archiveCaseProgress(archiveCase: ArchiveCase) {
  return `${archiveCase.completedCount}/${archiveCase.totalCount}`;
}

function routeLabel(item: TaskPlanItem) {
  if (!item.departureAirport || !item.arrivalAirport) return '';
  return `${item.departureAirport}-${item.arrivalAirport}`;
}

function defaultArchiveEntryWindow() {
  const dayMs = 24 * 60 * 60 * 1000;
  const centerMs = utcEpochMs(nowUtc());
  return {
    windowStartUtc: toUtcIsoString(centerMs - 2 * dayMs),
    windowEndUtc: toUtcIsoString(centerMs + 31 * dayMs),
  };
}

function summarizeCrewArchive(forms: ArchiveCaseDetail['crewForms']) {
  const noFlyingHourConfirmed = forms.filter((form) => form.formStatus === 'NoFlyingHourConfirmed').length;
  const completed = forms.filter((form) => form.formStatus === 'Completed').length;
  return {
    total: forms.length,
    notStarted: forms.length - completed - noFlyingHourConfirmed,
    completed,
    noFlyingHourConfirmed,
  };
}

function mergeTimelineBlocks(current: GanttTimelineBlock[], incoming: GanttTimelineBlock[]) {
  if (incoming.length === 0) return current;

  const nextById = new Map(current.map((block) => [block.blockId, block]));
  let changed = false;
  for (const block of incoming) {
    const existing = nextById.get(block.blockId);
    if (!existing || !sameTimelineBlock(existing, block)) {
      nextById.set(block.blockId, block);
      changed = true;
    }
  }

  if (!changed) return current;
  return Array.from(nextById.values()).sort((a, b) => (
    utcEpochMs(a.startUtc) - utcEpochMs(b.startUtc)
    || (a.crewCode ?? '').localeCompare(b.crewCode ?? '')
    || a.blockId - b.blockId
  ));
}

function sameTimelineBlock(a: GanttTimelineBlock, b: GanttTimelineBlock) {
  return a.blockId === b.blockId
    && a.flightId === b.flightId
    && a.blockType === b.blockType
    && a.crewId === b.crewId
    && a.crewCode === b.crewCode
    && a.crewName === b.crewName
    && a.displayLabel === b.displayLabel
    && a.route === b.route
    && a.startUtc === b.startUtc
    && a.endUtc === b.endUtc
    && a.taskStatus === b.taskStatus
    && a.blockStatus === b.blockStatus
    && a.assignmentRole === b.assignmentRole
    && a.displayOrder === b.displayOrder
    && a.archiveCaseId === b.archiveCaseId
    && a.archiveStatus === b.archiveStatus
    && a.archiveDeadlineAtUtc === b.archiveDeadlineAtUtc
    && a.canEditArchive === b.canEditArchive
    && a.archiveReadOnlyReason === b.archiveReadOnlyReason
    && a.crewArchiveSummary.total === b.crewArchiveSummary.total
    && a.crewArchiveSummary.notStarted === b.crewArchiveSummary.notStarted
    && a.crewArchiveSummary.completed === b.crewArchiveSummary.completed
    && a.crewArchiveSummary.noFlyingHourConfirmed === b.crewArchiveSummary.noFlyingHourConfirmed;
}

