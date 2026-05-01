import type {
  TimelineGroup,
} from 'vis-timeline/standalone';
import type {
  CrewMember,
  GanttTimelineBlock,
} from '../../types';
import { utcEpochMs } from '../../lib/time';
import { rowHeight } from './timelineConstants';
import {
  archiveMarkerClassName,
  archiveStatusLabel,
  flightGroupLabel,
  timelineStatusLabel,
  timelineVisualClassName,
} from './timelineVisuals';
import type { TimelineDisplayBlock, TimelineViewMode } from './timelineTypes';
import type { TimelineDisplayItem, TimelineRuleHitDisplay } from './timelineTypes';

export function toTimelineItem(block: TimelineDisplayBlock, t: (key: string) => string, viewMode: TimelineViewMode): TimelineDisplayItem {
  const visualClassName = timelineVisualClassName(block, viewMode);
  const archiveClassName = viewMode === 'FLIGHT' ? archiveMarkerClassName(block.archiveStatus) : '';
  const label = block.timelineItemLabel ?? timelineItemLabel(block);
  const statusLabel = timelineStatusLabel(block, t, viewMode);
  const archiveLabel = archiveClassName ? archiveStatusLabel(block.archiveStatus, t) : '';
  const ruleHit = buildRuleHitDisplay(block);
  return {
    id: itemId(block, viewMode),
    group: groupId(block, viewMode),
    start: block.startUtc,
    end: block.endUtc,
    content: escapeHtml(label),
    className: ['gantt-timeline-item', visualClassName, archiveClassName].filter(Boolean).join(' '),
    title: [
      block.displayLabel,
      block.route ?? '',
      statusLabel,
      archiveLabel,
      ruleHit?.summary ?? '',
      ruleHit?.codes.join(', ') ?? '',
      block.timelineTitleExtra ?? '',
    ].filter(Boolean).map(escapeHtml).join(' | '),
    type: 'range',
    displayMetadata: {
      label,
      statusLabel,
      startUtc: block.startUtc,
      endUtc: block.endUtc,
      route: block.route,
      archiveStatusLabel: archiveLabel || null,
      ruleHit,
    },
  };
}

export function itemId(block: TimelineDisplayBlock, viewMode: TimelineViewMode) {
  return viewMode === 'FLIGHT' ? `flight-${block.flightId ?? block.blockId}` : `block-${block.blockId}`;
}

export function uniqueGroups(
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

function timelineItemLabel(block: GanttTimelineBlock) {
  return block.displayLabel;
}

function buildRuleHitDisplay(block: TimelineDisplayBlock): TimelineRuleHitDisplay | null {
  const count = typeof block.ruleHitCount === 'number' && block.ruleHitCount > 0
    ? block.ruleHitCount
    : 0;
  const summary = block.ruleHitSummary?.trim() || null;
  const codes = (block.ruleHitCodes ?? []).filter(Boolean);
  if (count === 0 && !summary && codes.length === 0) return null;
  return {
    count: count || Math.max(codes.length, 1),
    summary,
    codes,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
