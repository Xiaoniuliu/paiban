import type { FormEvent } from 'react';
import type { AircraftRegistry, AirportDictionary, FlightRoute } from '../types';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { FormField } from './FlightOperationsShared';

export function defaultFlightRouteForm(): Partial<FlightRoute> {
  return {
    routeCode: '',
    departureAirport: 'MFM',
    arrivalAirport: '',
    standardDurationMinutes: 300,
    timeDifferenceMinutes: 0,
    crossTimezone: false,
  };
}

export function defaultAirportForm(): Partial<AirportDictionary> {
  return {
    iataCode: '',
    nameZh: '',
    nameEn: '',
    timezoneName: 'Asia/Macau',
    utcOffsetMinutes: 480,
    countryCode: '',
  };
}

export function defaultAircraftForm(): Partial<AircraftRegistry> {
  return {
    aircraftNo: '',
    aircraftType: 'A330',
    fleet: 'A330',
    baseAirport: 'MFM',
    seatCount: 0,
    maxPayload: null,
  };
}

export function FlightRouteEditDialog({ open, value, airports, saving, t, onChange, onClose, onSubmit }: {
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

export function AirportEditDialog({ open, value, saving, t, onChange, onClose, onSubmit }: {
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

export function AircraftEditDialog({ open, value, airports, saving, t, onChange, onClose, onSubmit }: {
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
