import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { apiErrorMessage } from '../lib/apiErrors';
import type {
  AircraftRegistry,
  AirportDictionary,
  FlightOperationsReferenceProtection,
  FlightRoute,
  Role,
  ViewId,
} from '../types';
import type { ApiClient } from '../lib/api';
import {
  defaultAircraftForm,
  defaultAirportForm,
  defaultFlightRouteForm,
} from './FlightOperationsDialogs';

const EMPTY_REFERENCE_PROTECTION: FlightOperationsReferenceProtection = {
  referencedRouteCodes: [],
  referencedAircraftNos: [],
  referencedAirportCodes: [],
};

export function useFlightOperationsManagement(
  api: ApiClient,
  t: (key: string) => string,
  activeView: ViewId,
  userRole: Role,
) {
  const [activeTab, setActiveTab] = useState(() => flightOperationsInitialTab(activeView));
  const [airports, setAirports] = useState<AirportDictionary[]>([]);
  const [routes, setRoutes] = useState<FlightRoute[]>([]);
  const [aircraftRows, setAircraftRows] = useState<AircraftRegistry[]>([]);
  const [referenceProtection, setReferenceProtection] = useState<FlightOperationsReferenceProtection>(EMPTY_REFERENCE_PROTECTION);
  const [referenceProtectionReady, setReferenceProtectionReady] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Partial<FlightRoute> | null>(null);
  const [editingAirport, setEditingAirport] = useState<Partial<AirportDictionary> | null>(null);
  const [editingAircraft, setEditingAircraft] = useState<Partial<AircraftRegistry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError('');
    setLoadWarning('');
    setReferenceProtectionReady(false);
    Promise.allSettled([
      api.airports(),
      api.flightRoutes(),
      api.aircraftRegistry(),
      api.flightOperationsReferenceProtection(),
    ])
      .then(([airportResult, routeResult, aircraftResult, protectionResult]) => {
        setAirports(airportResult.status === 'fulfilled' ? airportResult.value : []);
        setRoutes(routeResult.status === 'fulfilled' ? routeResult.value : []);
        setAircraftRows(aircraftResult.status === 'fulfilled' ? aircraftResult.value : []);
        setReferenceProtectionReady(protectionResult.status === 'fulfilled');
        setReferenceProtection(protectionResult.status === 'fulfilled' ? protectionResult.value : EMPTY_REFERENCE_PROTECTION);
        if (airportResult.status !== 'fulfilled'
          && routeResult.status !== 'fulfilled'
          && aircraftResult.status !== 'fulfilled'
          && protectionResult.status !== 'fulfilled') {
          setLoadError(t('flightOperationsLoadError'));
          return;
        }
        if (airportResult.status !== 'fulfilled'
          || routeResult.status !== 'fulfilled'
          || aircraftResult.status !== 'fulfilled'
          || protectionResult.status !== 'fulfilled') {
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

  const routeErrorFallback = t('routeSaveFailed');
  const airportErrorFallback = t('airportSaveFailed');
  const aircraftErrorFallback = t('aircraftSaveFailed');

  const saveRoute = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!editingRoute) return;
    setSaving(true);
    setActionError('');
    const action = editingRoute.id ? api.updateFlightRoute(editingRoute.id, editingRoute) : api.createFlightRoute(editingRoute);
    action.then(() => {
      setEditingRoute(null);
      refresh();
    }).catch((nextError: unknown) => setActionError(apiErrorMessage(nextError, routeErrorFallback))).finally(() => setSaving(false));
  }, [api, editingRoute, refresh, routeErrorFallback]);

  const saveAirport = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!editingAirport) return;
    setSaving(true);
    setActionError('');
    const action = editingAirport.id ? api.updateAirport(editingAirport.id, editingAirport) : api.createAirport(editingAirport);
    action.then(() => {
      setEditingAirport(null);
      refresh();
    }).catch((nextError: unknown) => setActionError(apiErrorMessage(nextError, airportErrorFallback))).finally(() => setSaving(false));
  }, [api, editingAirport, refresh, airportErrorFallback]);

  const saveAircraft = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!editingAircraft) return;
    setSaving(true);
    setActionError('');
    const action = editingAircraft.id ? api.updateAircraft(editingAircraft.id, editingAircraft) : api.createAircraft(editingAircraft);
    action.then(() => {
      setEditingAircraft(null);
      refresh();
    }).catch((nextError: unknown) => setActionError(apiErrorMessage(nextError, aircraftErrorFallback))).finally(() => setSaving(false));
  }, [api, editingAircraft, refresh, aircraftErrorFallback]);

  const deleteRoute = useCallback((routeId: number) => {
    setActionError('');
    api.deleteFlightRoute(routeId).then(refresh).catch((nextError: unknown) => setActionError(apiErrorMessage(nextError, routeErrorFallback)));
  }, [api, refresh, routeErrorFallback]);

  const deleteAirport = useCallback((airportId: number) => {
    setActionError('');
    api.deleteAirport(airportId).then(refresh).catch((nextError: unknown) => setActionError(apiErrorMessage(nextError, airportErrorFallback)));
  }, [api, refresh, airportErrorFallback]);

  const deleteAircraft = useCallback((aircraftId: number) => {
    setActionError('');
    api.deleteAircraft(aircraftId).then(refresh).catch((nextError: unknown) => setActionError(apiErrorMessage(nextError, aircraftErrorFallback)));
  }, [api, refresh, aircraftErrorFallback]);

  const confirmDeleteRoute = useCallback((route: FlightRoute) => {
    if (!globalThis.confirm(t('deleteRouteConfirm'))) return;
    deleteRoute(route.id);
  }, [deleteRoute, t]);

  const confirmDeleteAirport = useCallback((airport: AirportDictionary) => {
    if (!globalThis.confirm(t('deleteAirportConfirm'))) return;
    deleteAirport(airport.id);
  }, [deleteAirport, t]);

  const confirmDeleteAircraft = useCallback((aircraft: AircraftRegistry) => {
    if (!globalThis.confirm(t('deleteAircraftConfirm'))) return;
    deleteAircraft(aircraft.id);
  }, [deleteAircraft, t]);

  const airportByCode = useMemo(() => new Map(airports.map((airport) => [airport.iataCode, airport])), [airports]);
  const referencedRouteCodes = useMemo(() => new Set(referenceProtection.referencedRouteCodes), [referenceProtection]);
  const referencedAircraftNos = useMemo(() => new Set(referenceProtection.referencedAircraftNos), [referenceProtection]);
  const referencedAirportCodes = useMemo(() => new Set(referenceProtection.referencedAirportCodes), [referenceProtection]);
  const referenceProtectionBlockedReason = referenceProtectionReady
    ? t('editDeleteBlockedByReference')
    : t('editDeleteBlockedByMissingReferences');
  const canEdit = userRole === 'DISPATCHER' || userRole === 'ADMIN';

  return {
    activeTab,
    canEdit,
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
    error: loadError,
    actionError,
    loadWarning,
    refresh,
    saveRoute,
    saveAirport,
    saveAircraft,
    deleteRoute: confirmDeleteRoute,
    deleteAirport: confirmDeleteAirport,
    deleteAircraft: confirmDeleteAircraft,
    setEditingRoute,
    setEditingAirport,
    setEditingAircraft,
    startAddRoute: () => setEditingRoute(defaultFlightRouteForm()),
    startAddAirport: () => setEditingAirport(defaultAirportForm()),
    startAddAircraft: () => setEditingAircraft(defaultAircraftForm()),
    setActiveTab,
  };
}

function flightOperationsInitialTab(activeView: ViewId) {
  if (activeView === 'route-management') return 'routes';
  if (activeView === 'aircraft-registry') return 'aircraft';
  if (activeView === 'airport-timezone') return 'airports';
  return 'routes';
}
