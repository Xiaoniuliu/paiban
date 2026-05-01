import type { PageProps } from '../pageTypes';
import { WorkbenchLayoutPage } from './WorkbenchLayoutPage';

export function WorkbenchFlightViewPage(props: PageProps) {
  return <WorkbenchLayoutPage {...props} viewMode="FLIGHT" />;
}
