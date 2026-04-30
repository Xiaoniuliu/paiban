import { CrewInformationPage } from './CrewInformationPage';
import { CrewExternalWorkPage } from './CrewExternalWorkPage';
import { CrewStatusTimelinePage } from './CrewStatusTimelinePage';
import type { PageProps } from './pageTypes';

export function CrewStatusPage(props: PageProps) {
  const { activeView } = props;
  if (activeView === 'crew-status-timeline') {
    return <CrewStatusTimelinePage {...props} />;
  }
  if (activeView === 'crew-external-work') {
    return <CrewExternalWorkPage {...props} />;
  }
  return <CrewInformationPage {...props} />;
}
