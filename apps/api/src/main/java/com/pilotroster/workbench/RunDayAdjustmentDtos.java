package com.pilotroster.workbench;

import java.time.Instant;

public final class RunDayAdjustmentDtos {

    private RunDayAdjustmentDtos() {
    }

    public record CreateRunDayAdjustmentRequest(
        Long taskId,
        String adjustmentType,
        Instant proposedStartUtc,
        Instant proposedEndUtc,
        Long fromCrewId,
        Long toCrewId,
        String assignmentRole,
        Instant effectiveStartUtc,
        Instant effectiveEndUtc,
        String reason
    ) {
    }

    public record RunDayAdjustmentResponse(
        Long id,
        Long taskId,
        String taskCode,
        String route,
        Instant scheduledStartUtc,
        Instant scheduledEndUtc,
        String adjustmentType,
        Instant proposedStartUtc,
        Instant proposedEndUtc,
        Long fromCrewId,
        Long toCrewId,
        String assignmentRole,
        Instant effectiveStartUtc,
        Instant effectiveEndUtc,
        String reason,
        String status,
        Instant createdAtUtc
    ) {
    }
}
