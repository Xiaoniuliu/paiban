import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Clock, ZoomIn, ZoomOut } from 'lucide-react';
import type {
  IdType,
} from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
import type { CrewMember, GanttTimelineBlock } from '../../types';
import {
  nowUtc,
  toUtcIsoString,
} from '../../lib/time';
import { useTimeFormatter } from '../../lib/TimeDisplayContext';
import { Timestamp } from '../time';
import { VisTimelineAdapter, type VisTimelineAdapterHandle } from './VisTimelineAdapter';
import { buildDisplayBlocks, itemId, toTimelineItem, uniqueGroups } from './timelineDisplay';
import { routeTimelineItemClick } from './timelineInteractions';
import { legendStatusesForView } from './timelineLegend';
import { buildTimelineOptions } from './timelineOptions';
import type { TimelineViewMode, TimelineWindow } from './timelineTypes';
import './GanttTimeline.css';

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

// Phase 0 boundary rule:
// This timeline is a display adapter only.
// Do not add business-state authorship, workflow gating, or write actions here.
const userRangeSyncDelayMs = 220;

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
  const legendStatuses = useMemo(() => legendStatusesForView(viewMode), [viewMode]);
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
    routeTimelineItemClick(clickedItemId, blockByItemId, {
      onFlightBlockClick,
      onAssignmentBlockClick,
    });
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
  const centerMs = nowUtc().valueOf();
  return {
    windowStartUtc: toUtcIsoString(centerMs - halfWindowMs),
    windowEndUtc: toUtcIsoString(centerMs + halfWindowMs),
  };
}
