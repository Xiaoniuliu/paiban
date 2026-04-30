import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Plus, Users } from 'lucide-react';
import { displayDateTimeLocalToUtcIso, nowUtc, toDisplayDateTimeLocal, addUtcHours } from '../lib/time';
import type { CrewExternalWork, CrewMember, DisplayTimezone } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import type { PageProps } from './pageTypes';

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
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

export function CrewExternalWorkPage({ api, language, timezone, t, user }: PageProps) {
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
      <PageHeader icon={Users} title={t('crewExternalWorkLedger')} description={t('crewExternalWorkDescription')} />
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
