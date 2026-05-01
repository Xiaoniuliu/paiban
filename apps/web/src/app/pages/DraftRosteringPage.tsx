import { ClipboardList } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import { PageHeader } from '../components/framework/PageShell';
import { AssignmentDrawer } from '../components/assignment/AssignmentDrawer';
import { DraftTaskQueue } from './draft-rostering/components/DraftTaskQueue';
import { useAssignmentDrawerFlow } from './draft-rostering/hooks/useAssignmentDrawerFlow';
import { useDraftRosteringTasks } from './draft-rostering/hooks/useDraftRosteringTasks';
import type { PageProps } from './pageTypes';

export function DraftRosteringPage({ activeView, api, t }: PageProps) {
  const { tasks, loading, error, refresh } = useDraftRosteringTasks(api, t);
  const {
    detail,
    openError,
    drawerError,
    saving,
    openAssignment,
    closeAssignment,
    saveAssignmentDraft,
    clearAssignmentDraft,
  } = useAssignmentDrawerFlow(api, t, refresh);
  const queueError = error || openError;

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

      <DraftTaskQueue
        tasks={tasks}
        loading={loading}
        error={queueError}
        onOpenAssignment={openAssignment}
        t={t}
      />

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
