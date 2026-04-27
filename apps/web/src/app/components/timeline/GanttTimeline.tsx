import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Clock, ZoomIn, ZoomOut } from 'lucide-react';
import { moment } from 'vis-timeline/standalone';
import type {
  IdType,
  TimelineGroup,
  TimelineItem,
  TimelineOptions,
} from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import type { CrewMember, DisplayTimezone, GanttTimelineBlock } from '../../types';
import {
  nowUtc,
  toUtcIsoString,
  utcEpochMs,
} from '../../lib/time';
import { useTimeFormatter } from '../../lib/TimeDisplayContext';
import { Timestamp } from '../time';
import { VisTimelineAdapter, type VisTimelineAdapterHandle } from './VisTimelineAdapter';
import './GanttTimeline.css';

interface TimelineWindow {
  windowStartUtc: string;
  windowEndUtc: string;
}

interface GanttTimelineProps {
  blocks: GanttTimelineBlock[];
  crewRows: CrewMember[];
  viewMode: TimelineViewMode;
  windowStartUtc: string;
  windowEndUtc: string;
  t: (key: string) => string;
  onWindowChange: (window: TimelineWindow) => void;
  onFlightBlockClick: (block: GanttTimelineBlock) => void;
  onAssignmentBlockClick?: (block: GanttTimelineBlock) => void;
}

type TimelineRangeEvent = {
  start?: Date;
  end?: Date;
  byUser?: boolean;
};

type TimelineViewMode = 'FLIGHT' | 'CREW';
type TimelineDisplayBlock = GanttTimelineBlock & {
  timelineGroupLabel?: string;
  timelineItemLabel?: string;
  timelineTitleExtra?: string;
};

