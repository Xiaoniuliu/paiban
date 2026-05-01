import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { apiErrorMessage } from '../lib/apiErrors';
import type {
  AircraftRegistry,
  AirportDictionary,
  FlightOperationsReferenceProtection,
  FlightRoute,
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

export function useFlightOperationsManagement(api: ApiClient, t: (key: string) => string) {
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
  const [error, setError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    setError('');
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
          setError(t('flightOperationsLoadError'));
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

  const routeErrorFallback = `${t('routeManagement')}: ${t('saveFailed')}`;
  const airportErrorFallback = `${t('airportTimezone')}: ${t('saveFailed')}`;
  const aircraftErrorFallback = `${t('aircraftRegistry')}: ${t('saveFailed')}`;

  const saveRoute = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!editingRoute) return;
    setSaving(true);
    const action = editingRoute.id ? api.updateFlightRoute(editingRoute.id, editingRoute) : api.createFlightRoute(editingRoute);
    action.then(() => {
      setEditingRoute(null);
      refresh();
    }).catch((nextError: unknown) => setError(apiErrorMessage(nextError, routeErrorFallback))).finally(() => setSaving(false));
  }, [api, editingRoute, refresh, routeErrorFallback]);

  const saveAirport = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!editingAirport) return;
    setSaving(true);
    const action = editingAirport.id ? api.updateAirport(editingAirport.id, editingAirport) : api.createAirport(editingAirport);
    action.then(() => {
      setEditingAirport(null);
      refresh();
    }).catch((nextError: unknown) => setError(apiErrorMessage(nextError, airportErrorFallback))).finally(() => setSaving(false));
  }, [api, editingAirport, refresh, airportErrorFallback]);

  const saveAircraft = useCallback((event: FormEvent) => {
    event.preventDefault();
    if (!editingAircraft) return;
    setSaving(true);
    const action = editingAircraft.id ? api.updateAircraft(editingAircraft.id, editingAircraft) : api.createAircraft(editingAircraft);
    action.then(() => {
      setEditingAircraft(null);
      refresh();
    }).catch((nextError: unknown) => setError(apiErrorMessage(nextError, aircraftErrorFallback))).finally(() => setSaving(false));
  }, [api, editingAircraft, refresh, aircraftErrorFallback]);

  const deleteRoute = useCallback((routeId: number) => {
    api.deleteFlightRoute(routeId).then(refresh).catch((nextError: unknown) => setError(apiErrorMessage(nextError, routeErrorFallback)));
  }, [api, refresh, routeErrorFallback]);

  const deleteAirport = useCallback((airportId: number) => {
    api.deleteAirport(airportId).then(refresh).catch((nextError: unknown) => setError(apiErrorMessage(nextError, airportErrorFallback)));
  }, [api, refresh, airportErrorFallback]);

  const deleteAircraft = useCallback((aircraftId: number) => {
    api.deleteAircraft(aircraftId).then(refresh).catch((nextError: unknown) => setError(apiErrorMessage(nextError, aircraftErrorFallback)));
  }, [api, refresh, aircraftErrorFallback]);

  const airportByCode = useMemo(() => new Map(airports.map((airport) => [airport.iataCode, airport])), [airports]);
  const referencedRouteCodes = useMemo(() => new Set(referenceProtection.referencedRouteCodes), [referenceProtection]);
  const referencedAircraftNos = useMemo(() => new Set(referenceProtection.referencedAircraftNos), [referenceProtection]);
  const referencedAirportCodes = useMemo(() => new Set(referenceProtection.referencedAirportCodes), [referenceProtection]);
  const referenceProtectionBlockedReason = referenceProtectionReady
    ? t('editDeleteBlockedByReference')
    : t('editDeleteBlockedByMissingReferences');

  return {
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
    refresh,
    saveRoute,
    saveAirport,
    saveAircraft,
    deleteRoute,
    deleteAirport,
    deleteAircraft,
    setEditingRoute,
    setEditingAirport,
    setEditingAircraft,
    startAddRoute: () => setEditingRoute(defaultFlightRouteForm()),
    startAddAirport: () => setEditingAirport(defaultAirportForm()),
    startAddAircraft: () => setEditingAircraft(defaultAircraftForm()),
  };
}
