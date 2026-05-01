package com.pilotroster.task;

import java.time.Instant;
import java.util.List;

public final class TaskAssignmentReadinessDtos {

    private TaskAssignmentReadinessDtos() {
    }

    public record TaskAssignmentReadinessResponse(
        List<TaskAssignmentTaskReadinessResponse> tasks,
        List<TaskAssignmentCrewReadinessResponse> crews
    ) {
    }

    public record TaskAssignmentTaskReadinessResponse(
        Long taskId,
        String taskCode,
        boolean requiresCrewAssignment,
        List<TaskAssignmentRequirementResponse> assignmentRequirements
    ) {
    }

    public record TaskAssignmentRequirementResponse(
        String assignmentRole,
        String requiredRoleCode,
        String requiredQualificationCode
    ) {
    }

    public record TaskAssignmentCrewReadinessResponse(
        Long id,
        String crewCode,
        String nameZh,
        String nameEn,
        String roleCode,
        String homeBase,
        String aircraftQualification,
        boolean availableForAssignmentNow,
        String unavailableBlockType,
        Instant unavailableUntilUtc
    ) {
    }
}
