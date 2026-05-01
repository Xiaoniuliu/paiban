import { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';
import { viewTitleKey } from '../i18n';
import type {
  AircraftRegistry,
  AirportDictionary,
  FlightRoute,
  Language,
  ViewId,
} from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PageHeader } from '../components/framework/PageShell';
import type { PageProps } from './pageTypes';
import { RouteMaintenanceSection } from './RouteMaintenanceSection';
import { AirportMaintenanceSection } from './AirportMaintenanceSection';
import { AircraftMaintenanceSection } from './AircraftMaintenanceSection';
import {
  AircraftEditDialog,
  AirportEditDialog,
  FlightRouteEditDialog,
} from './FlightOperationsDialogs';
import { useFlightOperationsManagement } from './useFlightOperationsManagement';

export function FlightOperationsPage({ activeView, api, language, t, user }: PageProps) {
  const [activeTab, setActiveTab] = useState(() => flightOperationsInitialTab(activeView));
  const {
    airports,
    routes,
    aircraftRows,
    airportByCode,
    referencedRouteCodes,
    referencedAircraftNos,
    referencedAirportCodes,
    referenceProtectionReady,
    referenceProtectionBlockedReason,
    editingRoute,
    editingAirport,
    editingAircraft,
    loading,
    saving,
    error,
    loadWarning,
    saveRoute,
    saveAirport,
    saveAircraft,
    deleteRoute,
    deleteAirport,
    deleteAircraft,
    setEditingRoute,
    setEditingAirport,
    setEditingAircraft,
    startAddRoute,
    startAddAirport,
    startAddAircraft,
  } = useFlightOperationsManagement(api, t);

  useEffect(() => {
    setActiveTab(flightOperationsInitialTab(activeView));
  }, [activeView]);

  const canEdit = user.role === 'DISPATCHER' || user.role === 'ADMIN';

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
        referenceProtectionReady={referenceProtectionReady}
        activeTab={activeTab}
        loading={loading}
        error={error}
        loadWarning={loadWarning}
        language={language}
        t={t}
        canEdit={canEdit}
        blockedReason={referenceProtectionBlockedReason}
        onTabChange={setActiveTab}
        onAddRoute={startAddRoute}
        onEditRoute={setEditingRoute}
        onDeleteRoute={(route) => {
          if (!globalThis.confirm(t('deleteRouteConfirm'))) return;
          deleteRoute(route.id);
        }}
        onAddAirport={startAddAirport}
        onEditAirport={setEditingAirport}
        onDeleteAirport={(airport) => {
          if (!globalThis.confirm(t('deleteAirportConfirm'))) return;
          deleteAirport(airport.id);
        }}
        onAddAircraft={startAddAircraft}
        onEditAircraft={setEditingAircraft}
        onDeleteAircraft={(aircraft) => {
          if (!globalThis.confirm(t('deleteAircraftConfirm'))) return;
          deleteAircraft(aircraft.id);
        }}
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
  referenceProtectionReady,
  activeTab,
  loading,
  error,
  loadWarning,
  language,
  t,
  canEdit,
  blockedReason,
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
  referenceProtectionReady: boolean;
  activeTab: string;
  loading: boolean;
  error: string;
  loadWarning: string;
  language: Language;
  t: (key: string) => string;
  canEdit: boolean;
  blockedReason: string;
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
          <RouteMaintenanceSection routes={routes} airportByCode={airportByCode} referencedRouteCodes={referencedRouteCodes} referenceProtectionReady={referenceProtectionReady} language={language} loading={loading} error={error} canEdit={canEdit} blockedReason={blockedReason} t={t} onAdd={onAddRoute} onEdit={onEditRoute} onDelete={onDeleteRoute} />
        </TabsContent>
        <TabsContent value="airports">
          <AirportMaintenanceSection airports={airports} referencedAirportCodes={referencedAirportCodes} referenceProtectionReady={referenceProtectionReady} language={language} loading={loading} error={error} canEdit={canEdit} blockedReason={blockedReason} t={t} onAdd={onAddAirport} onEdit={onEditAirport} onDelete={onDeleteAirport} />
        </TabsContent>
        <TabsContent value="aircraft">
          <AircraftMaintenanceSection aircraftRows={aircraftRows} referencedAircraftNos={referencedAircraftNos} referenceProtectionReady={referenceProtectionReady} loading={loading} error={error} canEdit={canEdit} blockedReason={blockedReason} t={t} onAdd={onAddAircraft} onEdit={onEditAircraft} onDelete={onDeleteAircraft} />
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
