import type { Role } from './types';

export const operationsRoles: Role[] = ['DISPATCHER', 'OPS_MANAGER', 'ADMIN'];
export const crewReadRoles: Role[] = ['DISPATCHER', 'OPS_MANAGER', 'ADMIN'];
export const adminRoles: Role[] = ['ADMIN'];
export const pilotRoles: Role[] = ['PILOT', 'ADMIN'];

export function canAccessRole(allowedRoles: Role[], role: Role) {
  return allowedRoles.includes(role);
}
