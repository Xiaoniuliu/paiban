package com.pilotroster.assignment;

import com.pilotroster.assignment.AssignmentDtos.AssignmentCrewCandidateResponse;
import com.pilotroster.assignment.AssignmentDtos.AssignmentCrewAssignmentResponse;
import com.pilotroster.assignment.AssignmentDtos.AdditionalAssignmentRequest;
import com.pilotroster.assignment.AssignmentDtos.AssignmentRequirementResponse;
import com.pilotroster.assignment.AssignmentDtos.AssignmentTaskDetailResponse;
import com.pilotroster.assignment.AssignmentDtos.AssignmentTaskResponse;
import com.pilotroster.assignment.AssignmentDtos.AssignmentTimelineBlockResponse;
import com.pilotroster.assignment.AssignmentDtos.ClearAssignmentDraftResponse;
import com.pilotroster.assignment.AssignmentDtos.DraftRosteringTaskListResponse;
import com.pilotroster.assignment.AssignmentDtos.DraftRosteringTaskSummaryResponse;
import com.pilotroster.assignment.AssignmentDtos.SaveAssignmentDraftRequest;
import com.pilotroster.assignment.AssignmentDtos.SaveAssignmentDraftResponse;
import com.pilotroster.archive.FlightArchiveCaseRepository;
import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.auth.UserRole;
import com.pilotroster.crew.CrewMember;
import com.pilotroster.crew.CrewMemberRepository;
import com.pilotroster.framework.AuditLogService;
import com.pilotroster.framework.DomainEventService;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AssignmentService {

    private static final String DRAFT_ASSIGNED_STATUS = "ASSIGNED_DRAFT";
    private static final String STATUS_UNASSIGNED = "UNASSIGNED";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String BLOCK_FLIGHT_TYPE = "FLIGHT";
    private static final String BLOCK_DRAFT_STATUS = "ASSIGNED_DRAFT";
    private static final String ROLE_PIC = "PIC";
    private static final String ROLE_FO = "FO";
    private static final String ROLE_RELIEF = "RELIEF";
    private static final String ROLE_EXTRA = "EXTRA";

    private final TaskPlanItemRepository taskPlanItemRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final TimelineBlockRepository timelineBlockRepository;
    private final AssignmentEligibilityService assignmentEligibilityService;
    private final FlightArchiveCaseRepository archiveCaseRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AuditLogService auditLogService;
    private final DomainEventService domainEventService;

    public AssignmentService(
        TaskPlanItemRepository taskPlanItemRepository,
        CrewMemberRepository crewMemberRepository,
        TimelineBlockRepository timelineBlockRepository,
        AssignmentEligibilityService assignmentEligibilityService,
        FlightArchiveCaseRepository archiveCaseRepository,
        JdbcTemplate jdbcTemplate,
        AuditLogService auditLogService,
        DomainEventService domainEventService
    ) {
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.crewMemberRepository = crewMemberRepository;
        this.timelineBlockRepository = timelineBlockRepository;
        this.assignmentEligibilityService = assignmentEligibilityService;
        this.archiveCaseRepository = archiveCaseRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.auditLogService = auditLogService;
        this.domainEventService = domainEventService;
    }

    @Transactional(readOnly = true)
    public AssignmentTaskDetailResponse taskDetail(Long taskId, AuthenticatedUser user) {
        TaskPlanItem task = task(taskId);
        Long rosterVersionId = draftRosterVersionId();
        List<TimelineBlock> blocks = sortedBlocks(timelineBlockRepository
            .findAllByTaskPlanItemIdAndRosterVersionIdOrderByIdAsc(task.getId(), rosterVersionId));
        List<CrewMember> crewMembers = crewMemberRepository.findAll();
        Map<Long, CrewMember> crewById = crewMembers.stream()
            .collect(Collectors.toMap(CrewMember::getId, Function.identity()));
        return toDetail(task, blocks, crewMembers, crewById, user);
    }

    @Transactional(readOnly = true)
    public DraftRosteringTaskListResponse draftRosteringTasks(AuthenticatedUser user) {
        List<TaskPlanItem> draftTasks = taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc().stream()
            .filter(task -> STATUS_UNASSIGNED.equals(task.getStatus()) || DRAFT_ASSIGNED_STATUS.equals(task.getStatus()))
            .sorted(Comparator
                .comparing((TaskPlanItem task) -> DRAFT_ASSIGNED_STATUS.equals(task.getStatus()) ? 1 : 0)
                .thenComparing(TaskPlanItem::getScheduledStartUtc)
                .thenComparing(TaskPlanItem::getId))
            .toList();
        Set<Long> archivedTaskIds = archiveCaseRepository.findAllByFlightIdIn(
                draftTasks.stream().map(TaskPlanItem::getId).toList()
            ).stream()
            .map(com.pilotroster.archive.FlightArchiveCase::getFlightId)
            .collect(Collectors.toSet());
        List<DraftRosteringTaskSummaryResponse> tasks = draftTasks.stream()
            .map(task -> {
                DraftEditDecision decision = draftDecision(task, user, archivedTaskIds.contains(task.getId()));
                return new DraftRosteringTaskSummaryResponse(
                    task.getId(),
                    task.getTaskCode(),
                    task.getDepartureAirport(),
                    task.getArrivalAirport(),
                    task.getScheduledStartUtc(),
                    task.getScheduledEndUtc(),
                    task.getSectorCount(),
                    task.getStatus(),
                    task.getRequiredCrewPattern(),
                    canOpenAssignment(user),
                    decision.canEditDraft(),
                    decision.canClearDraft(),
                    decision.blockedReason()
                );
            })
            .toList();
        return new DraftRosteringTaskListResponse(tasks);
    }

    @Transactional
    public SaveAssignmentDraftResponse saveDraft(Long taskId, SaveAssignmentDraftRequest request, AuthenticatedUser user) {
        TaskPlanItem task = task(taskId);
        if (STATUS_PUBLISHED.equals(task.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Published flights must be changed through run-day adjustments");
        }
        if (STATUS_CANCELLED.equals(task.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancelled flights cannot be assigned");
        }
        if (archiveCaseRepository.existsByFlightId(task.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Archived flights must be handled from Archive Entry");
        }
        CrewMember pic = crew(request.picCrewId());
        CrewMember fo = crew(request.foCrewId());
        List<DesiredAssignment> desiredAssignments = desiredAssignments(pic, fo, request.additionalAssignments());
        List<TimelineBlock> taskWindowBlocks = assignmentEligibilityService.taskWindowBlocks(task);
        validateAssignments(task, desiredAssignments, taskWindowBlocks);

        Long rosterVersionId = draftRosterVersionId();
        List<TimelineBlock> existingBlocks = timelineBlockRepository
            .findAllByTaskPlanItemIdAndRosterVersionIdOrderByIdAsc(task.getId(), rosterVersionId);
        timelineBlockRepository.deleteAll(existingBlocks);
        List<TimelineBlock> nextBlocks = createDraftBlocks(task, rosterVersionId, desiredAssignments);

        task.setStatus(DRAFT_ASSIGNED_STATUS);
        taskPlanItemRepository.save(task);

        auditLogService.recordAndReturnId(
            user.id(),
            "ASSIGNMENT_DRAFT_SAVED",
            "TaskPlanItem",
            task.getId().toString(),
            "SUCCESS"
        );
        domainEventService.record("AssignmentDraftSaved", "TaskPlanItem", task.getId().toString(), "{}");

        return new SaveAssignmentDraftResponse(
            toTaskResponse(task),
            nextBlocks.stream().map(this::toBlockResponse).toList(),
            task.getScheduledStartUtc(),
            task.getScheduledEndUtc(),
            desiredAssignments.stream().map(assignment -> assignment.crew().getId()).toList(),
            List.of(task.getId()),
            "OK"
        );
    }

    @Transactional
    public ClearAssignmentDraftResponse clearDraft(Long taskId, AuthenticatedUser user) {
        TaskPlanItem task = task(taskId);
        if (!DRAFT_ASSIGNED_STATUS.equals(task.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only draft assignments can be cleared");
        }
        if (archiveCaseRepository.existsByFlightId(task.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Archived flights must be handled from Archive Entry");
        }

        Long rosterVersionId = draftRosterVersionId();
        List<TimelineBlock> existingBlocks = timelineBlockRepository
            .findAllByTaskPlanItemIdAndRosterVersionIdOrderByIdAsc(task.getId(), rosterVersionId);
        List<Long> affectedCrewIds = existingBlocks.stream()
            .map(TimelineBlock::getCrewMemberId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();

        timelineBlockRepository.deleteAll(existingBlocks);
        task.setStatus(STATUS_UNASSIGNED);
        taskPlanItemRepository.save(task);

        auditLogService.recordAndReturnId(
            user.id(),
            "ASSIGNMENT_DRAFT_CLEARED",
            "TaskPlanItem",
            task.getId().toString(),
            "SUCCESS"
        );
        domainEventService.record("AssignmentDraftCleared", "TaskPlanItem", task.getId().toString(), "{}");

        return new ClearAssignmentDraftResponse(
            toTaskResponse(task),
            affectedCrewIds,
            List.of(task.getId())
        );
    }

    private List<TimelineBlock> createDraftBlocks(
        TaskPlanItem task,
        Long rosterVersionId,
        List<DesiredAssignment> assignments
    ) {
        List<TimelineBlock> saved = new ArrayList<>();
        for (DesiredAssignment assignment : assignments) {
            TimelineBlock block = new TimelineBlock();
            block.setRosterVersionId(rosterVersionId);
            block.setCrewMemberId(assignment.crew().getId());
            block.setTaskPlanItemId(task.getId());
            block.setBlockType(BLOCK_FLIGHT_TYPE);
            block.setStartUtc(task.getScheduledStartUtc());
            block.setEndUtc(task.getScheduledEndUtc());
            block.setDisplayLabel(displayLabel(task));
            block.setStatus(BLOCK_DRAFT_STATUS);
            block.setAssignmentRole(assignment.assignmentRole());
            block.setDisplayOrder(assignment.displayOrder());
            saved.add(timelineBlockRepository.save(block));
        }
        return saved;
    }

    private AssignmentTaskDetailResponse toDetail(
        TaskPlanItem task,
        List<TimelineBlock> blocks,
        List<CrewMember> crewMembers,
        Map<Long, CrewMember> crewById,
        AuthenticatedUser user
    ) {
        Long selectedPicCrewId = selectedCrewId(blocks, crewById, ROLE_PIC, "CAPTAIN");
        Long selectedFoCrewId = selectedCrewId(blocks, crewById, ROLE_FO, "FIRST_OFFICER");
        boolean archiveExists = archiveCaseRepository.existsByFlightId(task.getId());
        boolean published = STATUS_PUBLISHED.equals(task.getStatus());
        boolean cancelled = STATUS_CANCELLED.equals(task.getStatus());
        boolean canEdit = user.role() == UserRole.DISPATCHER && !archiveExists && !published && !cancelled;
        boolean canClearDraft = canEdit && DRAFT_ASSIGNED_STATUS.equals(task.getStatus());
        List<TimelineBlock> taskWindowBlocks = assignmentEligibilityService.taskWindowBlocks(task);
        return new AssignmentTaskDetailResponse(
            toTaskResponse(task),
            selectedPicCrewId,
            selectedFoCrewId,
            candidates(task, crewMembers, ROLE_PIC, "CAPTAIN", taskWindowBlocks),
            candidates(task, crewMembers, ROLE_FO, "FIRST_OFFICER", taskWindowBlocks),
            allCandidates(task, crewMembers, taskWindowBlocks),
            blocks.stream().map(this::toCrewAssignmentResponse).toList(),
            blocks.stream().map(this::toBlockResponse).toList(),
            assignmentRequirements(task),
            canClearDraft,
            canEdit,
            canEdit ? null : readOnlyReason(user, archiveExists, published, cancelled)
        );
    }

    private Long selectedCrewId(List<TimelineBlock> blocks, Map<Long, CrewMember> crewById, String assignmentRole, String fallbackRoleCode) {
        return blocks.stream()
            .filter(block -> assignmentRole.equals(block.getAssignmentRole()) || block.getAssignmentRole() == null)
            .filter(block -> {
                if (assignmentRole.equals(block.getAssignmentRole())) {
                    return true;
                }
                CrewMember crew = crewById.get(block.getCrewMemberId());
                return crew != null && fallbackRoleCode.equals(crew.getRoleCode());
            })
            .map(TimelineBlock::getCrewMemberId)
            .findFirst()
            .orElse(null);
    }

    private List<AssignmentCrewCandidateResponse> candidates(
        TaskPlanItem task,
        List<CrewMember> crewMembers,
        String assignmentRole,
        String roleCode,
        List<TimelineBlock> taskWindowBlocks
    ) {
        return crewMembers.stream()
            .filter(crew -> roleCode.equals(crew.getRoleCode()))
            .sorted(Comparator.comparing(CrewMember::getCrewCode))
            .map(crew -> toCandidateResponse(task, crew, assignmentRole, taskWindowBlocks))
            .toList();
    }

    private List<AssignmentCrewCandidateResponse> allCandidates(
        TaskPlanItem task,
        List<CrewMember> crewMembers,
        List<TimelineBlock> taskWindowBlocks
    ) {
        return crewMembers.stream()
            .sorted(Comparator.comparing(CrewMember::getCrewCode))
            .map(crew -> toCandidateResponse(task, crew, ROLE_EXTRA, taskWindowBlocks))
            .toList();
    }

    private List<DesiredAssignment> desiredAssignments(CrewMember pic, CrewMember fo, List<AdditionalAssignmentRequest> additionalRequests) {
        List<DesiredAssignment> assignments = new ArrayList<>();
        assignments.add(new DesiredAssignment(pic, ROLE_PIC, 0));
        assignments.add(new DesiredAssignment(fo, ROLE_FO, 1));
        List<AdditionalAssignmentRequest> safeRequests = additionalRequests == null ? List.of() : additionalRequests;
        for (int index = 0; index < safeRequests.size(); index += 1) {
            AdditionalAssignmentRequest request = safeRequests.get(index);
            String role = normalizeAdditionalRole(request.assignmentRole());
            assignments.add(new DesiredAssignment(crew(request.crewId()), role, index + 2));
        }
        return assignments;
    }

    private void validateAssignments(
        TaskPlanItem task,
        List<DesiredAssignment> assignments,
        List<TimelineBlock> taskWindowBlocks
    ) {
        long uniqueCrewCount = assignments.stream()
            .map(assignment -> assignment.crew().getId())
            .distinct()
            .count();
        if (uniqueCrewCount != assignments.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Crew members cannot be assigned more than once");
        }
        for (DesiredAssignment assignment : assignments) {
            AssignmentEligibilityService.EligibilityResult eligibility = assignmentEligibilityService.eligibility(
                task,
                assignment.crew(),
                assignment.assignmentRole(),
                task.getId(),
                taskWindowBlocks
            );
            if (!eligibility.eligible()) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Crew is not eligible for assignment: " + String.join(",", eligibility.reasonCodes())
                );
            }
        }
    }

    private String normalizeAdditionalRole(String assignmentRole) {
        String normalized = assignmentRole == null ? "" : assignmentRole.trim().toUpperCase();
        if (ROLE_RELIEF.equals(normalized) || ROLE_EXTRA.equals(normalized)) {
            return normalized;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Additional crew role must be RELIEF or EXTRA");
    }

    private TaskPlanItem task(Long taskId) {
        return taskPlanItemRepository.findById(taskId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }

    private CrewMember crew(Long crewId) {
        if (crewId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Crew selection is required");
        }
        return crewMemberRepository.findById(crewId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Crew not found"));
    }

    private Long draftRosterVersionId() {
        List<Long> ids = jdbcTemplate.queryForList(
            "SELECT id FROM roster_version WHERE status = 'DRAFT' ORDER BY id DESC LIMIT 1",
            Long.class
        );
        if (ids.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Draft roster version not found");
        }
        return ids.get(0);
    }

    private String readOnlyReason(AuthenticatedUser user, boolean archiveExists, boolean published, boolean cancelled) {
        if (archiveExists) {
            return "ARCHIVE_CASE_EXISTS";
        }
        if (published) {
            return "PUBLISHED_LOCKED_RUN_DAY_ADJUSTMENT_REQUIRED";
        }
        if (cancelled) {
            return "CANCELLED_TASK";
        }
        if (user.role() != UserRole.DISPATCHER) {
            return "ROLE_READ_ONLY";
        }
        return null;
    }

    private boolean canOpenAssignment(AuthenticatedUser user) {
        return user.role() == UserRole.DISPATCHER || user.role() == UserRole.OPS_MANAGER || user.role() == UserRole.ADMIN;
    }

    private DraftEditDecision draftDecision(TaskPlanItem task, AuthenticatedUser user, boolean archiveExists) {
        boolean published = STATUS_PUBLISHED.equals(task.getStatus());
        boolean cancelled = STATUS_CANCELLED.equals(task.getStatus());
        boolean canEditDraft = user.role() == UserRole.DISPATCHER && !archiveExists && !published && !cancelled;
        return new DraftEditDecision(
            canEditDraft,
            canEditDraft && DRAFT_ASSIGNED_STATUS.equals(task.getStatus()),
            canEditDraft ? null : readOnlyReason(user, archiveExists, published, cancelled)
        );
    }

    private List<AssignmentRequirementResponse> assignmentRequirements(TaskPlanItem task) {
        return assignmentEligibilityService.requirements(task).stream()
            .map(requirement -> new AssignmentRequirementResponse(
                requirement.assignmentRole(),
                requirement.requiredRoleCode(),
                requirement.requiredQualificationCode()
            ))
            .toList();
    }

    private AssignmentTaskResponse toTaskResponse(TaskPlanItem task) {
        return new AssignmentTaskResponse(
            task.getId(),
            task.getBatchId(),
            task.getTaskCode(),
            task.getTaskType(),
            task.getDepartureAirport(),
            task.getArrivalAirport(),
            task.getScheduledStartUtc(),
            task.getScheduledEndUtc(),
            task.getSectorCount(),
            task.getStatus()
        );
    }

    private AssignmentCrewCandidateResponse toCandidateResponse(
        TaskPlanItem task,
        CrewMember crew,
        String assignmentRole,
        List<TimelineBlock> taskWindowBlocks
    ) {
        AssignmentEligibilityService.EligibilityResult eligibility = assignmentEligibilityService.eligibility(
            task,
            crew,
            assignmentRole,
            task.getId(),
            taskWindowBlocks
        );
        return new AssignmentCrewCandidateResponse(
            crew.getId(),
            crew.getCrewCode(),
            crew.getNameZh(),
            crew.getNameEn(),
            crew.getRoleCode(),
            crew.getHomeBase(),
            crew.getAircraftQualification(),
            crew.getRollingFlightHours28d(),
            crew.getRollingDutyHours28d(),
            eligibility.eligible(),
            eligibility.reasonCodes()
        );
    }

    private AssignmentTimelineBlockResponse toBlockResponse(TimelineBlock block) {
        return new AssignmentTimelineBlockResponse(
            block.getId(),
            block.getRosterVersionId(),
            block.getCrewMemberId(),
            block.getTaskPlanItemId(),
            block.getBlockType(),
            block.getStartUtc(),
            block.getEndUtc(),
            block.getDisplayLabel(),
            block.getStatus(),
            block.getAssignmentRole(),
            block.getDisplayOrder()
        );
    }

    private AssignmentCrewAssignmentResponse toCrewAssignmentResponse(TimelineBlock block) {
        return new AssignmentCrewAssignmentResponse(
            block.getId(),
            block.getCrewMemberId(),
            block.getAssignmentRole(),
            block.getDisplayOrder()
        );
    }

    private List<TimelineBlock> sortedBlocks(List<TimelineBlock> blocks) {
        return blocks.stream()
            .sorted(Comparator.comparing((TimelineBlock block) -> block.getDisplayOrder() == null ? 999 : block.getDisplayOrder())
                .thenComparing(TimelineBlock::getId))
            .toList();
    }

    private String displayLabel(TaskPlanItem task) {
        String route = route(task);
        return route.isBlank() ? task.getTaskCode() : task.getTaskCode() + " " + route;
    }

    private String route(TaskPlanItem task) {
        if (task.getDepartureAirport() == null || task.getArrivalAirport() == null) {
            return "";
        }
        return task.getDepartureAirport() + "-" + task.getArrivalAirport();
    }

    private record DesiredAssignment(
        CrewMember crew,
        String assignmentRole,
        int displayOrder
    ) {
    }

    private record DraftEditDecision(
        boolean canEditDraft,
        boolean canClearDraft,
        String blockedReason
    ) {
    }
}
