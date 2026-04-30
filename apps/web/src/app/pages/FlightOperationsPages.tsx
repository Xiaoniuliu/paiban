import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plane } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import type {
  AircraftRegistry,
  AirportDictionary,
  FlightRoute,
  Language,
  TaskPlanItem,
  ViewId,
} from '../types';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PageHeader } from '../components/framework/PageShell';
import type { PageProps } from './pageTypes';
import { FormField } from './FlightOperationsShared';
import { RouteMaintenanceSection } from './RouteMaintenanceSection';
import { AirportMaintenanceSection } from './AirportMaintenanceSection';
import { AircraftMaintenanceSection } from './AircraftMaintenanceSection';

export function FlightOperationsPage({ activeView, api, language, t, user }: PageProps) {
  const [airports, setAirports] = useState<AirportDictionary[]>([]);
  const [routes, setRoutes] = useState<FlightRoute[]>([]);
  const [aircraftRows, setAircraftRows] = useState<AircraftRegistry[]>([]);
  const [tasks, setTasks] = useState<TaskPlanItem[]>([]);
  const [activeTab, setActiveTab] = useState(() => flightOperationsInitialTab(activeView));
  const [editingRoute, setEditingRoute] = useState<Partial<FlightRoute> | null>(null);
  const [editingAirport, setEditingAirport] = useState<Partial<AirportDictionary> | null>(null);
  const [editingAircraft, setEditingAircraft] = useState<Partial<AircraftRegistry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
    setLoadWarning('');
    Promise.allSettled([api.airports(), api.flightRoutes(), api.aircraftRegistry(), api.taskPlanItems()])
      .then(([airportResult, routeResult, aircraftResult, taskResult]) => {
        setAirports(airportResult.status === 'fulfilled'
          ? airportResult.value.filter((airport) => airport.status !== 'INACTIVE')
          : []);
        setRoutes(routeResult.status === 'fulfilled'
          ? routeResult.value.filter((route) => route.status !== 'INACTIVE')
          : []);
        setAircraftRows(aircraftResult.status === 'fulfilled'
          ? aircraftResult.value.filter((aircraft) => aircraft.status !== 'INACTIVE')
          : []);
        setTasks(taskResult.status === 'fulfilled'
          ? taskResult.value.filter((task) => task.status !== 'CANCELLED')
          : []);
        if (airportResult.status !== 'fulfilled' && routeResult.status !== 'fulfilled' && aircraftResult.status !== 'fulfilled' && taskResult.status !== 'fulfilled') {
          setError(t('flightOperationsLoadError'));
          return;
        }
        if (airportResult.status !== 'fulfilled' || routeResult.status !== 'fulfilled' || aircraftResult.status !== 'fulfilled' || taskResult.status !== 'fulfilled') {
          setLoadWarning(t('flightOperationsLoadError'));
        }
      })
      .finally(() => setLoading(false));
  }, [api, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setActiveTab(flightOperationsInitialTab(activeView));
  }, [activeView]);

  const airportByCode = useMemo(() => new Map(airports.map((airport) => [airport.iataCode, airport])), [airports]);
  const canEdit = user.role === 'DISPATCHER' || user.role === 'ADMIN';

  const saveRoute = (event: FormEvent) => {
    event.preventDefault();
    if (!editingRoute) return;
    setSaving(true);
    const action = editingRoute.id ? api.updateFlightRoute(editingRoute.id, editingRoute) : api.createFlightRoute(editingRoute);
    action.then(() => {
      setEditingRoute(null);
      refresh();
    }).catch(() => setError(t('saveFailed'))).finally(() => setSaving(false));
  };

  const saveAirport = (event: FormEvent) => {
    event.preventDefault();
    if (!editingAirport) return;
    setSaving(true);
    const action = editingAirport.id ? api.updateAirport(editingAirport.id, editingAirport) : api.createAirport(editingAirport);
    action.then(() => {
      setEditingAirport(null);
      refresh();
    }).catch(() => setError(t('saveFailed'))).finally(() => setSaving(false));
  };

  const saveAircraft = (event: FormEvent) => {
    event.preventDefault();
    if (!editingAircraft) return;
    setSaving(true);
    const action = editingAircraft.id ? api.updateAircraft(editingAircraft.id, editingAircraft) : api.createAircraft(editingAircraft);
    action.then(() => {
      setEditingAircraft(null);
      refresh();
    }).catch(() => setError(t('saveFailed'))).finally(() => setSaving(false));
  };

  const referencedRouteCodes = useMemo(() => new Set(
    routes
      .filter((route) => tasks.some((task) => task.departureAirport === route.departureAirport && task.arrivalAirport === route.arrivalAirport))
      .map((route) => route.routeCode),
  ), [routes, tasks]);
  const referencedAircraftNos = useMemo(() => new Set(
    aircraftRows
      .filter((aircraft) => tasks.some((task) => (
        (task.aircraftNo && task.aircraftNo === aircraft.aircraftNo)
        || (task.aircraftType && task.aircraftType === aircraft.aircraftType)
      )))
      .map((aircraft) => aircraft.aircraftNo),
  ), [aircraftRows, tasks]);
  const referencedAirportCodes = useMemo(() => {
    const codes = new Set<string>();
    routes.forEach((route) => {
      codes.add(route.departureAirport);
      codes.add(route.arrivalAirport);
    });
    aircraftRows.forEach((aircraft) => {
      if (aircraft.baseAirport) codes.add(aircraft.baseAirport);
    });
    tasks.forEach((task) => {
      if (task.departureAirport) codes.add(task.departureAirport);
      if (task.arrivalAirport) codes.add(task.arrivalAirport);
    });
    return codes;
  }, [routes, aircraftRows, tasks]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Plane}
        title={t(viewTitleKey[activeView])}
        description={t('operationsDataDescription')}
      />
      <OperationsDataPanel
        airports={airports}
        airportByCode={airportByCode}
        routes={routes}
        aircraftRows={aircraftRows}
        referencedRouteCodes={referencedRouteCodes}
        referencedAircraftNos={referencedAircraftNos}
        referencedAirportCodes={referencedAirportCodes}
        activeTab={activeTab}
        loading={loading}
        error={error}
        loadWarning={loadWarning}
        language={language}
        t={t}
        canEdit={canEdit}
        onTabChange={setActiveTab}
        onAddRoute={() => setEditingRoute(defaultFlightRouteForm())}
        onEditRoute={setEditingRoute}
        onDeleteRoute={(route) => api.disableFlightRoute(route.id).then(refresh).catch(() => setError(t('saveFailed')))}
        onAddAirport={() => setEditingAirport(defaultAirportForm())}
        onEditAirport={setEditingAirport}
        onDeleteAirport={(airport) => api.disableAirport(airport.id).then(refresh).catch(() => setError(t('saveFailed')))}
        onAddAircraft={() => setEditingAircraft(defaultAircraftForm())}
        onEditAircraft={setEditingAircraft}
        onDeleteAircraft={(aircraft) => api.disableAircraft(aircraft.id).then(refresh).catch(() => setError(t('saveFailed')))}
      />
      <FlightRouteEditDialog
        open={editingRoute !== null}
        value={editingRoute}
        airports={airports}
        saving={saving}
        t={t}
        onChange={setEditingRoute}
        onClose={() => setEditingRoute(null)}
        onSubmit={saveRoute}
      />
      <AirportEditDialog
        open={editingAirport !== null}
        value={editingAirport}
        saving={saving}
        t={t}
        onChange={setEditingAirport}
        onClose={() => setEditingAirport(null)}
        onSubmit={saveAirport}
      />
      <AircraftEditDialog
        open={editingAircraft !== null}
        value={editingAircraft}
        airports={airports}
        saving={saving}
        t={t}
        onChange={setEditingAircraft}
        onClose={() => setEditingAircraft(null)}
        onSubmit={saveAircraft}
      />
    </div>
  );
}

