import type { ComponentType } from 'react';
import {
  IssueHandlingPage,
  PublishExportPage,
  PublishResultPage,
  ValidationCenterPage,
} from '../pages/Pages';
import { ArchiveEntryPage } from '../pages/validation/archive/ArchiveEntryPage';
import { operationsRoles } from '../permissions';
import type { AppRoute, ModuleKey, RoutedPageProps } from './types';

const issueHandlingPage = IssueHandlingPage as ComponentType<RoutedPageProps>;
const publishExportPage = PublishExportPage as ComponentType<RoutedPageProps>;
const publishResultPage = PublishResultPage as ComponentType<RoutedPageProps>;
const validationPage = ValidationCenterPage as ComponentType<RoutedPageProps>;
const archiveEntryPage = ArchiveEntryPage as ComponentType<RoutedPageProps>;

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
  route('validation-center', '/validation-center/export', 'validation-export', publishExportPage),
  route('validation-center', '/validation-center/archive-entry', 'workbench-archive-entry', archiveEntryPage),
];
