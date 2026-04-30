import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plane } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import type { AircraftRegistry, FlightRoute, TaskPlanImportBatch, TaskPlanItem } from '../types';
import { PageHeader } from '../components/framework/PageShell';
import type { PageProps } from './pageTypes';
import * as FlightTaskModule from './FlightTaskModule';

export function FlightTaskPage({ activeView, api, timezone, t, user }: PageProps) {
  const [batches, setBatches] = useState<TaskPlanImportBatch[]>([]);
  const [items, setItems] = useState<TaskPlanItem[]>([]);
  const [routes, setRoutes] = useState<FlightRoute[]>([]);
  const [aircraftRows, setAircraftRows] = useState<AircraftRegistry[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingTask, setEditingTask] = useState<FlightTaskModule.TaskPlanItemForm | null>(null);
  const [viewingTask, setViewingTask] = useState<FlightTaskModule.TaskPlanItemForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = user.role === 'DISPATCHER' || user.role === 'ADMIN';

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([api.taskPlanBatches(), api.taskPlanItems(), api.flightRoutes(), api.aircraftRegistry()])
      .then(([batchData, itemData, routeData, aircraftData]) => {
        setBatches(batchData);
        setItems(itemData.filter((item) => item.status !== 'CANCELLED'));
        setRoutes(routeData);
        setAircraftRows(aircraftData);
      })
      .catch(() => setError(t('flightOperationsLoadError')))
      .finally(() => setLoading(false));
  }, [api, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = [
        item.taskCode,
        item.taskType,
        item.departureAirport ?? '',
        item.arrivalAirport ?? '',
        item.status,
      ].join(' ').toLowerCase();
      return (!normalizedQuery || haystack.includes(normalizedQuery))
        && (statusFilter === 'ALL' || item.status === statusFilter);
    });
  }, [items, query, statusFilter]);

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
      <FlightTaskModule.FlightPlanOperationsPanel
        batches={batches}
        items={filteredItems}
        allItems={items}
        loading={loading}
        error={error}
        loadWarning=""
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
