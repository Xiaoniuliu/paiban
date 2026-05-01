import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileCheck2, ListChecks, RefreshCw, Send } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import { apiErrorMessage } from '../lib/apiErrors';
import type { PublishCrewResult, PublishFlightResult, PublishResultView } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { EmptyState, PageHeader } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import type { PageProps } from './pageTypes';

export function PublishResultPage({ activeView, api, t }: PageProps) {
  return <PublishResultsWorkspace activeView={activeView} api={api} t={t} mode="publish" />;
}

export function PublishExportPage({ activeView, api, t }: PageProps) {
  return <PublishResultsWorkspace activeView={activeView} api={api} t={t} mode="export" />;
}

function PublishResultsWorkspace({
  activeView,
  api,
  t,
  mode,
}: Pick<PageProps, 'activeView' | 'api' | 't'> & { mode: 'publish' | 'export' }) {
  const [view, setView] = useState<PublishResultView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState<'flight' | 'crew' | null>(null);
  const [notice, setNotice] = useState('');
  const defaultTab = mode === 'export' ? 'crew' : 'flight';

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.publishResults()
      .then((nextView) => setView(nextView))
      .catch((nextError: unknown) => setError(apiErrorMessage(nextError, t('publishResultsLoadError'))))
      .finally(() => setLoading(false));
  }, [api, t]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = view?.summary ?? null;
  const publishedReady = useMemo(() => (
    summary
      ? summary.blockedCount === 0 && summary.warningCount === 0 && summary.publishableTasks === 0 && summary.publishedTasks > 0
      : false
  ), [summary]);

  const runValidation = useCallback(async () => {
    setValidating(true);
    setError('');
    setNotice('');
    try {
      setView(await api.validatePublishResults());
    } catch (nextError: unknown) {
      setError(apiErrorMessage(nextError, t('validationPublishValidateError')));
    } finally {
      setValidating(false);
    }
  }, [api, t]);

  const publishRoster = useCallback(async () => {
    if (!summary?.canPublish || !summary.validatedAtUtc) return;
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      setView(await api.publishResultRoster(summary.managerConfirmationRequired));
      setNotice(t('validationPublishPublished'));
    } catch (nextError: unknown) {
      setError(apiErrorMessage(nextError, t('validationPublishPublishError')));
    } finally {
      setPublishing(false);
    }
  }, [api, summary, t]);

  const exportView = useCallback(async (targetView: 'flight' | 'crew') => {
    setExporting(targetView);
    setError('');
    try {
      const file = await api.publishResultExport(targetView);
      const blob = new Blob([file.csv], { type: 'text/csv;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (nextError: unknown) {
      setError(apiErrorMessage(nextError, t('publishResultsExportError')));
    } finally {
      setExporting(null);
    }
  }, [api, t]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileCheck2}
        title={t(viewTitleKey[activeView])}
        description={t(mode === 'export' ? 'publishExportDescription' : 'publishResultsDescription')}
      />

      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        {t(mode === 'export' ? 'publishExportBoundaryNote' : 'publishResultsBoundaryNote')}
      </div>

      <Card className="rounded-lg" data-testid="publish-result-actions">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base">{t(mode === 'export' ? 'publishExportTitle' : 'publishResultsActionTitle')}</CardTitle>
              <CardDescription>{t(mode === 'export' ? 'publishExportActionDescription' : 'publishResultsActionDescription')}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={load}
                disabled={loading || validating || publishing || exporting !== null}
              >
                <RefreshCw className="h-4 w-4" />
                {t('refresh')}
              </Button>
              {mode === 'publish' ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={runValidation}
                    disabled={loading || validating || publishing || exporting !== null}
                  >
                    <ListChecks className="h-4 w-4" />
                    {validating ? `${t('loading')}...` : t('submitValidation')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={publishRoster}
                    disabled={!summary?.canPublish || !summary?.validatedAtUtc || validating || publishing || exporting !== null}
                  >
                    <Send className="h-4 w-4" />
                    {publishing ? `${t('saving')}...` : t('publishRoster')}
                  </Button>
                </>
              ) : (
                <Button asChild type="button" size="sm" variant="outline">
                  <a href="/validation-center/release-gates">{t('openPublishResults')}</a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
          {summary && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                <Metric label={t('validationRosterVersion')} value={summary.rosterVersionNo} />
                <Metric label={t('validationTotalTasks')} value={summary.totalTasks} />
                <Metric label={t('validationDraftAssigned')} value={summary.draftAssignedTasks} />
                <Metric label={t('validationUnassigned')} value={summary.unassignedTasks} tone={summary.unassignedTasks > 0 ? 'text-destructive' : undefined} />
                <Metric label={t('validationBlocks')} value={summary.blockedCount} tone={summary.blockedCount > 0 ? 'text-destructive' : 'text-success'} />
                <Metric label={t('validationWarnings')} value={summary.warningCount} tone={summary.warningCount > 0 ? 'text-warning' : undefined} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <ReadinessBadge summary={summary} publishedReady={publishedReady} t={t} />
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
          {mode === 'publish' && notice && <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{notice}</div>}
          {error && <div className="text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>

      <Card className="rounded-lg" data-testid="publish-result-outputs">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base">{t('publishResultsOutputTitle')}</CardTitle>
              <CardDescription>{t('publishResultsOutputDescription')}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => exportView('flight')} disabled={exporting !== null || loading}>
                <Download className="h-4 w-4" />
                {exporting === 'flight' ? `${t('loading')}...` : t('publishResultsExportFlight')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => exportView('crew')} disabled={exporting !== null || loading}>
                <Download className="h-4 w-4" />
                {exporting === 'crew' ? `${t('loading')}...` : t('publishResultsExportCrew')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="flight">{t('publishResultsFlightView')}</TabsTrigger>
              <TabsTrigger value="crew">{t('publishResultsCrewView')}</TabsTrigger>
            </TabsList>
            <TabsContent value="flight">
              <FlightResultsTable flights={view?.flightResults ?? []} t={t} />
            </TabsContent>
            <TabsContent value="crew">
              <CrewResultsTable crews={view?.crewResults ?? []} t={t} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, tone, value }: { label: string; tone?: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate text-lg font-semibold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

function ReadinessBadge({
  publishedReady,
  summary,
  t,
}: {
  publishedReady: boolean;
  summary: PublishResultView['summary'];
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

function FlightResultsTable({ flights, t }: { flights: PublishFlightResult[]; t: (key: string) => string }) {
  if (flights.length === 0) {
    return <EmptyState title={t('publishResultsFlightView')} description={t('publishResultsNoFlights')} />;
  }
  return (
            <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {[t('taskPool'), t('route'), t('start'), t('end'), t('aircraft'), t('status'), t('publishResultsCrewAssignments')].map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flights.map((flight) => (
            <tr key={flight.taskId} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-4 py-3 font-medium">{flight.taskCode}</td>
              <td className="whitespace-nowrap px-4 py-3">{flight.route}</td>
              <td className="whitespace-nowrap px-4 py-3"><Timestamp value={flight.scheduledStartUtc} /></td>
              <td className="whitespace-nowrap px-4 py-3"><Timestamp value={flight.scheduledEndUtc} /></td>
              <td className="whitespace-nowrap px-4 py-3">{[flight.aircraftType, flight.aircraftNo].filter(Boolean).join(' / ') || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3">{flight.taskStatus}</td>
              <td className="px-4 py-3">
                {flight.crewAssignments.map((assignment) => (
                  <div key={`${flight.taskId}-${assignment.crewId ?? 'unknown'}-${assignment.assignmentRole ?? 'crew'}`}>
                    {(assignment.assignmentRole ?? 'CREW')}: {assignment.crewCode} {assignment.crewNameZh || assignment.crewNameEn}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CrewResultsTable({ crews, t }: { crews: PublishCrewResult[]; t: (key: string) => string }) {
  if (crews.length === 0) {
    return <EmptyState title={t('publishResultsCrewView')} description={t('publishResultsNoCrew')} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {[t('crewCode'), t('name'), t('publishResultsTaskCount'), t('publishResultsFirstDuty'), t('publishResultsLastDuty'), t('taskPool')].map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {crews.map((crew) => (
            <tr key={crew.crewId} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-4 py-3 font-medium">{crew.crewCode}</td>
              <td className="whitespace-nowrap px-4 py-3">{crew.nameZh || crew.nameEn}</td>
              <td className="whitespace-nowrap px-4 py-3">{crew.publishedTaskCount}</td>
              <td className="whitespace-nowrap px-4 py-3">{crew.tasks[0]?.scheduledStartUtc ? <Timestamp value={crew.tasks[0].scheduledStartUtc} /> : '-'}</td>
              <td className="whitespace-nowrap px-4 py-3">{crew.tasks[crew.tasks.length - 1]?.scheduledEndUtc ? <Timestamp value={crew.tasks[crew.tasks.length - 1].scheduledEndUtc} /> : '-'}</td>
              <td className="px-4 py-3">{crew.tasks.map((task) => task.taskCode).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
