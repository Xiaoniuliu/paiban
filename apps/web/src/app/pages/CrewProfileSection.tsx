import { Pencil, Plus } from 'lucide-react';
import type { CrewMember, Language } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function CrewProfileSection({
  crewRows,
  language,
  canEdit,
  t,
  onAddCrew,
  onEditCrew,
  onDisableCrew,
}: {
  crewRows: CrewMember[];
  language: Language;
  canEdit: boolean;
  t: (key: string) => string;
  onAddCrew: () => void;
  onEditCrew: (crew: CrewMember) => void;
  onDisableCrew: (crewId: number) => void;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{t('crewProfileTab')}</CardTitle>
          <CardDescription>{t('crewProfileDescription')}</CardDescription>
        </div>
        {canEdit && <Button onClick={onAddCrew}><Plus className="mr-2 h-4 w-4" />{t('add')}</Button>}
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('crewProfileBoundaryNote')}
        </div>
        <div className="mb-4 text-xs text-muted-foreground">
          {t('crewProfileCurrentSettingsNote')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-3 pr-4">{t('crewCode')}</th><th className="py-3 pr-4">{t('employeeNo')}</th><th className="py-3 pr-4">{t('name')}</th><th className="py-3 pr-4">{t('base')}</th><th className="py-3 pr-4">{t('crewProfileCurrentSettings')}</th><th className="py-3 pr-4">{t('actions')}</th>
            </tr></thead>
            <tbody>{crewRows.map((crew) => (
              <tr key={crew.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4">
                  <div className="font-medium">{crew.crewCode}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{crew.aircraftQualification}</div>
                </td>
                <td className="py-3 pr-4">{crew.employeeNo}</td>
                <td className="py-3 pr-4">
                  <div>{language === 'zh-CN' ? crew.nameZh : crew.nameEn}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{crew.roleCode} · {crew.rankCode}</div>
                </td>
                <td className="py-3 pr-4">{crew.homeBase}</td>
                <td className="py-3 pr-4">
                  <div><Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">{crew.status}</Badge></div>
                  <div className="mt-1"><Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">{crew.availabilityStatus}</Badge></div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex gap-2">
                    {canEdit && <Button size="sm" variant="outline" onClick={() => onEditCrew(crew)}><Pencil className="mr-1 h-3 w-3" />{t('edit')}</Button>}
                    {canEdit && <Button size="sm" variant="outline" onClick={() => onDisableCrew(crew.id)}>{t('disable')}</Button>}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