const zoomMinMs = 6 * 60 * 60 * 1000;
const zoomMaxMs = 31 * 24 * 60 * 60 * 1000;
const rowHeight = 45;
const userRangeSyncDelayMs = 220;
const flightTimelineLegendStatuses = [
  { key: 'UNASSIGNED', className: 'gantt-task-UNASSIGNED', labelKey: 'taskStatusUNASSIGNED' },
  { key: 'ASSIGNED_DRAFT', className: 'gantt-task-ASSIGNED_DRAFT', labelKey: 'taskStatusASSIGNED_DRAFT' },
  { key: 'ASSIGNED', className: 'gantt-task-ASSIGNED', labelKey: 'taskStatusASSIGNED' },
  { key: 'VALIDATION_FAILED', className: 'gantt-task-VALIDATION_FAILED', labelKey: 'taskStatusVALIDATION_FAILED' },
  { key: 'NEEDS_REVIEW', className: 'gantt-task-NEEDS_REVIEW', labelKey: 'taskStatusNEEDS_REVIEW' },
  { key: 'ARCHIVE_OPEN', className: 'gantt-archive-open-swatch', labelKey: 'archiveStatusUnarchived' },
  { key: 'ARCHIVE_DONE', className: 'gantt-archive-archived-swatch', labelKey: 'archiveStatusArchived' },
];
const crewTimelineLegendStatuses = [
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
const ruleSensitiveDutyTypes = new Set(['REST', 'DDO', 'RECOVERY']);

export function GanttTimeline({
  blocks,
  crewRows,
  viewMode,
  windowStartUtc,
  windowEndUtc,
  t,
  onWindowChange,
  onFlightBlockClick,
  onAssignmentBlockClick,
}: GanttTimelineProps) {
  const { timezone } = useTimeFormatter();
  const timelineControlRef = useRef<VisTimelineAdapterHandle | null>(null);
  const userRangeSyncTimerRef = useRef<number | null>(null);
  const displayBlocks = useMemo(() => buildDisplayBlocks(blocks, viewMode, t), [blocks, t, viewMode]);
  const legendStatuses = viewMode === 'CREW' ? crewTimelineLegendStatuses : flightTimelineLegendStatuses;
  const blockByItemId = useMemo(() => {
    return new Map(displayBlocks.map((block) => [itemId(block, viewMode), block]));
  }, [displayBlocks, viewMode]);
  const groups = useMemo(() => uniqueGroups(displayBlocks, crewRows, t, viewMode), [crewRows, displayBlocks, t, viewMode]);
  const items = useMemo(() => displayBlocks.map((block) => toTimelineItem(block, t, viewMode)), [displayBlocks, t, viewMode]);
  const timelineOptions = useMemo(() => (
    buildTimelineOptions({ timezone })
  ), [timezone]);

  useEffect(() => () => {
    if (userRangeSyncTimerRef.current != null) {
      globalThis.clearTimeout(userRangeSyncTimerRef.current);
      userRangeSyncTimerRef.current = null;
    }
  }, []);

  const handleItemClick = useCallback((clickedItemId: IdType) => {
    const block = blockByItemId.get(String(clickedItemId));
    if (!block) return;
    if (block.archiveCaseId) {
      onFlightBlockClick(block);
      return;
    }
    if (block.flightId == null) return;
    onAssignmentBlockClick?.(block);
  }, [blockByItemId, onAssignmentBlockClick, onFlightBlockClick]);

  const handleRangeChanged = useCallback((properties: TimelineRangeEvent) => {
    if (properties.byUser === false || !properties.start || !properties.end) return;
    if (userRangeSyncTimerRef.current != null) {
      globalThis.clearTimeout(userRangeSyncTimerRef.current);
    }
    const nextWindow = {
      windowStartUtc: toUtcIsoString(properties.start.valueOf()),
      windowEndUtc: toUtcIsoString(properties.end.valueOf()),
    };
    userRangeSyncTimerRef.current = globalThis.setTimeout(() => {
      userRangeSyncTimerRef.current = null;
      onWindowChange(nextWindow);
    }, userRangeSyncDelayMs);
  }, [onWindowChange]);

  const moveToNow = useCallback(() => {
    timelineControlRef.current?.moveToNow();
  }, []);

  const zoomInTimeline = useCallback(() => {
    timelineControlRef.current?.zoomIn();
  }, []);

  const zoomOutTimeline = useCallback(() => {
    timelineControlRef.current?.zoomOut();
  }, []);

  return (
    <div className={`gantt-timeline-shell gantt-timeline-${viewMode.toLowerCase()}`} data-testid="gantt-timeline">
      <div className="gantt-timeline-toolbar">
        <div className="gantt-timeline-toolbar-left">
          <div className="gantt-timeline-controls" aria-label="Timeline controls">
            <button
              type="button"
              className="gantt-timeline-control-button"
              title={t('timelineMoveToNow')}
              aria-label={t('timelineMoveToNow')}
              data-testid="timeline-move-to-now"
              onClick={moveToNow}
            >
              <Clock aria-hidden="true" size={14} />
              <span>{t('timelineMoveToNow')}</span>
            </button>
            <button
              type="button"
              className="gantt-timeline-control-button"
              title={t('timelineZoomIn')}
              aria-label={t('timelineZoomIn')}
              data-testid="timeline-zoom-in"
              onClick={zoomInTimeline}
            >
              <ZoomIn aria-hidden="true" size={14} />
              <span>{t('timelineZoomIn')}</span>
            </button>
            <button
              type="button"
              className="gantt-timeline-control-button"
              title={t('timelineZoomOut')}
              aria-label={t('timelineZoomOut')}
              data-testid="timeline-zoom-out"
              onClick={zoomOutTimeline}
            >
              <ZoomOut aria-hidden="true" size={14} />
              <span>{t('timelineZoomOut')}</span>
            </button>
          </div>
          <div className="gantt-timeline-legend-label">
            {viewMode === 'FLIGHT' ? t('timelineFlightStatus') : t('timelineCrewStatus')}
          </div>
        </div>
        <div className="gantt-timeline-legend" data-testid="timeline-status-legend">
          {legendStatuses.map((status) => (
            <span key={status.key} className="gantt-timeline-legend-item">
              <span className={`gantt-timeline-legend-swatch ${status.className}`} />
              <span>{t(status.labelKey)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="gantt-timeline-window-label" data-testid="timeline-window-label">
        <Timestamp value={windowStartUtc} /> <span> - </span> <Timestamp value={windowEndUtc} />
      </div>

      <div className="gantt-timeline-stage">
        {blocks.length === 0 && (
          <div className="gantt-timeline-empty">{t('noData')}</div>
        )}
        <div className="gantt-timeline-canvas-frame">
          <VisTimelineAdapter
            ref={timelineControlRef}
            className="gantt-timeline-canvas"
            groups={groups}
            items={items}
            options={timelineOptions}
            windowStart={windowStartUtc}
            windowEnd={windowEndUtc}
            onItemClick={handleItemClick}
            onRangeChanged={handleRangeChanged}
          />
        </div>
      </div>
    </div>
  );
}

export function defaultGanttWindow() {
  const halfWindowMs = 7 * 24 * 60 * 60 * 1000 / 2;
  const centerMs = utcEpochMs(nowUtc());
  return {
    windowStartUtc: toUtcIsoString(centerMs - halfWindowMs),
    windowEndUtc: toUtcIsoString(centerMs + halfWindowMs),
  };
}

function buildTimelineOptions({
  timezone,
}: {
  timezone: DisplayTimezone;
}): TimelineOptions {
  return {
    autoResize: true,
    editable: false,
    groupOrder: (a, b) => (
      Number(a.order ?? 0) - Number(b.order ?? 0)
      || String(a.id).localeCompare(String(b.id))
    ),
    groupHeightMode: 'fixed',
    height: '100%',
    horizontalScroll: true,
    margin: { axis: 12, item: { horizontal: 0, vertical: 12 } },
    moveable: true,
    orientation: { axis: 'top', item: 'top' },
    preferZoom: true,
    selectable: true,
    showCurrentTime: true,
    stack: false,
    type: 'range',
    verticalScroll: true,
    zoomable: true,
    zoomMax: zoomMaxMs,
    zoomMin: zoomMinMs,
    moment: (date) => (
      timezone === 'UTC'
        ? moment(date).utc()
        : moment(date).utcOffset('+08:00')
    ),
    tooltip: {
      followMouse: true,
      overflowMethod: 'cap',
    },
  };
}

function toTimelineItem(block: TimelineDisplayBlock, t: (key: string) => string, viewMode: TimelineViewMode): TimelineItem {
  const visualClassName = timelineVisualClassName(block, viewMode);
  const archiveClassName = viewMode === 'FLIGHT' ? archiveMarkerClassName(block.archiveStatus) : '';
  return {
    id: itemId(block, viewMode),
    group: groupId(block, viewMode),
    start: block.startUtc,
    end: block.endUtc,
    content: escapeHtml(block.timelineItemLabel ?? timelineItemLabel(block, t, viewMode)),
    className: ['gantt-timeline-item', visualClassName, archiveClassName].filter(Boolean).join(' '),
    title: [
      block.displayLabel,
      block.route ?? '',
      timelineStatusLabel(block, t, viewMode),
      archiveClassName ? archiveStatusLabel(block.archiveStatus, t) : '',
      block.timelineTitleExtra ?? '',
    ].filter(Boolean).map(escapeHtml).join(' | '),
    type: 'range',
  };
}

function itemId(block: TimelineDisplayBlock, viewMode: TimelineViewMode) {
  return viewMode === 'FLIGHT' ? `flight-${block.flightId ?? block.blockId}` : `block-${block.blockId}`;
}

function uniqueGroups(
  blocks: TimelineDisplayBlock[],
  crewRows: CrewMember[],
  t: (key: string) => string,
  viewMode: TimelineViewMode
): TimelineGroup[] {
  const seen = new Map<string, TimelineGroup>();
  if (viewMode === 'CREW') {
    for (const crew of crewRows) {
      const id = `crew-${crew.id}`;
      seen.set(id, {
        id,
        content: `<span class="gantt-timeline-group-label">${escapeHtml(`${crew.crewCode} ${crew.nameEn}`.trim())}</span>`,
        order: crewGroupOrder(crew.crewCode, crew.roleCode),
        style: `height: ${rowHeight}px;`,
      });
    }
  }

  for (const block of blocks) {
    const id = groupId(block, viewMode);
    if (!seen.has(id)) {
      seen.set(id, {
        id,
        content: `<span class="gantt-timeline-group-label">${escapeHtml(groupLabel(block, t, viewMode))}</span>`,
        order: viewMode === 'FLIGHT'
          ? utcEpochMs(block.startUtc)
          : crewGroupOrder(block.crewCode, undefined, block.crewId == null),
        style: `height: ${rowHeight}px;`,
      });
    }
  }
  return Array.from(seen.values());
}

function groupId(block: TimelineDisplayBlock, viewMode: TimelineViewMode) {
  if (viewMode === 'FLIGHT') return `flight-${block.flightId}`;
  if (block.crewId == null) return 'unassigned';
  return `crew-${block.crewId}`;
}

function crewGroupOrder(crewCode: string | null, roleCode?: string, unassigned = false) {
  if (unassigned) return -1;
  const normalizedRole = roleCode?.toUpperCase() ?? '';
  const normalizedCode = (crewCode ?? '').toUpperCase();
  const roleRank = normalizedRole === 'CAPTAIN' || normalizedCode.startsWith('CPT')
    ? 0
    : normalizedRole === 'FIRST_OFFICER' || normalizedCode.startsWith('FO')
      ? 1
      : 2;
  const numericPart = Number(normalizedCode.match(/\d+/)?.[0] ?? 999999);
  return roleRank * 1_000_000 + numericPart;
}

function groupLabel(block: TimelineDisplayBlock, t: (key: string) => string, viewMode: TimelineViewMode) {
  if (viewMode === 'FLIGHT') return block.timelineGroupLabel ?? flightGroupLabel(block);
  if (block.crewId == null) return t('timelineUnassignedGroup');
  return `${block.crewCode ?? ''} ${block.crewName ?? ''}`.trim();
}

function timelineVisualClassName(block: GanttTimelineBlock, viewMode: TimelineViewMode) {
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

function timelineStatusLabel(block: GanttTimelineBlock, t: (key: string) => string, viewMode: TimelineViewMode) {
  if (viewMode === 'CREW' && block.crewId != null) {
    const type = normalizedDutyType(block.blockType);
    const dutyLabel = dutyStatusLabel(block.blockType, t);
    return ruleSensitiveDutyTypes.has(type)
      ? `${plannedDutyStatusLabel(block.blockType, t)} | ${t('ruleValidationPending')}`
      : dutyLabel;
  }
  return taskStatusLabel(block.taskStatus ?? block.blockStatus ?? 'ASSIGNED', t);
}

function archiveMarkerClassName(status: GanttTimelineBlock['archiveStatus']) {
  if (!status) return '';
  return status === 'Archived' ? 'gantt-archive-archived' : 'gantt-archive-open';
}

function archiveStatusLabel(status: GanttTimelineBlock['archiveStatus'], t: (key: string) => string) {
  if (!status) return '';
  const key = `archiveStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function timelineItemLabel(block: GanttTimelineBlock, t: (key: string) => string, viewMode: TimelineViewMode) {
  return block.displayLabel;
}

function taskStatusLabel(status: string, t: (key: string) => string) {
  const key = `taskStatus${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function dutyStatusLabel(blockType: string | null, t: (key: string) => string) {
  const type = normalizedDutyType(blockType);
  const key = `dutyStatus${type}`;
  const label = t(key);
  return label === key ? type : label;
}

function plannedDutyStatusLabel(blockType: string | null, t: (key: string) => string) {
  const type = normalizedDutyType(blockType);
  if (!ruleSensitiveDutyTypes.has(type)) return dutyStatusLabel(blockType, t);
  const key = `plannedDutyStatus${type}`;
  const label = t(key);
  return label === key ? `${t('plannedStatus')} ${dutyStatusLabel(blockType, t)}` : label;
}

function normalizedDutyType(blockType: string | null) {
  const normalized = (blockType ?? 'FLIGHT').toUpperCase();
  if (normalized === 'GROUND_DUTY' || normalized === 'COURSE_DUTY' || normalized === 'VALUE_DUTY') return 'DUTY';
  if (normalized === 'SIMULATOR' || normalized === 'SIM') return 'TRAINING';
  if (normalized === 'REST_PERIOD') return 'REST';
  if (normalized === 'RECOVERY_PERIOD') return 'RECOVERY';
  if (normalized === 'POSITIONING_DUTY') return 'POSITIONING';
  return normalized;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildDisplayBlocks(
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

function crewDisplayName(block: GanttTimelineBlock) {
  return block.crewName || block.crewCode || '';
}

function flightGroupLabel(block: GanttTimelineBlock) {
  const label = block.displayLabel.trim();
  if (!block.route || label.includes(block.route)) return label;
  return `${label} ${block.route}`;
}

function pickStatus(statuses: Array<string | null>) {
  const statusPriority = [
    'VALIDATION_FAILED',
    'BLOCKED',
    'NEEDS_REVIEW',
    'WARNING',
    'UNASSIGNED',
    'ASSIGNED_DRAFT',
    'ASSIGNED',
    'PUBLISHED',
  ];
  for (const status of statusPriority) {
    if (statuses.includes(status)) return status;
  }
  return statuses.find(Boolean) ?? null;
}

function pickArchiveStatus(statuses: Array<ArchiveStatus | null>) {
  const statusPriority: ArchiveStatus[] = ['Overdue', 'PartiallyArchived', 'Unarchived', 'Archived'];
  for (const status of statusPriority) {
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
