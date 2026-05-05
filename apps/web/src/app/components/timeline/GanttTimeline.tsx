import { useEffect, useMemo, useState } from 'react';
import type { IdType, TimelineItem, TimelineOptions } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import type { CrewMember, GanttTimelineBlock } from '../../types';
import {
  nowUtc,
  toUtcIsoString,
} from '../../lib/time';
import { useTimeFormatter } from '../../lib/TimeDisplayContext';
import { TimeRange } from '../time';
import { VisTimelineAdapter } from './VisTimelineAdapter';
import { buildDisplayBlocks, toTimelineItem, uniqueGroups } from './timelineDisplay';
import { legendStatusesForView } from './timelineLegend';
import { buildTimelineOptions } from './timelineOptions';
import type { TimelineDisplayItem, TimelineViewMode } from './timelineTypes';
import './GanttTimeline.css';

interface GanttTimelineProps {
  blocks: GanttTimelineBlock[];
  crewRows: CrewMember[];
  viewMode: TimelineViewMode;
  windowStartUtc: string;
  windowEndUtc: string;
  t: (key: string) => string;
}

// Phase 0 boundary rule:
// This timeline is a display adapter only.
// Do not add business-state authorship, workflow gating, or write actions here.

export function GanttTimeline({
  blocks,
  crewRows,
  viewMode,
  windowStartUtc,
  windowEndUtc,
  t,
}: GanttTimelineProps) {
  const { timezone } = useTimeFormatter();
  const [selectedItemId, setSelectedItemId] = useState<IdType | null>(null);
  const displayBlocks = useMemo(() => buildDisplayBlocks(blocks, viewMode, t), [blocks, t, viewMode]);
  const legendStatuses = useMemo(() => legendStatusesForView(viewMode), [viewMode]);
  const groups = useMemo(() => uniqueGroups(displayBlocks, crewRows, t, viewMode), [crewRows, displayBlocks, t, viewMode]);
  const items = useMemo(() => displayBlocks.map((block) => toTimelineItem(block, t, viewMode)), [displayBlocks, t, viewMode]);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const timelineOptions = useMemo((): TimelineOptions => {
    const baseOptions = buildTimelineOptions({ timezone });
    return {
      ...baseOptions,
      template: timelineItemTemplate(t),
      tooltip: {
        ...baseOptions.tooltip,
        template: timelineTooltipTemplate(t),
      },
    };
  }, [t, timezone]);

  useEffect(() => {
    if (selectedItemId == null) return;
    if (!items.some((item) => item.id === selectedItemId)) setSelectedItemId(null);
  }, [items, selectedItemId]);

  return (
    <div className={`gantt-timeline-shell gantt-timeline-${viewMode.toLowerCase()}`} data-testid="gantt-timeline">
      <div className="gantt-timeline-toolbar">
        <div className="gantt-timeline-toolbar-left">
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

      <div className="gantt-timeline-stage">
        {blocks.length === 0 && (
          <div className="gantt-timeline-empty">{t('noData')}</div>
        )}
        <div className="gantt-timeline-canvas-frame">
          <VisTimelineAdapter
            className="gantt-timeline-canvas"
            groups={groups}
            items={items}
            options={timelineOptions}
            windowStart={windowStartUtc}
            windowEnd={windowEndUtc}
            onItemSelect={setSelectedItemId}
          />
        </div>
      </div>
      {selectedItem && (
        <TimelineReadonlyDetail
          item={selectedItem}
          t={t}
        />
      )}
    </div>
  );
}

export function defaultGanttWindow() {
  const halfWindowMs = 7 * 24 * 60 * 60 * 1000 / 2;
  const centerMs = nowUtc().valueOf();
  return {
    windowStartUtc: toUtcIsoString(centerMs - halfWindowMs),
    windowEndUtc: toUtcIsoString(centerMs + halfWindowMs),
  };
}

function TimelineReadonlyDetail({
  item,
  t,
}: {
  item: TimelineDisplayItem;
  t: (key: string) => string;
}) {
  const metadata = item.displayMetadata;

  return (
    <div className="gantt-timeline-readonly-detail" data-testid="timeline-readonly-detail">
      <div className="gantt-timeline-readonly-detail-title">{t('timelineSelectedDetail')}</div>
      <dl className="gantt-timeline-readonly-detail-grid">
        <div>
          <dt>{t('name')}</dt>
          <dd>{metadata.label}</dd>
        </div>
        <div>
          <dt>{t('status')}</dt>
          <dd>{metadata.statusLabel}</dd>
        </div>
        <div>
          <dt>{t('timelineTimeWindow')}</dt>
          <dd><TimeRange start={metadata.startUtc} end={metadata.endUtc} /></dd>
        </div>
        {metadata.ruleHit && (
          <div>
            <dt>{t('timelineRuleHits')}</dt>
            <dd>{formatRuleHitDetail(metadata.ruleHit, t)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function timelineItemTemplate(t: (key: string) => string) {
  return (item?: TimelineItem) => {
    const metadata = (item as TimelineDisplayItem | undefined)?.displayMetadata;
    const container = document.createElement('span');
    container.className = 'gantt-timeline-item-content';
    if (item?.id != null) container.dataset.timelineItemId = String(item.id);
    const label = document.createElement('span');
    label.className = 'gantt-timeline-item-label';
    label.textContent = metadata?.label ?? String(item?.content ?? '');
    container.append(label);
    if (!metadata) return container;
    const hitCount = metadata.ruleHit?.count ?? 0;
    if (hitCount > 0) {
      const hitBadge = document.createElement('span');
      hitBadge.className = 'gantt-timeline-rule-hit-badge';
      hitBadge.setAttribute('aria-label', t('timelineRuleHits'));
      hitBadge.textContent = formatRuleHitBadge(hitCount);
      container.append(hitBadge);
    }
    return container;
  };
}

function timelineTooltipTemplate(t: (key: string) => string) {
  return (item: TimelineItem) => {
    const metadata = (item as TimelineDisplayItem).displayMetadata;
    if (!metadata) return String(item.title ?? item.content ?? '');
    if (metadata.ruleHit) {
      return [
        metadata.label,
        formatRuleHitDetail(metadata.ruleHit, t),
      ].filter(Boolean).map(escapeHtml).join(' | ');
    }
    return String(item.title ?? metadata.label);
  };
}

function formatRuleHitDetail(
  ruleHit: TimelineDisplayItem['displayMetadata']['ruleHit'],
  t: (key: string) => string
) {
  if (!ruleHit) return '';
  if (ruleHit.summary) return ruleHit.summary;
  if (ruleHit.codes.length > 0) return ruleHit.codes.join(', ');
  return `${ruleHit.count} ${t('timelineRuleHits')}`;
}

function formatRuleHitBadge(count: number) {
  return count > 1 ? `${count} hits` : '!';
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
