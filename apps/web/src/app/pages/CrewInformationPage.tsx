import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Users } from 'lucide-react';
import {
  addUtcHours,
  displayDateTimeLocalToUtcIso,
  nowUtc,
  toDisplayDateTimeLocal,
  utcEpochMs,
} from '../lib/time';
import type {
  CrewMember,
  CrewQualification,
  DisplayTimezone,
  Language,
  TimelineBlock,
} from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import { CrewDutyCalendarSection } from './CrewDutyCalendarSection';
import { CrewLimitsSection } from './CrewLimitsSection';
import { CrewProfileSection } from './CrewProfileSection';
import { CrewQualificationSection } from './CrewQualificationSection';
import type { PageProps } from './pageTypes';

export function CrewInformationPage({ api, language, timezone, t, user }: PageProps) {
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
          {loading ? <div className="text-sm text-muted-foreground">{t('loading')}...</div> : (
            <CrewProfileSection
              crewRows={crewRows}
              language={language}
              canEdit={canEdit}
              t={t}
              onAddCrew={() => setEditingCrew(defaultCrewForm())}
              onEditCrew={setEditingCrew}
              onDisableCrew={disableCrew}
            />
          )}
        </TabsContent>
        <TabsContent value="qualification">
          {loading ? <div className="text-sm text-muted-foreground">{t('loading')}...</div> : (
            <CrewQualificationSection
              qualifications={qualifications}
              crewRows={crewRows}
              crewById={crewById}
              timezone={timezone}
              canEdit={canEdit}
              t={t}
              onAddQualification={() => setEditingQualification(defaultQualificationForm(crewRows[0]?.id))}
              onEditQualification={setEditingQualification}
              onDisableQualification={disableQualification}
            />
          )}
        </TabsContent>
        <TabsContent value="limits">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>{t('crewLimitsTab')}</CardTitle><CardDescription>{t('crewLimitsDescription')}</CardDescription></CardHeader>
            <CardContent>
              <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {t('crewLimitsBoundaryNote')}
              </div>
              <CrewLimitsSection crewRows={crewRows} language={language} t={t} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>{t('crewDutyCalendarTab')}</CardTitle><CardDescription>{t('crewDutyCalendarDescription')}</CardDescription></CardHeader>
            <CardContent>
              <CrewDutyCalendarSection dutyRows={dutyRows} crewById={crewById} t={t} />
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
          <div className="md:col-span-2 text-sm font-medium">{t('crewProfileCoreSection')}</div>
          <FormField label={t('crewCode')}><Input required value={value.crewCode ?? ''} onChange={(event) => update('crewCode', event.target.value)} /></FormField>
          <FormField label={t('employeeNo')}><Input value={value.employeeNo ?? ''} onChange={(event) => update('employeeNo', event.target.value)} /></FormField>
          <FormField label={t('nameZh')}><Input required value={value.nameZh ?? ''} onChange={(event) => update('nameZh', event.target.value)} /></FormField>
          <FormField label={t('nameEn')}><Input required value={value.nameEn ?? ''} onChange={(event) => update('nameEn', event.target.value)} /></FormField>
          <FormField label={t('base')}><Input value={value.homeBase ?? ''} onChange={(event) => update('homeBase', event.target.value)} /></FormField>
          <FormField label={t('status')}><Input value={value.status ?? ''} onChange={(event) => update('status', event.target.value)} /></FormField>
          <div className="md:col-span-2 text-sm font-medium">{t('crewProfileOperationalSection')}</div>
          <FormField label={t('role')}><Input value={value.roleCode ?? ''} onChange={(event) => update('roleCode', event.target.value)} /></FormField>
          <FormField label={t('rankCode')}><Input value={value.rankCode ?? ''} onChange={(event) => update('rankCode', event.target.value)} /></FormField>
          <FormField label={t('qualification')}><Input value={value.aircraftQualification ?? ''} onChange={(event) => update('aircraftQualification', event.target.value)} /></FormField>
          <FormField label={t('acclimatizationStatus')}><Input value={value.acclimatizationStatus ?? ''} onChange={(event) => update('acclimatizationStatus', event.target.value)} /></FormField>
          <FormField label={t('bodyClockTimezone')}><Input value={value.bodyClockTimezone ?? ''} onChange={(event) => update('bodyClockTimezone', event.target.value)} /></FormField>
          <FormField label={t('normalCommuteMinutes')}><Input type="number" value={value.normalCommuteMinutes ?? 0} onChange={(event) => update('normalCommuteMinutes', Number(event.target.value))} /></FormField>
          <FormField label={t('availabilityStatus')}><Input value={value.availabilityStatus ?? ''} onChange={(event) => update('availabilityStatus', event.target.value)} /></FormField>
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
          <div className="text-sm font-medium">{t('crewQualificationDefinitionSection')}</div>
          <FormField label={t('crewCode')}><select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={value.crewMemberId ?? ''} onChange={(event) => update('crewMemberId', Number(event.target.value))}>{crewRows.map((crew) => <option key={crew.id} value={crew.id}>{crew.crewCode}</option>)}</select></FormField>
          <FormField label={t('type')}><Input value={value.qualificationType ?? ''} onChange={(event) => update('qualificationType', event.target.value)} /></FormField>
          <FormField label={t('qualification')}><Input value={value.qualificationCode ?? ''} onChange={(event) => update('qualificationCode', event.target.value)} /></FormField>
          <div className="text-sm font-medium">{t('crewQualificationValiditySection')}</div>
          <FormField label={t('effectiveFrom')}><Input type="datetime-local" value={toOptionalLocal(value.effectiveFromUtc, timezone)} onChange={(event) => update('effectiveFromUtc', event.target.value)} /></FormField>
          <FormField label={t('effectiveTo')}><Input type="datetime-local" value={toOptionalLocal(value.effectiveToUtc, timezone)} onChange={(event) => update('effectiveToUtc', event.target.value)} /></FormField>
          <FormField label={t('status')}><Input value={value.status ?? ''} onChange={(event) => update('status', event.target.value)} /></FormField>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
