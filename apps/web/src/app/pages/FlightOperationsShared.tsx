import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import type { AirportDictionary, Language } from '../types';
import { Button } from '../components/ui/button';

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ActionButtons({
  canEdit,
  canUpdate = true,
  canDelete = true,
  blockedReason = '',
  t,
  onEdit,
  onDelete,
}: {
  canEdit: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  blockedReason?: string;
  t: (key: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!canEdit) return null;
  const editTitle = !canUpdate ? blockedReason : undefined;
  const deleteTitle = !canDelete ? blockedReason : undefined;
  return (
    <div className="flex gap-2">
      <span title={editTitle} className="inline-flex">
        <Button
          size="sm"
          variant="outline"
          disabled={!canUpdate}
          className={canUpdate ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800' : 'border-slate-200 bg-slate-50 text-slate-400'}
          onClick={onEdit}
        >
          <Pencil className="mr-1 h-3 w-3" />
          {t('edit')}
        </Button>
      </span>
      <span title={deleteTitle} className="inline-flex">
        <Button
          size="sm"
          variant="outline"
          disabled={!canDelete}
          className={canDelete ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-400'}
          onClick={onDelete}
        >
          {t('delete')}
        </Button>
      </span>
    </div>
  );
}

export function airportName(airport: AirportDictionary | undefined, language: Language) {
  if (!airport) return '';
  return language === 'zh-CN' ? airport.nameZh : airport.nameEn;
}

export function formatUtcOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60).toString().padStart(2, '0');
  const minutes = (absolute % 60).toString().padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

export function formatMinutesAsHours(minutes: number) {
  return `${(Number(minutes ?? 0) / 60).toFixed(1)}h`;
}
