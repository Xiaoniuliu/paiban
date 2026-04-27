import {
  BarChart3,
  BookOpenCheck,
  FileClock,
  Gauge,
  LayoutGrid,
  Plane,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import type { Role, ViewId } from './types';
import { adminRoles, crewReadRoles, operationsRoles, pilotRoles } from './permissions';

export type MenuGroupId =
  | 'menu-dashboard'
  | 'menu-task-plan'
  | 'menu-crew-status'
  | 'menu-flight-operations'
  | 'menu-workbench'
  | 'menu-validation'
  | 'menu-rule-center'
  | 'menu-exceptions-cdr'
  | 'menu-reports'
  | 'menu-admin'
  | 'menu-pilot-portal';

export interface MenuChild {
  id: ViewId;
  roles: Role[];
}

export interface MenuGroup {
  id: MenuGroupId;
  icon: typeof Gauge;
  roles: Role[];
  viewId?: ViewId;
  children: MenuChild[];
  aliases?: ViewId[];
}

export const menuGroups: MenuGroup[] = [
  {
    id: 'menu-dashboard',
    icon: Gauge,
    roles: operationsRoles,
    viewId: 'dashboard-overview',
    children: [],
    aliases: [
      'dashboard-today-flights',
      'dashboard-risk-alerts',
      'dashboard-todo',
      'dashboard-qualification-expiry',
    ],
  },
  {
    id: 'menu-flight-operations',
    icon: Plane,
    roles: operationsRoles,
    children: [
      { id: 'task-import-batches', roles: operationsRoles },
      { id: 'flight-list', roles: operationsRoles },
    ],
    aliases: [
      'task-pool',
      'task-field-mapping',
      'task-batch-history',
      'task-import-validation',
      'route-management',
      'aircraft-registry',
      'airport-timezone',
    ],
  },
  {
    id: 'menu-crew-status',
    icon: Users,
    roles: ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT'],
    children: [
      { id: 'crew-list', roles: crewReadRoles },
      { id: 'crew-status-timeline', roles: ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT'] },
      { id: 'crew-external-work', roles: ['DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT'] },
    ],
    aliases: [
      'crew-profile',
      'crew-licenses',
      'crew-flight-hours',
      'crew-duty-calendar',
    ],
  },
  {
    id: 'menu-workbench',
    icon: LayoutGrid,
    roles: operationsRoles,
    children: [
      { id: 'workbench-flight-view', roles: operationsRoles },
      { id: 'workbench-crew-view', roles: operationsRoles },
      { id: 'workbench-unassigned-tasks', roles: operationsRoles },
      { id: 'workbench-draft-versions', roles: operationsRoles },
      { id: 'workbench-run-day-adjustments', roles: operationsRoles },
      { id: 'workbench-archive-entry', roles: operationsRoles },
    ],
  },
  {
    id: 'menu-rule-center',
    icon: BookOpenCheck,
    roles: operationsRoles,
    viewId: 'rule-catalog',
    children: [],
    aliases: [
      'rule-versions',
      'fom-references',
      'recent-hits',
      'validation-overview',
      'validation-rule-hits',
      'validation-violation-handling',
      'validation-release-gates',
      'validation-export',
    ],
  },
  {
    id: 'menu-exceptions-cdr',
    icon: FileClock,
    roles: operationsRoles,
    children: [
      { id: 'exception-requests', roles: operationsRoles },
      { id: 'cdr-ledger', roles: operationsRoles },
    ],
    aliases: ['pic-decisions', 'aacm-reporting'],
  },
  {
    id: 'menu-reports',
    icon: BarChart3,
    roles: operationsRoles,
    viewId: 'reports-statistics',
    children: [],
    aliases: [
      'reports-crew-hours',
      'reports-duty-rest',
      'reports-ddo-recovery',
      'reports-archive',
      'reports-block-deviation',
      'reports-data-export',
      'reports-export-history',
    ],
  },
  {
    id: 'menu-admin',
    icon: Settings,
    roles: adminRoles,
    children: [
      { id: 'admin-basic-config', roles: adminRoles },
      { id: 'admin-account-management', roles: adminRoles },
      { id: 'admin-role-permission', roles: adminRoles },
      { id: 'admin-rule-config', roles: adminRoles },
      { id: 'admin-dictionary', roles: adminRoles },
      { id: 'admin-airport-timezone', roles: adminRoles },
      { id: 'admin-import-mapping', roles: adminRoles },
      { id: 'admin-notification-template', roles: adminRoles },
      { id: 'admin-user-preference', roles: adminRoles },
    ],
  },
  {
    id: 'menu-pilot-portal',
    icon: UserRound,
    roles: pilotRoles,
    children: [
      { id: 'pilot-my-roster', roles: pilotRoles },
      { id: 'pilot-my-alerts', roles: pilotRoles },
      { id: 'pilot-status-report', roles: pilotRoles },
      { id: 'pilot-my-history', roles: pilotRoles },
      { id: 'pilot-my-preferences', roles: pilotRoles },
    ],
  },
];

export function firstViewForRole(role: Role): ViewId {
  if (role === 'PILOT') {
    return 'pilot-my-roster';
  }
  return 'dashboard-overview';
}

export function allowedMenuForRole(role: Role) {
  return menuGroups
    .filter((group) => group.roles.includes(role))
    .map((group) => ({
      ...group,
      children: group.children.filter((child) => child.roles.includes(role)),
    }))
    .filter((group) => Boolean(group.viewId) || group.children.length > 0);
}

export function parentForView(view: ViewId) {
  return menuGroups.find(
    (group) => group.viewId === view || group.aliases?.includes(view) || group.children.some((child) => child.id === view),
  );
}
