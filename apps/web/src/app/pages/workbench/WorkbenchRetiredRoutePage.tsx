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

const handoffByView = {
  'workbench-draft-versions': {
    testId: 'workbench-retired-publish',
    titleKey: 'workbenchPublishRetiredTitle',
    descriptionKey: 'workbenchPublishRetiredDescription',
    primaryHref: '/validation-center/release-gates',
    primaryLabelKey: 'openPublishResults',
    secondaryHref: '/rostering-workbench/draft-rostering',
    secondaryLabelKey: 'openDraftRostering',
  },
  'workbench-archive-entry': {
    testId: 'workbench-retired-archive',
    titleKey: 'workbenchArchiveRetiredTitle',
    descriptionKey: 'workbenchArchiveRetiredDescription',
    primaryHref: '/validation-center/archive-entry',
    primaryLabelKey: 'openArchiveEntry',
    secondaryHref: '/rostering-workbench/draft-rostering',
    secondaryLabelKey: 'openDraftRostering',
  },
  'validation-export': {
    testId: 'validation-export-handoff',
    titleKey: 'validationExportHandoffTitle',
    descriptionKey: 'validationExportHandoffDescription',
    primaryHref: '/validation-center/release-gates',
    primaryLabelKey: 'openPublishResults',
    secondaryHref: '/validation-center/violation-handling',
    secondaryLabelKey: 'openIssueHandling',
  },
} as const;

type HandoffView = keyof typeof handoffByView;

function isHandoffView(activeView: PageProps['activeView']): activeView is HandoffView {
  return activeView in handoffByView;
}

export function WorkbenchCompatibilityHandoffPage({ activeView, t }: PageProps) {
  const handoff = isHandoffView(activeView)
    ? handoffByView[activeView]
    : handoffByView['workbench-draft-versions'];

  return (
    <div className="space-y-4" data-testid={handoff.testId}>
      <PageHeader
        icon={Clock}
        title={t(viewTitleKey[activeView])}
        description={t(handoff.descriptionKey)}
      />
      <Card className="rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t(handoff.titleKey)}</CardTitle>
          <CardDescription>{t(handoff.descriptionKey)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" type="button">
            <a href={handoff.primaryHref}>{t(handoff.primaryLabelKey)}</a>
          </Button>
          <Button asChild size="sm" type="button" variant="outline">
            <a href={handoff.secondaryHref}>{t(handoff.secondaryLabelKey)}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
