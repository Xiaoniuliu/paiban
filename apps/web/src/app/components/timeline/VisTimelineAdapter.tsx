import { useEffect, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import type {
  IdType,
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
  onItemSelect?: (itemId: IdType | null) => void;
}

export function VisTimelineAdapter({
  className,
  groups,
  items,
  options,
  windowStart,
  windowEnd,
  onItemSelect,
}: VisTimelineAdapterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const groupsSignatureRef = useRef('');
  const itemsSignatureRef = useRef('');
  const onItemSelectRef = useRef(onItemSelect);

  useEffect(() => {
    onItemSelectRef.current = onItemSelect;
  }, [onItemSelect]);

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

  useEffect(() => {
    const timeline = timelineRef.current;
    const container = containerRef.current;
    if (!timeline || !container) return;

    const handleSelect = (properties?: { items?: IdType[] }) => {
      onItemSelectRef.current?.(properties?.items?.[0] ?? null);
    };
    const handleClick = (properties?: { item?: IdType | null }) => {
      if (properties?.item != null) onItemSelectRef.current?.(properties.item);
    };
    const handleDomClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-timeline-item-id]')
        : null;
      const itemId = target?.dataset.timelineItemId;
      if (itemId != null) onItemSelectRef.current?.(itemId);
    };

    timeline.on('select', handleSelect);
    timeline.on('click', handleClick);
    container.addEventListener('click', handleDomClick, true);
    return () => {
      timeline.off('select', handleSelect);
      timeline.off('click', handleClick);
      container.removeEventListener('click', handleDomClick, true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      onClickCapture={(event) => {
        const target = event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-timeline-item-id]')
          : null;
        const itemId = target?.dataset.timelineItemId;
        if (itemId != null) onItemSelectRef.current?.(itemId);
      }}
    />
  );
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
    JSON.stringify((item as TimelineItem & { displayMetadata?: unknown }).displayMetadata ?? null),
  ].join('\u001f')).join('\u001e');
}
