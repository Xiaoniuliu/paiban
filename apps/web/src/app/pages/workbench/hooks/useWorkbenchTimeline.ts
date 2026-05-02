import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ApiClient } from '../../../lib/api';
import { resizeUtcWindowAroundCenter, toUtcIsoString, utcEpochMs } from '../../../lib/time';
import type { CrewMember, GanttTimelineBlock } from '../../../types';
import { defaultGanttWindow } from '../../../components/timeline/GanttTimeline';

const timelineQueryDays = 62;

export type WorkbenchTimelineViewMode = 'FLIGHT' | 'CREW';

export type TimelineWindow = {
  windowStartUtc: string;
  windowEndUtc: string;
};

export type WorkbenchTimelineState = ReturnType<typeof useWorkbenchTimeline>;

function timelineQueryWindow(windowStartUtc: string, windowEndUtc: string): TimelineWindow {
  const centerMs = (utcEpochMs(windowStartUtc) + utcEpochMs(windowEndUtc)) / 2;
  return resizeUtcWindowAroundCenter(
    toUtcIsoString(centerMs),
    toUtcIsoString(centerMs),
    timelineQueryDays,
  );
}

export function useWorkbenchTimeline(
  api: ApiClient,
  t: (key: string) => string,
  viewMode: WorkbenchTimelineViewMode,
  initialWindow = defaultGanttWindow,
) {
  const initialTimelineWindow = useMemo(() => initialWindow(), [initialWindow]);
  const [blocks, setBlocks] = useState<GanttTimelineBlock[]>([]);
  const [crewRows, setCrewRows] = useState<CrewMember[]>([]);
  const [timelineWindow, setTimelineWindow] = useState(initialTimelineWindow);
  const [queryWindow, setQueryWindow] = useState(() => (
    timelineQueryWindow(initialTimelineWindow.windowStartUtc, initialTimelineWindow.windowEndUtc)
  ));
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [crewLoading, setCrewLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelineReloadKey, setTimelineReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setCrewLoading(true);
    setError('');
    api.crewMembers()
      .then((crewData) => {
        if (active) setCrewRows(crewData);
      })
      .catch(() => {
        if (active) setError(t('workbenchLoadError'));
      })
      .finally(() => {
        if (active) setCrewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, t]);

  useEffect(() => {
    let active = true;
    setTimelineLoaded(false);
    setError('');
    api.ganttTimeline({
        windowStartUtc: queryWindow.windowStartUtc,
        windowEndUtc: queryWindow.windowEndUtc,
        viewMode,
      })
      .then((timelineBlocks) => {
        if (!active) return;
        setBlocks(timelineBlocks);
      })
      .catch(() => {
        if (active) {
          setError(t('workbenchLoadError'));
        }
      })
      .finally(() => {
        if (active) setTimelineLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [api, t, queryWindow.windowEndUtc, queryWindow.windowStartUtc, timelineReloadKey, viewMode]);

  const reloadTimeline = useCallback(() => {
    setQueryWindow(timelineQueryWindow(timelineWindow.windowStartUtc, timelineWindow.windowEndUtc));
    setTimelineReloadKey((current) => current + 1);
  }, [timelineWindow.windowEndUtc, timelineWindow.windowStartUtc]);

  const updateTimelineWindow = useCallback((nextWindow: TimelineWindow) => {
    setTimelineWindow(nextWindow);
  }, []);

  const showBlockingLoading = !timelineLoaded && crewLoading && blocks.length === 0 && crewRows.length === 0;
  const showTimeline = !showBlockingLoading;

  return {
    blocks,
    crewRows,
    error,
    reloadTimeline,
    setTimelineWindow: updateTimelineWindow,
    showBlockingLoading,
    showTimeline,
    timelineWindow,
  };
}
