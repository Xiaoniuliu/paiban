import type {
  ApiResponse,
  AircraftRegistry,
  AirportDictionary,
  ArchiveCaseDetail,
  ArchiveCase,
  AssignmentTaskDetail,
  ClearAssignmentDraftResponse,
  CreateRunDayAdjustmentRequest,
  CreateCrewStatusBlockRequest,
  CrewExternalWork,
  CrewMember,
  CrewQualification,
  FlightRoute,
  GanttTimelineBlock,
  RunDayAdjustment,
  RuleCatalog,
  RuleRecentHit,
  SaveAssignmentDraftRequest,
  SaveAssignmentDraftResponse,
  SaveCrewArchiveFormRequest,
  SaveCrewArchiveFormResponse,
  TaskPlanImportBatch,
  TaskPlanItem,
  TimelineBlock,
  UserPreference,
  UserProfile,
  ValidationPublishSummary,
} from '../types';

export interface LoginResult {
  token: string;
  user: UserProfile;
}

export interface GanttTimelineQuery {
  windowStartUtc: string;
  windowEndUtc: string;
  viewMode: 'FLIGHT' | 'CREW';
}

export class ApiClient {
  private token: string | null;
  private onUnauthorized: () => void;

  constructor(token: string | null, onUnauthorized: () => void) {
    this.token = token;
    this.onUnauthorized = onUnauthorized;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  async login(username: string, password: string) {
    return this.request<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, false);
  }

  async me() {
    return this.request<UserProfile>('/api/auth/me');
  }

  async crewMembers() {
    return this.request<CrewMember[]>('/api/crew-members');
  }

