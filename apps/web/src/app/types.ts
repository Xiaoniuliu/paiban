export type Role = 'DISPATCHER' | 'OPS_MANAGER' | 'PILOT' | 'ADMIN';

export type Language = 'zh-CN' | 'en-US';

export type DisplayTimezone = 'UTC' | 'UTC+8';

export interface UserPreference {
  language: Language;
  displayTimezone: DisplayTimezone;
  dateFormat: string;
  timeFormat: string;
}

export type ViewId =
  | 'dashboard-overview'
  | 'dashboard-today-flights'
  | 'dashboard-risk-alerts'
  | 'dashboard-todo'
  | 'dashboard-qualification-expiry'
  | 'task-import-batches'
  | 'task-pool'
  | 'task-field-mapping'
  | 'task-batch-history'
  | 'task-import-validation'
  | 'crew-list'
  | 'crew-profile'
  | 'crew-licenses'
  | 'crew-flight-hours'
  | 'crew-duty-calendar'
  | 'crew-status-timeline'
  | 'flight-list'
  | 'route-management'
  | 'aircraft-registry'
  | 'airport-timezone'
  | 'workbench-flight-view'
  | 'workbench-crew-view'
  | 'workbench-unassigned-tasks'
  | 'workbench-draft-versions'
  | 'workbench-run-day-adjustments'
  | 'workbench-archive-entry'
  | 'validation-overview'
  | 'validation-rule-hits'
  | 'validation-violation-handling'
  | 'validation-release-gates'
  | 'validation-export'
  | 'rule-catalog'
  | 'rule-versions'
  | 'fom-references'
  | 'recent-hits'
  | 'exception-requests'
  | 'pic-decisions'
  | 'cdr-ledger'
  | 'aacm-reporting'
  | 'reports-statistics'
  | 'reports-crew-hours'
  | 'reports-duty-rest'
  | 'reports-ddo-recovery'
  | 'reports-archive'
  | 'reports-block-deviation'
  | 'reports-data-export'
  | 'reports-export-history'
  | 'admin-basic-config'
  | 'admin-account-management'
  | 'admin-role-permission'
  | 'admin-rule-config'
  | 'admin-dictionary'
  | 'admin-airport-timezone'
  | 'admin-import-mapping'
  | 'admin-notification-template'
  | 'admin-user-preference'
  | 'pilot-my-roster'
  | 'pilot-my-alerts'
  | 'pilot-status-report'
  | 'pilot-my-history'
  | 'pilot-my-preferences'
  | 'legacy';

export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  crewId: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface CrewMember {
  id: number;
  crewCode: string;
  employeeNo: string;
  nameZh: string;
  nameEn: string;
  roleCode: string;
  rankCode: string;
  homeBase: string;
  aircraftQualification: string;
  acclimatizationStatus: string;
  bodyClockTimezone: string;
  normalCommuteMinutes: number;
  externalEmploymentFlag: boolean;
  availabilityStatus: string;
  status: string;
  rollingFlightHours28d: number;
  rollingDutyHours28d: number;
  rollingDutyHours7d: number;
  rollingDutyHours14d: number;
  rollingFlightHours12m: number;
  latestActualFdpHours: number | null;
  latestActualFdpSource: string;
}

export interface TaskPlanImportBatch {
  id: number;
  batchNo: string;
  sourceName: string;
  status: string;
  importedAtUtc: string;
}

export interface TaskPlanItem {
  id: number;
  batchId: number;
  taskCode: string;
  taskType: string;
  titleZh: string;
  titleEn: string;
  departureAirport: string | null;
  arrivalAirport: string | null;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  sectorCount: number;
  aircraftType: string | null;
  aircraftNo: string | null;
  requiredCrewPattern: string | null;
  status: string;
  sourceStatus: string;
}

export interface AirportDictionary {
  id: number;
  iataCode: string;
  nameZh: string;
  nameEn: string;
  timezoneName: string;
  utcOffsetMinutes: number;
  countryCode: string;
  status: string;
}

export interface FlightRoute {
  id: number;
  routeCode: string;
  departureAirport: string;
  arrivalAirport: string;
  standardDurationMinutes: number;
  timeDifferenceMinutes: number;
  crossTimezone: boolean;
  status: string;
}

export interface AircraftRegistry {
  id: number;
  aircraftNo: string;
  aircraftType: string;
  fleet: string;
  baseAirport: string;
  seatCount: number;
  maxPayload: number | null;
  status: string;
}

export interface CrewQualification {
  id: number;
  crewMemberId: number;
  qualificationType: string;
  qualificationCode: string;
  effectiveFromUtc: string | null;
  effectiveToUtc: string | null;
  status: string;
}

export interface CrewExternalWork {
  id: number;
  crewMemberId: number;
  externalType: string;
  startUtc: string;
  endUtc: string;
  description: string;
  status: string;
}

