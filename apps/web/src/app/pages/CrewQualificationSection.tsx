import { Plus } from 'lucide-react';
import { toDisplayDateTimeLocal } from '../lib/time';
import type { CrewMember, CrewQualification, DisplayTimezone } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Timestamp } from '../components/time';

function toOptionalLocal(value: string | null | undefined, timezone: DisplayTimezone) {
  return value ? toDisplayDateTimeLocal(value, timezone) : '';
}

function SimpleQualificationTable({
  qualifications,
  crewById,
  timezone,
  t,
  canEdit,
  onEdit,
  onDisable,
}: {
  qualifications: CrewQualification[];
  crewById: Map<number, CrewMember>;
  timezone: DisplayTimezone;
  t: (key: string) => string;
  canEdit: boolean;
  onEdit: (value: Partial<CrewQualification>) => void;
  onDisable: (value: CrewQualification) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('type')}</th><th className="py-3 pr-4">{t('qualification')}</th><th className="py-3 pr-4">{t('effectiveFrom')}</th><th className="py-3 pr-4">{t('effectiveTo')}</th><th className="py-3 pr-4">{t('status')}</th><th className="py-3 pr-4">{t('actions')}</th></tr></thead>
        <tbody>{qualifications.map((qualification) => {
          const crew = crewById.get(qualification.crewMemberId);
          return (
            <tr key={qualification.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium">{crew?.crewCode ?? '-'}</td>
              <td className="py-3 pr-4">{qualification.qualificationType}</td>
              <td className="py-3 pr-4">{qualification.qualificationCode}</td>
              <td className="py-3 pr-4">{qualification.effectiveFromUtc ? <Timestamp value={qualification.effectiveFromUtc} /> : '-'}</td>
              <td className="py-3 pr-4">{qualification.effectiveToUtc ? <Timestamp value={qualification.effectiveToUtc} /> : '-'}</td>
              <td className="py-3 pr-4"><Badge variant={qualification.status === 'ACTIVE' ? 'outline' : 'secondary'}>{qualification.status}</Badge></td>
              <td className="py-3 pr-4"><div className="flex gap-2">{canEdit && <Button size="sm" variant="outline" onClick={() => onEdit({ ...qualification, effectiveFromUtc: toOptionalLocal(qualification.effectiveFromUtc, timezone), effectiveToUtc: toOptionalLocal(qualification.effectiveToUtc, timezone) })}>{t('edit')}</Button>}{canEdit && <Button size="sm" variant="outline" onClick={() => onDisable(qualification)}>{t('disable')}</Button>}</div></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

export function CrewQualificationSection({
  qualifications,
  crewRows,
  crewById,
  timezone,
  canEdit,
  t,
  onAddQualification,
  onEditQualification,
  onDisableQualification,
}: {
  qualifications: CrewQualification[];
  crewRows: CrewMember[];
  crewById: Map<number, CrewMember>;
  timezone: DisplayTimezone;
  canEdit: boolean;
  t: (key: string) => string;
  onAddQualification: () => void;
  onEditQualification: (value: Partial<CrewQualification>) => void;
  onDisableQualification: (value: CrewQualification) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{t('crewQualificationTab')}</CardTitle>
          <CardDescription>{t('crewQualificationDescription')}</CardDescription>
        </div>
        {canEdit && crewRows.length > 0 && <Button onClick={onAddQualification}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('crewQualificationBoundaryNote')}
        </div>
        <SimpleQualificationTable
          qualifications={qualifications}
          crewById={crewById}
          timezone={timezone}
          t={t}
          canEdit={canEdit}
          onEdit={onEditQualification}
          onDisable={onDisableQualification}
        />
      </CardContent>
    </Card>
  );
}
