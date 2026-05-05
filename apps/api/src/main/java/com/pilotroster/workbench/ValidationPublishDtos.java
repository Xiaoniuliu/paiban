package com.pilotroster.workbench;

import java.time.Instant;
import java.util.List;

public class ValidationPublishDtos {

    public record ValidationIssueListResponse(
        Long rosterVersionId,
        String rosterVersionNo,
        String rosterVersionStatus,
        int blockedCount,
        int warningCount,
        List<ValidationIssueResponse> issues
    ) {
    }

    public record ValidationPublishSummaryResponse(
        Long rosterVersionId,
        String rosterVersionNo,
        String rosterVersionStatus,
        Instant validatedAtUtc,
        Instant publishedAtUtc,
        int totalTasks,
        int assignedTasks,
        int draftAssignedTasks,
        int unassignedTasks,
        int publishedTasks,
        int blockedCount,
        int warningCount,
        int publishableTasks,
        boolean canPublish,
        boolean managerConfirmationRequired,
        List<String> inactiveRuleIds,
        List<ValidationIssueResponse> issues
    ) {
    }

    public record ValidationIssueResponse(
        String id,
        Long hitId,
        Long taskId,
        Long crewId,
        Long timelineBlockId,
        String targetType,
        Long targetId,
        String taskCode,
        String route,
        Instant startUtc,
        Instant endUtc,
        String severity,
        String ruleId,
        String ruleTitle,
        String ruleTitleZh,
        String ruleTitleEn,
        String message,
        String actionType,
        String status,
        Instant evidenceWindowStartUtc,
        Instant evidenceWindowEndUtc,
        String evidenceJson
    ) {
    }

    public record PublishRosterRequest(
        boolean managerConfirmed
    ) {
    }
}
