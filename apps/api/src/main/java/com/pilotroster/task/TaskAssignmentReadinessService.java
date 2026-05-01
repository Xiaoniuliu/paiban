package com.pilotroster.task;

import com.pilotroster.assignment.AssignmentEligibilityService;
import com.pilotroster.crew.CrewMember;
import com.pilotroster.crew.CrewMemberRepository;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentCrewReadinessResponse;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentReadinessResponse;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentRequirementResponse;
import com.pilotroster.task.TaskAssignmentReadinessDtos.TaskAssignmentTaskReadinessResponse;
import com.pilotroster.timeline.TimelineBlock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskAssignmentReadinessService {

    private final TaskPlanItemRepository taskPlanItemRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final AssignmentEligibilityService assignmentEligibilityService;

    public TaskAssignmentReadinessService(
        TaskPlanItemRepository taskPlanItemRepository,
        CrewMemberRepository crewMemberRepository,
        AssignmentEligibilityService assignmentEligibilityService
    ) {
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.crewMemberRepository = crewMemberRepository;
        this.assignmentEligibilityService = assignmentEligibilityService;
    }

    @Transactional(readOnly = true)
    public TaskAssignmentReadinessResponse readiness() {
        Instant now = Instant.now();
        Map<Long, TimelineBlock> activeStatusBlockByCrewId = assignmentEligibilityService.activeStatusBlockByCrewId(now);
        return new TaskAssignmentReadinessResponse(
            taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc().stream()
                .map(this::toTaskReadiness)
                .toList(),
            crewMemberRepository.findAll().stream()
                .sorted(Comparator.comparing(CrewMember::getCrewCode))
                .map((crew) -> toCrewReadiness(crew, activeStatusBlockByCrewId))
                .toList()
        );
    }

    private TaskAssignmentTaskReadinessResponse toTaskReadiness(TaskPlanItem task) {
        boolean requiresCrewAssignment = assignmentEligibilityService.requiresCrewAssignment(task);
        return new TaskAssignmentTaskReadinessResponse(
            task.getId(),
            task.getTaskCode(),
            requiresCrewAssignment,
            requiresCrewAssignment ? assignmentRequirements(task) : List.of()
        );
    }

    private List<TaskAssignmentRequirementResponse> assignmentRequirements(TaskPlanItem task) {
        return assignmentEligibilityService.requirements(task).stream()
            .map(requirement -> new TaskAssignmentRequirementResponse(
                requirement.assignmentRole(),
                requirement.requiredRoleCode(),
                requirement.requiredQualificationCode()
            ))
            .toList();
    }

    private TaskAssignmentCrewReadinessResponse toCrewReadiness(CrewMember crew, Map<Long, TimelineBlock> activeStatusBlockByCrewId) {
        AssignmentEligibilityService.CurrentAvailability availability = assignmentEligibilityService.currentAvailability(crew, activeStatusBlockByCrewId);
        return new TaskAssignmentCrewReadinessResponse(
            crew.getId(),
            crew.getCrewCode(),
            crew.getNameZh(),
            crew.getNameEn(),
            crew.getRoleCode(),
            crew.getHomeBase(),
            crew.getAircraftQualification(),
            availability.availableForAssignmentNow(),
            availability.unavailableBlockType(),
            availability.unavailableUntilUtc()
        );
    }
}
