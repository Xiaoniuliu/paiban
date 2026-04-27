package com.pilotroster.archive;

import java.time.Instant;
import java.util.List;

public final class ArchiveDtos {

    private ArchiveDtos() {
    }

    public record CrewArchiveSummary(
        int total,
        int notStarted,
        int completed,
        int noFlyingHourConfirmed
    ) {
    }

    public record GanttTimelineBlockResponse(
        Long blockId,
        Long flightId,
        String blockType,
        Long crewId,
        String crewCode,
        String crewName,
        String displayLabel,
        String route,
        Instant startUtc,
        Instant endUtc,
        String taskStatus,
        String blockStatus,
        String assignmentRole,
        Integer displayOrder,
        Long archiveCaseId,
        String archiveStatus,
        Instant archiveDeadlineAtUtc,
        CrewArchiveSummary crewArchiveSummary,
        boolean canEditArchive,
        String archiveReadOnlyReason
    ) {
    }

    public record ArchiveCaseResponse(
        Long id,
        Long flightId,
        String taskCode,
        String route,
        Instant scheduledStartUtc,
        Instant scheduledEndUtc,
        String archiveStatus,
        Instant archiveDeadlineAtUtc,
        Instant archivedAtUtc,
        int completedCount,
        int totalCount,
        int revision,
        boolean canEditArchive,
        String archiveReadOnlyReason
    ) {
    }

    public record CrewArchiveFormResponse(
        Long id,
        Long archiveCaseId,
        Long flightId,
        Long crewId,
        String crewCode,
        String crewName,
        Instant actualDutyStartUtc,
        Instant actualDutyEndUtc,
        Instant actualFdpStartUtc,
        Instant actualFdpEndUtc,
        Integer flyingHourMinutes,
        boolean noFlyingHourFlag,
        String formStatus,
        Instant enteredAtUtc,
        Instant confirmedAtUtc,
        int revision,
        boolean canEdit
    ) {
    }

    public record ArchiveCaseDetailResponse(
        ArchiveCaseResponse archiveCase,
        List<CrewArchiveFormResponse> crewForms
    ) {
    }

    public record SaveCrewArchiveFormRequest(
        int expectedRevision,
        Instant actualDutyStartUtc,
        Instant actualDutyEndUtc,
        Instant actualFdpStartUtc,
        Instant actualFdpEndUtc,
        Integer flyingHourMinutes,
        Boolean noFlyingHourFlag
    ) {
    }

    public record SaveCrewArchiveFormResponse(
        CrewArchiveFormResponse crewArchiveForm,
        ArchiveCaseResponse archiveCase,
        Instant affectedWindowStartUtc,
        Instant affectedWindowEndUtc,
        List<Long> affectedCrewIds,
        List<Long> affectedFlightIds,
        String validationSummary,
        Long auditLogId
    ) {
    }

    public record PilotArchiveSummaryResponse(
        Long archiveCaseId,
        Long flightId,
        String taskCode,
        String route,
        Instant scheduledStartUtc,
        Instant scheduledEndUtc,
        String archiveStatus,
        String formStatus,
        Instant actualDutyStartUtc,
        Instant actualDutyEndUtc,
        Instant actualFdpStartUtc,
        Instant actualFdpEndUtc,
        Integer flyingHourMinutes,
        boolean noFlyingHourFlag
    ) {
    }
}
