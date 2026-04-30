import { Plus } from 'lucide-react';
import type { AirportDictionary, FlightRoute, Language } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/framework/PageShell';
import { ActionButtons, airportName, formatMinutesAsHours, formatUtcOffset } from './FlightOperationsShared';

export function RouteMaintenanceSection({
  routes,
  airportByCode,
  referencedRouteCodes,
  referenceProtectionReady,
  language,
  loading,
  error,
  canEdit,
  blockedReason,
  t,
  onAdd,
  onEdit,
  onDelete,
}: {
  routes: FlightRoute[];
  airportByCode: Map<string, AirportDictionary>;
  referencedRouteCodes: Set<string>;
  referenceProtectionReady: boolean;
  language: Language;
  loading: boolean;
  error: string;
  canEdit: boolean;
  blockedReason: string;
  t: (key: string) => string;
  onAdd: () => void;
  onEdit: (route: FlightRoute) => void;
  onDelete: (route: FlightRoute) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{t('routeManagement')}</CardTitle>
          <CardDescription>{t('routeManagementDescription')}</CardDescription>
        </div>
        {canEdit && <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
        {!loading && !error && routes.length === 0 && <EmptyState title={t('noData')} description={t('routeNoData')} />}
        {!loading && !error && routes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('routeCode')}</th><th className="py-3 pr-4">{t('departureAirport')}</th><th className="py-3 pr-4">{t('arrivalAirport')}</th><th className="py-3 pr-4">{t('standardDuration')}</th><th className="py-3 pr-4">{t('timeDifference')}</th><th className="py-3 pr-4">{t('crossTimezone')}</th><th className="py-3 pr-4">{t('actions')}</th></tr></thead>
              <tbody>{routes.map((route) => (
                <tr key={route.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium">{route.routeCode}</td>
                  <td className="py-3 pr-4">{route.departureAirport} {airportName(airportByCode.get(route.departureAirport), language)}</td>
                  <td className="py-3 pr-4">{route.arrivalAirport} {airportName(airportByCode.get(route.arrivalAirport), language)}</td>
                  <td className="py-3 pr-4">{formatMinutesAsHours(route.standardDurationMinutes)}</td>
                  <td className="py-3 pr-4">{formatUtcOffset(route.timeDifferenceMinutes)}</td>
                  <td className="py-3 pr-4">{route.crossTimezone ? t('yes') : t('no')}</td>
                  <td className="py-3 pr-4"><ActionButtons canEdit={canEdit} canUpdate={referenceProtectionReady && !referencedRouteCodes.has(route.routeCode)} canDelete={referenceProtectionReady && !referencedRouteCodes.has(route.routeCode)} blockedReason={blockedReason} t={t} onEdit={() => onEdit(route)} onDelete={() => onDelete(route)} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
