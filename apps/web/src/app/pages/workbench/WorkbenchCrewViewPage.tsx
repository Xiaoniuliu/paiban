import type { PageProps } from '../pageTypes';
import { WorkbenchLayoutPage } from './WorkbenchLayoutPage';

export function WorkbenchCrewViewPage(props: PageProps) {
  return <WorkbenchLayoutPage {...props} viewMode="CREW" />;
}
