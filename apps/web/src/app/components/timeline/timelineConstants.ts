import type { ArchiveStatus } from '../../types';

export const rowHeight = 45;

export const ruleSensitiveDutyTypes = new Set(['REST', 'DDO', 'RECOVERY']);

export const flightStatusPriority = [
  'VALIDATION_FAILED',
  'BLOCKED',
  'NEEDS_REVIEW',
  'WARNING',
  'UNASSIGNED',
  'ASSIGNED_DRAFT',
  'ASSIGNED',
  'PUBLISHED',
];

export const archiveStatusPriority: ArchiveStatus[] = ['Overdue', 'PartiallyArchived', 'Unarchived', 'Archived'];
