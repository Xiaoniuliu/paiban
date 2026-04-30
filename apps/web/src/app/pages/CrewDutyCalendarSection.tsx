import type { CrewMember, TimelineBlock } from '../types';
import { Badge } from '../components/ui/badge';
import { Timestamp } from '../components/time';

export function CrewDutyCalendarSection({
  dutyRows,
  crewById,
  t,
}: {
  dutyRows: TimelineBlock[];
  crewById: Map<number, CrewMember>;
  t: (key: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('type')}</th><th className="py-3 pr-4">{t('start')}</th><th className="py-3 pr-4">{t('end')}</th><th className="py-3 pr-4">{t('status')}</th></tr></thead>
        <tbody>{dutyRows.map((block) => {
          const crew = crewById.get(block.crewMemberId ?? 0);
          return <tr key={block.id} className="border-b border-border last:border-0"><td className="py-3 pr-4 font-medium">{crew?.crewCode ?? '-'}</td><td className="py-3 pr-4">{block.blockType}</td><td className="py-3 pr-4"><Timestamp value={block.startUtc} /></td><td className="py-3 pr-4"><Timestamp value={block.endUtc} /></td><td className="py-3 pr-4"><Badge variant="outline" className={crewDutyCalendarStatusBadgeClassName(block.status)}>{crewDutyCalendarStatusLabel(block.status, t)}</Badge></td></tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function crewDutyCalendarStatusLabel(status: string, t: (key: string) => string) {
  if (status === 'PLANNED') return t('crewDutyCalendarStatusPLANNED');
  if (status === 'ASSIGNED_DRAFT') return t('crewDutyCalendarStatusASSIGNED_DRAFT');
  if (status === 'PUBLISHED') return t('crewDutyCalendarStatusPUBLISHED');
  return status;
}

function crewDutyCalendarStatusBadgeClassName(status: string) {
  if (status === 'PLANNED') {
    return 'border-slate-300 bg-slate-100 text-slate-700';
  }
  if (status === 'ASSIGNED_DRAFT') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  if (status === 'PUBLISHED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return '';
}
