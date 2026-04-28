import type {
  ArchiveStatus,
  GanttTimelineBlock,
} from '../../types';
import {
  toUtcIsoString,
  utcEpochMs,
} from '../../lib/time';
import { archiveStatusPriority, flightStatusPriority } from './timelineConstants';
import { crewDisplayName, flightGroupLabel } from './timelineVisuals';
import type { TimelineDisplayBlock, TimelineViewMode } from './timelineTypes';

export function buildDisplayBlocks(
  blocks: GanttTimelineBlock[],
  viewMode: TimelineViewMode,
  t: (key: string) => string
): TimelineDisplayBlock[] {
  if (viewMode === 'CREW') return blocks;
  return aggregateFlightBlocks(blocks, t);
}

function aggregateFlightBlocks(blocks: GanttTimelineBlock[], t: (key: string) => string): TimelineDisplayBlock[] {
  const byFlightId = new Map<number, GanttTimelineBlock[]>();
  for (const block of blocks) {
    if (block.flightId == null) continue;
    const grouped = byFlightId.get(block.flightId) ?? [];
    grouped.push(block);
    byFlightId.set(block.flightId, grouped);
  }

  return Array.from(byFlightId.values())
    .map((flightBlocks) => toFlightDisplayBlock(flightBlocks, t))
    .sort((a, b) => (
      utcEpochMs(a.startUtc) - utcEpochMs(b.startUtc)
      || a.displayLabel.localeCompare(b.displayLabel)
    ));
}

function toFlightDisplayBlock(flightBlocks: GanttTimelineBlock[], t: (key: string) => string): TimelineDisplayBlock {
  const sortedBlocks = [...flightBlocks].sort((a, b) => (
    utcEpochMs(a.startUtc) - utcEpochMs(b.startUtc)
    || Number(a.displayOrder ?? 9999) - Number(b.displayOrder ?? 9999)
    || Number(a.blockId) - Number(b.blockId)
  ));
  const representative = pickFlightRepresentative(sortedBlocks);
  const assignedBlocks = sortedBlocks.filter((block) => block.crewId != null);
  const picName = findCrewName(sortedBlocks, 'PIC') ?? findCrewNameByCodePrefix(sortedBlocks, 'CPT');
  const foName = findCrewName(sortedBlocks, 'FO') ?? findCrewNameByCodePrefix(sortedBlocks, 'FO');
  const additionalNames = sortedBlocks
    .filter((block) => block.assignmentRole === 'RELIEF' || block.assignmentRole === 'EXTRA')
    .map(crewDisplayName)
    .filter(Boolean);
  const hasAssignedCrew = assignedBlocks.length > 0;
  const picLabel = picName ?? t('timelinePicPending');
  const foLabel = foName ?? t('timelineFoPending');
  const titleExtra = [
    `PIC: ${picLabel}`,
    `FO: ${foLabel}`,
    additionalNames.length > 0 ? `Additional: ${additionalNames.join(', ')}` : '',
  ].filter(Boolean).join(' | ');

  return {
    ...representative,
    startUtc: toUtcIsoString(Math.min(...sortedBlocks.map((block) => utcEpochMs(block.startUtc)))),
    endUtc: toUtcIsoString(Math.max(...sortedBlocks.map((block) => utcEpochMs(block.endUtc)))),
    taskStatus: pickStatus(sortedBlocks.map((block) => block.taskStatus)),
    blockStatus: pickStatus(sortedBlocks.map((block) => block.blockStatus)),
    archiveCaseId: pickFirst(sortedBlocks.map((block) => block.archiveCaseId)),
    archiveStatus: pickArchiveStatus(sortedBlocks.map((block) => block.archiveStatus)),
    archiveDeadlineAtUtc: pickFirst(sortedBlocks.map((block) => block.archiveDeadlineAtUtc)),
    crewArchiveSummary: pickCrewArchiveSummary(sortedBlocks),
    canEditArchive: sortedBlocks.some((block) => block.canEditArchive),
    archiveReadOnlyReason: pickFirst(sortedBlocks.map((block) => block.archiveReadOnlyReason)),
    timelineGroupLabel: flightGroupLabel(representative),
    timelineItemLabel: hasAssignedCrew ? `${picLabel} / ${foLabel}` : t('taskStatusUNASSIGNED'),
    timelineTitleExtra: titleExtra,
  };
}

function pickFlightRepresentative(blocks: GanttTimelineBlock[]) {
  return blocks.find((block) => block.assignmentRole === 'PIC')
    ?? blocks.find((block) => block.assignmentRole === 'FO')
    ?? blocks.find((block) => block.crewId != null)
    ?? blocks[0];
}

function findCrewName(blocks: GanttTimelineBlock[], role: 'PIC' | 'FO') {
  const block = blocks.find((item) => item.assignmentRole === role);
  return block ? crewDisplayName(block) : null;
}

function findCrewNameByCodePrefix(blocks: GanttTimelineBlock[], prefix: string) {
  const block = blocks.find((item) => (item.crewCode ?? '').toUpperCase().startsWith(prefix));
  return block ? crewDisplayName(block) : null;
}

function pickStatus(statuses: Array<string | null>) {
  for (const status of flightStatusPriority) {
    if (statuses.includes(status)) return status;
  }
  return statuses.find(Boolean) ?? null;
}

function pickArchiveStatus(statuses: Array<ArchiveStatus | null>) {
  for (const status of archiveStatusPriority) {
    if (statuses.includes(status)) return status;
  }
  return statuses.find(Boolean) ?? null;
}

function pickFirst<T>(values: Array<T | null>) {
  return values.find((value): value is T => value != null) ?? null;
}

function pickCrewArchiveSummary(blocks: GanttTimelineBlock[]) {
  return blocks
    .map((block) => block.crewArchiveSummary)
    .find((summary) => summary.total > 0)
    ?? blocks[0].crewArchiveSummary;
}
