import { CrewInformationPage } from './CrewInformationPage';
import { CrewStatusTimelinePage } from './CrewStatusTimelinePage';
import type { PageProps } from './pageTypes';

export function CrewStatusPage(props: PageProps) {
  const { activeView } = props;
  if (activeView === 'crew-status-timeline') {
    return <CrewStatusTimelinePage {...props} />;
  }
  return <CrewInformationPage {...props} />;
}
