import type { PageProps } from './pageTypes';
import { WorkbenchCrewViewPage } from './workbench/WorkbenchCrewViewPage';
import { WorkbenchFlightViewPage } from './workbench/WorkbenchFlightViewPage';

export {
  AccessDeniedPage,
  AdminPage,
  DashboardPage,
  ExceptionsCdrPage,
  LegacyReferencePage,
  PilotPortalPage,
  ReportsPage,
  ValidationCenterPage,
} from './StaticPages';
export {
  LegacyRuleCenterPage,
  RuleCenterPage,
} from './RuleCenterPages';
export { FlightOperationsPage } from './FlightOperationsPages';
export { FlightTaskPage } from './FlightTaskPage';
export { CrewInformationPage } from './CrewInformationPage';
export { CrewStatusTimelinePage } from './CrewStatusTimelinePage';
export { IssueHandlingPage } from './IssueHandlingPage';
export { PublishResultPage } from './PublishResultPage';
export { WorkbenchCrewViewPage } from './workbench/WorkbenchCrewViewPage';
export { WorkbenchFlightViewPage } from './workbench/WorkbenchFlightViewPage';

export function RosteringWorkbenchPage(props: PageProps) {
  if (props.activeView === 'workbench-crew-view') {
    return <WorkbenchCrewViewPage {...props} />;
  }

  return <WorkbenchFlightViewPage {...props} />;
}