export interface AssignmentCrewCandidate {
  id: number;
  crewCode: string;
  nameZh: string;
  nameEn: string;
  roleCode: string;
  homeBase: string;
  aircraftQualification: string;
  rollingFlightHours28d: number;
  rollingDutyHours28d: number;
}

export type AssignmentRole = 'PIC' | 'FO' | 'RELIEF' | 'EXTRA';

export interface AssignmentCrewAssignment {
  timelineBlockId: number | null;
  crewId: number;
  assignmentRole: AssignmentRole;
  displayOrder: number;
}

export interface AssignmentTimelineBlock {
  id: number;
  rosterVersionId: number;
  crewMemberId: number;
  taskPlanItemId: number;
  blockType: string;
  startUtc: string;
  endUtc: string;
  displayLabel: string;
  status: string;
  assignmentRole: AssignmentRole;
  displayOrder: number;
}

export interface AssignmentTaskDetail {
  task: TaskPlanItem;
  selectedPicCrewId: number | null;
  selectedFoCrewId: number | null;
  picCandidates: AssignmentCrewCandidate[];
  foCandidates: AssignmentCrewCandidate[];
  additionalCandidates: AssignmentCrewCandidate[];
  currentAssignments: AssignmentCrewAssignment[];
  timelineBlocks: AssignmentTimelineBlock[];
  canEdit: boolean;
  readOnlyReason: string | null;
}

export interface AdditionalAssignmentRequest {
  crewId: number;
  assignmentRole: Extract<AssignmentRole, 'RELIEF' | 'EXTRA'>;
}

export interface SaveAssignmentDraftRequest {
  picCrewId: number;
  foCrewId: number;
  additionalAssignments: AdditionalAssignmentRequest[];
}

export interface SaveAssignmentDraftResponse {
  task: TaskPlanItem;
  timelineBlocks: AssignmentTimelineBlock[];
  affectedWindowStartUtc: string;
  affectedWindowEndUtc: string;
  affectedCrewIds: number[];
  affectedTaskIds: number[];
  validationSummary: string;
}

export interface ClearAssignmentDraftResponse {
  task: TaskPlanItem;
  affectedCrewIds: number[];
  affectedTaskIds: number[];
}

export type ValidationIssueSeverity = 'BLOCK' | 'WARNING';

export interface ValidationIssue {
  id: string;
  hitId: number | null;
  taskId: number;
  crewId: number | null;
  timelineBlockId: number | null;
  targetType: string | null;
  targetId: number | null;
  taskCode: string;
  route: string;
  startUtc: string;
  endUtc: string;
  severity: ValidationIssueSeverity;
  ruleId: string;
  ruleTitle: string;
  message: string;
  actionType: 'ASSIGNMENT_DRAWER' | 'STATUS_REPAIR' | 'REVIEW' | string;
  status: string;
  evidenceWindowStartUtc: string | null;
  evidenceWindowEndUtc: string | null;
}

export interface ValidationPublishSummary {
  rosterVersionNo: string;
  rosterVersionStatus: string;
  validatedAtUtc: string | null;
  publishedAtUtc: string | null;
  totalTasks: number;
  assignedTasks: number;
  draftAssignedTasks: number;
  unassignedTasks: number;
  publishedTasks: number;
  blockedCount: number;
  warningCount: number;
  publishableTasks: number;
  canPublish: boolean;
  managerConfirmationRequired: boolean;
  inactiveRuleIds: string[];
  issues: ValidationIssue[];
}

export interface TimelineBlock {
  id: number;
  rosterVersionId: number;
  crewMemberId: number | null;
  taskPlanItemId: number | null;
  blockType: string;
  startUtc: string;
  endUtc: string;
  displayLabel: string;
  status: string;
  assignmentRole: AssignmentRole | null;
  displayOrder: number | null;
}

export type CrewStatusBlockType = 'POSITIONING' | 'STANDBY' | 'DUTY' | 'TRAINING' | 'REST' | 'DDO' | 'RECOVERY';

export interface CreateCrewStatusBlockRequest {
  crewMemberId: number;
  blockType: CrewStatusBlockType;
  startUtc: string;
  endUtc: string;
  displayLabel?: string;
}

export type ArchiveStatus = 'Unarchived' | 'PartiallyArchived' | 'Archived' | 'Overdue';

export type CrewArchiveFormStatus = 'NotStarted' | 'Completed' | 'NoFlyingHourConfirmed';

export interface CrewArchiveSummary {
  total: number;
  notStarted: number;
  completed: number;
  noFlyingHourConfirmed: number;
}

