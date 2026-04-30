import { Plus } from 'lucide-react';
import type { AirportDictionary, Language } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/framework/PageShell';
import { ActionButtons, airportName, formatUtcOffset } from './FlightOperationsShared';

export function AirportMaintenanceSection({
  airports,
  referencedAirportCodes,
  language,
  loading,
  error,
  canEdit,
  t,
  onAdd,
  onEdit,
  onDelete,
}: {
  airports: AirportDictionary[];
  referencedAirportCodes: Set<string>;
  language: Language;
  loading: boolean;
  error: string;
  canEdit: boolean;
  t: (key: string) => string;
  onAdd: () => void;
  onEdit: (airport: AirportDictionary) => void;
  onDelete: (airport: AirportDictionary) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{t('airportTimezone')}</CardTitle>
          <CardDescription>{t('airportTimezoneDescription')}</CardDescription>
        </div>
        {canEdit && <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
        {!loading && !error && airports.length === 0 && <EmptyState title={t('noData')} description={t('airportNoData')} />}
        {!loading && !error && airports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">IATA</th><th className="py-3 pr-4">{t('name')}</th><th className="py-3 pr-4">{t('timezoneName')}</th><th className="py-3 pr-4">{t('utcOffset')}</th><th className="py-3 pr-4">{t('countryCode')}</th><th className="py-3 pr-4">{t('status')}</th><th className="py-3 pr-4">{t('actions')}</th></tr></thead>
              <tbody>{airports.map((airport) => (
                <tr key={airport.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium">{airport.iataCode}</td>
                  <td className="py-3 pr-4">{airportName(airport, language)}</td>
                  <td className="py-3 pr-4">{airport.timezoneName}</td>
                  <td className="py-3 pr-4">{formatUtcOffset(airport.utcOffsetMinutes)}</td>
                  <td className="py-3 pr-4">{airport.countryCode}</td>
                  <td className="py-3 pr-4"><Badge variant={airport.status === 'ACTIVE' ? 'outline' : 'secondary'}>{airport.status}</Badge></td>
                  <td className="py-3 pr-4"><ActionButtons canEdit={canEdit} canUpdate={!referencedAirportCodes.has(airport.iataCode)} canDelete={!referencedAirportCodes.has(airport.iataCode)} deleteBlockedReason={t('editDeleteBlockedByReference')} t={t} onEdit={() => onEdit(airport)} onDelete={() => onDelete(airport)} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
