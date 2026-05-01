import type { PageProps } from '../pageTypes';
import { WorkbenchTimelineCard } from './components/WorkbenchTimelineCard';
import { useWorkbenchTimeline, type WorkbenchTimelineViewMode } from './hooks/useWorkbenchTimeline';

export function WorkbenchLayoutPage({
  activeView,
  api,
  t,
  viewMode,
}: PageProps & { viewMode: WorkbenchTimelineViewMode }) {
  const workbench = useWorkbenchTimeline(api, t, viewMode);

  return (
    <WorkbenchTimelineCard
      activeView={activeView}
      t={t}
      viewMode={viewMode}
      workbench={workbench}
    />
  );
}
