import type { ApiClient } from '../lib/api';
import type {
  DisplayTimezone,
  Language,
  UserProfile,
  ViewId,
} from '../types';

export interface PageProps {
  activeView: ViewId;
  api: ApiClient;
  language: Language;
  timezone: DisplayTimezone;
  t: (key: string) => string;
  user: UserProfile;
}
