import type { ViewId } from '../../../types';
import { viewTitleKey } from '../../../i18n';
import { nowUtc } from '../../../lib/time';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Timestamp } from '../../../components/time';
import { GanttTimeline } from '../../../components/timeline/GanttTimeline';
import type { WorkbenchTimelineState, WorkbenchTimelineViewMode } from '../hooks/useWorkbenchTimeline';

export function WorkbenchTimelineCard({
  activeView,
  t,
  viewMode,
  workbench,
}: {
  activeView: ViewId;
  t: (key: string) => string;
  viewMode: WorkbenchTimelineViewMode;
  workbench: WorkbenchTimelineState;
}) {
  return (
    <Card className="flex h-[calc(100vh-6.5rem)] min-h-[30rem] flex-col gap-3 overflow-hidden rounded-lg">
      <WorkbenchCardHeader activeView={activeView} t={t} />
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        <div className="mb-3 shrink-0 text-sm text-muted-foreground"><Timestamp value={nowUtc()} /></div>
        <WorkbenchTimelineBody
          viewMode={viewMode}
          workbench={workbench}
          t={t}
        />
      </CardContent>
    </Card>
  );
}

function WorkbenchCardHeader({
  activeView,
  t,
}: {
  activeView: ViewId;
  t: (key: string) => string;
}) {
  return (
    <CardHeader className="shrink-0 px-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>{t(viewTitleKey[activeView])}</CardTitle>
          <CardDescription>{t('workbenchDescription')}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

function WorkbenchTimelineBody({
  viewMode,
  workbench,
  t,
}: {
  viewMode: WorkbenchTimelineViewMode;
  workbench: WorkbenchTimelineState;
  t: (key: string) => string;
}) {
  return (
    <>
      {workbench.showBlockingLoading && <div className="text-sm text-muted-foreground">{t('loading')}...</div>}
      {workbench.error && <div className="text-sm text-destructive">{workbench.error}</div>}
      {workbench.showTimeline && !workbench.error && (
        <GanttTimeline
          blocks={workbench.blocks}
          crewRows={workbench.crewRows}
          viewMode={viewMode}
          windowStartUtc={workbench.timelineWindow.windowStartUtc}
          windowEndUtc={workbench.timelineWindow.windowEndUtc}
          t={t}
        />
      )}
    </>
  );
}
