import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ListChecks, RefreshCw } from 'lucide-react';
import { AssignmentDrawer } from '../components/assignment/AssignmentDrawer';
import { EmptyState, PageHeader } from '../components/framework/PageShell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Timestamp } from '../components/time';
import type {
  AssignmentTaskDetail,
  SaveAssignmentDraftRequest,
  ValidationIssue,
  ValidationIssueList,
  ValidationPublishSummary,
} from '../types';
import type { PageProps } from './pageTypes';

export function IssueHandlingPage({ activeView, api, t }: PageProps) {
  const [issueList, setIssueList] = useState<ValidationIssueList | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const loadIssues = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    try {
      const nextIssueList = await api.validationIssues();
      setIssueList(nextIssueList);
      setSelectedIssueId((current) => keepSelectedIssue(current, nextIssueList.issues));
    } catch {
      setError(t('validationPublishLoadError'));
    } finally {
      if (mode === 'initial') {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [api, t]);

  useEffect(() => {
    loadIssues('initial');
  }, [loadIssues]);

  const assignment = useAssignmentFlow(api, t, () => loadIssues('refresh'));
  const selectedIssue = useMemo(() => {
    if (!issueList || issueList.issues.length === 0) return null;
    return issueList.issues.find((issue) => issue.id === selectedIssueId) ?? issueList.issues[0];
  }, [issueList, selectedIssueId]);

  const runValidation = async () => {
    setValidating(true);
    setError('');
    try {
      const summary = await api.runValidationPublishCheck();
      const nextIssueList = issueListFromSummary(summary);
      setIssueList(nextIssueList);
      setSelectedIssueId((current) => keepSelectedIssue(current, nextIssueList.issues));
    } catch {
      setError(t('validationPublishValidateError'));
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ListChecks}
        title={t(activeView)}
        description={t('issueHandlingDescription')}
      />
      <Card className="rounded-lg">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base">{t('validationIssues')}</CardTitle>
              <CardDescription>{t('validationIssuesDescription')}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => loadIssues('refresh')}
                disabled={loading || refreshing || validating}
              >
                <RefreshCw className="h-4 w-4" />
                {refreshing ? `${t('loading')}...` : t('refresh')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={runValidation}
                disabled={loading || refreshing || validating}
              >
                <ListChecks className="h-4 w-4" />
                {validating ? `${t('loading')}...` : t('submitValidation')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {t('issueHandlingRefreshHint')}
          </div>
          {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
          {issueList && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <IssueMetric label={t('validationRosterVersion')} value={issueList.rosterVersionNo} />
              <IssueMetric label={t('status')} value={issueList.rosterVersionStatus} />
              <IssueMetric label={t('validationBlocks')} value={issueList.blockedCount} tone={issueList.blockedCount > 0 ? 'text-destructive' : 'text-success'} />
              <IssueMetric label={t('validationWarnings')} value={issueList.warningCount} tone={issueList.warningCount > 0 ? 'text-warning' : undefined} />
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}
        </CardContent>
      </Card>

      {!loading && issueList && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="rounded-lg" data-testid="issue-handling-list">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('validationIssues')}</CardTitle>
              <CardDescription>{t('issueHandlingListDescription')}</CardDescription>
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
                    {issueList.issues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6">
                          <EmptyState title={t('validationNoIssues')} description={t('validationNoIssuesDescription')} />
                        </td>
                      </tr>
                    ) : (
                      issueList.issues.map((issue) => (
                        <tr
                          key={issue.id}
                          className={`cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40 ${selectedIssue?.id === issue.id ? 'bg-muted/50' : ''}`}
                          onClick={() => setSelectedIssueId(issue.id)}
                        >
                          <td className="whitespace-nowrap px-3 py-3"><ValidationIssueSeverityBadge severity={issue.severity} t={t} /></td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium">{issue.taskCode || '-'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{issue.route || '-'}</td>
                          <td className="px-3 py-3">
                            <div className="font-medium">{issue.ruleId}</div>
                            <div className="text-xs text-muted-foreground">{validationIssueRuleTitle(issue, t)}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">{validationIssueStatusLabel(issue.status, t)}</td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <ValidationIssueAction issue={issue} t={t} onOpenAssignment={assignment.openAssignmentTask} />
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
            t={t}
            onOpenAssignment={assignment.openAssignmentTask}
          />
        </div>
      )}

      <IssueHandlingAssignmentDrawer assignment={assignment} t={t} />
    </div>
  );
}

function IssueMetric({
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
  onOpenAssignment,
  t,
}: {
  issue: ValidationIssue | null;
  onOpenAssignment: (taskId: number) => void;
  t: (key: string) => string;
}) {
  return (
    <Card className="rounded-lg" data-testid="issue-handling-detail">
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
                <span className="text-right font-medium">{issue.taskCode || '-'}</span>
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
              {issue.evidenceWindowStartUtc && issue.evidenceWindowEndUtc && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{t('issueHandlingEvidenceWindow')}</span>
                  <span className="text-right">
                    <Timestamp value={issue.evidenceWindowStartUtc} />
                    {' - '}
                    <Timestamp value={issue.evidenceWindowEndUtc} />
                  </span>
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

function issueListFromSummary(summary: ValidationPublishSummary): ValidationIssueList {
  return {
    rosterVersionNo: summary.rosterVersionNo,
    rosterVersionStatus: summary.rosterVersionStatus,
    blockedCount: summary.blockedCount,
    warningCount: summary.warningCount,
    issues: summary.issues,
  };
}

type AssignmentFlowState = ReturnType<typeof useAssignmentFlow>;

function useAssignmentFlow(api: PageProps['api'], t: (key: string) => string, onSaved?: () => void) {
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
      await api.saveAssignmentDraft(assignmentDetail.task.id, payload);
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

function IssueHandlingAssignmentDrawer({ assignment, t }: { assignment: AssignmentFlowState; t: (key: string) => string }) {
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
