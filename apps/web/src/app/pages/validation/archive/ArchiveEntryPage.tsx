import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, RefreshCw } from 'lucide-react';
import { viewTitleKey } from '../../../i18n';
import type { ArchiveCase, ArchiveCaseDetail, SaveCrewArchiveFormRequest } from '../../../types';
import { ArchiveDrawer } from '../../../components/archive/ArchiveDrawer';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { DataTableShell, EmptyState, PageHeader } from '../../../components/framework/PageShell';
import { Timestamp } from '../../../components/time';
import type { PageProps } from '../../pageTypes';

type ArchiveQueueFilter = 'ALL' | 'OPEN' | 'Unarchived' | 'PartiallyArchived' | 'Overdue' | 'Archived';

const archiveQueueFilters: ArchiveQueueFilter[] = ['OPEN', 'Unarchived', 'PartiallyArchived', 'Overdue', 'Archived', 'ALL'];

export function ArchiveEntryPage({ activeView, api, t }: PageProps) {
  const [archiveCases, setArchiveCases] = useState<ArchiveCase[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveQueueFilter>('OPEN');
  const [archiveDetail, setArchiveDetail] = useState<ArchiveCaseDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const archiveDetailRequestId = useRef(0);

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

  const openArchiveCase = useCallback((archiveCaseId: number | null) => {
    if (!archiveCaseId) return;
    const requestId = archiveDetailRequestId.current + 1;
    archiveDetailRequestId.current = requestId;
    setArchiveError('');
    api.syncArchiveState()
      .then(() => api.archiveCase(archiveCaseId))
      .then((detail) => {
        if (archiveDetailRequestId.current === requestId) {
          setArchiveDetail(detail);
        }
      })
      .catch(() => {
        if (archiveDetailRequestId.current === requestId) {
          setArchiveError(t('archiveLoadError'));
        }
      });
  }, [api, t]);

  const saveArchiveForm = useCallback(async (formId: number, payload: SaveCrewArchiveFormRequest) => {
    setSaving(true);
    try {
      const result = await api.saveArchiveForm(formId, payload);
      setArchiveDetail((current) => {
        if (current?.archiveCase.id !== result.archiveCase.id) return current;
        let matched = false;
        const nextForms = current.crewForms.map((form) => {
          if (form.id !== result.crewArchiveForm.id) return form;
          matched = true;
          return result.crewArchiveForm;
        });
        return {
          archiveCase: result.archiveCase,
          crewForms: matched ? nextForms : [...nextForms, result.crewArchiveForm],
        };
      });
      setArchiveCases((current) => current.map((archiveCase) => (
        archiveCase.id === result.archiveCase.id ? result.archiveCase : archiveCase
      )));
    } finally {
      setSaving(false);
    }
  }, [api]);

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
        onClick={() => openArchiveCase(archiveCase.id)}
      >
        {archiveCase.taskCode}
      </Button>,
      archiveCase.route,
      <ArchiveStatusBadge status={archiveCase.archiveStatus} t={t} />,
      <Timestamp value={archiveCase.archiveDeadlineAtUtc} />,
      archiveCaseProgress(archiveCase),
      <Button type="button" size="sm" variant="outline" onClick={() => openArchiveCase(archiveCase.id)}>
        {t('archiveOpenDetail')}
      </Button>,
    ]))
  ), [filteredArchiveCases, openArchiveCase, t]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Archive}
        title={t(viewTitleKey[activeView])}
        description={t('archiveQueueDescription')}
      />
      {archiveError && <div className="text-sm text-destructive">{archiveError}</div>}
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
      {archiveDetail && (
        <ArchiveDrawer
          detail={archiveDetail}
          saving={saving}
          t={t}
          onClose={() => setArchiveDetail(null)}
          onSave={saveArchiveForm}
        />
      )}
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

function statusLabel(status: ArchiveCase['archiveStatus'], t: (key: string) => string) {
  return t(`archiveStatus${status}`);
}

function ArchiveStatusBadge({ status, t }: { status: ArchiveCase['archiveStatus']; t: (key: string) => string }) {
  return <Badge variant={status === 'Overdue' ? 'destructive' : 'outline'}>{statusLabel(status, t)}</Badge>;
}

function archiveCaseProgress(archiveCase: ArchiveCase) {
  return `${archiveCase.completedCount}/${archiveCase.totalCount}`;
}
