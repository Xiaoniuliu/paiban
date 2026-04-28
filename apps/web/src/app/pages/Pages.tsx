import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Archive,
  ArrowRight,
  Clock,
  FileCheck2,
  ListChecks,
  Pencil,
  Plane,
  Plus,
  RefreshCw,
  Send,
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
  CrewExternalWork,
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
  ValidationIssue,
  ValidationPublishSummary,
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

export function TaskPlanCenterPage({ activeView, api, t }: PageProps) {
  const [batches, setBatches] = useState<TaskPlanImportBatch[]>([]);
  const [items, setItems] = useState<TaskPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([api.taskPlanBatches(), api.taskPlanItems()])
      .then(([batchData, itemData]) => {
        setBatches(batchData);
        setItems(itemData);
      })
      .catch(() => setError(t('taskPlanLoadError')))
      .finally(() => setLoading(false));
  }, [api, t]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="rounded-lg xl:col-span-1">
        <CardHeader>
          <CardTitle>{t(viewTitleKey[activeView])}</CardTitle>
          <CardDescription>{t('taskImportDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
          {!loading && !error && batches.map((batch) => (
            <div key={batch.id} className="rounded-lg border border-border bg-background p-4">
              <div className="font-medium">{batch.batchNo}</div>
              <div className="mt-1 text-sm text-muted-foreground">{batch.sourceName}</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <Badge variant="outline">{batch.status}</Badge>
                <Timestamp className="text-muted-foreground" value={batch.importedAtUtc} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg xl:col-span-2">
        <CardHeader>
          <CardTitle>{t('taskPool')}</CardTitle>
          <CardDescription>{t('taskPlanDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4">{t('taskPool')}</th>
                    <th className="py-3 pr-4">{t('route')}</th>
                    <th className="py-3 pr-4">{t('start')}</th>
                    <th className="py-3 pr-4">{t('end')}</th>
                    <th className="py-3 pr-4">{t('sectors')}</th>
                    <th className="py-3 pr-4">{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-medium">{item.taskCode}</td>
                      <td className="py-3 pr-4">{item.departureAirport}-{item.arrivalAirport}</td>
                      <td className="py-3 pr-4"><Timestamp value={item.scheduledStartUtc} /></td>
                      <td className="py-3 pr-4"><Timestamp value={item.scheduledEndUtc} /></td>
                      <td className="py-3 pr-4">{item.sectorCount}</td>
                      <td className="py-3 pr-4"><Badge variant="outline">{item.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const crewStatusBlockTypes: CrewStatusBlockType[] = [
  'STANDBY',
  'DUTY',
  'TRAINING',
  'REST',
  'DDO',
  'RECOVERY',
  'POSITIONING',
];

const crewStatusBlockTypeSet = new Set<string>(crewStatusBlockTypes);
const ruleSensitiveCrewStatusBlockTypes = new Set<string>(crewStatusBlockTypes);
const ddoMinimumHours = 34;
const timelineQueryDays = 62;

export function CrewStatusPage(props: PageProps) {
  const { activeView } = props;
  if (activeView === 'crew-status-timeline') {
    return <CrewStatusTimelinePage {...props} />;
  }
  if (activeView === 'crew-external-work') {
    return <CrewExternalWorkPage {...props} />;
  }
  return <CrewInformationPage {...props} />;
}

function CrewInformationPage({ api, language, timezone, t, user }: PageProps) {
  const [crewRows, setCrewRows] = useState<CrewMember[]>([]);
  const [qualifications, setQualifications] = useState<CrewQualification[]>([]);
  const [timelineBlocks, setTimelineBlocks] = useState<TimelineBlock[]>([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [editingCrew, setEditingCrew] = useState<Partial<CrewMember> | null>(null);
  const [editingQualification, setEditingQualification] = useState<Partial<CrewQualification> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const canEdit = user.role === 'DISPATCHER' || user.role === 'ADMIN';

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    setLoadWarning('');
    Promise.allSettled([api.crewMembers(), api.crewQualifications(), api.timelineBlocks()])
      .then(([crewResult, qualificationResult, blockResult]) => {
        if (crewResult.status !== 'fulfilled') {
          setCrewRows([]);
          setQualifications([]);
          setTimelineBlocks([]);
          setError(t('crewLoadError'));
          return;
        }
        setCrewRows(crewResult.value);
        setQualifications(qualificationResult.status === 'fulfilled' ? qualificationResult.value : []);
        setTimelineBlocks(blockResult.status === 'fulfilled' ? blockResult.value : []);
        if (qualificationResult.status !== 'fulfilled' || blockResult.status !== 'fulfilled') {
          setLoadWarning(t('crewLoadError'));
        }
      })
      .finally(() => setLoading(false));
  }, [api, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveCrew = (event: FormEvent) => {
    event.preventDefault();
    if (!editingCrew) return;
    setSaving(true);
    const action = editingCrew.id
      ? api.updateCrewMember(editingCrew.id, editingCrew)
      : api.createCrewMember(editingCrew);
    action.then(() => {
      setEditingCrew(null);
      refresh();
    }).catch(() => setError(t('saveFailed'))).finally(() => setSaving(false));
  };
  const saveQualification = (event: FormEvent) => {
    event.preventDefault();
    if (!editingQualification?.crewMemberId) return;
    setSaving(true);
    const payload = {
      ...editingQualification,
      effectiveFromUtc: toOptionalUtc(editingQualification.effectiveFromUtc, timezone),
      effectiveToUtc: toOptionalUtc(editingQualification.effectiveToUtc, timezone),
    };
    const action = editingQualification.id
      ? api.updateCrewQualification(editingQualification.crewMemberId, editingQualification.id, payload)
      : api.createCrewQualification(editingQualification.crewMemberId, payload);
    action.then(() => {
      setEditingQualification(null);
      refresh();
    }).catch(() => setError(t('saveFailed'))).finally(() => setSaving(false));
  };

  const disableCrew = (crewId: number) => {
    api.disableCrewMember(crewId).then(refresh).catch(() => setError(t('saveFailed')));
  };

  const disableQualification = (qualification: CrewQualification) => {
    api.disableCrewQualification(qualification.crewMemberId, qualification.id).then(refresh).catch(() => setError(t('saveFailed')));
  };

  const crewById = useMemo(() => new Map(crewRows.map((crew) => [crew.id, crew])), [crewRows]);
  const dutyRows = useMemo(() => timelineBlocks
    .filter((block) => block.crewMemberId)
    .sort((left, right) => utcEpochMs(left.startUtc) - utcEpochMs(right.startUtc)), [timelineBlocks]);

  return (
    <div className="space-y-4">
      <PageHeader icon={Users} title={t('crew-list')} description={t('crewDescription')} />
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {!error && loadWarning && <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{loadWarning}</div>}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">{t('crewProfileTab')}</TabsTrigger>
          <TabsTrigger value="qualification">{t('crewQualificationTab')}</TabsTrigger>
          <TabsTrigger value="limits">{t('crewLimitsTab')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('crewDutyCalendarTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card className="rounded-lg">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>{t('crewProfileTab')}</CardTitle>
                <CardDescription>{t('crewProfileDescription')}</CardDescription>
              </div>
              {canEdit && <Button onClick={() => setEditingCrew(defaultCrewForm())}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
            </CardHeader>
            <CardContent>
              {loading ? <div className="text-sm text-muted-foreground">{t('loading')}...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead><tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('employeeNo')}</th><th className="py-3 pr-4">{t('name')}</th><th className="py-3 pr-4">{t('role')}</th><th className="py-3 pr-4">{t('rankCode')}</th><th className="py-3 pr-4">{t('base')}</th><th className="py-3 pr-4">{t('qualification')}</th><th className="py-3 pr-4">{t('availabilityStatus')}</th><th className="py-3 pr-4">{t('status')}</th><th className="py-3 pr-4">{t('actions')}</th>
                    </tr></thead>
                    <tbody>{crewRows.map((crew) => (
                      <tr key={crew.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 font-medium">{crew.crewCode}</td>
                        <td className="py-3 pr-4">{crew.employeeNo}</td>
                        <td className="py-3 pr-4">{language === 'zh-CN' ? crew.nameZh : crew.nameEn}</td>
                        <td className="py-3 pr-4">{crew.roleCode}</td>
                        <td className="py-3 pr-4">{crew.rankCode}</td>
                        <td className="py-3 pr-4">{crew.homeBase}</td>
                        <td className="py-3 pr-4">{crew.aircraftQualification}</td>
                        <td className="py-3 pr-4"><Badge variant="outline">{crew.availabilityStatus}</Badge></td>
                        <td className="py-3 pr-4"><Badge variant={crew.status === 'ACTIVE' ? 'outline' : 'secondary'}>{crew.status}</Badge></td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            {canEdit && <Button size="sm" variant="outline" onClick={() => setEditingCrew(crew)}><Pencil className="mr-1 h-3 w-3" />{t('edit')}</Button>}
                            {canEdit && <Button size="sm" variant="outline" onClick={() => disableCrew(crew.id)}>{t('disable')}</Button>}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="qualification">
          <Card className="rounded-lg">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>{t('crewQualificationTab')}</CardTitle>
                <CardDescription>{t('crewQualificationDescription')}</CardDescription>
              </div>
              {canEdit && <Button onClick={() => setEditingQualification(defaultQualificationForm(crewRows[0]?.id))}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
            </CardHeader>
            <CardContent>
              <SimpleQualificationTable
                qualifications={qualifications}
                crewById={crewById}
                timezone={timezone}
                t={t}
                canEdit={canEdit}
                onEdit={setEditingQualification}
                onDisable={disableQualification}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="limits">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>{t('crewLimitsTab')}</CardTitle><CardDescription>{t('crewLimitsDescription')}</CardDescription></CardHeader>
            <CardContent><CrewLimitTable crewRows={crewRows} language={language} t={t} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>{t('crewDutyCalendarTab')}</CardTitle><CardDescription>{t('crewDutyCalendarDescription')}</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('type')}</th><th className="py-3 pr-4">{t('start')}</th><th className="py-3 pr-4">{t('end')}</th><th className="py-3 pr-4">{t('status')}</th></tr></thead>
                  <tbody>{dutyRows.map((block) => {
                    const crew = crewById.get(block.crewMemberId ?? 0);
                    return <tr key={block.id} className="border-b border-border last:border-0"><td className="py-3 pr-4 font-medium">{crew?.crewCode ?? '-'}</td><td className="py-3 pr-4">{block.blockType}</td><td className="py-3 pr-4"><Timestamp value={block.startUtc} /></td><td className="py-3 pr-4"><Timestamp value={block.endUtc} /></td><td className="py-3 pr-4"><Badge variant="outline">{block.status}</Badge></td></tr>;
                  })}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CrewEditDialog
        open={editingCrew !== null}
        value={editingCrew}
        saving={saving}
        t={t}
        onChange={setEditingCrew}
        onClose={() => setEditingCrew(null)}
        onSubmit={saveCrew}
      />
      <QualificationEditDialog
        open={editingQualification !== null}
        value={editingQualification}
        crewRows={crewRows}
        timezone={timezone}
        saving={saving}
        t={t}
        onChange={setEditingQualification}
        onClose={() => setEditingQualification(null)}
        onSubmit={saveQualification}
      />
    </div>
  );
}

function CrewExternalWorkPage({ api, language, timezone, t, user }: PageProps) {
  const [crewRows, setCrewRows] = useState<CrewMember[]>([]);
  const [workRows, setWorkRows] = useState<CrewExternalWork[]>([]);
  const [editingWork, setEditingWork] = useState<Partial<CrewExternalWork> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const canEdit = user.role === 'DISPATCHER' || user.role === 'ADMIN';

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    setLoadWarning('');
    Promise.allSettled([api.crewMembers(), api.crewExternalWork()])
      .then(([crewResult, workResult]) => {
        if (crewResult.status !== 'fulfilled') {
          setCrewRows([]);
          setWorkRows([]);
          setError(t('crewExternalWorkLoadError'));
          return;
        }
        setCrewRows(crewResult.value);
        setWorkRows(workResult.status === 'fulfilled' ? workResult.value : []);
        if (workResult.status !== 'fulfilled') {
          setLoadWarning(t('crewExternalWorkLoadError'));
        }
      })
      .finally(() => setLoading(false));
  }, [api, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const crewById = useMemo(() => new Map(crewRows.map((crew) => [crew.id, crew])), [crewRows]);

  const saveWork = (event: FormEvent) => {
    event.preventDefault();
    if (!editingWork?.crewMemberId) return;
    setSaving(true);
    const startUtc = toOptionalUtc(editingWork.startUtc, timezone) ?? undefined;
    const endUtc = toOptionalUtc(editingWork.endUtc, timezone) ?? undefined;
    const payload: Partial<CrewExternalWork> = {
      ...editingWork,
      startUtc,
      endUtc,
    };
    const action = editingWork.id
      ? api.updateCrewExternalWork(editingWork.crewMemberId, editingWork.id, payload)
      : api.createCrewExternalWork(editingWork.crewMemberId, payload);
    action.then(() => {
      setEditingWork(null);
      refresh();
    }).catch(() => setError(t('saveFailed'))).finally(() => setSaving(false));
  };

  const disableWork = (work: CrewExternalWork) => {
    api.disableCrewExternalWork(work.crewMemberId, work.id).then(refresh).catch(() => setError(t('saveFailed')));
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Users} title={t('crew-external-work')} description={t('crewExternalWorkDescription')} />
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {!error && loadWarning && <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{loadWarning}</div>}
      <Card className="rounded-lg">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('crewExternalWorkLedger')}</CardTitle>
            <CardDescription>{t('crewExternalWorkLedgerDescription')}</CardDescription>
          </div>
          {canEdit && <Button onClick={() => setEditingWork(defaultExternalWorkForm(crewRows[0]?.id, timezone))}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">{t('loading')}...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('name')}</th><th className="py-3 pr-4">{t('type')}</th><th className="py-3 pr-4">{t('start')}</th><th className="py-3 pr-4">{t('end')}</th><th className="py-3 pr-4">{t('description')}</th><th className="py-3 pr-4">{t('status')}</th><th className="py-3 pr-4">{t('actions')}</th></tr></thead>
                <tbody>{workRows.map((work) => {
                  const crew = crewById.get(work.crewMemberId);
                  return (
                    <tr key={work.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-medium">{crew?.crewCode ?? '-'}</td>
                      <td className="py-3 pr-4">{crew ? (language === 'zh-CN' ? crew.nameZh : crew.nameEn) : '-'}</td>
                      <td className="py-3 pr-4">{work.externalType}</td>
                      <td className="py-3 pr-4"><Timestamp value={work.startUtc} /></td>
                      <td className="py-3 pr-4"><Timestamp value={work.endUtc} /></td>
                      <td className="py-3 pr-4">{work.description}</td>
                      <td className="py-3 pr-4"><Badge variant={work.status === 'ACTIVE' ? 'outline' : 'secondary'}>{work.status}</Badge></td>
                      <td className="py-3 pr-4"><div className="flex gap-2">{canEdit && <Button size="sm" variant="outline" onClick={() => setEditingWork(work)}>{t('edit')}</Button>}{canEdit && <Button size="sm" variant="outline" onClick={() => disableWork(work)}>{t('disable')}</Button>}</div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <ExternalWorkEditDialog
        open={editingWork !== null}
        value={editingWork}
        crewRows={crewRows}
        timezone={timezone}
        saving={saving}
        t={t}
        onChange={setEditingWork}
        onClose={() => setEditingWork(null)}
        onSubmit={saveWork}
      />
    </div>
  );
}

function CrewLimitTable({ crewRows, language, t }: { crewRows: CrewMember[]; language: Language; t: (key: string) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-sm">
        <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('name')}</th><th className="py-3 pr-4">{t('dutyHours7dLimit')}</th><th className="py-3 pr-4">{t('dutyHours14dLimit')}</th><th className="py-3 pr-4">{t('dutyHours28dLimit')}</th><th className="py-3 pr-4">{t('flightHours28d')}</th><th className="py-3 pr-4">{t('flightHours12mLimit')}</th><th className="py-3 pr-4">{t('singleFdp14hLimit')}</th></tr></thead>
        <tbody>{crewRows.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0">
            <td className="py-3 pr-4 font-medium">{item.crewCode}</td>
            <td className="py-3 pr-4">{language === 'zh-CN' ? item.nameZh : item.nameEn}</td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours7d} normalLimit={55} warningLimit={60} extremeLimit={70} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours14d} normalLimit={95} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours28d} normalLimit={190} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingFlightHours28d} normalLimit={100} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingFlightHours12m} normalLimit={900} t={t} /></td>
            <td className="py-3 pr-4"><CrewFdpLimitCell value={item.latestActualFdpHours} t={t} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function SimpleQualificationTable({ qualifications, crewById, timezone, t, canEdit, onEdit, onDisable }: {
  qualifications: CrewQualification[];
  crewById: Map<number, CrewMember>;
  timezone: DisplayTimezone;
  t: (key: string) => string;
  canEdit: boolean;
  onEdit: (value: Partial<CrewQualification>) => void;
  onDisable: (value: CrewQualification) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('type')}</th><th className="py-3 pr-4">{t('qualification')}</th><th className="py-3 pr-4">{t('effectiveFrom')}</th><th className="py-3 pr-4">{t('effectiveTo')}</th><th className="py-3 pr-4">{t('status')}</th><th className="py-3 pr-4">{t('actions')}</th></tr></thead>
        <tbody>{qualifications.map((qualification) => {
          const crew = crewById.get(qualification.crewMemberId);
          return (
            <tr key={qualification.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium">{crew?.crewCode ?? '-'}</td>
              <td className="py-3 pr-4">{qualification.qualificationType}</td>
              <td className="py-3 pr-4">{qualification.qualificationCode}</td>
              <td className="py-3 pr-4">{qualification.effectiveFromUtc ? <Timestamp value={qualification.effectiveFromUtc} /> : '-'}</td>
              <td className="py-3 pr-4">{qualification.effectiveToUtc ? <Timestamp value={qualification.effectiveToUtc} /> : '-'}</td>
              <td className="py-3 pr-4"><Badge variant={qualification.status === 'ACTIVE' ? 'outline' : 'secondary'}>{qualification.status}</Badge></td>
              <td className="py-3 pr-4"><div className="flex gap-2">{canEdit && <Button size="sm" variant="outline" onClick={() => onEdit({ ...qualification, effectiveFromUtc: toOptionalLocal(qualification.effectiveFromUtc, timezone), effectiveToUtc: toOptionalLocal(qualification.effectiveToUtc, timezone) })}>{t('edit')}</Button>}{canEdit && <Button size="sm" variant="outline" onClick={() => onDisable(qualification)}>{t('disable')}</Button>}</div></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function CrewLimitCell({
  value,
  normalLimit,
  warningLimit,
  extremeLimit,
  t,
}: {
  value: number;
  normalLimit: number;
  warningLimit?: number;
  extremeLimit?: number;
  t: (key: string) => string;
}) {
  const numericValue = Number(value ?? 0);
  const limit = extremeLimit ?? warningLimit ?? normalLimit;
  const label = `${formatHours(numericValue)} / ${limit}h`;
  let badgeClass = 'border-success text-success';
  let note = `${t('crewLimitNormal')} ${normalLimit}h`;

  if (extremeLimit != null && numericValue > extremeLimit) {
    badgeClass = '';
    note = `${t('crewLimitExceeded')} ${extremeLimit}h`;
  } else if (warningLimit != null && numericValue > warningLimit) {
    badgeClass = 'border-destructive text-destructive';
    note = `${t('crewLimitExtremeBand')} ${warningLimit}-${extremeLimit}h`;
  } else if (warningLimit != null && numericValue > normalLimit) {
    badgeClass = 'border-warning text-warning';
    note = `${t('crewLimitSpecialBand')} ${normalLimit}-${warningLimit}h`;
  } else if (numericValue > normalLimit) {
    badgeClass = 'border-destructive text-destructive';
    note = `${t('crewLimitExceeded')} ${normalLimit}h`;
  }

  return (
    <div className="min-w-[7.5rem] space-y-1">
      <Badge variant={badgeClass ? 'outline' : 'destructive'} className={badgeClass}>{label}</Badge>
      <div className="text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function CrewFdpLimitCell({ value, t }: { value: number | null; t: (key: string) => string }) {
  if (value == null) {
    return (
      <div className="min-w-[8rem] space-y-1">
        <Badge variant="outline">{t('crewFdpActualOnly')}</Badge>
        <div className="text-xs text-muted-foreground">{t('crewFdpActualOnlyHint')}</div>
      </div>
    );
  }
  return <CrewLimitCell value={value} normalLimit={14} t={t} />;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function defaultCrewForm(): Partial<CrewMember> {
  return {
    crewCode: '',
    employeeNo: '',
    nameZh: '',
    nameEn: '',
    roleCode: 'CAPTAIN',
    rankCode: 'CAPT',
    homeBase: 'MFM',
    aircraftQualification: 'A330',
    acclimatizationStatus: 'ACCLIMATIZED',
    bodyClockTimezone: 'Asia/Macau',
    normalCommuteMinutes: 0,
    externalEmploymentFlag: false,
    availabilityStatus: 'AVAILABLE',
    status: 'ACTIVE',
  };
}

function defaultQualificationForm(crewMemberId?: number): Partial<CrewQualification> {
  return {
    crewMemberId,
    qualificationType: 'AIRCRAFT',
    qualificationCode: 'A330',
    effectiveFromUtc: '',
    effectiveToUtc: '',
    status: 'ACTIVE',
  };
}

function defaultExternalWorkForm(crewMemberId: number | undefined, timezone: DisplayTimezone): Partial<CrewExternalWork> {
  const start = nowUtc();
  const end = addUtcHours(start, 8);
  return {
    crewMemberId,
    externalType: 'UNAVAILABLE',
    startUtc: toDisplayDateTimeLocal(start, timezone),
    endUtc: toDisplayDateTimeLocal(end, timezone),
    description: '',
    status: 'ACTIVE',
  };
}

function toOptionalUtc(value: string | null | undefined, timezone: DisplayTimezone) {
  if (!value) return null;
  return value.endsWith('Z') ? value : displayDateTimeLocalToUtcIso(value, timezone);
}

function toOptionalLocal(value: string | null | undefined, timezone: DisplayTimezone) {
  return value ? toDisplayDateTimeLocal(value, timezone) : '';
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CrewEditDialog({ open, value, saving, t, onChange, onClose, onSubmit }: {
  open: boolean;
  value: Partial<CrewMember> | null;
  saving: boolean;
  t: (key: string) => string;
  onChange: (value: Partial<CrewMember> | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!value) return null;
  const update = (key: keyof CrewMember, nextValue: string | number | boolean) => onChange({ ...value, [key]: nextValue });
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{value.id ? t('editCrew') : t('addCrew')}</DialogTitle><DialogDescription>{t('crewProfileDescription')}</DialogDescription></DialogHeader>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <FormField label={t('crewCode')}><Input required value={value.crewCode ?? ''} onChange={(event) => update('crewCode', event.target.value)} /></FormField>
          <FormField label={t('employeeNo')}><Input value={value.employeeNo ?? ''} onChange={(event) => update('employeeNo', event.target.value)} /></FormField>
          <FormField label={t('nameZh')}><Input required value={value.nameZh ?? ''} onChange={(event) => update('nameZh', event.target.value)} /></FormField>
          <FormField label={t('nameEn')}><Input required value={value.nameEn ?? ''} onChange={(event) => update('nameEn', event.target.value)} /></FormField>
          <FormField label={t('role')}><Input value={value.roleCode ?? ''} onChange={(event) => update('roleCode', event.target.value)} /></FormField>
          <FormField label={t('rankCode')}><Input value={value.rankCode ?? ''} onChange={(event) => update('rankCode', event.target.value)} /></FormField>
          <FormField label={t('base')}><Input value={value.homeBase ?? ''} onChange={(event) => update('homeBase', event.target.value)} /></FormField>
          <FormField label={t('qualification')}><Input value={value.aircraftQualification ?? ''} onChange={(event) => update('aircraftQualification', event.target.value)} /></FormField>
          <FormField label={t('acclimatizationStatus')}><Input value={value.acclimatizationStatus ?? ''} onChange={(event) => update('acclimatizationStatus', event.target.value)} /></FormField>
          <FormField label={t('bodyClockTimezone')}><Input value={value.bodyClockTimezone ?? ''} onChange={(event) => update('bodyClockTimezone', event.target.value)} /></FormField>
          <FormField label={t('normalCommuteMinutes')}><Input type="number" value={value.normalCommuteMinutes ?? 0} onChange={(event) => update('normalCommuteMinutes', Number(event.target.value))} /></FormField>
          <FormField label={t('availabilityStatus')}><Input value={value.availabilityStatus ?? ''} onChange={(event) => update('availabilityStatus', event.target.value)} /></FormField>
          <FormField label={t('status')}><Input value={value.status ?? ''} onChange={(event) => update('status', event.target.value)} /></FormField>
          <label className="flex items-center gap-2 text-sm"><Switch checked={Boolean(value.externalEmploymentFlag)} onCheckedChange={(checked) => update('externalEmploymentFlag', checked)} />{t('externalEmploymentFlag')}</label>
          <DialogFooter className="md:col-span-2"><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QualificationEditDialog({ open, value, crewRows, timezone, saving, t, onChange, onClose, onSubmit }: {
  open: boolean;
  value: Partial<CrewQualification> | null;
  crewRows: CrewMember[];
  timezone: DisplayTimezone;
  saving: boolean;
  t: (key: string) => string;
  onChange: (value: Partial<CrewQualification> | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!value) return null;
  const update = (key: keyof CrewQualification, nextValue: string | number | null) => onChange({ ...value, [key]: nextValue });
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{value.id ? t('editQualification') : t('addQualification')}</DialogTitle><DialogDescription>{t('crewQualificationDescription')}</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <FormField label={t('crewCode')}><select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={value.crewMemberId ?? ''} onChange={(event) => update('crewMemberId', Number(event.target.value))}>{crewRows.map((crew) => <option key={crew.id} value={crew.id}>{crew.crewCode}</option>)}</select></FormField>
          <FormField label={t('type')}><Input value={value.qualificationType ?? ''} onChange={(event) => update('qualificationType', event.target.value)} /></FormField>
          <FormField label={t('qualification')}><Input value={value.qualificationCode ?? ''} onChange={(event) => update('qualificationCode', event.target.value)} /></FormField>
          <FormField label={t('effectiveFrom')}><Input type="datetime-local" value={toOptionalLocal(value.effectiveFromUtc, timezone)} onChange={(event) => update('effectiveFromUtc', event.target.value)} /></FormField>
          <FormField label={t('effectiveTo')}><Input type="datetime-local" value={toOptionalLocal(value.effectiveToUtc, timezone)} onChange={(event) => update('effectiveToUtc', event.target.value)} /></FormField>
          <FormField label={t('status')}><Input value={value.status ?? ''} onChange={(event) => update('status', event.target.value)} /></FormField>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExternalWorkEditDialog({ open, value, crewRows, timezone, saving, t, onChange, onClose, onSubmit }: {
  open: boolean;
  value: Partial<CrewExternalWork> | null;
  crewRows: CrewMember[];
  timezone: DisplayTimezone;
  saving: boolean;
  t: (key: string) => string;
  onChange: (value: Partial<CrewExternalWork> | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!value) return null;
  const update = (key: keyof CrewExternalWork, nextValue: string | number) => onChange({ ...value, [key]: nextValue });
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{value.id ? t('editExternalWork') : t('addExternalWork')}</DialogTitle><DialogDescription>{t('crewExternalWorkLedgerDescription')}</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <FormField label={t('crewCode')}><select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={value.crewMemberId ?? ''} onChange={(event) => update('crewMemberId', Number(event.target.value))}>{crewRows.map((crew) => <option key={crew.id} value={crew.id}>{crew.crewCode}</option>)}</select></FormField>
          <FormField label={t('type')}><Input value={value.externalType ?? ''} onChange={(event) => update('externalType', event.target.value)} /></FormField>
          <FormField label={t('start')}><Input type="datetime-local" value={toOptionalLocal(value.startUtc, timezone)} onChange={(event) => update('startUtc', event.target.value)} /></FormField>
          <FormField label={t('end')}><Input type="datetime-local" value={toOptionalLocal(value.endUtc, timezone)} onChange={(event) => update('endUtc', event.target.value)} /></FormField>
          <FormField label={t('description')}><Input value={value.description ?? ''} onChange={(event) => update('description', event.target.value)} /></FormField>
          <FormField label={t('status')}><Input value={value.status ?? ''} onChange={(event) => update('status', event.target.value)} /></FormField>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CrewStatusTimelinePage({ api, language, timezone, t, user }: PageProps) {
  const [crewRows, setCrewRows] = useState<CrewMember[]>([]);
  const [statusBlocks, setStatusBlocks] = useState<TimelineBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<number | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [form, setForm] = useState(() => defaultCrewStatusForm(timezone));
  const canEdit = user.role === 'DISPATCHER' || user.role === 'ADMIN';
  const crewById = useMemo(() => new Map(crewRows.map((crew) => [crew.id, crew])), [crewRows]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([api.crewMembers(), api.timelineBlocks()])
      .then(([crewData, blockData]) => {
        if (!active) return;
        setCrewRows(crewData);
        setStatusBlocks(blockData.filter(isCrewStatusBlock));
        setForm((current) => (
          current.crewMemberId || crewData.length === 0
            ? current
            : { ...current, crewMemberId: String(crewData[0].id) }
        ));
      })
      .catch(() => {
        if (active) setError(t('crewLoadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  const sortedStatusBlocks = useMemo(() => (
    [...statusBlocks].sort((a, b) => utcEpochMs(a.startUtc) - utcEpochMs(b.startUtc))
  ), [statusBlocks]);

  const saveStatusBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaveMessage('');
    const crewMemberId = Number(form.crewMemberId);
    if (!crewMemberId) {
      setError(t('assignmentSelectPlaceholder'));
      return;
    }
    const payload: CreateCrewStatusBlockRequest = {
      crewMemberId,
      blockType: form.blockType,
      startUtc: displayDateTimeLocalToUtcIso(form.startLocal, timezone),
      endUtc: displayDateTimeLocalToUtcIso(form.endLocal, timezone),
      displayLabel: form.displayLabel.trim() || undefined,
    };
    if (utcEpochMs(payload.startUtc) >= utcEpochMs(payload.endUtc)) {
      setError(t('crewStatusTimeInvalid'));
      return;
    }
    setSaving(true);
    try {
      const saved = editingBlockId == null
        ? await api.createCrewStatusBlock(payload)
        : await api.updateCrewStatusBlock(editingBlockId, payload);
      setStatusBlocks((current) => [...current.filter((block) => block.id !== saved.id), saved]);
      setSaveMessage(editingBlockId == null ? t('crewStatusSaved') : t('crewStatusUpdated'));
      setEditingBlockId(null);
      setForm((current) => ({ ...current, displayLabel: '' }));
    } catch {
      setError(editingBlockId == null ? t('crewStatusSaveError') : t('crewStatusUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const editStatusBlock = (block: TimelineBlock) => {
    setError('');
    setSaveMessage('');
    setEditingBlockId(block.id);
    setForm({
      crewMemberId: block.crewMemberId == null ? '' : String(block.crewMemberId),
      blockType: crewStatusBlockTypeValue(block.blockType),
      startLocal: toDisplayDateTimeLocal(block.startUtc, timezone),
      endLocal: toDisplayDateTimeLocal(block.endUtc, timezone),
      displayLabel: block.displayLabel,
    });
  };

  const cancelStatusBlockEdit = () => {
    setEditingBlockId(null);
    setForm((current) => ({ ...current, displayLabel: '' }));
  };

  const deleteStatusBlock = async (block: TimelineBlock) => {
    if (!globalThis.confirm(t('crewStatusDeleteConfirm'))) return;
    setError('');
    setSaveMessage('');
    setDeletingBlockId(block.id);
    try {
      await api.deleteCrewStatusBlock(block.id);
      setStatusBlocks((current) => current.filter((item) => item.id !== block.id));
      if (editingBlockId === block.id) {
        setEditingBlockId(null);
        setForm((current) => ({ ...current, displayLabel: '' }));
      }
      setSaveMessage(t('crewStatusDeleted'));
    } catch {
      setError(t('crewStatusDeleteError'));
    } finally {
      setDeletingBlockId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('crewStatusCreateTitle')}</CardTitle>
          <CardDescription>{t('crewDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{t('crewStatusPlannedFactBadge')}</Badge>
            <Badge variant="outline">{t('crewStatusRuleValidationBadge')}</Badge>
          </div>
          <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {t('crewStatusPlannedFactNote')}
          </div>
          {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
          {error && <div className="mb-3 text-sm text-destructive">{error}</div>}
          {saveMessage && <div className="mb-3 text-sm text-success">{saveMessage}</div>}
          {!loading && (
            <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={saveStatusBlock}>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t('crewCode')}</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  disabled={!canEdit || saving}
                  value={form.crewMemberId}
                  onChange={(event) => setForm((current) => ({ ...current, crewMemberId: event.target.value }))}
                >
                  {crewRows.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.crewCode} {language === 'zh-CN' ? crew.nameZh : crew.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t('crewStatusBlockType')}</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  disabled={!canEdit || saving}
                  value={form.blockType}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    blockType: event.target.value as CrewStatusBlockType,
                    endLocal: crewStatusEndLocalForType(
                      event.target.value as CrewStatusBlockType,
                      current.startLocal,
                      current.endLocal,
                      timezone,
                    ),
                  }))}
                >
                  {crewStatusBlockTypes.map((blockType) => (
                    <option key={blockType} value={blockType}>{t(`dutyStatus${blockType}`)}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t('start')}</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  disabled={!canEdit || saving}
                  type="datetime-local"
                  value={form.startLocal}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    startLocal: event.target.value,
                    endLocal: crewStatusEndLocalForType(
                      current.blockType,
                      event.target.value,
                      current.endLocal,
                      timezone,
                    ),
                  }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t('end')}</span>
                <input
                  className={`w-full rounded-md border border-border px-3 py-2 ${
                    form.blockType === 'DDO' ? 'bg-muted/50 text-muted-foreground' : 'bg-background'
                  }`}
                  disabled={!canEdit || saving}
                  readOnly={form.blockType === 'DDO'}
                  type="datetime-local"
                  value={form.endLocal}
                  onChange={(event) => setForm((current) => ({ ...current, endLocal: event.target.value }))}
                />
                {form.blockType === 'DDO' && (
                  <span className="block text-xs text-muted-foreground">{t('crewStatusDdoAutoEndHint')}</span>
                )}
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t('crewStatusLabel')}</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                  disabled={!canEdit || saving}
                  value={form.displayLabel}
                  onChange={(event) => setForm((current) => ({ ...current, displayLabel: event.target.value }))}
                />
              </label>
              <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-5">
                <Button type="submit" disabled={!canEdit || saving || crewRows.length === 0}>
                  {saving
                    ? `${t('saving')}...`
                    : editingBlockId == null ? t('crewStatusSave') : t('crewStatusUpdateSave')}
                </Button>
                {editingBlockId != null && (
                  <Button type="button" variant="outline" onClick={cancelStatusBlockEdit}>
                    {t('crewStatusCancelEdit')}
                  </Button>
                )}
                <Button type="button" variant="outline" asChild>
                  <a href="/rostering-workbench/crew-view">{t('crewStatusOpenWorkbench')}</a>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('crewStatusTimeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
          {!loading && sortedStatusBlocks.length === 0 && (
            <EmptyState title={t('noData')} description={t('crewStatusEmpty')} />
          )}
          {!loading && sortedStatusBlocks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {[t('crewCode'), t('crewStatusBlockType'), t('start'), t('end'), t('status'), t('ruleValidationStatus'), t('actions')].map((column) => (
                      <th key={column} className="py-3 pr-4">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStatusBlocks.map((block) => {
                    const crew = block.crewMemberId == null ? null : crewById.get(block.crewMemberId);
                    return (
                      <tr key={block.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 font-medium">
                          {crew ? `${crew.crewCode} ${language === 'zh-CN' ? crew.nameZh : crew.nameEn}` : '-'}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{crewStatusTypeLabel(block.blockType, t)}</Badge>
                        </td>
                        <td className="py-3 pr-4"><Timestamp value={block.startUtc} /></td>
                        <td className="py-3 pr-4"><Timestamp value={block.endUtc} /></td>
                        <td className="py-3 pr-4">{crewStatusBlockStatusLabel(block.status, t)}</td>
                        <td className="py-3 pr-4">
                          {ruleSensitiveCrewStatusBlockTypes.has(block.blockType) ? (
                            <Badge variant="outline">{t('ruleValidationPending')}</Badge>
                          ) : '-'}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!canEdit || saving || deletingBlockId === block.id}
                              onClick={() => editStatusBlock(block)}
                            >
                              {t('crewStatusEdit')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!canEdit || saving || deletingBlockId === block.id}
                              onClick={() => deleteStatusBlock(block)}
                            >
                              {deletingBlockId === block.id ? `${t('saving')}...` : t('crewStatusDelete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function isCrewStatusBlock(block: TimelineBlock) {
  return block.taskPlanItemId == null && block.crewMemberId != null && crewStatusBlockTypeSet.has(block.blockType);
}

function crewStatusBlockTypeValue(blockType: string): CrewStatusBlockType {
  return crewStatusBlockTypes.includes(blockType as CrewStatusBlockType)
    ? blockType as CrewStatusBlockType
    : 'STANDBY';
}

function crewStatusTypeLabel(blockType: string, t: (key: string) => string) {
  if (blockType === 'REST' || blockType === 'DDO' || blockType === 'RECOVERY') {
    const plannedKey = `plannedDutyStatus${blockType}`;
    const plannedLabel = t(plannedKey);
    if (plannedLabel !== plannedKey) return plannedLabel;
  }
  const key = `dutyStatus${blockType}`;
  const label = t(key);
  return label === key ? blockType : label;
}

function crewStatusBlockStatusLabel(status: string, t: (key: string) => string) {
  const key = `crewStatusBlockStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function crewStatusEndLocalForType(
  blockType: CrewStatusBlockType,
  startLocal: string,
  fallbackEndLocal: string,
  timezone: DisplayTimezone,
) {
  if (blockType !== 'DDO') return fallbackEndLocal;
  try {
    return toDisplayDateTimeLocal(
      addUtcHours(displayDateTimeLocalToUtcIso(startLocal, timezone), ddoMinimumHours),
      timezone,
    );
  } catch {
    return fallbackEndLocal;
  }
}

function defaultCrewStatusForm(timezone: DisplayTimezone) {
  const start = addUtcHours(nowUtc(), 1);
  const end = addUtcHours(nowUtc(), 5);
  return {
    crewMemberId: '',
    blockType: 'STANDBY' as CrewStatusBlockType,
    startLocal: toDisplayDateTimeLocal(start, timezone),
    endLocal: toDisplayDateTimeLocal(end, timezone),
    displayLabel: '',
  };
}

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
  const [summary, setSummary] = useState<ValidationPublishSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState('');

  const loadSummary = useCallback(() => {
    let active = true;
    setSummaryLoading(true);
    setSummaryError('');
    api.validationPublishSummary()
      .then((nextSummary) => {
        if (active) {
          setSummary(nextSummary);
          setSelectedIssueId((current) => keepSelectedIssue(current, nextSummary.issues));
        }
      })
      .catch(() => {
        if (active) setSummaryError(t('validationPublishLoadError'));
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  useEffect(() => loadSummary(), [loadSummary]);

  const refreshAll = useCallback(() => {
    reload();
    loadSummary();
  }, [loadSummary, reload]);
  const assignment = useAssignmentFlow(api, t, refreshAll);
  const draftItems = useMemo(() => (
    items
      .filter((item) => item.status === 'ASSIGNED_DRAFT')
      .sort((left, right) => utcEpochMs(left.scheduledStartUtc) - utcEpochMs(right.scheduledStartUtc))
  ), [items]);
  const selectedIssue = useMemo(() => {
    if (!summary || summary.issues.length === 0) return null;
    return summary.issues.find((issue) => issue.id === selectedIssueId) ?? summary.issues[0];
  }, [selectedIssueId, summary]);
  const publishedReady = summary
    ? summary.blockedCount === 0 && summary.warningCount === 0 && summary.publishableTasks === 0 && summary.publishedTasks > 0
    : false;

  const runValidation = async () => {
    setValidating(true);
    setSummaryError('');
    setPublishNotice('');
    try {
      const nextSummary = await api.runValidationPublishCheck();
      setSummary(nextSummary);
      setSelectedIssueId((current) => keepSelectedIssue(current, nextSummary.issues));
    } catch {
      setSummaryError(t('validationPublishValidateError'));
    } finally {
      setValidating(false);
    }
  };

  const publishRoster = async () => {
    if (!summary?.canPublish || !summary.validatedAtUtc) return;
    setPublishing(true);
    setSummaryError('');
    setPublishNotice('');
    try {
      const nextSummary = await api.publishRoster(summary.managerConfirmationRequired);
      setSummary(nextSummary);
      setSelectedIssueId((current) => keepSelectedIssue(current, nextSummary.issues));
      reload();
      setPublishNotice(t('validationPublishPublished'));
    } catch {
      setSummaryError(t('validationPublishPublishError'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileCheck2}
        title={t(viewTitleKey[activeView])}
        description={t('workbenchDescription')}
      />
      <Card className="rounded-lg" data-testid="validation-publish-actions">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base">{t('draftVersionActions')}</CardTitle>
              <CardDescription>{t('draftVersionActionsDescription')}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={refreshAll}
                disabled={loading || summaryLoading || validating || publishing}
              >
                <RefreshCw className="h-4 w-4" />
                {t('refresh')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={runValidation}
                disabled={summaryLoading || validating || publishing}
                data-testid="validation-submit"
              >
                <ListChecks className="h-4 w-4" />
                {validating ? `${t('loading')}...` : t('submitValidation')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={publishRoster}
                disabled={!summary?.canPublish || !summary.validatedAtUtc || validating || publishing}
                data-testid="validation-publish"
              >
                <Send className="h-4 w-4" />
                {publishing ? `${t('saving')}...` : t('publishRoster')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {summaryLoading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
          {summary && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                <ValidationMetric label={t('validationRosterVersion')} value={summary.rosterVersionNo} />
                <ValidationMetric label={t('validationTotalTasks')} value={summary.totalTasks} />
                <ValidationMetric label={t('validationDraftAssigned')} value={summary.draftAssignedTasks} />
                <ValidationMetric label={t('validationUnassigned')} value={summary.unassignedTasks} tone={summary.unassignedTasks > 0 ? 'text-destructive' : undefined} />
                <ValidationMetric label={t('validationBlocks')} value={summary.blockedCount} tone={summary.blockedCount > 0 ? 'text-destructive' : 'text-success'} />
                <ValidationMetric label={t('validationWarnings')} value={summary.warningCount} tone={summary.warningCount > 0 ? 'text-warning' : undefined} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ValidationReadinessBadge summary={summary} publishedReady={publishedReady} t={t} />
                {summary.validatedAtUtc ? (
                  <span className="text-muted-foreground">
                    {t('validationLastRun')}: <Timestamp value={summary.validatedAtUtc} />
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t('validationNotRun')}</span>
                )}
                {summary.managerConfirmationRequired && (
                  <Badge variant="outline" className="border-warning text-warning">{t('validationManagerConfirm')}</Badge>
                )}
              </div>
              {summary.inactiveRuleIds.length > 0 && (
                <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                  <span className="font-medium">{t('validationInactiveRulesTitle')}</span>
                  <span className="ml-2">{summary.inactiveRuleIds.join(', ')}</span>
                </div>
              )}
            </>
          )}
          {publishNotice && <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{publishNotice}</div>}
          {(summaryError || error) && <div className="text-sm text-destructive">{summaryError || error}</div>}
        </CardContent>
      </Card>
      {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
      {!loading && summary && (
        <div className="space-y-4">
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="rounded-lg" data-testid="validation-issue-list">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('validationIssues')}</CardTitle>
              <CardDescription>{t('validationIssuesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      {[t('severity'), t('taskPool'), t('route'), t('ruleValidationStatus'), t('status'), t('actions')].map((column) => (
                        <th key={column} className="whitespace-nowrap px-3 py-3 font-medium">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.issues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6">
                          <EmptyState
                            title={publishedReady ? t('validationAlreadyPublished') : t('validationNoIssues')}
                            description={publishedReady ? t('validationAlreadyPublishedDescription') : t('validationNoIssuesDescription')}
                          />
                        </td>
                      </tr>
                    ) : (
                      summary.issues.map((issue) => (
                        <tr
                          key={issue.id}
                          className={`cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40 ${selectedIssue?.id === issue.id ? 'bg-muted/50' : ''}`}
                          data-testid={`validation-issue-${issue.taskId}`}
                          onClick={() => setSelectedIssueId(issue.id)}
                        >
                          <td className="whitespace-nowrap px-3 py-3"><ValidationIssueSeverityBadge severity={issue.severity} t={t} /></td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium">{issue.taskCode}</td>
                          <td className="whitespace-nowrap px-3 py-3">{issue.route}</td>
                          <td className="px-3 py-3">
                            <div className="font-medium">{issue.ruleId}</div>
                            <div className="text-xs text-muted-foreground">{validationIssueRuleTitle(issue, t)}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">{validationIssueStatusLabel(issue.status, t)}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <ValidationIssueAction
                              issue={issue}
                              t={t}
                              onOpenAssignment={assignment.openAssignmentTask}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            </Card>
            <ValidationIssueDetail
              issue={selectedIssue}
              items={items}
              t={t}
              onOpenAssignment={assignment.openAssignmentTask}
            />
          </div>
        </div>
      )}
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

function ValidationReadinessBadge({
  publishedReady,
  summary,
  t,
}: {
  publishedReady: boolean;
  summary: ValidationPublishSummary;
  t: (key: string) => string;
}) {
  if (summary.blockedCount > 0) {
    return <Badge variant="destructive">{t('validationBlocked')}</Badge>;
  }
  if (summary.warningCount > 0) {
    return <Badge variant="outline" className="border-warning text-warning">{t('validationWarningReady')}</Badge>;
  }
  if (publishedReady) {
    return <Badge className="bg-success text-white">{t('validationAlreadyPublished')}</Badge>;
  }
  if (summary.validatedAtUtc && summary.canPublish) {
    return <Badge className="bg-success text-white">{t('validationReadyToPublish')}</Badge>;
  }
  return <Badge variant="outline">{t('validationPendingRun')}</Badge>;
}

function ValidationIssueSeverityBadge({ severity, t }: { severity: ValidationIssue['severity']; t: (key: string) => string }) {
  if (severity === 'BLOCK') {
    return <Badge variant="destructive">{t('validationSeverityBlock')}</Badge>;
  }
  return <Badge variant="outline" className="border-warning text-warning">{t('validationSeverityWarning')}</Badge>;
}

function ValidationIssueAction({
  issue,
  onOpenAssignment,
  t,
}: {
  issue: ValidationIssue;
  onOpenAssignment: (taskId: number) => void;
  t: (key: string) => string;
}) {
  if (issue.actionType === 'ASSIGNMENT_DRAWER' || issue.actionType === 'STATUS_REPAIR') {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(event) => {
          event.stopPropagation();
          onOpenAssignment(issue.taskId);
        }}
      >
        {t('validationOpenAssignment')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <Button asChild size="sm" variant="outline" onClick={(event) => event.stopPropagation()}>
      <a href="/exceptions-cdr/exception-requests">{t('validationOpenException')}</a>
    </Button>
  );
}

function ValidationIssueDetail({
  issue,
  items,
  onOpenAssignment,
  t,
}: {
  issue: ValidationIssue | null;
  items: TaskPlanItem[];
  onOpenAssignment: (taskId: number) => void;
  t: (key: string) => string;
}) {
  const task = issue ? items.find((item) => item.id === issue.taskId) : null;
  return (
    <Card className="rounded-lg" data-testid="validation-issue-detail">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('validationIssueDetail')}</CardTitle>
        <CardDescription>{issue ? validationIssueRuleTitle(issue, t) : t('validationIssueDetailEmpty')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!issue && <EmptyState title={t('validationIssueDetail')} description={t('validationIssueDetailEmpty')} />}
        {issue && (
          <>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('taskPool')}</span>
                <span className="text-right font-medium">{issue.taskCode}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('route')}</span>
                <span className="text-right">{issue.route || t('noData')}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('start')}</span>
                <span className="text-right"><Timestamp value={issue.startUtc} /></span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('end')}</span>
                <span className="text-right"><Timestamp value={issue.endUtc} /></span>
              </div>
              {task && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <TaskStatusBadge status={task.status} t={t} />
                </div>
              )}
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="mb-1 font-medium">{issue.ruleId}</div>
              <p className="text-muted-foreground">{validationIssueMessage(issue, t)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ValidationIssueAction issue={issue} t={t} onOpenAssignment={onOpenAssignment} />
              <Button asChild size="sm" variant="ghost">
                <a href="/rostering-workbench/flight-view">{t('validationOpenFlightView')}</a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a href="/rostering-workbench/crew-view">{t('validationOpenCrewView')}</a>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function validationIssueStatusLabel(status: string, t: (key: string) => string) {
  const key = `validationIssueStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function validationIssueRuleTitle(issue: ValidationIssue, t: (key: string) => string) {
  const key = `validationRuleTitle${issue.ruleId}`;
  const label = t(key);
  return label === key ? issue.ruleTitle : label;
}

function validationIssueMessage(issue: ValidationIssue, t: (key: string) => string) {
  const key = `validationRuleMessage${issue.ruleId}`;
  const label = t(key);
  return label === key ? issue.message : label;
}

function keepSelectedIssue(current: string | null, issues: ValidationIssue[]) {
  if (current && issues.some((issue) => issue.id === current)) return current;
  return issues[0]?.id ?? null;
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

