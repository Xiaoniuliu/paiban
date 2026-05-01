import type { FormEvent, ReactNode } from 'react';
import { ArrowRightLeft, Eye, Pencil, Plus, Upload } from 'lucide-react';
import {
  addUtcHours,
  displayDateTimeLocalToUtcIso,
  nowUtc,
  toDisplayDateTimeLocal,
  utcEpochMs,
} from '../lib/time';
import type {
  AircraftRegistry,
  DisplayTimezone,
  FlightRoute,
  TaskPlanImportBatch,
  TaskPlanItem,
} from '../types';
import { EmptyState } from '../components/framework/PageShell';
import { Timestamp } from '../components/time';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';

export interface TaskPlanItemForm extends Partial<TaskPlanItem> {
  scheduledEndManuallyEdited?: boolean;
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function routeLabel(item: TaskPlanItem) {
  if (!item.departureAirport || !item.arrivalAirport) return '';
  return `${item.departureAirport}-${item.arrivalAirport}`;
}

export function taskDurationNumber(item: TaskPlanItem) {
  return Math.max(0, (utcEpochMs(item.scheduledEndUtc) - utcEpochMs(item.scheduledStartUtc)) / 3_600_000);
}

function taskDurationHours(item: TaskPlanItem) {
  return taskDurationNumber(item).toFixed(1);
}

function displayTaskStatus(status: string) {
  return status === 'ASSIGNED' ? 'ASSIGNED_DRAFT' : status;
}

function taskStatusLabel(status: string, t: (key: string) => string) {
  const normalized = displayTaskStatus(status);
  const key = `taskStatus${normalized}`;
  const label = t(key);
  return label === key ? normalized : label;
}

function taskStatusBadgeClassName(status: string) {
  const normalized = displayTaskStatus(status);
  if (normalized === 'UNASSIGNED') {
    return 'border-slate-300 bg-slate-100 text-slate-700';
  }
  if (normalized === 'ASSIGNED_DRAFT') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  if (normalized === 'PUBLISHED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (normalized === 'CANCELLED') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return '';
}

function canMaintainTask(item: TaskPlanItem) {
  return item.status === 'UNASSIGNED';
}

export function FlightOperationsSummary({
  items,
  t,
}: {
  items: TaskPlanItem[];
  t: (key: string) => string;
}) {
  const totalFlights = items.length;
  const unassigned = items.filter((item) => item.status === 'UNASSIGNED').length;
  const draftAssigned = items.filter((item) => displayTaskStatus(item.status) === 'ASSIGNED_DRAFT').length;
  const published = items.filter((item) => item.status === 'PUBLISHED').length;
  const cards = [
    { label: t('totalFlights'), value: totalFlights },
    { label: t('unassignedFlights'), value: unassigned },
    { label: t('draftAssignedFlights'), value: draftAssigned },
    { label: t('publishedFlights'), value: published },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="rounded-lg">
          <CardContent className="flex items-end justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{card.label}</div>
              <div className="mt-1 text-2xl font-semibold leading-none">{card.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FlightPlanBatchStrip({
  batch,
  loading,
  error,
  canEdit,
  t,
  onImportBatch,
  onSwitchBatch,
  onViewBatch,
}: {
  batch?: TaskPlanImportBatch;
  loading: boolean;
  error: string;
  canEdit: boolean;
  t: (key: string) => string;
  onImportBatch?: () => void;
  onSwitchBatch?: () => void;
  onViewBatch?: () => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('currentBatch')}</div>
          {loading ? (
            <div className="text-sm text-muted-foreground">{t('loading')}...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : batch ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold text-foreground">{batch.batchNo}</div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs uppercase tracking-wide">{t('source')}</span>
                <span>{batch.sourceName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs uppercase tracking-wide">{t('status')}</span>
                <Badge variant="outline">{batch.status}</Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs uppercase tracking-wide">{t('importedAt')}</span>
                <Timestamp value={batch.importedAtUtc} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('flightPlanNoBatch')}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {canEdit && onImportBatch && (
            <Button size="sm" onClick={() => onImportBatch?.()}>
              <Upload className="mr-2 h-4 w-4" />
              {t('importNewBatch')}
            </Button>
          )}
          {onSwitchBatch && (
            <Button size="sm" variant="outline" disabled={!batch} onClick={() => onSwitchBatch?.()}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {t('switchBatch')}
            </Button>
          )}
          {onViewBatch && (
            <Button size="sm" variant="outline" disabled={!batch} onClick={() => onViewBatch?.()}>
              <Eye className="mr-2 h-4 w-4" />
              {t('viewBatchDetail')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FlightOperationsFilters({
  query,
  statusFilter,
  statusValues,
  t,
  onQueryChange,
  onStatusFilterChange,
}: {
  query: string;
  statusFilter: string;
  statusValues: string[];
  t: (key: string) => string;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <Input
        className="md:flex-1"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t('flightSearchPlaceholder')}
      />
      <select
        className="h-10 rounded-md border border-border bg-background px-3 text-sm md:w-44"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        aria-label={t('status')}
      >
        <option value="ALL">{t('all')} {t('status')}</option>
        {statusValues.map((status) => (
          <option key={status} value={status}>{taskStatusLabel(status, t)}</option>
        ))}
      </select>
    </div>
  );
}

export function FlightPlanItemsTable({
  items,
  loading,
  error,
  canEdit = false,
  t,
  onEdit,
  onView,
  onDelete,
}: {
  items: TaskPlanItem[];
  loading: boolean;
  error: string;
  canEdit?: boolean;
  t: (key: string) => string;
  onEdit?: (item: TaskPlanItem) => void;
  onView?: (item: TaskPlanItem) => void;
  onDelete?: (item: TaskPlanItem) => void;
}) {
  if (loading) return <div className="text-sm text-muted-foreground">{t('loading')}...</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;
  if (items.length === 0) return <EmptyState title={t('noData')} description={t('flightNoData')} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-3 pr-4">{t('flightNo')}</th>
            <th className="py-3 pr-4">{t('taskType')}</th>
            <th className="py-3 pr-4">{t('route')}</th>
            <th className="py-3 pr-4">{t('aircraftType')}</th>
            <th className="py-3 pr-4">{t('requiredCrew')}</th>
            <th className="py-3 pr-4">{t('start')}</th>
            <th className="py-3 pr-4">{t('end')}</th>
            <th className="py-3 pr-4">{t('duration')}</th>
            <th className="py-3 pr-4">{t('sectors')}</th>
            <th className="py-3 pr-4">{t('status')}</th>
            {canEdit && <th className="py-3 pr-4">{t('actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium">{item.taskCode}</td>
              <td className="py-3 pr-4">{item.taskType}</td>
              <td className="py-3 pr-4">{routeLabel(item)}</td>
              <td className="py-3 pr-4">{item.aircraftType ?? '-'}</td>
              <td className="py-3 pr-4">{item.requiredCrewPattern ?? '-'}</td>
              <td className="py-3 pr-4"><Timestamp value={item.scheduledStartUtc} /></td>
              <td className="py-3 pr-4"><Timestamp value={item.scheduledEndUtc} /></td>
              <td className="py-3 pr-4">{taskDurationHours(item)}h</td>
              <td className="py-3 pr-4">{item.sectorCount}</td>
              <td className="py-3 pr-4">
                <Badge variant="outline" className={taskStatusBadgeClassName(item.status)}>
                  {taskStatusLabel(item.status, t)}
                </Badge>
              </td>
              {canEdit && (
                <td className="py-3 pr-4">
                  {canMaintainTask(item) ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit?.(item)}><Pencil className="mr-1 h-3 w-3" />{t('edit')}</Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete?.(item)}>{t('deleteFlight')}</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onView?.(item)}>{t('viewDetail')}</Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FlightPlanOperationsPanel({
  batches,
  items,
  allItems,
  loading,
  error,
  loadWarning,
  query,
  statusFilter,
  statusValues,
  canEdit,
  t,
  onQueryChange,
  onStatusFilterChange,
  onAddTask,
  onEditTask,
  onViewTask,
  onDeleteTask,
  onImportBatch,
  onSwitchBatch,
  onViewBatch,
}: {
  batches: TaskPlanImportBatch[];
  items: TaskPlanItem[];
  allItems: TaskPlanItem[];
  loading: boolean;
  error: string;
  loadWarning: string;
  query: string;
  statusFilter: string;
  statusValues: string[];
  canEdit: boolean;
  t: (key: string) => string;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onAddTask: () => void;
  onEditTask: (item: TaskPlanItem) => void;
  onViewTask: (item: TaskPlanItem) => void;
  onDeleteTask: (item: TaskPlanItem) => void;
  onImportBatch?: () => void;
  onSwitchBatch?: () => void;
  onViewBatch?: () => void;
}) {
  const latestBatch = batches[0];
  return (
    <div className="space-y-4">
      <FlightOperationsSummary items={allItems} t={t} />
      <FlightPlanBatchStrip
        batch={latestBatch}
        loading={loading}
        error={error}
        canEdit={canEdit}
        t={t}
        onImportBatch={onImportBatch}
        onSwitchBatch={onSwitchBatch}
        onViewBatch={onViewBatch}
      />
      {!error && loadWarning && <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{loadWarning}</div>}
      <Card className="rounded-lg">
        <CardHeader className="gap-4">
          <div>
            <CardTitle className="text-base">{t('flightPool')}</CardTitle>
            <CardDescription>{t('flightPoolDescription')}</CardDescription>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex justify-start xl:shrink-0">
              {canEdit && <Button onClick={onAddTask}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
            </div>
            <div className="w-full xl:min-w-[34rem] xl:flex-1">
              <FlightOperationsFilters
                query={query}
                statusFilter={statusFilter}
                statusValues={statusValues}
                t={t}
                onQueryChange={onQueryChange}
                onStatusFilterChange={onStatusFilterChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FlightPlanItemsTable
            items={items}
            loading={loading}
            error={error}
            canEdit={canEdit}
            t={t}
            onEdit={onEditTask}
            onView={onViewTask}
            onDelete={onDeleteTask}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function localDisplayDateTimePlusMinutes(value: string, minutes: number, timezone: DisplayTimezone) {
  const utcIso = displayDateTimeLocalToUtcIso(value, timezone);
  return toDisplayDateTimeLocal(utcEpochMs(utcIso) + minutes * 60_000, timezone);
}

function syncTaskTimingFromRoute(
  value: TaskPlanItemForm,
  route: FlightRoute,
  timezone: DisplayTimezone,
  options: { forceEndTime?: boolean } = {},
): TaskPlanItemForm {
  const nextValue: TaskPlanItemForm = {
    ...value,
    departureAirport: route.departureAirport,
    arrivalAirport: route.arrivalAirport,
  };
  if (value.scheduledStartUtc && (options.forceEndTime || !value.scheduledEndManuallyEdited)) {
    nextValue.scheduledEndUtc = localDisplayDateTimePlusMinutes(
      value.scheduledStartUtc,
      route.standardDurationMinutes,
      timezone,
    );
    nextValue.scheduledEndManuallyEdited = false;
  }
  return nextValue;
}

export function defaultTaskPlanItemForm(batchId: number | undefined, timezone: DisplayTimezone): TaskPlanItemForm {
  const start = addUtcHours(nowUtc(), 24);
  const end = addUtcHours(start, 5);
  return {
    batchId,
    taskCode: '',
    taskType: 'FLIGHT',
    titleZh: '',
    titleEn: '',
    departureAirport: 'MFM',
    arrivalAirport: '',
    scheduledStartUtc: toDisplayDateTimeLocal(start, timezone),
    scheduledEndUtc: toDisplayDateTimeLocal(end, timezone),
    sectorCount: 1,
    aircraftType: 'A330',
    aircraftNo: '',
    requiredCrewPattern: 'PIC+FO',
    status: 'UNASSIGNED',
    sourceStatus: 'MANUAL',
    scheduledEndManuallyEdited: false,
  };
}

export function taskPlanItemToForm(item: TaskPlanItem, timezone: DisplayTimezone): TaskPlanItemForm {
  return {
    ...item,
    scheduledStartUtc: toDisplayDateTimeLocal(item.scheduledStartUtc, timezone),
    scheduledEndUtc: toDisplayDateTimeLocal(item.scheduledEndUtc, timezone),
    scheduledEndManuallyEdited: true,
  };
}

export function normalizeTaskPlanItemPayload(
  item: TaskPlanItemForm,
  timezone: DisplayTimezone,
  options: { includeSourceStatus?: boolean } = {},
): Partial<TaskPlanItem> {
  const payload: Partial<TaskPlanItem> = {
    batchId: item.batchId,
    taskCode: item.taskCode,
    taskType: item.taskType,
    titleZh: item.titleZh,
    titleEn: item.titleEn,
    departureAirport: item.departureAirport,
    arrivalAirport: item.arrivalAirport,
    scheduledStartUtc: item.scheduledStartUtc ? displayDateTimeLocalToUtcIso(item.scheduledStartUtc, timezone) : item.scheduledStartUtc,
    scheduledEndUtc: item.scheduledEndUtc ? displayDateTimeLocalToUtcIso(item.scheduledEndUtc, timezone) : item.scheduledEndUtc,
    sectorCount: item.sectorCount,
    aircraftType: item.aircraftType,
    aircraftNo: item.aircraftNo,
    requiredCrewPattern: item.requiredCrewPattern,
  };
  if (options.includeSourceStatus) {
    payload.sourceStatus = item.sourceStatus ?? 'MANUAL';
  }
  return payload;
}

export function TaskPlanItemEditDialog({
  open,
  value,
  timezone,
  routes,
  aircraftRows,
  saving,
  readOnly = false,
  t,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  value: TaskPlanItemForm | null;
  timezone: DisplayTimezone;
  routes: FlightRoute[];
  aircraftRows: AircraftRegistry[];
  saving: boolean;
  readOnly?: boolean;
  t: (key: string) => string;
  onChange: (value: TaskPlanItemForm | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!value) return null;
  const update = (key: keyof TaskPlanItem, nextValue: string | number | null | undefined) => onChange({ ...value, [key]: nextValue });
  const activeRoutes = routes.filter((route) => route.status === 'ACTIVE');
  const activeAircraftRows = aircraftRows.filter((aircraft) => aircraft.status === 'ACTIVE');
  const selectedRoute = activeRoutes.find((route) => (
    route.departureAirport === value.departureAirport && route.arrivalAirport === value.arrivalAirport
  )) ?? routes.find((route) => (
    route.departureAirport === value.departureAirport && route.arrivalAirport === value.arrivalAirport
  )) ?? null;
  const selectedAircraft = activeAircraftRows.find((aircraft) => aircraft.aircraftNo === value.aircraftNo)
    ?? aircraftRows.find((aircraft) => aircraft.aircraftNo === value.aircraftNo)
    ?? null;
  const changeRoute = (routeCode: string) => {
    const route = activeRoutes.find((candidate) => candidate.routeCode === routeCode)
      ?? routes.find((candidate) => candidate.routeCode === routeCode);
    if (!route) return;
    onChange(syncTaskTimingFromRoute(value, route, timezone, { forceEndTime: !value.scheduledEndUtc }));
  };
  const changeAircraft = (aircraftNo: string) => {
    const aircraft = activeAircraftRows.find((candidate) => candidate.aircraftNo === aircraftNo)
      ?? aircraftRows.find((candidate) => candidate.aircraftNo === aircraftNo);
    if (!aircraft) return;
    onChange({
      ...value,
      aircraftNo: aircraft.aircraftNo,
      aircraftType: aircraft.aircraftType,
    });
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{readOnly ? t('viewDetail') : (value.id ? t('editFlight') : t('addFlight'))}</DialogTitle><DialogDescription>{t('flightPoolDescription')}</DialogDescription></DialogHeader>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <FormField label={t('flightNo')}><Input required disabled={readOnly} value={value.taskCode ?? ''} onChange={(event) => update('taskCode', event.target.value)} /></FormField>
          <FormField label={t('taskType')}><Input disabled={readOnly} value={value.taskType ?? 'FLIGHT'} onChange={(event) => update('taskType', event.target.value)} /></FormField>
          <FormField label={t('routeCode')}>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              disabled={readOnly}
              value={selectedRoute?.routeCode ?? ''}
              onChange={(event) => changeRoute(event.target.value)}
            >
              <option value="">{t('routeCode')}</option>
              {activeRoutes.map((route) => (
                <option key={route.id} value={route.routeCode}>
                  {route.routeCode} · {route.departureAirport}-{route.arrivalAirport} · {(route.standardDurationMinutes / 60).toFixed(1)}h
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('aircraftNo')}>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              disabled={readOnly}
              value={selectedAircraft?.aircraftNo ?? value.aircraftNo ?? ''}
              onChange={(event) => changeAircraft(event.target.value)}
            >
              <option value="">{t('aircraftNo')}</option>
              {activeAircraftRows.map((aircraft) => (
                <option key={aircraft.id} value={aircraft.aircraftNo}>
                  {aircraft.aircraftNo}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('departureAirport')}><Input disabled value={value.departureAirport ?? ''} readOnly /></FormField>
          <FormField label={t('arrivalAirport')}><Input disabled value={value.arrivalAirport ?? ''} readOnly /></FormField>
          <FormField label={t('start')}>
            <Input
              required
              disabled={readOnly}
              type="datetime-local"
              value={value.scheduledStartUtc ?? ''}
              onChange={(event) => {
                const nextStart = event.target.value;
                if (selectedRoute && nextStart && !value.scheduledEndManuallyEdited) {
                  onChange({
                    ...value,
                    scheduledStartUtc: nextStart,
                    scheduledEndUtc: localDisplayDateTimePlusMinutes(nextStart, selectedRoute.standardDurationMinutes, timezone),
                    scheduledEndManuallyEdited: false,
                  });
                  return;
                }
                update('scheduledStartUtc', nextStart);
              }}
            />
          </FormField>
          <FormField label={t('end')}>
            <Input
              required
              disabled={readOnly}
              type="datetime-local"
              value={value.scheduledEndUtc ?? ''}
              onChange={(event) => onChange({
                ...value,
                scheduledEndUtc: event.target.value,
                scheduledEndManuallyEdited: true,
              })}
            />
          </FormField>
          <FormField label={t('aircraftType')}><Input disabled value={value.aircraftType ?? ''} readOnly /></FormField>
          <FormField label={t('requiredCrew')}><Input disabled={readOnly} value={value.requiredCrewPattern ?? ''} onChange={(event) => update('requiredCrewPattern', event.target.value)} /></FormField>
          <FormField label={t('sectors')}><Input disabled={readOnly} type="number" value={value.sectorCount ?? 1} onChange={(event) => update('sectorCount', Number(event.target.value))} /></FormField>
          <FormField label={t('status')}><div className="flex h-10 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">{taskStatusLabel(value.status ?? 'UNASSIGNED', t)}</div></FormField>
          <FormField label={t('sourceStatus')}><div className="flex h-10 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">{value.sourceStatus ?? 'MANUAL'}</div></FormField>
          <div className="md:col-span-2 text-xs text-muted-foreground">{t('timezone')}: {timezone}</div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>{readOnly ? t('close') : t('cancel')}</Button>
            {!readOnly && <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
