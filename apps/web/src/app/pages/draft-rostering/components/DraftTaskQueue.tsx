import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Timestamp } from '../../../components/time';
import type { DraftRosteringTask } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { AssignmentEntryButton } from './AssignmentEntryButton';

interface DraftTaskQueueProps {
  tasks: DraftRosteringTask[];
  loading: boolean;
  error: string;
  onOpenAssignment: (taskId: number) => void;
  t: (key: string) => string;
}

export function DraftTaskQueue({ tasks, loading, error, onOpenAssignment, t }: DraftTaskQueueProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{t('draftRosteringQueueTitle')}</CardTitle>
        <CardDescription>{t('draftRosteringQueueDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading && <div className="p-4 text-sm text-muted-foreground">{t('loading')}...</div>}
        {!loading && error && <div className="p-4 text-sm text-destructive">{error}</div>}
        {!loading && !error && tasks.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">{t('draftRosteringQueueEmpty')}</div>
        )}
        {!loading && !error && tasks.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {[t('taskPool'), t('route'), t('start'), t('end'), t('sectors'), t('status'), t('draftContext'), t('actions')].map((column) => (
                    <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.taskId} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{task.taskCode}</td>
                    <td className="whitespace-nowrap px-4 py-3">{routeLabel(task)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><Timestamp value={task.scheduledStartUtc} /></td>
                    <td className="whitespace-nowrap px-4 py-3"><Timestamp value={task.scheduledEndUtc} /></td>
                    <td className="whitespace-nowrap px-4 py-3">{task.sectorCount}</td>
                    <td className="whitespace-nowrap px-4 py-3">{taskStatusLabel(task.taskStatus, t)}</td>
                    <td className="min-w-[220px] px-4 py-3">
                      <DraftContextSummary task={task} t={t} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <AssignmentEntryButton task={task} onOpenAssignment={onOpenAssignment} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DraftContextSummary({ task, t }: { task: DraftRosteringTask; t: (key: string) => string }) {
  const hasIssues = task.issueSummary.totalIssueCount > 0;
  return (
    <div className="space-y-1 text-xs text-muted-foreground" data-testid={`draft-context-${task.taskId}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={hasIssues ? 'destructive' : 'outline'}>
          {hasIssues
            ? `${t('draftIssueSummary')}: ${task.issueSummary.totalIssueCount}`
            : t('draftNoIssues')}
        </Badge>
        {task.issueSummary.blockingIssueCount > 0 && (
          <Badge variant="destructive">{t('draftBlockingIssues')}: {task.issueSummary.blockingIssueCount}</Badge>
        )}
      </div>
      {task.issueSummary.latestIssueMessage && (
        <div className="max-w-[260px] truncate" title={task.issueSummary.latestIssueMessage}>
          {task.issueSummary.latestIssueMessage}
        </div>
      )}
      <div>
        {task.draftAuditSummary.hasDraftAudit && task.draftAuditSummary.lastActionAtUtc ? (
          <>
            {draftAuditActionLabel(task.draftAuditSummary.lastActionCode, t)} · <Timestamp value={task.draftAuditSummary.lastActionAtUtc} />
          </>
        ) : (
          t('draftNoAudit')
        )}
      </div>
    </div>
  );
}

function routeLabel(task: DraftRosteringTask) {
  if (!task.departureAirport || !task.arrivalAirport) return '';
  return `${task.departureAirport}-${task.arrivalAirport}`;
}

function taskStatusLabel(status: string, t: (key: string) => string) {
  const key = `taskStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function draftAuditActionLabel(actionCode: string | null, t: (key: string) => string) {
  if (!actionCode) return t('draftAuditUpdated');
  const key = `draftAudit${actionCode}`;
  const label = t(key);
  return label === key ? actionCode : label;
}
