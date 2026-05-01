import { Clock } from 'lucide-react';
import { PageHeader } from '../../components/framework/PageShell';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { viewTitleKey } from '../../i18n';
import type { PageProps } from '../pageTypes';

export function WorkbenchRunDayRetiredPage({ activeView, t }: PageProps) {
  return (
    <div className="space-y-4" data-testid="workbench-retired-run-day">
      <PageHeader
        icon={Clock}
        title={t(viewTitleKey[activeView])}
        description={t('workbenchRunDayRetiredDescription')}
      />
      <Card className="rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('workbenchRunDayRetiredTitle')}</CardTitle>
          <CardDescription>{t('workbenchRunDayRetiredDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" type="button">
            <a href="/rostering-workbench/draft-rostering">{t('workbenchRunDayRetiredDraftAction')}</a>
          </Button>
          <Button asChild size="sm" type="button" variant="outline">
            <a href="/validation-center/violation-handling">{t('openIssueHandling')}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
