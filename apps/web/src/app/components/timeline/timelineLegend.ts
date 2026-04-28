import type { TimelineViewMode } from './timelineTypes';

export type TimelineLegendStatus = {
  key: string;
  className: string;
  labelKey: string;
};

const flightTimelineLegendStatuses: TimelineLegendStatus[] = [
  { key: 'UNASSIGNED', className: 'gantt-task-UNASSIGNED', labelKey: 'taskStatusUNASSIGNED' },
  { key: 'ASSIGNED_DRAFT', className: 'gantt-task-ASSIGNED_DRAFT', labelKey: 'taskStatusASSIGNED_DRAFT' },
  { key: 'ASSIGNED', className: 'gantt-task-ASSIGNED', labelKey: 'taskStatusASSIGNED' },
  { key: 'VALIDATION_FAILED', className: 'gantt-task-VALIDATION_FAILED', labelKey: 'taskStatusVALIDATION_FAILED' },
  { key: 'NEEDS_REVIEW', className: 'gantt-task-NEEDS_REVIEW', labelKey: 'taskStatusNEEDS_REVIEW' },
  { key: 'ARCHIVE_OPEN', className: 'gantt-archive-open-swatch', labelKey: 'archiveStatusUnarchived' },
  { key: 'ARCHIVE_DONE', className: 'gantt-archive-archived-swatch', labelKey: 'archiveStatusArchived' },
];

const crewTimelineLegendStatuses: TimelineLegendStatus[] = [
  { key: 'UNASSIGNED', className: 'gantt-task-UNASSIGNED', labelKey: 'taskStatusUNASSIGNED' },
  { key: 'FLIGHT', className: 'gantt-duty-FLIGHT', labelKey: 'dutyStatusFLIGHT' },
  { key: 'POSITIONING', className: 'gantt-duty-POSITIONING', labelKey: 'dutyStatusPOSITIONING' },
  { key: 'STANDBY', className: 'gantt-duty-STANDBY', labelKey: 'dutyStatusSTANDBY' },
  { key: 'DUTY', className: 'gantt-duty-DUTY', labelKey: 'dutyStatusDUTY' },
  { key: 'TRAINING', className: 'gantt-duty-TRAINING', labelKey: 'dutyStatusTRAINING' },
  { key: 'REST', className: 'gantt-duty-REST', labelKey: 'dutyStatusREST' },
  { key: 'DDO', className: 'gantt-duty-DDO', labelKey: 'dutyStatusDDO' },
  { key: 'RECOVERY', className: 'gantt-duty-RECOVERY', labelKey: 'dutyStatusRECOVERY' },
];

export function legendStatusesForView(viewMode: TimelineViewMode): TimelineLegendStatus[] {
  return viewMode === 'CREW' ? crewTimelineLegendStatuses : flightTimelineLegendStatuses;
}
