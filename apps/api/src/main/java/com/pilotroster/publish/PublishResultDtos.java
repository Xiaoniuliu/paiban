package com.pilotroster.publish;

import com.pilotroster.workbench.ValidationPublishDtos.ValidationPublishSummaryResponse;
import java.time.Instant;
import java.util.List;

public final class PublishResultDtos {

    private PublishResultDtos() {
    }

    public record PublishResultsResponse(
        ValidationPublishSummaryResponse summary,
        List<PublishedFlightResultRow> flightResults,
        List<PublishedCrewResultRow> crewResults
    ) {
    }

    public record PublishedFlightResultRow(
        Long taskId,
        String taskCode,
        String route,
        Instant scheduledStartUtc,
        Instant scheduledEndUtc,
        String aircraftType,
        String aircraftNo,
        String taskStatus,
        List<PublishedFlightAssignment> crewAssignments
    ) {
    }

    public record PublishedFlightAssignment(
        Long crewId,
        String crewCode,
        String crewNameZh,
        String crewNameEn,
        String assignmentRole,
        Integer displayOrder
    ) {
    }

    public record PublishedCrewResultRow(
        Long crewId,
        String crewCode,
        String nameZh,
        String nameEn,
        int publishedTaskCount,
        List<PublishedCrewTaskRow> tasks
    ) {
    }

    public record PublishedCrewTaskRow(
        Long taskId,
        String taskCode,
        String route,
        Instant scheduledStartUtc,
        Instant scheduledEndUtc,
        String taskStatus,
        String assignmentRole,
        Integer displayOrder
    ) {
    }

    public record PublishExportResponse(
        String view,
        String fileName,
        String csv
    ) {
    }
}
