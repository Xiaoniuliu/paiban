import type { ComponentType } from 'react';
import {
  AdminPage,
  CrewStatusPage,
  DashboardPage,
  ExceptionsCdrPage,
  FlightOperationsPage,
  PilotPortalPage,
  ReportsPage,
  RosteringWorkbenchPage,
  RuleCenterPage,
  TaskPlanCenterPage,
  ValidationCenterPage,
} from '../pages/Pages';
import { adminRoles, crewReadRoles, operationsRoles, pilotRoles } from '../permissions';
import type { AppRoute, ModuleKey, RoutedPageProps } from './types';

const dashboardPage = DashboardPage as ComponentType<RoutedPageProps>;
const taskPlanPage = TaskPlanCenterPage as ComponentType<RoutedPageProps>;
const crewStatusPage = CrewStatusPage as ComponentType<RoutedPageProps>;
const flightOperationsPage = FlightOperationsPage as ComponentType<RoutedPageProps>;
const workbenchPage = RosteringWorkbenchPage as ComponentType<RoutedPageProps>;
const validationPage = ValidationCenterPage as ComponentType<RoutedPageProps>;
const ruleCenterPage = RuleCenterPage as ComponentType<RoutedPageProps>;
const exceptionsPage = ExceptionsCdrPage as ComponentType<RoutedPageProps>;
const reportsPage = ReportsPage as ComponentType<RoutedPageProps>;
const adminPage = AdminPage as ComponentType<RoutedPageProps>;
const pilotPortalPage = PilotPortalPage as ComponentType<RoutedPageProps>;

function route(
  moduleKey: ModuleKey,
  path: string,
  viewId: AppRoute['viewId'],
  pageComponent: AppRoute['pageComponent'],
  allowedRoles = operationsRoles,
): AppRoute {
  return { moduleKey, path, viewId, pageComponent, allowedRoles };
}

export const dashboardRoutes: AppRoute[] = [
  route('dashboard', '/dashboard/overview', 'dashboard-overview', dashboardPage),
  route('dashboard', '/dashboard/today-flights', 'dashboard-today-flights', dashboardPage),
  route('dashboard', '/dashboard/risk-alerts', 'dashboard-risk-alerts', dashboardPage),
  route('dashboard', '/dashboard/todo', 'dashboard-todo', dashboardPage),
  route('dashboard', '/dashboard/qualification-expiry', 'dashboard-qualification-expiry', dashboardPage),
];

export const taskPlanRoutes: AppRoute[] = [
  route('task-plan', '/task-plan/import-batches', 'task-import-batches', taskPlanPage),
  route('task-plan', '/task-plan/task-pool', 'task-pool', taskPlanPage),
  route('task-plan', '/task-plan/field-mapping', 'task-field-mapping', taskPlanPage),
  route('task-plan', '/task-plan/batch-history', 'task-batch-history', taskPlanPage),
  route('task-plan', '/task-plan/import-validation', 'task-import-validation', taskPlanPage),
];

