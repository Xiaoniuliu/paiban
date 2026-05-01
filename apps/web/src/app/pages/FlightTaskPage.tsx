import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plane } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import type { AircraftRegistry, FlightRoute, TaskAssignmentReadiness, TaskPlanImportBatch, TaskPlanItem } from '../types';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/framework/PageShell';
import type { PageProps } from './pageTypes';
import * as FlightTaskModule from './FlightTaskModule';

export function FlightTaskPage({ activeView, api, timezone, t, user }: PageProps) {
  const [batches, setBatches] = useState<TaskPlanImportBatch[]>([]);
  const [items, setItems] = useState<TaskPlanItem[]>([]);
  const [routes, setRoutes] = useState<FlightRoute[]>([]);
  const [aircraftRows, setAircraftRows] = useState<AircraftRegistry[]>([]);
  const [assignmentReadiness, setAssignmentReadiness] = useState<TaskAssignmentReadiness | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingTask, setEditingTask] = useState<FlightTaskModule.TaskPlanItemForm | null>(null);
  const [viewingTask, setViewingTask] = useState<FlightTaskModule.TaskPlanItemForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const canEdit = user.role === 'DISPATCHER' || user.role === 'ADMIN';

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    setLoadWarning('');
    Promise.allSettled([
      api.taskPlanBatches(),
      api.taskPlanItems(),
      api.flightRoutes(),
      api.aircraftRegistry(),
      api.taskAssignmentReadiness(),
    ])
      .then(([batchResult, itemResult, routeResult, aircraftResult, readinessResult]) => {
        if (itemResult.status !== 'fulfilled') {
          if (batchResult.status === 'fulfilled') setBatches(batchResult.value);
          if (routeResult.status === 'fulfilled') setRoutes(routeResult.value);
          if (aircraftResult.status === 'fulfilled') setAircraftRows(aircraftResult.value);
          if (readinessResult.status === 'fulfilled') setAssignmentReadiness(readinessResult.value);
          setError(t('taskPlanLoadError'));
          return;
        }

        const nextBatches = batchResult.status === 'fulfilled' ? batchResult.value : [];
        const nextItems = itemResult.value.filter((item) => item.status !== 'CANCELLED');
        const nextRoutes = routeResult.status === 'fulfilled' ? routeResult.value : [];
        const nextAircraftRows = aircraftResult.status === 'fulfilled' ? aircraftResult.value : [];
        const nextReadiness = readinessResult.status === 'fulfilled' ? readinessResult.value : null;

        setBatches(nextBatches);
        setItems(nextItems);
        setRoutes(nextRoutes);
        setAircraftRows(nextAircraftRows);
        setAssignmentReadiness(nextReadiness);

        const coreFailures = [batchResult, routeResult, aircraftResult]
          .filter((result) => result.status !== 'fulfilled')
          .length;
        const readinessTaskIds = new Set(nextReadiness?.tasks.map((task) => task.taskId) ?? []);
        const missingReadinessForVisibleTask = nextReadiness !== null
          && nextItems.some((item) => !readinessTaskIds.has(item.id));
        const readinessUnavailable = readinessResult.status !== 'fulfilled' || missingReadinessForVisibleTask;
        if (coreFailures > 0 || readinessUnavailable) {
          if (readinessUnavailable && coreFailures > 0) {
            setLoadWarning(t('taskPlanReadinessAndSupportingDataWarning'));
          } else if (readinessUnavailable) {
            setLoadWarning(t('taskPlanReadinessUnavailableWarning'));
          } else {
            setLoadWarning(t('taskPlanSupportingDataUnavailableWarning'));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [api, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const taskReadinessById = useMemo(
    () => new Map(assignmentReadiness?.tasks.map((task) => [task.taskId, task]) ?? []),
    [assignmentReadiness],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const haystack = [
          item.taskCode,
          item.taskType,
          item.departureAirport ?? '',
          item.arrivalAirport ?? '',
          item.status,
        ].join(' ').toLowerCase();
        return (!normalizedQuery || haystack.includes(normalizedQuery))
          && (statusFilter === 'ALL' || item.status === statusFilter);
      })
      .sort((left, right) => {
        const leftRequiresCrew = taskReadinessById.get(left.id)?.requiresCrewAssignment ? 1 : 0;
        const rightRequiresCrew = taskReadinessById.get(right.id)?.requiresCrewAssignment ? 1 : 0;
        return rightRequiresCrew - leftRequiresCrew;
      });
  }, [items, query, statusFilter, taskReadinessById]);

  const statusValues = useMemo(() => Array.from(new Set(items.map((item) => item.status))).sort(), [items]);

  const saveTask = (event: FormEvent) => {
    event.preventDefault();
    if (!editingTask) return;
    setSaving(true);
    const payload = FlightTaskModule.normalizeTaskPlanItemPayload(
      editingTask,
      timezone,
      { includeSourceStatus: !editingTask.id },
    );
    const action = editingTask.id ? api.updateTaskPlanItem(editingTask.id, payload) : api.createTaskPlanItem(payload);
    action.then(() => {
      setEditingTask(null);
      refresh();
    }).catch(() => setError(t('saveFailed'))).finally(() => setSaving(false));
  };

  const deleteTask = (item: TaskPlanItem) => {
    if (!globalThis.confirm(t('deleteFlightConfirm'))) return;
    api.cancelTaskPlanItem(item.id).then(refresh).catch(() => setError(t('saveFailed')));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Plane}
        title={t(viewTitleKey[activeView])}
        description={t('flightPlanDescription')}
      />
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <a href="/rostering-workbench/draft-rostering">{t('openDraftRostering')}</a>
        </Button>
      </div>
      <FlightTaskModule.FlightPlanOperationsPanel
        batches={batches}
        items={filteredItems}
        allItems={items}
        loading={loading}
        error={error}
        loadWarning={loadWarning}
        query={query}
        statusFilter={statusFilter}
        statusValues={statusValues}
        canEdit={canEdit}
        t={t}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
        onAddTask={() => setEditingTask(FlightTaskModule.defaultTaskPlanItemForm(batches[0]?.id, timezone))}
        onEditTask={(item) => setEditingTask(FlightTaskModule.taskPlanItemToForm(item, timezone))}
        onViewTask={(item) => setViewingTask(FlightTaskModule.taskPlanItemToForm(item, timezone))}
        onDeleteTask={deleteTask}
        onImportBatch={() => {}}
        onSwitchBatch={() => {}}
        onViewBatch={() => {}}
      />
      <FlightTaskModule.TaskPlanItemEditDialog
        open={editingTask !== null}
        value={editingTask}
        timezone={timezone}
        routes={routes}
        aircraftRows={aircraftRows}
        saving={saving}
        t={t}
        onChange={setEditingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={saveTask}
      />
      <FlightTaskModule.TaskPlanItemEditDialog
        open={viewingTask !== null}
        value={viewingTask}
        timezone={timezone}
        routes={routes}
        aircraftRows={aircraftRows}
        saving={false}
        readOnly
        t={t}
        onChange={setViewingTask}
        onClose={() => setViewingTask(null)}
        onSubmit={(event) => event.preventDefault()}
      />
    </div>
  );
}