export interface GanttTimelineBlock {
  blockId: number;
  flightId: number | null;
  blockType: string | null;
  crewId: number | null;
  crewCode: string | null;
  crewName: string | null;
  displayLabel: string;
  route: string | null;
  startUtc: string;
  endUtc: string;
  taskStatus: string | null;
  blockStatus: string | null;
  assignmentRole: AssignmentRole | null;
  displayOrder: number | null;
  archiveCaseId: number | null;
  archiveStatus: ArchiveStatus | null;
  archiveDeadlineAtUtc: string | null;
  crewArchiveSummary: CrewArchiveSummary;
  canEditArchive: boolean;
  archiveReadOnlyReason: string | null;
}

export interface ArchiveCase {
  id: number;
  flightId: number;
  taskCode: string;
  route: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  archiveStatus: ArchiveStatus;
  archiveDeadlineAtUtc: string;
  archivedAtUtc: string | null;
  completedCount: number;
  totalCount: number;
  revision: number;
  canEditArchive: boolean;
  archiveReadOnlyReason: string | null;
}

export type RunDayAdjustmentType = 'DELAY' | 'CANCEL' | 'STANDBY_CALLOUT' | 'CREW_REPLACEMENT' | 'REST_INSERT';
export type RunDayAdjustmentStatus = 'DRAFT' | 'APPLIED';

export interface RunDayAdjustment {
  id: number;
  taskId: number;
  taskCode: string;
  route: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
  adjustmentType: RunDayAdjustmentType;
  proposedStartUtc: string | null;
  proposedEndUtc: string | null;
  fromCrewId: number | null;
  toCrewId: number | null;
  assignmentRole: AssignmentRole | null;
  effectiveStartUtc: string | null;
  effectiveEndUtc: string | null;
  reason: string;
  status: RunDayAdjustmentStatus | string;
  createdAtUtc: string;
}

export interface CreateRunDayAdjustmentRequest {
  taskId: number;
  adjustmentType: RunDayAdjustmentType;
  proposedStartUtc: string | null;
  proposedEndUtc: string | null;
  fromCrewId: number | null;
  toCrewId: number | null;
  assignmentRole: AssignmentRole | null;
  effectiveStartUtc: string | null;
  effectiveEndUtc: string | null;
  reason: string;
}

export interface CrewArchiveForm {
  id: number;
  archiveCaseId: number;
  flightId: number;
  crewId: number;
  crewCode: string;
  crewName: string;
  actualDutyStartUtc: string | null;
  actualDutyEndUtc: string | null;
  actualFdpStartUtc: string | null;
  actualFdpEndUtc: string | null;
  flyingHourMinutes: number | null;
  noFlyingHourFlag: boolean;
  formStatus: CrewArchiveFormStatus;
  enteredAtUtc: string | null;
  confirmedAtUtc: string | null;
  revision: number;
  canEdit: boolean;
}

export interface ArchiveCaseDetail {
  archiveCase: ArchiveCase;
  crewForms: CrewArchiveForm[];
}

export interface SaveCrewArchiveFormRequest {
  expectedRevision: number;
  actualDutyStartUtc: string;
  actualDutyEndUtc: string;
  actualFdpStartUtc: string;
  actualFdpEndUtc: string;
  flyingHourMinutes: number | null;
  noFlyingHourFlag: boolean;
}

export interface SaveCrewArchiveFormResponse {
  crewArchiveForm: CrewArchiveForm;
  archiveCase: ArchiveCase;
  affectedWindowStartUtc: string;
  affectedWindowEndUtc: string;
  affectedCrewIds: number[];
  affectedFlightIds: number[];
  validationSummary: string;
  auditLogId: number | null;
}

export interface RuleCatalog {
  id: number;
  ruleId: string;
  titleZh: string;
  titleEn: string;
  ruleCategory: string;
  severityDefault: string;
  sourceSection: string;
  sourceClause: string;
  sourcePage: number;
  phaseCode: string;
  activeFlag: boolean;
  applicability: string;
  descriptionZh: string;
  descriptionEn: string;
  triggerSummaryZh: string;
  triggerSummaryEn: string;
  handlingMethodZh: string;
  handlingMethodEn: string;
  exceptionAllowed: boolean;
  pdfDeeplink: string | null;
  versionStatus: string;
  catalogEntryType: string;
  displayRuleCode: string | null;
  sourceRuleIds: string | null;
  effectiveFromUtc: string | null;
  effectiveToUtc: string | null;
  hitCount: number;
  latestHitAtUtc: string | null;
  activationLocked: boolean;
}

export interface RuleRecentHit {
  hitId: number;
  ruleId: string;
  severity: string;
  status: string;
  targetType: string | null;
  targetId: number | null;
  crewId: number | null;
  taskId: number | null;
  timelineBlockId: number | null;
  evidenceWindowStartUtc: string | null;
  evidenceWindowEndUtc: string | null;
  message: string;
  recommendedAction: string;
  createdAtUtc: string | null;
  taskCode: string | null;
  route: string | null;
  crewCode: string | null;
  crewName: string | null;
}
