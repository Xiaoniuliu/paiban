import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DisplayTimezone } from '../types';
import { formatDate, formatDateTime, formatGanttTimeLabel, formatTimeRange, type UtcInput } from './time';

interface TimeDisplayContextValue {
  timezone: DisplayTimezone;
  formatDateTime: (value: UtcInput) => string;
  formatDate: (value: UtcInput) => string;
  formatTimeRange: (start: UtcInput, end: UtcInput) => string;
  formatGanttTimeLabel: (value: UtcInput) => string;
}

const TimeDisplayContext = createContext<TimeDisplayContextValue | null>(null);

export function TimeDisplayProvider({
  timezone,
  children,
}: {
  timezone: DisplayTimezone;
  children: ReactNode;
}) {
  const value = useMemo<TimeDisplayContextValue>(() => {
    if (timezone !== 'UTC' && timezone !== 'UTC+8') {
      throw new Error('TimeDisplayProvider requires an explicit display timezone.');
    }

    return {
      timezone,
      formatDateTime: (input) => formatDateTime(input, timezone),
      formatDate: (input) => formatDate(input, timezone),
      formatTimeRange: (start, end) => formatTimeRange(start, end, timezone),
      formatGanttTimeLabel: (input) => formatGanttTimeLabel(input, timezone),
    };
  }, [timezone]);

  return <TimeDisplayContext.Provider value={value}>{children}</TimeDisplayContext.Provider>;
}

export function useTimeFormatter() {
  const context = useContext(TimeDisplayContext);
  if (!context) {
    throw new Error('useTimeFormatter must be used within TimeDisplayProvider.');
  }
  return context;
}
