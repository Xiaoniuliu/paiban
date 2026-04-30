import { Plus } from 'lucide-react';
import type { AircraftRegistry } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/framework/PageShell';
import { ActionButtons } from './FlightOperationsShared';

export function AircraftMaintenanceSection({
  aircraftRows,
  referencedAircraftNos,
  loading,
  error,
  canEdit,
  t,
  onAdd,
  onEdit,
  onDelete,
}: {
  aircraftRows: AircraftRegistry[];
  referencedAircraftNos: Set<string>;
  loading: boolean;
  error: string;
  canEdit: boolean;
  t: (key: string) => string;
  onAdd: () => void;
  onEdit: (aircraft: AircraftRegistry) => void;
  onDelete: (aircraft: AircraftRegistry) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{t('aircraftRegistry')}</CardTitle>
          <CardDescription>{t('aircraftRegistryDescription')}</CardDescription>
        </div>
        {canEdit && <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
        {!loading && !error && aircraftRows.length === 0 && <EmptyState title={t('noData')} description={t('aircraftNoData')} />}
        {!loading && !error && aircraftRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('aircraftNo')}</th><th className="py-3 pr-4">{t('aircraftType')}</th><th className="py-3 pr-4">{t('fleet')}</th><th className="py-3 pr-4">{t('base')}</th><th className="py-3 pr-4">{t('seatCount')}</th><th className="py-3 pr-4">{t('maxPayload')}</th><th className="py-3 pr-4">{t('status')}</th><th className="py-3 pr-4">{t('actions')}</th></tr></thead>
              <tbody>{aircraftRows.map((aircraft) => (
                <tr key={aircraft.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium">{aircraft.aircraftNo}</td>
                  <td className="py-3 pr-4">{aircraft.aircraftType}</td>
                  <td className="py-3 pr-4">{aircraft.fleet}</td>
                  <td className="py-3 pr-4">{aircraft.baseAirport}</td>
                  <td className="py-3 pr-4">{aircraft.seatCount}</td>
                  <td className="py-3 pr-4">{aircraft.maxPayload ?? '-'}</td>
                  <td className="py-3 pr-4"><Badge variant={aircraft.status === 'ACTIVE' ? 'outline' : 'secondary'}>{aircraft.status}</Badge></td>
                  <td className="py-3 pr-4"><ActionButtons canEdit={canEdit} canUpdate={!referencedAircraftNos.has(aircraft.aircraftNo)} canDelete={!referencedAircraftNos.has(aircraft.aircraftNo)} deleteBlockedReason={t('editDeleteBlockedByReference')} t={t} onEdit={() => onEdit(aircraft)} onDelete={() => onDelete(aircraft)} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
