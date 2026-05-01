package com.pilotroster.task;

import com.pilotroster.crew.CrewMember;
import com.pilotroster.crew.CrewMemberRepository;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentCrewReadinessResponse;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentReadinessResponse;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentRequirementResponse;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentTaskReadinessResponse;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskAssignmentReadinessService {

    private static final Set<String> CREW_STATUS_BLOCK_TYPES = Set.of(
        "POSITIONING",
        "STANDBY",
        "DUTY",
        "TRAINING",
        "REST",
        "DDO",
        "RECOVERY"
    );

    private final TaskPlanItemRepository taskPlanItemRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final TimelineBlockRepository timelineBlockRepository;

    public TaskAssignmentReadinessService(
        TaskPlanItemRepository taskPlanItemRepository,
        CrewMemberRepository crewMemberRepository,
        TimelineBlockRepository timelineBlockRepository
    ) {
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.crewMemberRepository = crewMemberRepository;
        this.timelineBlockRepository = timelineBlockRepository;
    }

    @Transactional(readOnly = true)
    public TaskAssignmentReadinessResponse readiness() {
        Instant now = Instant.now();
        Map<Long, TimelineBlock> activeStatusBlockByCrewId = activeStatusBlockByCrewId(now);
        return new TaskAssignmentReadinessResponse(
            taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc().stream()
                .map(this::toTaskReadiness)
                .toList(),
            crewMemberRepository.findAll().stream()
                .sorted(Comparator.comparing(CrewMember::getCrewCode))
                .map((crew) -> toCrewReadiness(crew, activeStatusBlockByCrewId.get(crew.getId())))
                .toList()
        );
    }

    private Map<Long, TimelineBlock> activeStatusBlockByCrewId(Instant now) {
        Map<Long, TimelineBlock> blocksByCrewId = new LinkedHashMap<>();
        for (TimelineBlock block : timelineBlockRepository.findAllByEndUtcAfterAndStartUtcBeforeOrderByStartUtcAsc(now, now)) {
            if (block.getCrewMemberId() == null
                || block.getTaskPlanItemId() != null
                || !CREW_STATUS_BLOCK_TYPES.contains(normalized(block.getBlockType()))
                || blocksByCrewId.containsKey(block.getCrewMemberId())) {
                continue;
            }
            blocksByCrewId.put(block.getCrewMemberId(), block);
        }
        return blocksByCrewId;
    }

    private TaskAssignmentTaskReadinessResponse toTaskReadiness(TaskPlanItem task) {
        boolean requiresCrewAssignment = requiresCrewAssignment(task);
        return new TaskAssignmentTaskReadinessResponse(
            task.getId(),
            task.getTaskCode(),
            requiresCrewAssignment,
            requiresCrewAssignment ? assignmentRequirements(task) : List.of()
        );
    }

    private List<TaskAssignmentRequirementResponse> assignmentRequirements(TaskPlanItem task) {
        String qualificationCode = blankToNull(task.getAircraftType());
        return List.of(normalized(task.getRequiredCrewPattern()).split("\\+")).stream()
            .map(String::trim)
            .filter((token) -> !token.isBlank())
            .map((assignmentRole) -> new TaskAssignmentRequirementResponse(
                assignmentRole,
                requiredRoleCode(assignmentRole),
                qualificationCode
            ))
            .toList();
    }

    private TaskAssignmentCrewReadinessResponse toCrewReadiness(CrewMember crew, TimelineBlock activeStatusBlock) {
        boolean availableForAssignmentNow = isAssignableCrewState(crew) && activeStatusBlock == null;
        return new TaskAssignmentCrewReadinessResponse(
            crew.getId(),
            crew.getCrewCode(),
            crew.getNameZh(),
            crew.getNameEn(),
            crew.getRoleCode(),
            crew.getHomeBase(),
            crew.getAircraftQualification(),
            availableForAssignmentNow,
            activeStatusBlock == null ? null : normalized(activeStatusBlock.getBlockType()),
            activeStatusBlock == null ? null : activeStatusBlock.getEndUtc()
        );
    }

    private boolean requiresCrewAssignment(TaskPlanItem task) {
        return "FLIGHT".equals(normalized(task.getTaskType()))
            && !"CANCELLED".equals(normalized(task.getStatus()));
    }

    private String requiredRoleCode(String assignmentRole) {
        return switch (assignmentRole) {
            case "PIC" -> "CAPTAIN";
            case "FO" -> "FIRST_OFFICER";
            default -> null;
        };
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private boolean isAssignableCrewState(CrewMember crew) {
        return "ACTIVE".equals(normalized(crew.getStatus()))
            && "AVAILABLE".equals(normalized(crew.getAvailabilityStatus()));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