function OperationsDataPanel({
  airports,
  airportByCode,
  routes,
  aircraftRows,
  referencedRouteCodes,
  referencedAircraftNos,
  referencedAirportCodes,
  activeTab,
  loading,
  error,
  loadWarning,
  language,
  t,
  canEdit,
  onTabChange,
  onAddRoute,
  onEditRoute,
  onDeleteRoute,
  onAddAirport,
  onEditAirport,
  onDeleteAirport,
  onAddAircraft,
  onEditAircraft,
  onDeleteAircraft,
}: {
  airports: AirportDictionary[];
  airportByCode: Map<string, AirportDictionary>;
  routes: FlightRoute[];
  aircraftRows: AircraftRegistry[];
  referencedRouteCodes: Set<string>;
  referencedAircraftNos: Set<string>;
  referencedAirportCodes: Set<string>;
  activeTab: string;
  loading: boolean;
  error: string;
  loadWarning: string;
  language: Language;
  t: (key: string) => string;
  canEdit: boolean;
  onTabChange: (value: string) => void;
  onAddRoute: () => void;
  onEditRoute: (route: FlightRoute) => void;
  onDeleteRoute: (route: FlightRoute) => void;
  onAddAirport: () => void;
  onEditAirport: (airport: AirportDictionary) => void;
  onDeleteAirport: (airport: AirportDictionary) => void;
  onAddAircraft: () => void;
  onEditAircraft: (aircraft: AircraftRegistry) => void;
  onDeleteAircraft: (aircraft: AircraftRegistry) => void;
}) {
  return (
    <div className="space-y-4">
      {!error && loadWarning && <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{loadWarning}</div>}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="routes">{t('routeManagement')}</TabsTrigger>
          <TabsTrigger value="airports">{t('airportTimezone')}</TabsTrigger>
          <TabsTrigger value="aircraft">{t('aircraftRegistry')}</TabsTrigger>
        </TabsList>
        <TabsContent value="routes">
          <RouteMaintenanceSection routes={routes} airportByCode={airportByCode} referencedRouteCodes={referencedRouteCodes} language={language} loading={loading} error={error} canEdit={canEdit} t={t} onAdd={onAddRoute} onEdit={onEditRoute} onDelete={onDeleteRoute} />
        </TabsContent>
        <TabsContent value="airports">
          <AirportMaintenanceSection airports={airports} referencedAirportCodes={referencedAirportCodes} language={language} loading={loading} error={error} canEdit={canEdit} t={t} onAdd={onAddAirport} onEdit={onEditAirport} onDelete={onDeleteAirport} />
        </TabsContent>
        <TabsContent value="aircraft">
          <AircraftMaintenanceSection aircraftRows={aircraftRows} referencedAircraftNos={referencedAircraftNos} loading={loading} error={error} canEdit={canEdit} t={t} onAdd={onAddAircraft} onEdit={onEditAircraft} onDelete={onDeleteAircraft} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function flightOperationsInitialTab(activeView: ViewId) {
  if (activeView === 'route-management') return 'routes';
  if (activeView === 'aircraft-registry') return 'aircraft';
  if (activeView === 'airport-timezone') return 'airports';
  return 'routes';
}

function defaultFlightRouteForm(): Partial<FlightRoute> {
  return {
    routeCode: '',
    departureAirport: 'MFM',
    arrivalAirport: '',
    standardDurationMinutes: 300,
    timeDifferenceMinutes: 0,
    crossTimezone: false,
    status: 'ACTIVE',
  };
}

function defaultAirportForm(): Partial<AirportDictionary> {
  return {
    iataCode: '',
    nameZh: '',
    nameEn: '',
    timezoneName: 'Asia/Macau',
    utcOffsetMinutes: 480,
    countryCode: '',
    status: 'ACTIVE',
  };
}

function defaultAircraftForm(): Partial<AircraftRegistry> {
  return {
    aircraftNo: '',
    aircraftType: 'A330',
    fleet: 'A330',
    baseAirport: 'MFM',
    seatCount: 0,
    maxPayload: null,
    status: 'ACTIVE',
  };
}

function FlightRouteEditDialog({ open, value, airports, saving, t, onChange, onClose, onSubmit }: {
  open: boolean;
  value: Partial<FlightRoute> | null;
  airports: AirportDictionary[];
  saving: boolean;
  t: (key: string) => string;
  onChange: (value: Partial<FlightRoute> | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!value) return null;
  const update = (key: keyof FlightRoute, nextValue: string | number | boolean) => onChange({ ...value, [key]: nextValue });
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{value.id ? t('editRoute') : t('addRoute')}</DialogTitle><DialogDescription>{t('routeManagementDescription')}</DialogDescription></DialogHeader>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <FormField label={t('routeCode')}><Input required value={value.routeCode ?? ''} onChange={(event) => update('routeCode', event.target.value)} /></FormField>
          <FormField label={t('departureAirport')}>
            <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" required value={value.departureAirport ?? ''} onChange={(event) => update('departureAirport', event.target.value)}>
              <option value="">{t('departureAirport')}</option>
              {airports.map((airport) => <option key={airport.id} value={airport.iataCode}>{airport.iataCode}</option>)}
            </select>
          </FormField>
          <FormField label={t('arrivalAirport')}>
            <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" required value={value.arrivalAirport ?? ''} onChange={(event) => update('arrivalAirport', event.target.value)}>
              <option value="">{t('arrivalAirport')}</option>
              {airports.map((airport) => <option key={airport.id} value={airport.iataCode}>{airport.iataCode}</option>)}
            </select>
          </FormField>
          <FormField label={t('standardDurationMinutes')}><Input type="number" value={value.standardDurationMinutes ?? 0} onChange={(event) => update('standardDurationMinutes', Number(event.target.value))} /></FormField>
          <FormField label={t('timeDifferenceMinutes')}><Input type="number" value={value.timeDifferenceMinutes ?? 0} onChange={(event) => update('timeDifferenceMinutes', Number(event.target.value))} /></FormField>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={Boolean(value.crossTimezone)} onChange={(event) => update('crossTimezone', event.target.checked)} />{t('crossTimezone')}</label>
          <DialogFooter className="md:col-span-2"><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AirportEditDialog({ open, value, saving, t, onChange, onClose, onSubmit }: {
  open: boolean;
  value: Partial<AirportDictionary> | null;
  saving: boolean;
  t: (key: string) => string;
  onChange: (value: Partial<AirportDictionary> | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!value) return null;
  const update = (key: keyof AirportDictionary, nextValue: string | number) => onChange({ ...value, [key]: nextValue });
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{value.id ? t('editAirport') : t('addAirport')}</DialogTitle><DialogDescription>{t('airportTimezoneDescription')}</DialogDescription></DialogHeader>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <FormField label="IATA"><Input required value={value.iataCode ?? ''} onChange={(event) => update('iataCode', event.target.value)} /></FormField>
          <FormField label={t('nameZh')}><Input required value={value.nameZh ?? ''} onChange={(event) => update('nameZh', event.target.value)} /></FormField>
          <FormField label={t('nameEn')}><Input required value={value.nameEn ?? ''} onChange={(event) => update('nameEn', event.target.value)} /></FormField>
          <FormField label={t('timezoneName')}><Input required value={value.timezoneName ?? ''} onChange={(event) => update('timezoneName', event.target.value)} /></FormField>
          <FormField label={t('utcOffsetMinutes')}><Input type="number" value={value.utcOffsetMinutes ?? 0} onChange={(event) => update('utcOffsetMinutes', Number(event.target.value))} /></FormField>
          <FormField label={t('countryCode')}><Input value={value.countryCode ?? ''} onChange={(event) => update('countryCode', event.target.value)} /></FormField>
          <DialogFooter className="md:col-span-2"><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AircraftEditDialog({ open, value, airports, saving, t, onChange, onClose, onSubmit }: {
  open: boolean;
  value: Partial<AircraftRegistry> | null;
  airports: AirportDictionary[];
  saving: boolean;
  t: (key: string) => string;
  onChange: (value: Partial<AircraftRegistry> | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!value) return null;
  const update = (key: keyof AircraftRegistry, nextValue: string | number | null) => onChange({ ...value, [key]: nextValue });
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{value.id ? t('editAircraft') : t('addAircraft')}</DialogTitle><DialogDescription>{t('aircraftRegistryDescription')}</DialogDescription></DialogHeader>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <FormField label={t('aircraftNo')}><Input required value={value.aircraftNo ?? ''} onChange={(event) => update('aircraftNo', event.target.value)} /></FormField>
          <FormField label={t('aircraftType')}><Input required value={value.aircraftType ?? ''} onChange={(event) => update('aircraftType', event.target.value)} /></FormField>
          <FormField label={t('fleet')}><Input value={value.fleet ?? ''} onChange={(event) => update('fleet', event.target.value)} /></FormField>
          <FormField label={t('base')}>
            <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={value.baseAirport ?? ''} onChange={(event) => update('baseAirport', event.target.value)}>
              <option value="">{t('base')}</option>
              {airports.map((airport) => <option key={airport.id} value={airport.iataCode}>{airport.iataCode}</option>)}
            </select>
          </FormField>
          <FormField label={t('seatCount')}><Input type="number" value={value.seatCount ?? 0} onChange={(event) => update('seatCount', Number(event.target.value))} /></FormField>
          <FormField label={t('maxPayload')}><Input type="number" value={value.maxPayload ?? ''} onChange={(event) => update('maxPayload', event.target.value === '' ? null : Number(event.target.value))} /></FormField>
          <DialogFooter className="md:col-span-2"><Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{saving ? t('saving') : t('save')}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
