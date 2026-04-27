import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import type {
  IdType,
  TimelineGroup,
  TimelineItem,
  TimelineOptions,
} from 'vis-timeline/standalone';
import { addUtcHours, nowUtc, utcEpochMs } from '../../lib/time';

type TimelineRangeEvent = {
  start?: Date;
  end?: Date;
  byUser?: boolean;
};

interface VisTimelineAdapterProps {
  className?: string;
  groups: TimelineGroup[];
  items: TimelineItem[];
  options: TimelineOptions;
  windowStart: string;
  windowEnd: string;
  onItemClick?: (itemId: IdType) => void;
  onRangeChanged?: (event: TimelineRangeEvent) => void;
}

export interface VisTimelineAdapterHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  moveToNow: () => void;
}

const timelineZoomStep = 0.35;
const timelineControlOptions = { animation: false };

export const VisTimelineAdapter = forwardRef<VisTimelineAdapterHandle, VisTimelineAdapterProps>(function VisTimelineAdapter({
  className,
  groups,
  items,
  options,
  windowStart,
  windowEnd,
  onItemClick,
  onRangeChanged,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const onItemClickRef = useRef(onItemClick);
  const onRangeChangedRef = useRef(onRangeChanged);
  const optionsRef = useRef(options);
  const groupsSignatureRef = useRef('');
  const itemsSignatureRef = useRef('');

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      zoomTimeline(timelineRef.current, optionsRef.current, 1 - timelineZoomStep, onRangeChangedRef.current);
    },
    zoomOut: () => {
      zoomTimeline(timelineRef.current, optionsRef.current, 1 + timelineZoomStep, onRangeChangedRef.current);
    },
    moveToNow: () => {
      moveTimelineToCenter(timelineRef.current, utcEpochMs(nowUtc()), onRangeChangedRef.current);
    },
  }), []);

  useEffect(() => {
    onItemClickRef.current = onItemClick;
  }, [onItemClick]);

  useEffect(() => {
    onRangeChangedRef.current = onRangeChanged;
  }, [onRangeChanged]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!containerRef.current || timelineRef.current) return;

    groupsSignatureRef.current = timelineGroupsSignature(groups);
    itemsSignatureRef.current = timelineItemsSignature(items);
    const timeline = new Timeline(
      containerRef.current,
      new DataSet(items),
      new DataSet(groups),
      options
    );

    const handleClick = (properties?: { item?: IdType | null }) => {
      if (properties?.item == null) return;
      onItemClickRef.current?.(properties.item);
    };

    const handleRangeChanged = (properties?: TimelineRangeEvent) => {
      onRangeChangedRef.current?.(properties ?? {});
    };

    timeline.on('click', handleClick);
    timeline.on('rangechanged', handleRangeChanged);
    timelineRef.current = timeline;

    return () => {
      timeline.off('click', handleClick);
      timeline.off('rangechanged', handleRangeChanged);
      timeline.destroy();
      timelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const nextGroupsSignature = timelineGroupsSignature(groups);
    const nextItemsSignature = timelineItemsSignature(items);
    if (nextGroupsSignature !== groupsSignatureRef.current) {
      timeline.setGroups(new DataSet(groups));
      groupsSignatureRef.current = nextGroupsSignature;
    }
    if (nextItemsSignature !== itemsSignatureRef.current) {
      timeline.setItems(new DataSet(items));
      itemsSignatureRef.current = nextItemsSignature;
    }
  }, [groups, items]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.setOptions(options);
  }, [options]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const currentWindow = timeline.getWindow();
    if (sameWindow(currentWindow.start, currentWindow.end, windowStart, windowEnd)) return;
    timeline.setWindow(windowStart, windowEnd, { animation: false });
  }, [windowEnd, windowStart]);

  return <div ref={containerRef} className={className} />;
});

function sameWindow(currentStart: Date, currentEnd: Date, nextStart: string, nextEnd: string) {
  return Math.abs(currentStart.valueOf() - utcEpochMs(nextStart)) < 5
    && Math.abs(currentEnd.valueOf() - utcEpochMs(nextEnd)) < 5;
}

function zoomTimeline(
  timeline: Timeline | null,
  options: TimelineOptions,
  spanFactor: number,
  onRangeChanged?: (event: TimelineRangeEvent) => void
) {
  if (!timeline) return;
  const currentWindow = timeline.getWindow();
  const centerMs = (currentWindow.start.valueOf() + currentWindow.end.valueOf()) / 2;
  const currentSpanMs = currentWindow.end.valueOf() - currentWindow.start.valueOf();
  const nextSpanMs = clampZoomSpan(currentSpanMs * spanFactor, options);
  setTimelineWindowAroundCenter(timeline, centerMs, nextSpanMs, onRangeChanged);
}

function moveTimelineToCenter(
  timeline: Timeline | null,
  centerMs: number,
  onRangeChanged?: (event: TimelineRangeEvent) => void
) {
  if (!timeline) return;
  const currentWindow = timeline.getWindow();
  const currentSpanMs = currentWindow.end.valueOf() - currentWindow.start.valueOf();
  setTimelineWindowAroundCenter(timeline, centerMs, currentSpanMs, onRangeChanged);
}

function setTimelineWindowAroundCenter(
  timeline: Timeline,
  centerMs: number,
  spanMs: number,
  onRangeChanged?: (event: TimelineRangeEvent) => void
) {
  const halfSpanHours = spanMs / (2 * 60 * 60 * 1000);
  const nextStart = addUtcHours(centerMs, -halfSpanHours);
  const nextEnd = addUtcHours(centerMs, halfSpanHours);
  timeline.setWindow(nextStart, nextEnd, timelineControlOptions);
  onRangeChanged?.({ start: nextStart, end: nextEnd, byUser: true });
}

function clampZoomSpan(spanMs: number, options: TimelineOptions) {
  const min = typeof options.zoomMin === 'number' ? options.zoomMin : spanMs;
  const max = typeof options.zoomMax === 'number' ? options.zoomMax : spanMs;
  return Math.min(max, Math.max(min, spanMs));
}

function timelineGroupsSignature(groups: TimelineGroup[]) {
  return groups.map((group) => [
    group.id,
    group.content,
    group.order,
    group.style,
  ].join('\u001f')).join('\u001e');
}

function timelineItemsSignature(items: TimelineItem[]) {
  return items.map((item) => [
    item.id,
    item.group,
    item.start,
    item.end,
    item.content,
    item.className,
    item.title,
    item.type,
  ].join('\u001f')).join('\u001e');
}
