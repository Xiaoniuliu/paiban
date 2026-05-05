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
  Language,
  SaveAssignmentDraftRequest,
  ValidationIssue,
  ValidationIssueList,
  ValidationPublishSummary,
} from '../types';
import type { PageProps } from './pageTypes';

export function IssueHandlingPage({ activeView, api, language, t }: PageProps) {
  const [issueList, setIssueList] = useState<ValidationIssueList | null>(null);
  const [issueSelection, setIssueSelection] = useState<IssueSelection>({ issueId: null, staleUrlLookup: false });
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
      setIssueSelection((current) => resolveIssueSelection(current.issueId, nextIssueList));
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
    if (!issueSelection.issueId) return null;
    return issueList.issues.find((issue) => issue.id === issueSelection.issueId) ?? null;
  }, [issueList, issueSelection.issueId]);

  const runValidation = async () => {
    setValidating(true);
    setError('');
    try {
      const summary = await api.runValidationPublishCheck();
      const nextIssueList = issueListFromSummary(summary);
      setIssueList(nextIssueList);
      setIssueSelection((current) => resolveIssueSelection(current.issueId, nextIssueList));
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
                          onClick={() => setIssueSelection({ issueId: issue.id, staleUrlLookup: false })}
                        >
                          <td className="whitespace-nowrap px-3 py-3"><ValidationIssueSeverityBadge severity={issue.severity} t={t} /></td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium">{issue.taskCode || '-'}</td>
                          <td className="whitespace-nowrap px-3 py-3">{issue.route || '-'}</td>
                          <td className="px-3 py-3">
                            <div className="font-medium">{issue.ruleId}</div>
                            <div className="text-xs text-muted-foreground">{validationIssueRuleTitle(issue, t, language)}</div>
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
            staleUrlLookup={issueSelection.staleUrlLookup}
            t={t}
            language={language}
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
  const action = validationIssueActionDestination(issue);
  if (action.kind === 'assignment') {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(event) => {
          event.stopPropagation();
          onOpenAssignment(action.taskId);
        }}
      >
        {t('validationOpenAssignment')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <Button asChild size="sm" variant="outline" onClick={(event) => event.stopPropagation()}>
      <a href={action.href}>{t(action.labelKey)}</a>
    </Button>
  );
}

function ValidationIssueDetail({
  issue,
  staleUrlLookup,
  onOpenAssignment,
  language,
  t,
}: {
  issue: ValidationIssue | null;
  staleUrlLookup: boolean;
  onOpenAssignment: (taskId: number) => void;
  language: Language;
  t: (key: string) => string;
}) {
  return (
    <Card className="rounded-lg" data-testid="issue-handling-detail">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('validationIssueDetail')}</CardTitle>
        <CardDescription>{issue ? validationIssueRuleTitle(issue, t, language) : staleUrlLookup ? validationIssueStaleMessage(t) : t('validationIssueDetailEmpty')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!issue && <EmptyState title={t('validationIssueDetail')} description={staleUrlLookup ? validationIssueStaleMessage(t) : t('validationIssueDetailEmpty')} />}
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
                <span className="text-right">{issue.startUtc ? <Timestamp value={issue.startUtc} /> : t('noData')}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{t('end')}</span>
                <span className="text-right">{issue.endUtc ? <Timestamp value={issue.endUtc} /> : t('noData')}</span>
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

function validationIssueRuleTitle(issue: ValidationIssue, t: (key: string) => string, language: Language) {
  const key = `validationRuleTitle${issue.ruleId}`;
  const label = t(key);
  if (label !== key) return label;
  if (language === 'zh-CN') {
    return issue.ruleTitleZh || issue.ruleTitle || issue.ruleTitleEn || issue.ruleId;
  }
  return issue.ruleTitleEn || issue.ruleTitle || issue.ruleTitleZh || issue.ruleId;
}

function validationIssueMessage(issue: ValidationIssue, t: (key: string) => string) {
  const key = `validationRuleMessage${issue.ruleId}`;
  const label = t(key);
  return label === key ? issue.message : label;
}

type IssueSelection = {
  issueId: string | null;
  staleUrlLookup: boolean;
};

function resolveIssueSelection(current: string | null, issueList: ValidationIssueList): IssueSelection {
  const issues = issueList.issues;
  const urlIssue = issueFromUrlParams(issueList);
  if (urlIssue.hasLocator) {
    return { issueId: urlIssue.issue?.id ?? null, staleUrlLookup: !urlIssue.issue };
  }
  if (current && issues.some((issue) => issue.id === current)) {
    return { issueId: current, staleUrlLookup: false };
  }
  return { issueId: issues[0]?.id ?? null, staleUrlLookup: false };
}

function issueFromUrlParams(issueList: ValidationIssueList) {
  const issues = issueList.issues;
  const params = new URLSearchParams(window.location.search);
  const hitId = params.get('hitId');
  const rosterVersionId = params.get('rosterVersionId');
  const taskId = params.get('taskId');
  const ruleId = params.get('ruleId');
  const targetType = params.get('targetType');
  const targetId = params.get('targetId');
  const timelineBlockId = params.get('timelineBlockId');
  const crewId = params.get('crewId');
  const hasLocator = Boolean(hitId || taskId || ruleId || targetType || targetId || timelineBlockId || crewId);
  if (!hasLocator) return { hasLocator: false, issue: null };
  if (rosterVersionId && issueList.rosterVersionId != null && String(issueList.rosterVersionId) !== rosterVersionId) {
    return { hasLocator: true, issue: null };
  }

  if (hitId) {
    const matchedByHit = issues.find((issue) => String(issue.hitId) === hitId);
    return { hasLocator: true, issue: matchedByHit ?? null };
  }
  if (targetType && targetId) {
    const matchedByTarget = issues.find((issue) => (
      String(issue.targetId) === targetId
      && issue.targetType === targetType
      && (!ruleId || issue.ruleId === ruleId)
    ));
    if (matchedByTarget) return { hasLocator: true, issue: matchedByTarget };
  }
  if (timelineBlockId && ruleId) {
    const matchedByTimeline = issues.find((issue) => String(issue.timelineBlockId) === timelineBlockId && issue.ruleId === ruleId);
    if (matchedByTimeline) return { hasLocator: true, issue: matchedByTimeline };
  }
  if (taskId && ruleId) {
    const matchedByTask = issues.find((issue) => String(issue.taskId) === taskId && issue.ruleId === ruleId);
    if (matchedByTask) return { hasLocator: true, issue: matchedByTask };
  }
  if (crewId && ruleId) {
    const matchedByCrew = issues.find((issue) => String(issue.crewId) === crewId && issue.ruleId === ruleId);
    if (matchedByCrew) return { hasLocator: true, issue: matchedByCrew };
  }
  return { hasLocator: true, issue: null };
}

function validationIssueStaleMessage(t: (key: string) => string) {
  return t('validationIssueStaleHit');
}

type IssueActionDestination =
  | { kind: 'assignment'; taskId: number }
  | { kind: 'link'; href: string; labelKey: string };

function validationIssueActionDestination(issue: ValidationIssue): IssueActionDestination {
  const actionCode = (issue.recommendedAction || issue.actionType || '').toUpperCase();
  if ((actionCode === 'ASSIGNMENT_DRAWER' || actionCode === 'STATUS_REPAIR') && issue.taskId != null) {
    return { kind: 'assignment', taskId: issue.taskId };
  }
  if (['EXTEND_DDO', 'SHORTEN_STANDBY'].includes(actionCode)
    || (actionCode === 'FIX_TIMELINE_BLOCK' && issue.taskId == null)) {
    return { kind: 'link', href: '/crew-status/status-timeline', labelKey: 'crew-status-timeline' };
  }
  if (['FIX_TASK_TIME', 'FIX_FLIGHT_PLAN'].includes(actionCode)) {
    return { kind: 'link', href: '/flight-operations/flight-plan', labelKey: 'task-import-batches' };
  }
  if ([
    'ASSIGNMENT_DRAWER',
    'STATUS_REPAIR',
    'FIX_ASSIGNMENT',
    'FIX_DRAFT_ROSTER',
    'ADJUST_ASSIGNMENT',
    'ADJUST_ROSTER',
    'ASSIGN_CREW',
    'ADD_RELIEF_CREW',
    'FIX_TIMELINE_BLOCK',
  ].includes(actionCode)) {
    return { kind: 'link', href: '/rostering-workbench/draft-rostering', labelKey: 'draft-rostering' };
  }
  if (['ADJUST_CREW_HOURS', 'FIX_CREW_HOURS'].includes(actionCode)) {
    return { kind: 'link', href: '/reports/crew-hours', labelKey: 'reports-crew-hours' };
  }
  return { kind: 'link', href: '/exceptions-cdr/exception-requests', labelKey: 'validationOpenException' };
}

function issueListFromSummary(summary: ValidationPublishSummary): ValidationIssueList {
  return {
    rosterVersionNo: summary.rosterVersionNo,
    rosterVersionId: summary.rosterVersionId,
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
