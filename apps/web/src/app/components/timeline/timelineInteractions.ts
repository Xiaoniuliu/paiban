import type { IdType } from 'vis-timeline/standalone';
import type { GanttTimelineBlock } from '../../types';

const assignmentRoutableTaskStatuses = new Set(['UNASSIGNED', 'ASSIGNED_DRAFT', 'ASSIGNED']);

type ClickHandlers = {
  onFlightBlockClick: (block: GanttTimelineBlock) => void;
  onAssignmentBlockClick?: (block: GanttTimelineBlock) => void;
};

export function routeTimelineItemClick(
  clickedItemId: IdType,
  blockByItemId: Map<string, GanttTimelineBlock>,
  { onFlightBlockClick, onAssignmentBlockClick }: ClickHandlers
) {
  const block = blockByItemId.get(String(clickedItemId));
  if (!block || block.flightId == null) return;

  const taskStatus = block.taskStatus ?? block.blockStatus;
  if (taskStatus && assignmentRoutableTaskStatuses.has(taskStatus)) {
    onAssignmentBlockClick?.(block);
    return;
  }

  if (block.archiveCaseId) {
    onFlightBlockClick(block);
    return;
  }

  onAssignmentBlockClick?.(block);
}
