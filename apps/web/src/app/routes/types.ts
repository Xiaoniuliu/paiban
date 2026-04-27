import type { ComponentType } from 'react';
import type { ApiClient } from '../lib/api';
import type { DisplayTimezone, Language, Role, UserProfile, ViewId } from '../types';

export type ModuleKey =
  | 'dashboard'
  | 'task-plan'
  | 'crew-status'
  | 'flight-operations'
  | 'rostering-workbench'
  | 'validation-center'
  | 'rule-center'
  | 'exceptions-cdr'
  | 'reports'
  | 'admin'
  | 'pilot-portal';

export interface RoutedPageProps {
  activeView: ViewId;
  api: ApiClient;
  language: Language;
  timezone: DisplayTimezone;
  t: (key: string) => string;
  user: UserProfile;
}

export interface AppRoute {
  viewId: ViewId;
  path: string;
  moduleKey: ModuleKey;
  pageComponent: ComponentType<RoutedPageProps>;
  allowedRoles: Role[];
}
