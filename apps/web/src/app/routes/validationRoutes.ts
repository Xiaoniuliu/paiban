import type { ComponentType } from 'react';
import {
  IssueHandlingPage,
  PublishResultPage,
  ValidationCenterPage,
} from '../pages/Pages';
import { ArchiveEntryPage } from '../pages/validation/archive/ArchiveEntryPage';
import { WorkbenchCompatibilityHandoffPage } from '../pages/workbench/WorkbenchRetiredRoutePage';
import { operationsRoles } from '../permissions';
import type { AppRoute, ModuleKey, RoutedPageProps } from './types';

const issueHandlingPage = IssueHandlingPage as ComponentType<RoutedPageProps>;
const publishResultPage = PublishResultPage as ComponentType<RoutedPageProps>;
const validationPage = ValidationCenterPage as ComponentType<RoutedPageProps>;
const archiveEntryPage = ArchiveEntryPage as ComponentType<RoutedPageProps>;
const compatibilityHandoffPage = WorkbenchCompatibilityHandoffPage as ComponentType<RoutedPageProps>;

function route(
  moduleKey: ModuleKey,
  path: string,
  viewId: AppRoute['viewId'],
  pageComponent: AppRoute['pageComponent'],
): AppRoute {
  return { moduleKey, path, viewId, pageComponent, allowedRoles: operationsRoles };
}

export const validationRoutes: AppRoute[] = [
  route('validation-center', '/validation-center/overview', 'validation-overview', validationPage),
  route('validation-center', '/validation-center/rule-hits', 'validation-rule-hits', validationPage),
  route('validation-center', '/validation-center/violation-handling', 'validation-violation-handling', issueHandlingPage),
  route('validation-center', '/validation-center/release-gates', 'validation-release-gates', publishResultPage),
  route('validation-center', '/validation-center/export', 'validation-export', compatibilityHandoffPage),
  route('validation-center', '/validation-center/archive-entry', 'workbench-archive-entry', archiveEntryPage),
];
