import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Users } from 'lucide-react';
import {
  addUtcHours,
  displayDateTimeLocalToUtcIso,
  nowUtc,
  toDisplayDateTimeLocal,
  utcEpochMs,
} from '../lib/time';
import type {
  CreateCrewStatusBlockRequest,
  CrewMember,
  CrewStatusBlockType,
  DisplayTimezone,
  TimelineBlock,
} from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState, PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import type { PageProps } from './pageTypes';

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

export function CrewStatusTimelinePage({ api, language, timezone, t, user }: PageProps) {
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
      <PageHeader icon={Users} title={t('crew-status-timeline')} description={t('crewDescription')} />

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
