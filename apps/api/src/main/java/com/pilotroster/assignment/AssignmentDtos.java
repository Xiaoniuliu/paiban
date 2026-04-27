package com.pilotroster.assignment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class AssignmentDtos {

    private AssignmentDtos() {
    }

    public record AssignmentTaskResponse(
        Long id,
        Long batchId,
        String taskCode,
        String taskType,
        String departureAirport,
        String arrivalAirport,
        Instant scheduledStartUtc,
        Instant scheduledEndUtc,
        Integer sectorCount,
        String status
    ) {
    }

    public record AssignmentCrewCandidateResponse(
        Long id,
        String crewCode,
        String nameZh,
        String nameEn,
        String roleCode,
        String homeBase,
        String aircraftQualification,
        BigDecimal rollingFlightHours28d,
        BigDecimal rollingDutyHours28d
    ) {
    }

    public record AssignmentTimelineBlockResponse(
        Long id,
        Long rosterVersionId,
        Long crewMemberId,
        Long taskPlanItemId,
        String blockType,
        Instant startUtc,
        Instant endUtc,
        String displayLabel,
        String status,
        String assignmentRole,
        Integer displayOrder
    ) {
    }

    public record AssignmentCrewAssignmentResponse(
        Long timelineBlockId,
        Long crewId,
        String assignmentRole,
        Integer displayOrder
    ) {
    }

    public record AssignmentTaskDetailResponse(
        AssignmentTaskResponse task,
        Long selectedPicCrewId,
        Long selectedFoCrewId,
        List<AssignmentCrewCandidateResponse> picCandidates,
        List<AssignmentCrewCandidateResponse> foCandidates,
        List<AssignmentCrewCandidateResponse> additionalCandidates,
        List<AssignmentCrewAssignmentResponse> currentAssignments,
        List<AssignmentTimelineBlockResponse> timelineBlocks,
        boolean canEdit,
        String readOnlyReason
    ) {
    }

    public record AdditionalAssignmentRequest(
        Long crewId,
        String assignmentRole
    ) {
    }

    public record SaveAssignmentDraftRequest(
        Long picCrewId,
        Long foCrewId,
        List<AdditionalAssignmentRequest> additionalAssignments
    ) {
    }

    public record SaveAssignmentDraftResponse(
        AssignmentTaskResponse task,
        List<AssignmentTimelineBlockResponse> timelineBlocks,
        Instant affectedWindowStartUtc,
        Instant affectedWindowEndUtc,
        List<Long> affectedCrewIds,
        List<Long> affectedTaskIds,
        String validationSummary
    ) {
    }
}
