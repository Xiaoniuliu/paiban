import type { ReactNode } from 'react';
import { useTimeFormatter } from '../lib/TimeDisplayContext';
import { toUtcIsoString, type UtcInput } from '../lib/time';

export function Timestamp({ value, className }: { value: UtcInput; className?: string }) {
  const { formatDateTime } = useTimeFormatter();
  return <time className={className} dateTime={dateTimeAttribute(value)}>{formatDateTime(value)}</time>;
}

export function DateOnly({ value, className }: { value: UtcInput; className?: string }) {
  const { formatDate } = useTimeFormatter();
  return <time className={className} dateTime={dateTimeAttribute(value)}>{formatDate(value)}</time>;
}

export function TimeRange({
  start,
  end,
  className,
}: {
  start: UtcInput;
  end: UtcInput;
  className?: string;
}) {
  const { formatTimeRange } = useTimeFormatter();
  return <span className={className}>{formatTimeRange(start, end)}</span>;
}

export function GanttTimeLabel({ value, className }: { value: UtcInput; className?: string }) {
  const { formatGanttTimeLabel } = useTimeFormatter();
  return <time className={className} dateTime={dateTimeAttribute(value)}>{formatGanttTimeLabel(value)}</time>;
}

export function TimezoneBadge({ children }: { children?: ReactNode }) {
  const { timezone } = useTimeFormatter();
  return (
    <span className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
      {children ?? timezone}
    </span>
  );
}

function dateTimeAttribute(value: UtcInput) {
  return toUtcIsoString(value);
}
