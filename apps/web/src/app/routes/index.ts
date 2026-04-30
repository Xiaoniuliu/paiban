import type { Role, ViewId } from '../types';
import { firstViewForRole } from '../menu';
import {
  adminRoutes,
  crewStatusRoutes,
  dashboardRoutes,
  exceptionsCdrRoutes,
  flightOperationsRoutes,
  pilotPortalRoutes,
  reportsRoutes,
  rosteringWorkbenchRoutes,
  ruleCenterRoutes,
  validationRoutes,
} from './moduleRoutes';
import type { AppRoute } from './types';

export const appRoutes: AppRoute[] = [
  ...dashboardRoutes,
  ...crewStatusRoutes,
  ...flightOperationsRoutes,
  ...rosteringWorkbenchRoutes,
  ...validationRoutes,
  ...ruleCenterRoutes,
  ...exceptionsCdrRoutes,
  ...reportsRoutes,
  ...adminRoutes,
  ...pilotPortalRoutes,
];

const byView = new Map<ViewId, AppRoute>(appRoutes.map((route) => [route.viewId, route]));
const byPath = new Map<string, AppRoute>(appRoutes.map((route) => [route.path, route]));

export function pathForView(viewId: ViewId) {
  return byView.get(viewId)?.path ?? '/dashboard/overview';
}

export function routeForView(viewId: ViewId) {
  return byView.get(viewId);
}

export function viewForPath(pathname: string) {
  return routeForPath(pathname)?.viewId;
}

export function routeForPath(pathname: string) {
  const normalized = normalizePath(pathname);
  return byPath.get(normalized);
}

export function defaultPathForRole(role: Role) {
  return pathForView(firstViewForRole(role));
}

export function canAccessRoute(route: AppRoute, role: Role) {
  return route.allowedRoles.includes(role);
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname || '/';
}

export type { AppRoute, RoutedPageProps } from './types';
