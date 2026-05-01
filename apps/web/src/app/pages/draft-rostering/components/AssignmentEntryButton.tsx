import { Button } from '../../../components/ui/button';
import type { DraftRosteringTask } from '../../../types';

interface AssignmentEntryButtonProps {
  task: DraftRosteringTask;
  onOpenAssignment: (taskId: number) => void;
  t: (key: string) => string;
}

export function AssignmentEntryButton({ task, onOpenAssignment, t }: AssignmentEntryButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={task.taskStatus === 'UNASSIGNED' ? 'default' : 'outline'}
      disabled={!task.canOpenAssignment}
      title={task.blockedReason ? assignmentBlockedReason(task.blockedReason, t) : undefined}
      onClick={() => onOpenAssignment(task.taskId)}
    >
      {task.taskStatus === 'ASSIGNED_DRAFT' ? t('assignmentAdjust') : t('assignmentOpen')}
    </Button>
  );
}

function assignmentBlockedReason(reason: string, t: (key: string) => string) {
  const key = `assignmentReadOnlyReason${reason}`;
  const label = t(key);
  return label === key ? reason : label;
}
