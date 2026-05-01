import { useMemo } from 'react';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import type { CrewMember, GanttTimelineBlock } from '../../types';
import {
  nowUtc,
  toUtcIsoString,
} from '../../lib/time';
import { useTimeFormatter } from '../../lib/TimeDisplayContext';
import { VisTimelineAdapter } from './VisTimelineAdapter';
import { buildDisplayBlocks, toTimelineItem, uniqueGroups } from './timelineDisplay';
import { legendStatusesForView } from './timelineLegend';
import { buildTimelineOptions } from './timelineOptions';
import type { TimelineViewMode } from './timelineTypes';
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
  const displayBlocks = useMemo(() => buildDisplayBlocks(blocks, viewMode, t), [blocks, t, viewMode]);
  const legendStatuses = useMemo(() => legendStatusesForView(viewMode), [viewMode]);
  const groups = useMemo(() => uniqueGroups(displayBlocks, crewRows, t, viewMode), [crewRows, displayBlocks, t, viewMode]);
  const items = useMemo(() => displayBlocks.map((block) => toTimelineItem(block, t, viewMode)), [displayBlocks, t, viewMode]);
  const timelineOptions = useMemo(() => (
    buildTimelineOptions({ timezone })
  ), [timezone]);

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
          />
        </div>
      </div>
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
