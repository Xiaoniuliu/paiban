import type { DisplayTimezone } from '../types';

export type UtcInput = string | Date | number | { valueOf(): number };

export function nowUtc() {
  return new Date();
}

export function formatDateTime(value: UtcInput, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  return `${formatDateTimeCore(value, timezone)} (${timezone})`;
}

export function formatDate(value: UtcInput, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  const shifted = shiftForDisplay(value, timezone);
  return `${padDate(shifted)} (${timezone})`;
}

export function formatTimeRange(start: UtcInput, end: UtcInput, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  const displayStart = formatDateTimeCore(start, timezone);
  const displayEnd = padTime(shiftForDisplay(end, timezone));
  return `${displayStart}-${displayEnd} (${timezone})`;
}

export function formatGanttTimeLabel(value: UtcInput, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  return `${padTime(shiftForDisplay(value, timezone))} (${timezone})`;
}

export function utcEpochMs(value: UtcInput) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && typeof value.valueOf === 'function') {
    const epoch = Number(value.valueOf());
    if (!Number.isNaN(epoch)) return epoch;
  }
  const epoch = new Date(normalizeUtcString(value)).getTime();
  if (Number.isNaN(epoch)) {
    throw new Error(`Invalid UTC instant: ${value}`);
  }
  return epoch;
}

export function toUtcIsoString(value: UtcInput) {
  return new Date(utcEpochMs(value)).toISOString();
}

export function toDisplayDateTimeLocal(value: UtcInput, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  const shifted = shiftForDisplay(value, timezone);
  return `${padDate(shifted)}T${padTime(shifted)}`;
}

export function displayDateTimeLocalToUtcIso(value: string, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid local display datetime: ${value}`);
  }
  const [, year, month, day, hour, minute] = match;
  const displayEpochMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
  return new Date(displayEpochMs - displayTimezoneOffsetMs(timezone)).toISOString();
}

export function startOfUtcDay(value: UtcInput) {
  const date = new Date(utcEpochMs(value));
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcHours(value: UtcInput, hours: number) {
  return new Date(utcEpochMs(value) + hours * 60 * 60 * 1000);
}

export function addUtcDays(value: UtcInput, days: number) {
  return addUtcHours(value, days * 24);
}

export function utcWindow(start: UtcInput, days: number) {
  return {
    windowStartUtc: toUtcIsoString(start),
    windowEndUtc: toUtcIsoString(addUtcDays(start, days)),
  };
}

export function shiftUtcWindow(start: UtcInput, end: UtcInput, direction: -1 | 1) {
  const durationMs = utcEpochMs(end) - utcEpochMs(start);
  return {
    windowStartUtc: toUtcIsoString(utcEpochMs(start) + durationMs * direction),
    windowEndUtc: toUtcIsoString(utcEpochMs(end) + durationMs * direction),
  };
}

export function resizeUtcWindowAroundCenter(start: UtcInput, end: UtcInput, days: number) {
  const centerMs = (utcEpochMs(start) + utcEpochMs(end)) / 2;
  const halfMs = days * 24 * 60 * 60 * 1000 / 2;
  return {
    windowStartUtc: toUtcIsoString(centerMs - halfMs),
    windowEndUtc: toUtcIsoString(centerMs + halfMs),
  };
}

export function expandUtcWindowAroundItems(
  items: Array<{ startUtc: UtcInput; endUtc: UtcInput }>,
  fallbackStart: UtcInput,
  fallbackEnd: UtcInput,
  paddingHours = 12
) {
  if (items.length === 0) {
    return {
      windowStartUtc: toUtcIsoString(fallbackStart),
      windowEndUtc: toUtcIsoString(fallbackEnd),
    };
  }

  const startMs = Math.min(...items.map((item) => utcEpochMs(item.startUtc)));
  const endMs = Math.max(...items.map((item) => utcEpochMs(item.endUtc)));
  const paddingMs = paddingHours * 60 * 60 * 1000;
  return {
    windowStartUtc: toUtcIsoString(startMs - paddingMs),
    windowEndUtc: toUtcIsoString(endMs + paddingMs),
  };
}

export function interpolateUtcTicks(start: UtcInput, end: UtcInput, count: number) {
  const startMs = utcEpochMs(start);
  const endMs = utcEpochMs(end);
  if (count <= 1 || endMs <= startMs) return [new Date(startMs)];
  const stepMs = (endMs - startMs) / (count - 1);
  return Array.from({ length: count }, (_, index) => new Date(startMs + stepMs * index));
}

export function timelineAxisMinorLabel(value: UtcInput, scale: string, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  const shifted = shiftForDisplay(value, timezone);

  if (scale === 'millisecond' || scale === 'second' || scale === 'minute' || scale === 'hour') {
    return padTime(shifted);
  }

  if (scale === 'weekday' || scale === 'day' || scale === 'week') {
    return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
  }

  if (scale === 'month') {
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}`;
  }

  return String(shifted.getUTCFullYear());
}

export function timelineAxisMajorLabel(value: UtcInput, scale: string, timezone: DisplayTimezone) {
  assertDisplayTimezone(timezone);
  const shifted = shiftForDisplay(value, timezone);

  if (scale === 'millisecond' || scale === 'second') {
    return `${padDate(shifted)} ${padTime(shifted)} (${timezone})`;
  }

  if (scale === 'minute' || scale === 'hour') {
    return `${padDate(shifted)} (${timezone})`;
  }

  if (scale === 'weekday' || scale === 'day' || scale === 'week') {
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)} (${timezone})`;
  }

  if (scale === 'month') {
    return `${shifted.getUTCFullYear()} (${timezone})`;
  }

  return timezone;
}

export function timelineLeftPercent(value: UtcInput, rangeStart: UtcInput, rangeHours = 24) {
  const elapsedMs = utcEpochMs(value) - utcEpochMs(rangeStart);
  const rangeMs = rangeHours * 60 * 60 * 1000;
  return `${clampPercent((elapsedMs / rangeMs) * 100)}%`;
}

export function timelineWidthPercent(start: UtcInput, end: UtcInput, rangeHours = 24, minimumMinutes = 30) {
  const durationMs = Math.max(minimumMinutes * 60 * 1000, utcEpochMs(end) - utcEpochMs(start));
  const rangeMs = rangeHours * 60 * 60 * 1000;
  return `${clampPercent((durationMs / rangeMs) * 100)}%`;
}

function formatDateTimeCore(value: UtcInput, timezone: DisplayTimezone) {
  const shifted = shiftForDisplay(value, timezone);
  return `${padDate(shifted)} ${padTime(shifted)}`;
}

function shiftForDisplay(value: UtcInput, timezone: DisplayTimezone) {
  const date = new Date(utcEpochMs(value));
  return new Date(date.getTime() + displayTimezoneOffsetMs(timezone));
}

function displayTimezoneOffsetMs(timezone: DisplayTimezone) {
  return timezone === 'UTC+8' ? 8 * 60 * 60 * 1000 : 0;
}

function normalizeUtcString(value: string) {
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  return `${value}Z`;
}

function assertDisplayTimezone(timezone: DisplayTimezone | undefined) {
  if (timezone !== 'UTC' && timezone !== 'UTC+8') {
    throw new Error('Display timezone is required for every time rendering path.');
  }
}

function padDate(date: Date) {
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join('-');
}

function padTime(date: Date) {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function clampPercent(value: number) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
