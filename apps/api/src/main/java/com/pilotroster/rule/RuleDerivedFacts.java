package com.pilotroster.rule;

import java.util.Map;

public record RuleDerivedFacts(
    Long rosterVersionId,
    Map<Long, CrewHourFact> crewHourFactsByCrewId,
    Map<Long, DdoFact> ddoFactsByBlockId,
    Map<Long, FdpRestFact> fdpRestFactsByTaskId
) {
    public RuleDerivedFacts {
        crewHourFactsByCrewId = Map.copyOf(crewHourFactsByCrewId);
        ddoFactsByBlockId = Map.copyOf(ddoFactsByBlockId);
        fdpRestFactsByTaskId = Map.copyOf(fdpRestFactsByTaskId);
    }

    public record CrewHourFact(
        Long crewId,
        long rolling7dDutyMinutes,
        long rolling14dDutyMinutes,
        long rolling28dDutyMinutes,
        long rolling28dFlightMinutes,
        long rolling12mToPreviousMonthFlightMinutes
    ) {
    }

    public record DdoFact(
        Long timelineBlockId,
        Long crewId,
        long ddoMinutes,
        int localNights,
        int consecutiveDutyDaysBefore,
        int consecutiveDdoAfter,
        boolean validDdoUnit,
        boolean restContributesToContinuousDdoSpan
    ) {
    }

    public record FdpRestFact(
        Long taskId,
        Long crewId,
        Integer startBand,
        long allowableFdpMinutes,
        long previousDutyMinutes,
        int restLocalNights,
        boolean reducedRest,
        boolean specialAssessmentPassed
    ) {
    }
}