export const crewStatusRoutes: AppRoute[] = [
  route('crew-status', '/crew-status/crew-list', 'crew-list', crewStatusPage, crewReadRoles),
  route('crew-status', '/crew-status/crew-profile', 'crew-profile', crewStatusPage, ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT']),
  route('crew-status', '/crew-status/licenses', 'crew-licenses', crewStatusPage, ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT']),
  route('crew-status', '/crew-status/flight-hours', 'crew-flight-hours', crewStatusPage, ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT']),
  route('crew-status', '/crew-status/duty-calendar', 'crew-duty-calendar', crewStatusPage, ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT']),
  route('crew-status', '/crew-status/status-timeline', 'crew-status-timeline', crewStatusPage, ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT']),
  route('crew-status', '/crew-status/external-work', 'crew-external-work', crewStatusPage, ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT']),
];

export const flightOperationsRoutes: AppRoute[] = [
  route('flight-operations', '/flight-operations/flight-plan', 'task-import-batches', flightOperationsPage),
  route('flight-operations', '/flight-operations/flights', 'flight-list', flightOperationsPage),
  route('flight-operations', '/flight-operations/routes', 'route-management', flightOperationsPage),
  route('flight-operations', '/flight-operations/aircraft', 'aircraft-registry', flightOperationsPage),
  route('flight-operations', '/flight-operations/airport-timezone', 'airport-timezone', flightOperationsPage),
];

export const rosteringWorkbenchRoutes: AppRoute[] = [
  route('rostering-workbench', '/rostering-workbench/flight-view', 'workbench-flight-view', workbenchPage),
  route('rostering-workbench', '/rostering-workbench/crew-view', 'workbench-crew-view', workbenchPage),
  route('rostering-workbench', '/rostering-workbench/unassigned-tasks', 'workbench-unassigned-tasks', workbenchPage),
  route('rostering-workbench', '/rostering-workbench/draft-versions', 'workbench-draft-versions', workbenchPage),
  route('rostering-workbench', '/rostering-workbench/run-day-adjustments', 'workbench-run-day-adjustments', workbenchPage),
  route('rostering-workbench', '/rostering-workbench/archive-entry', 'workbench-archive-entry', workbenchPage),
];

export const validationRoutes: AppRoute[] = [
  route('validation-center', '/validation-center/overview', 'validation-overview', validationPage),
  route('validation-center', '/validation-center/rule-hits', 'validation-rule-hits', validationPage),
  route('validation-center', '/validation-center/violation-handling', 'validation-violation-handling', validationPage),
  route('validation-center', '/validation-center/release-gates', 'validation-release-gates', validationPage),
  route('validation-center', '/validation-center/export', 'validation-export', validationPage),
];

export const ruleCenterRoutes: AppRoute[] = [
  route('rule-center', '/rule-center/catalog', 'rule-catalog', ruleCenterPage),
  route('rule-center', '/rule-center/versions', 'rule-versions', ruleCenterPage),
  route('rule-center', '/rule-center/fom-references', 'fom-references', ruleCenterPage),
  route('rule-center', '/rule-center/recent-hits', 'recent-hits', ruleCenterPage),
];

export const exceptionsCdrRoutes: AppRoute[] = [
  route('exceptions-cdr', '/exceptions-cdr/exception-requests', 'exception-requests', exceptionsPage),
  route('exceptions-cdr', '/exceptions-cdr/pic-decisions', 'pic-decisions', exceptionsPage, ['OPS_MANAGER', 'ADMIN']),
  route('exceptions-cdr', '/exceptions-cdr/cdr-ledger', 'cdr-ledger', exceptionsPage),
  route('exceptions-cdr', '/exceptions-cdr/aacm-reporting', 'aacm-reporting', exceptionsPage),
];

export const reportsRoutes: AppRoute[] = [
  route('reports', '/reports/statistics', 'reports-statistics', reportsPage),
  route('reports', '/reports/crew-hours', 'reports-crew-hours', reportsPage),
  route('reports', '/reports/duty-rest', 'reports-duty-rest', reportsPage),
  route('reports', '/reports/ddo-recovery', 'reports-ddo-recovery', reportsPage),
  route('reports', '/reports/archive', 'reports-archive', reportsPage),
  route('reports', '/reports/block-deviation', 'reports-block-deviation', reportsPage),
  route('reports', '/reports/data-export', 'reports-data-export', reportsPage),
  route('reports', '/reports/export-history', 'reports-export-history', reportsPage),
];

export const adminRoutes: AppRoute[] = [
  route('admin', '/admin/basic-config', 'admin-basic-config', adminPage, adminRoles),
  route('admin', '/admin/account-management', 'admin-account-management', adminPage, adminRoles),
  route('admin', '/admin/role-permission', 'admin-role-permission', adminPage, adminRoles),
  route('admin', '/admin/rule-config', 'admin-rule-config', adminPage, adminRoles),
  route('admin', '/admin/dictionary', 'admin-dictionary', adminPage, adminRoles),
  route('admin', '/admin/airport-timezone', 'admin-airport-timezone', adminPage, adminRoles),
  route('admin', '/admin/import-mapping', 'admin-import-mapping', adminPage, adminRoles),
  route('admin', '/admin/notification-template', 'admin-notification-template', adminPage, adminRoles),
  route('admin', '/admin/user-preference', 'admin-user-preference', adminPage, adminRoles),
];

export const pilotPortalRoutes: AppRoute[] = [
  route('pilot-portal', '/pilot-portal/my-roster', 'pilot-my-roster', pilotPortalPage, pilotRoles),
  route('pilot-portal', '/pilot-portal/my-alerts', 'pilot-my-alerts', pilotPortalPage, pilotRoles),
  route('pilot-portal', '/pilot-portal/status-report', 'pilot-status-report', pilotPortalPage, pilotRoles),
  route('pilot-portal', '/pilot-portal/my-history', 'pilot-my-history', pilotPortalPage, pilotRoles),
  route('pilot-portal', '/pilot-portal/my-preferences', 'pilot-my-preferences', pilotPortalPage, pilotRoles),
];
