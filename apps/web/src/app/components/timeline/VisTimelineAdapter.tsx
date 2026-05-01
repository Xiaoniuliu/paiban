import { useEffect, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import type {
  TimelineGroup,
  TimelineItem,
  TimelineOptions,
} from 'vis-timeline/standalone';
import { utcEpochMs } from '../../lib/time';

interface VisTimelineAdapterProps {
  className?: string;
  groups: TimelineGroup[];
  items: TimelineItem[];
  options: TimelineOptions;
  windowStart: string;
  windowEnd: string;
}

export function VisTimelineAdapter({
  className,
  groups,
  items,
  options,
  windowStart,
  windowEnd,
}: VisTimelineAdapterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const groupsSignatureRef = useRef('');
  const itemsSignatureRef = useRef('');

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

    timelineRef.current = timeline;

    return () => {
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
}

function sameWindow(currentStart: Date, currentEnd: Date, nextStart: string, nextEnd: string) {
  return Math.abs(currentStart.valueOf() - utcEpochMs(nextStart)) < 5
    && Math.abs(currentEnd.valueOf() - utcEpochMs(nextEnd)) < 5;
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
