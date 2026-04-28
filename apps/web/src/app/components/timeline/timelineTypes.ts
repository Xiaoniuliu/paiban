import type { GanttTimelineBlock } from '../../types';

export type TimelineViewMode = 'FLIGHT' | 'CREW';

export interface TimelineWindow {
  windowStartUtc: string;
  windowEndUtc: string;
}

export type TimelineDisplayBlock = GanttTimelineBlock & {
  timelineGroupLabel?: string;
  timelineItemLabel?: string;
  timelineTitleExtra?: string;
};
