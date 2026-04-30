import type { CrewMember, Language } from '../types';
import { Badge } from '../components/ui/badge';

export function CrewLimitsSection({
  crewRows,
  language,
  t,
}: {
  crewRows: CrewMember[];
  language: Language;
  t: (key: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-sm">
        <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('name')}</th><th className="py-3 pr-4">{t('dutyHours7dLimit')}</th><th className="py-3 pr-4">{t('dutyHours14dLimit')}</th><th className="py-3 pr-4">{t('dutyHours28dLimit')}</th><th className="py-3 pr-4">{t('flightHours28d')}</th><th className="py-3 pr-4">{t('flightHours12mLimit')}</th><th className="py-3 pr-4">{t('singleFdp14hLimit')}</th></tr></thead>
        <tbody>{crewRows.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-0">
            <td className="py-3 pr-4 font-medium">{item.crewCode}</td>
            <td className="py-3 pr-4">{language === 'zh-CN' ? item.nameZh : item.nameEn}</td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours7d} normalLimit={55} warningLimit={60} extremeLimit={70} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours14d} normalLimit={95} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingDutyHours28d} normalLimit={190} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingFlightHours28d} normalLimit={100} t={t} /></td>
            <td className="py-3 pr-4"><CrewLimitCell value={item.rollingFlightHours12m} normalLimit={900} t={t} /></td>
            <td className="py-3 pr-4"><CrewFdpLimitCell value={item.latestActualFdpHours} t={t} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function CrewLimitCell({
  value,
  normalLimit,
  warningLimit,
  extremeLimit,
  t,
}: {
  value: number;
  normalLimit: number;
  warningLimit?: number;
  extremeLimit?: number;
  t: (key: string) => string;
}) {
  const numericValue = Number(value ?? 0);
  const limit = extremeLimit ?? warningLimit ?? normalLimit;
  const label = `${formatHours(numericValue)} / ${limit}h`;
  let badgeClass = 'border-success text-success';
  let note = `${t('crewLimitNormal')} ${normalLimit}h`;

  if (extremeLimit != null && numericValue > extremeLimit) {
    badgeClass = '';
    note = `${t('crewLimitExceeded')} ${extremeLimit}h`;
  } else if (warningLimit != null && numericValue > warningLimit) {
    badgeClass = 'border-destructive text-destructive';
    note = `${t('crewLimitExtremeBand')} ${warningLimit}-${extremeLimit}h`;
  } else if (warningLimit != null && numericValue > normalLimit) {
    badgeClass = 'border-warning text-warning';
    note = `${t('crewLimitSpecialBand')} ${normalLimit}-${warningLimit}h`;
  } else if (numericValue > normalLimit) {
    badgeClass = 'border-destructive text-destructive';
    note = `${t('crewLimitExceeded')} ${normalLimit}h`;
  }

  return (
    <div className="min-w-[7.5rem] space-y-1">
      <Badge variant={badgeClass ? 'outline' : 'destructive'} className={badgeClass}>{label}</Badge>
      <div className="text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function CrewFdpLimitCell({ value, t }: { value: number | null; t: (key: string) => string }) {
  if (value == null) {
    return (
      <div className="min-w-[8rem] space-y-1">
        <Badge variant="outline">{t('crewFdpActualOnly')}</Badge>
        <div className="text-xs text-muted-foreground">{t('crewFdpActualOnlyHint')}</div>
      </div>
    );
  }
  return <CrewLimitCell value={value} normalLimit={14} t={t} />;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
