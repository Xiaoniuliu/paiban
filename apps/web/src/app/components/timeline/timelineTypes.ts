import type { TimelineItem } from 'vis-timeline/standalone';
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

export interface TimelineRuleHitDisplay {
  count: number;
  summary: string | null;
  codes: string[];
}

export interface TimelineItemDisplayMetadata {
  label: string;
  statusLabel: string;
  startUtc: string;
  endUtc: string;
  route: string | null;
  archiveStatusLabel: string | null;
  ruleHit: TimelineRuleHitDisplay | null;
}

export type TimelineDisplayItem = TimelineItem & {
  displayMetadata: TimelineItemDisplayMetadata;
};
