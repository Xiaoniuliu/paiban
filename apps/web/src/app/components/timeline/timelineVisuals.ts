import type { GanttTimelineBlock } from '../../types';
import { ruleSensitiveDutyTypes } from './timelineConstants';
import type { TimelineViewMode } from './timelineTypes';

export function timelineVisualClassName(block: GanttTimelineBlock, viewMode: TimelineViewMode) {
  if (block.blockStatus === 'VALIDATION_FAILED' || block.taskStatus === 'VALIDATION_FAILED') {
    return 'gantt-task-VALIDATION_FAILED';
  }
  if (block.blockStatus === 'BLOCKED' || block.taskStatus === 'BLOCKED') {
    return 'gantt-task-BLOCKED';
  }
  if (viewMode === 'CREW') {
    if (block.crewId == null || block.taskStatus === 'UNASSIGNED' || block.blockStatus === 'UNASSIGNED') {
      return 'gantt-task-UNASSIGNED';
    }
    return `gantt-duty-${normalizedDutyType(block.blockType)}`;
  }
  return `gantt-task-${block.taskStatus ?? block.blockStatus ?? 'ASSIGNED'}`;
}

export function timelineStatusLabel(block: GanttTimelineBlock, t: (key: string) => string, viewMode: TimelineViewMode) {
  if (viewMode === 'CREW' && block.crewId != null) {
    const type = normalizedDutyType(block.blockType);
    const dutyLabel = dutyStatusLabel(block.blockType, t);
    return ruleSensitiveDutyTypes.has(type)
      ? `${plannedDutyStatusLabel(block.blockType, t)} | ${t('ruleValidationPending')}`
      : dutyLabel;
  }
  return taskStatusLabel(block.taskStatus ?? block.blockStatus ?? 'ASSIGNED', t);
}

export function archiveMarkerClassName(status: GanttTimelineBlock['archiveStatus']) {
  if (!status) return '';
  return status === 'Archived' ? 'gantt-archive-archived' : 'gantt-archive-open';
}

export function archiveStatusLabel(status: GanttTimelineBlock['archiveStatus'], t: (key: string) => string) {
  if (!status) return '';
  const key = `archiveStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function taskStatusLabel(status: string, t: (key: string) => string) {
  const key = `taskStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function dutyStatusLabel(blockType: string | null, t: (key: string) => string) {
  const type = normalizedDutyType(blockType);
  const key = `dutyStatus${type}`;
  const label = t(key);
  return label === key ? type : label;
}

export function plannedDutyStatusLabel(blockType: string | null, t: (key: string) => string) {
  const type = normalizedDutyType(blockType);
  if (!ruleSensitiveDutyTypes.has(type)) return dutyStatusLabel(blockType, t);
  const key = `plannedDutyStatus${type}`;
  const label = t(key);
  return label === key ? `${t('plannedStatus')} ${dutyStatusLabel(blockType, t)}` : label;
}

export function normalizedDutyType(blockType: string | null) {
  const normalized = (blockType ?? 'FLIGHT').toUpperCase();
  if (normalized === 'GROUND_DUTY' || normalized === 'COURSE_DUTY' || normalized === 'VALUE_DUTY') return 'DUTY';
  if (normalized === 'SIMULATOR' || normalized === 'SIM') return 'TRAINING';
  if (normalized === 'REST_PERIOD') return 'REST';
  if (normalized === 'RECOVERY_PERIOD') return 'RECOVERY';
  if (normalized === 'POSITIONING_DUTY') return 'POSITIONING';
  return normalized;
}

export function flightGroupLabel(block: GanttTimelineBlock) {
  const label = block.displayLabel.trim();
  if (!block.route || label.includes(block.route)) return label;
  return `${label} ${block.route}`;
}

export function crewDisplayName(block: GanttTimelineBlock) {
  return block.crewName || block.crewCode || '';
}
