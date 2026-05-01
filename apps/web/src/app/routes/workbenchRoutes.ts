import type { ComponentType } from 'react';
import { PublishResultPage } from '../pages/Pages';
import { DraftRosteringPage } from '../pages/DraftRosteringPage';
import { ArchiveEntryPage } from '../pages/validation/archive/ArchiveEntryPage';
import { WorkbenchCrewViewPage } from '../pages/workbench/WorkbenchCrewViewPage';
import { WorkbenchFlightViewPage } from '../pages/workbench/WorkbenchFlightViewPage';
import { WorkbenchRunDayRetiredPage } from '../pages/workbench/WorkbenchRetiredRoutePage';
import { operationsRoles } from '../permissions';
import type { AppRoute, ModuleKey, RoutedPageProps } from './types';

const workbenchFlightViewPage = WorkbenchFlightViewPage as ComponentType<RoutedPageProps>;
const workbenchCrewViewPage = WorkbenchCrewViewPage as ComponentType<RoutedPageProps>;
const draftRosteringPage = DraftRosteringPage as ComponentType<RoutedPageProps>;
const publishResultPage = PublishResultPage as ComponentType<RoutedPageProps>;
const archiveEntryPage = ArchiveEntryPage as ComponentType<RoutedPageProps>;
const runDayRetiredPage = WorkbenchRunDayRetiredPage as ComponentType<RoutedPageProps>;

function route(
  moduleKey: ModuleKey,
  path: string,
  viewId: AppRoute['viewId'],
  pageComponent: AppRoute['pageComponent'],
): AppRoute {
  return { moduleKey, path, viewId, pageComponent, allowedRoles: operationsRoles };
}

export const rosteringWorkbenchRoutes: AppRoute[] = [
  route('rostering-workbench', '/rostering-workbench/flight-view', 'workbench-flight-view', workbenchFlightViewPage),
  route('rostering-workbench', '/rostering-workbench/crew-view', 'workbench-crew-view', workbenchCrewViewPage),
  route('rostering-workbench', '/rostering-workbench/draft-rostering', 'draft-rostering', draftRosteringPage),

  // Compatibility routes: keep old URLs reachable while formal menu entries move elsewhere.
  route('rostering-workbench', '/rostering-workbench/unassigned-tasks', 'workbench-unassigned-tasks', draftRosteringPage),
  route('rostering-workbench', '/rostering-workbench/draft-versions', 'workbench-draft-versions', publishResultPage),
  route('rostering-workbench', '/rostering-workbench/run-day-adjustments', 'workbench-run-day-adjustments', runDayRetiredPage),
  route('rostering-workbench', '/rostering-workbench/archive-entry', 'workbench-archive-entry', archiveEntryPage),
];
