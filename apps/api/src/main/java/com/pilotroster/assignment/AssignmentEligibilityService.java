package com.pilotroster.assignment;

import com.pilotroster.crew.CrewMember;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AssignmentEligibilityService {

    public static final String ROLE_PIC = "PIC";
    public static final String ROLE_FO = "FO";
    public static final String ROLE_RELIEF = "RELIEF";
    public static final String ROLE_EXTRA = "EXTRA";

    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String TASK_TYPE_FLIGHT = "FLIGHT";
    private static final Set<String> CREW_STATUS_BLOCK_TYPES = Set.of(
        "POSITIONING",
        "STANDBY",
        "DUTY",
        "TRAINING",
        "REST",
        "DDO",
        "RECOVERY"
    );

    private final TimelineBlockRepository timelineBlockRepository;

    public AssignmentEligibilityService(TimelineBlockRepository timelineBlockRepository) {
        this.timelineBlockRepository = timelineBlockRepository;
    }

    public boolean requiresCrewAssignment(TaskPlanItem task) {
        return TASK_TYPE_FLIGHT.equals(normalized(task.getTaskType()))
            && !STATUS_CANCELLED.equals(normalized(task.getStatus()));
    }

    public List<AssignmentRequirement> requirements(TaskPlanItem task) {
        if (!requiresCrewAssignment(task)) {
            return List.of();
        }
        String qualificationCode = blankToNull(task.getAircraftType());
        return List.of(normalized(task.getRequiredCrewPattern()).split("\\+")).stream()
            .map(String::trim)
            .filter((token) -> !token.isBlank())
            .map((assignmentRole) -> new AssignmentRequirement(
                assignmentRole,
                requiredRoleCode(assignmentRole),
                qualificationCode
            ))
            .toList();
    }

    public EligibilityResult eligibility(TaskPlanItem task, CrewMember crew, String assignmentRole) {
        return eligibility(task, crew, assignmentRole, task.getId());
    }

    public EligibilityResult eligibility(
        TaskPlanItem task,
        CrewMember crew,
        String assignmentRole,
        Long ignoredTaskPlanItemId
    ) {
        return eligibility(task, crew, assignmentRole, ignoredTaskPlanItemId, taskWindowBlocks(task));
    }

    public EligibilityResult eligibility(
        TaskPlanItem task,
        CrewMember crew,
        String assignmentRole,
        Long ignoredTaskPlanItemId,
        List<TimelineBlock> taskWindowBlocks
    ) {
        List<String> reasonCodes = new ArrayList<>();
        if (!"ACTIVE".equals(normalized(crew.getStatus()))) {
            reasonCodes.add("CREW_INACTIVE");
        }
        if (!"AVAILABLE".equals(normalized(crew.getAvailabilityStatus()))) {
            reasonCodes.add("CREW_UNAVAILABLE");
        }
        String requiredRoleCode = requiredRoleCode(assignmentRole);
        if (requiredRoleCode != null && !requiredRoleCode.equals(normalized(crew.getRoleCode()))) {
            reasonCodes.add("ROLE_MISMATCH");
        }
        String taskAircraftType = normalized(task.getAircraftType());
        if (!taskAircraftType.isBlank() && !taskAircraftType.equals(normalized(crew.getAircraftQualification()))) {
            reasonCodes.add("QUALIFICATION_MISMATCH");
        }
        if (hasTaskWindowConflict(crew, ignoredTaskPlanItemId, taskWindowBlocks)) {
            reasonCodes.add("TIME_CONFLICT");
        }
        return new EligibilityResult(reasonCodes.isEmpty(), reasonCodes);
    }

    public CurrentAvailability currentAvailability(CrewMember crew, Instant now) {
        return currentAvailability(crew, activeStatusBlockByCrewId(now));
    }

    public CurrentAvailability currentAvailability(CrewMember crew, Map<Long, TimelineBlock> activeStatusBlockByCrewId) {
        if (!"ACTIVE".equals(normalized(crew.getStatus())) || !"AVAILABLE".equals(normalized(crew.getAvailabilityStatus()))) {
            return new CurrentAvailability(false, null, null);
        }
        TimelineBlock block = activeStatusBlockByCrewId.get(crew.getId());
        return new CurrentAvailability(
            block == null,
            block == null ? null : normalized(block.getBlockType()),
            block == null ? null : block.getEndUtc()
        );
    }

    public List<TimelineBlock> taskWindowBlocks(TaskPlanItem task) {
        return timelineBlockRepository.findAllByEndUtcAfterAndStartUtcBeforeOrderByStartUtcAsc(
            task.getScheduledStartUtc(),
            task.getScheduledEndUtc()
        );
    }

    private boolean hasTaskWindowConflict(CrewMember crew, Long ignoredTaskPlanItemId, List<TimelineBlock> taskWindowBlocks) {
        for (TimelineBlock block : taskWindowBlocks) {
            if (!crew.getId().equals(block.getCrewMemberId())) {
                continue;
            }
            if (ignoredTaskPlanItemId != null && ignoredTaskPlanItemId.equals(block.getTaskPlanItemId())) {
                continue;
            }
            if (STATUS_CANCELLED.equals(normalized(block.getStatus()))) {
                continue;
            }
            if (block.getTaskPlanItemId() != null || CREW_STATUS_BLOCK_TYPES.contains(normalized(block.getBlockType()))) {
                return true;
            }
        }
        return false;
    }

    public Map<Long, TimelineBlock> activeStatusBlockByCrewId(Instant now) {
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

    private String requiredRoleCode(String assignmentRole) {
        return switch (normalized(assignmentRole)) {
            case ROLE_PIC -> "CAPTAIN";
            case ROLE_FO -> "FIRST_OFFICER";
            default -> null;
        };
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    public record AssignmentRequirement(
        String assignmentRole,
        String requiredRoleCode,
        String requiredQualificationCode
    ) {
    }

    public record EligibilityResult(
        boolean eligible,
        List<String> reasonCodes
    ) {
    }

    public record CurrentAvailability(
        boolean availableForAssignmentNow,
        String unavailableBlockType,
        Instant unavailableUntilUtc
    ) {
    }
}
