import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import { apiErrorMessage } from '../lib/apiErrors';
import type {
  AssignmentTaskDetail,
  DraftRosteringTask,
  SaveAssignmentDraftRequest,
} from '../types';
import { PageHeader } from '../components/framework/PageShell';
import { AssignmentDrawer } from '../components/assignment/AssignmentDrawer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Timestamp } from '../components/time';
import type { PageProps } from './pageTypes';

export function DraftRosteringPage({ activeView, api, t }: PageProps) {
  const [tasks, setTasks] = useState<DraftRosteringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AssignmentTaskDetail | null>(null);
  const [drawerError, setDrawerError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    api.draftRosteringTasks()
      .then((response) => setTasks(response.tasks))
      .catch((nextError: unknown) => setError(apiErrorMessage(nextError, t('draftRosteringLoadError'))))
      .finally(() => setLoading(false));
  }, [api, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAssignment = useCallback((taskId: number) => {
    setError('');
    setDrawerError('');
    api.assignmentTask(taskId)
      .then(setDetail)
      .catch((nextError: unknown) => setError(apiErrorMessage(nextError, t('assignmentLoadError'))));
  }, [api, t]);

  const closeAssignment = useCallback(() => {
    setDetail(null);
    setDrawerError('');
  }, []);

  const saveAssignmentDraft = useCallback(async (payload: SaveAssignmentDraftRequest) => {
    if (!detail) return;
    setSaving(true);
    setDrawerError('');
    try {
      await api.saveAssignmentDraft(detail.task.id, payload);
      closeAssignment();
      refresh();
    } catch (nextError: unknown) {
      setDrawerError(apiErrorMessage(nextError, t('assignmentSaveError')));
    } finally {
      setSaving(false);
    }
  }, [api, closeAssignment, detail, refresh, t]);

  const clearAssignmentDraft = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    setDrawerError('');
    try {
      await api.clearAssignmentDraft(detail.task.id);
      closeAssignment();
      refresh();
    } catch (nextError: unknown) {
      setDrawerError(apiErrorMessage(nextError, t('assignmentClearDraftError')));
    } finally {
      setSaving(false);
    }
  }, [api, closeAssignment, detail, refresh, t]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ClipboardList}
        title={t(viewTitleKey[activeView])}
        description={t('draftRosteringDescription')}
      />

      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        {t('draftRosteringBoundaryNote')}
      </div>

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
                    {[t('taskPool'), t('route'), t('start'), t('end'), t('sectors'), t('status'), t('actions')].map((column) => (
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
                      <td className="whitespace-nowrap px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant={task.taskStatus === 'UNASSIGNED' ? 'default' : 'outline'}
                          disabled={!task.canOpenAssignment}
                          onClick={() => openAssignment(task.taskId)}
                        >
                          {task.taskStatus === 'ASSIGNED_DRAFT' ? t('assignmentAdjust') : t('assignmentOpen')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {detail && (
        <AssignmentDrawer
          detail={detail}
          saving={saving}
          error={drawerError}
          t={t}
          onClose={closeAssignment}
          onSave={saveAssignmentDraft}
          onClearDraft={clearAssignmentDraft}
        />
      )}
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