  async createCrewMember(payload: Partial<CrewMember>) {
    return this.request<CrewMember>('/api/crew-members', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCrewMember(crewId: number, payload: Partial<CrewMember>) {
    return this.request<CrewMember>(`/api/crew-members/${crewId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async disableCrewMember(crewId: number) {
    return this.request<CrewMember>(`/api/crew-members/${crewId}`, { method: 'DELETE' });
  }

  async crewQualifications() {
    return this.request<CrewQualification[]>('/api/crew-members/qualifications');
  }

  async createCrewQualification(crewId: number, payload: Partial<CrewQualification>) {
    return this.request<CrewQualification>(`/api/crew-members/${crewId}/qualifications`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCrewQualification(crewId: number, qualificationId: number, payload: Partial<CrewQualification>) {
    return this.request<CrewQualification>(`/api/crew-members/${crewId}/qualifications/${qualificationId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async disableCrewQualification(crewId: number, qualificationId: number) {
    return this.request<CrewQualification>(`/api/crew-members/${crewId}/qualifications/${qualificationId}`, { method: 'DELETE' });
  }

  async crewExternalWork() {
    return this.request<CrewExternalWork[]>('/api/crew-members/external-work');
  }

  async createCrewExternalWork(crewId: number, payload: Partial<CrewExternalWork>) {
    return this.request<CrewExternalWork>(`/api/crew-members/${crewId}/external-work`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCrewExternalWork(crewId: number, workId: number, payload: Partial<CrewExternalWork>) {
    return this.request<CrewExternalWork>(`/api/crew-members/${crewId}/external-work/${workId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async disableCrewExternalWork(crewId: number, workId: number) {
    return this.request<CrewExternalWork>(`/api/crew-members/${crewId}/external-work/${workId}`, { method: 'DELETE' });
  }

  async airports() {
    return this.request<AirportDictionary[]>('/api/airports');
  }

  async createAirport(payload: Partial<AirportDictionary>) {
    return this.request<AirportDictionary>('/api/airports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAirport(airportId: number, payload: Partial<AirportDictionary>) {
    return this.request<AirportDictionary>(`/api/airports/${airportId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteAirport(airportId: number) {
    return this.request<AirportDictionary>(`/api/airports/${airportId}`, { method: 'DELETE' });
  }

  async taskPlanBatches() {
    return this.request<TaskPlanImportBatch[]>('/api/task-plan/batches');
  }

  async taskPlanItems() {
    return this.request<TaskPlanItem[]>('/api/task-plan/items');
  }

  async createTaskPlanItem(payload: Partial<TaskPlanItem>) {
    return this.request<TaskPlanItem>('/api/task-plan/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTaskPlanItem(itemId: number, payload: Partial<TaskPlanItem>) {
    return this.request<TaskPlanItem>(`/api/task-plan/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async cancelTaskPlanItem(itemId: number) {
    return this.request<TaskPlanItem>(`/api/task-plan/items/${itemId}`, { method: 'DELETE' });
  }

  async flightRoutes() {
    return this.request<FlightRoute[]>('/api/flight-operations/routes');
  }

  async createFlightRoute(payload: Partial<FlightRoute>) {
    return this.request<FlightRoute>('/api/flight-operations/routes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateFlightRoute(routeId: number, payload: Partial<FlightRoute>) {
    return this.request<FlightRoute>(`/api/flight-operations/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteFlightRoute(routeId: number) {
    return this.request<FlightRoute>(`/api/flight-operations/routes/${routeId}`, { method: 'DELETE' });
  }

  async aircraftRegistry() {
    return this.request<AircraftRegistry[]>('/api/flight-operations/aircraft');
  }

  async createAircraft(payload: Partial<AircraftRegistry>) {
    return this.request<AircraftRegistry>('/api/flight-operations/aircraft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAircraft(aircraftId: number, payload: Partial<AircraftRegistry>) {
    return this.request<AircraftRegistry>(`/api/flight-operations/aircraft/${aircraftId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteAircraft(aircraftId: number) {
    return this.request<AircraftRegistry>(`/api/flight-operations/aircraft/${aircraftId}`, { method: 'DELETE' });
  }

  async timelineBlocks() {
    return this.request<TimelineBlock[]>('/api/timeline-blocks');
  }

  async createCrewStatusBlock(payload: CreateCrewStatusBlockRequest) {
    return this.request<TimelineBlock>('/api/timeline-blocks/crew-status', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCrewStatusBlock(blockId: number, payload: CreateCrewStatusBlockRequest) {
    return this.request<TimelineBlock>(`/api/timeline-blocks/crew-status/${blockId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCrewStatusBlock(blockId: number) {
    return this.request<number>(`/api/timeline-blocks/crew-status/${blockId}`, {
      method: 'DELETE',
    });
  }

  async ganttTimeline(query: GanttTimelineQuery) {
    const params = new URLSearchParams({
      windowStartUtc: query.windowStartUtc,
      windowEndUtc: query.windowEndUtc,
      viewMode: query.viewMode,
    });
    return this.request<GanttTimelineBlock[]>(`/api/gantt-timeline?${params.toString()}`);
  }

  async assignmentTask(taskId: number) {
    return this.request<AssignmentTaskDetail>(`/api/assignments/tasks/${taskId}`);
  }

  async saveAssignmentDraft(taskId: number, payload: SaveAssignmentDraftRequest) {
    return this.request<SaveAssignmentDraftResponse>(`/api/assignments/tasks/${taskId}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async clearAssignmentDraft(taskId: number) {
    return this.request<ClearAssignmentDraftResponse>(`/api/assignments/tasks/${taskId}/draft`, {
      method: 'DELETE',
    });
  }

  async validationPublishSummary() {
    return this.request<ValidationPublishSummary>('/api/rostering-workbench/validation-publish');
  }

  async runValidationPublishCheck() {
    return this.request<ValidationPublishSummary>('/api/rostering-workbench/validation-publish/validate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async publishRoster(managerConfirmed: boolean) {
    return this.request<ValidationPublishSummary>('/api/rostering-workbench/validation-publish/publish', {
      method: 'POST',
      body: JSON.stringify({ managerConfirmed }),
    });
  }

  async runDayAdjustments() {
    return this.request<RunDayAdjustment[]>('/api/rostering-workbench/run-day-adjustments');
  }

  async createRunDayAdjustment(payload: CreateRunDayAdjustmentRequest) {
    return this.request<RunDayAdjustment>('/api/rostering-workbench/run-day-adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async applyRunDayAdjustment(adjustmentId: number) {
    return this.request<RunDayAdjustment>(`/api/rostering-workbench/run-day-adjustments/${adjustmentId}/apply`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async archiveCases() {
    return this.request<ArchiveCase[]>('/api/archive/cases');
  }

  async syncArchiveState() {
    return this.request<{ archiveCaseCount: number }>('/api/archive/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async archiveCase(archiveCaseId: number) {
    return this.request<ArchiveCaseDetail>(`/api/archive/cases/${archiveCaseId}`);
  }

  async saveArchiveForm(formId: number, payload: SaveCrewArchiveFormRequest) {
    return this.request<SaveCrewArchiveFormResponse>(`/api/archive/forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async rules() {
    return this.request<RuleCatalog[]>('/api/rules');
  }

  async ruleRecentHits(ruleId: string) {
    return this.request<RuleRecentHit[]>(`/api/rules/${encodeURIComponent(ruleId)}/recent-hits`);
  }

  async updateRuleActive(ruleId: string, active: boolean) {
    return this.request<RuleCatalog>(`/api/rules/${encodeURIComponent(ruleId)}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  }

  async userPreferences() {
    return this.request<UserPreference>('/api/users/me/preferences');
  }

  async updateUserPreferences(preference: Pick<UserPreference, 'language' | 'displayTimezone'>) {
    return this.request<UserPreference>('/api/users/me/preferences', {
      method: 'PUT',
      body: JSON.stringify(preference),
    });
  }

  private async request<T>(path: string, init: RequestInit = {}, authorized = true) {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (authorized && this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(path, { ...init, headers });
    if (response.status === 401) {
      this.onUnauthorized();
      throw new Error('Unauthorized');
    }

    if (response.status === 403) {
      throw new Error('Forbidden');
    }

    if (!response.ok) {
      let detail = '';
      const contentType = response.headers.get('content-type') ?? '';
      try {
        if (contentType.includes('application/json')) {
          const payload = await response.json() as { message?: string; error?: string };
          detail = payload.message ?? payload.error ?? '';
        } else {
          detail = await response.text();
        }
      } catch {
        detail = '';
      }
      throw new Error(detail || `Request failed: ${response.status}`);
    }

    const payload = (await response.json()) as ApiResponse<T>;
    return payload.data;
  }
}
