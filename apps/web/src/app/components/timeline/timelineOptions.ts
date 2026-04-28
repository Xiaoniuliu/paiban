import * as visTimelineStandalone from 'vis-timeline/standalone';
import type { TimelineOptions } from 'vis-timeline/standalone';
import type { DisplayTimezone } from '../../types';

const zoomMinMs = 6 * 60 * 60 * 1000;
const zoomMaxMs = 31 * 24 * 60 * 60 * 1000;

export function buildTimelineOptions({
  timezone,
}: {
  timezone: DisplayTimezone;
}): TimelineOptions {
  const timelineMoment = (visTimelineStandalone as unknown as {
    moment: (date: unknown) => { utc: () => unknown; utcOffset: (offset: string) => unknown };
  }).moment;

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
    moment: ((date: unknown) => (
      timezone === 'UTC'
        ? timelineMoment(date).utc()
        : timelineMoment(date).utcOffset('+08:00')
    )) as TimelineOptions['moment'],
    tooltip: {
      followMouse: true,
      overflowMethod: 'cap',
    },
  };
}
