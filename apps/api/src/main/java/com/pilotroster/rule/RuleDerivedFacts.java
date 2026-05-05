package com.pilotroster.rule;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record RuleDerivedFacts(
    Long rosterVersionId,
    Map<Long, CrewHourFact> crewHourFactsByCrewId,
    Map<Long, DdoFact> ddoFactsByBlockId,
    Map<Long, CrewDaySequenceFact> crewDaySequenceFactsByCrewId,
    Map<Long, DdoCrewSequenceFact> ddoSequenceFactsByCrewId,
    List<FdpRestFact> fdpRestFacts
) {
    public RuleDerivedFacts(
        Long rosterVersionId,
        Map<Long, CrewHourFact> crewHourFactsByCrewId,
        Map<Long, DdoFact> ddoFactsByBlockId,
        List<FdpRestFact> fdpRestFacts
    ) {
        this(
            rosterVersionId,
            crewHourFactsByCrewId,
            ddoFactsByBlockId,
            crewDaySequenceFactsFrom(ddoFactsByBlockId),
            ddoSequenceFactsFrom(ddoFactsByBlockId),
            fdpRestFacts
        );
    }

    public RuleDerivedFacts {
        crewHourFactsByCrewId = Map.copyOf(crewHourFactsByCrewId);
        ddoFactsByBlockId = Map.copyOf(ddoFactsByBlockId);
        crewDaySequenceFactsByCrewId = Map.copyOf(crewDaySequenceFactsByCrewId);
        ddoSequenceFactsByCrewId = Map.copyOf(ddoSequenceFactsByCrewId);
        fdpRestFacts = List.copyOf(fdpRestFacts);
    }

    public Map<Long, List<FdpRestFact>> fdpRestFactsByTaskId() {
        return fdpRestFacts.stream()
            .collect(Collectors.collectingAndThen(
                Collectors.groupingBy(
                    FdpRestFact::taskId,
                    LinkedHashMap::new,
                    Collectors.toList()
                ),
                groupedFacts -> {
                    Map<Long, List<FdpRestFact>> immutableGroupedFacts = new LinkedHashMap<>();
                    groupedFacts.forEach((taskId, facts) -> immutableGroupedFacts.put(taskId, List.copyOf(facts)));
                    return Map.copyOf(immutableGroupedFacts);
                }
            ));
    }

    public Map<Long, Map<Long, FdpRestFact>> fdpRestFactsByTaskIdAndCrewId() {
        return fdpRestFacts.stream()
            .collect(Collectors.collectingAndThen(
                Collectors.groupingBy(
                    FdpRestFact::taskId,
                    LinkedHashMap::new,
                    Collectors.toMap(
                        FdpRestFact::crewId,
                        fact -> fact,
                        (left, right) -> left,
                        LinkedHashMap::new
                    )
                ),
                groupedFacts -> {
                    Map<Long, Map<Long, FdpRestFact>> immutableGroupedFacts = new LinkedHashMap<>();
                    groupedFacts.forEach((taskId, factsByCrewId) ->
                        immutableGroupedFacts.put(taskId, Map.copyOf(factsByCrewId))
                    );
                    return Map.copyOf(immutableGroupedFacts);
                }
            ));
    }

    private static Map<Long, CrewDaySequenceFact> crewDaySequenceFactsFrom(Map<Long, DdoFact> ddoFactsByBlockId) {
        if (ddoFactsByBlockId instanceof DdoFactBuilder.DdoFactBuildResult ddoFactBuildResult) {
            return ddoFactBuildResult.crewDaySequenceFactsByCrewId();
        }
        return Map.of();
    }

    private static Map<Long, DdoCrewSequenceFact> ddoSequenceFactsFrom(Map<Long, DdoFact> ddoFactsByBlockId) {
        if (ddoFactsByBlockId instanceof DdoFactBuilder.DdoFactBuildResult ddoFactBuildResult) {
            return ddoFactBuildResult.ddoSequenceFactsByCrewId();
        }
        return Map.of();
    }

    public record CrewHourFact(
        Long crewId,
        long rolling7dDutyMinutes,
        long rolling14dDutyMinutes,
        long rolling28dDutyMinutes,
        long rolling28dFlightMinutes,
        long rolling12mToPreviousMonthFlightMinutes,
        CrewHourWindow rolling7dDutyWindow,
        CrewHourWindow rolling14dDutyWindow,
        CrewHourWindow rolling28dDutyWindow,
        CrewHourWindow rolling28dFlightWindow,
        CrewHourWindow rolling12mToPreviousMonthFlightWindow
    ) {
        public CrewHourFact(
            Long crewId,
            long rolling7dDutyMinutes,
            long rolling14dDutyMinutes,
            long rolling28dDutyMinutes,
            long rolling28dFlightMinutes,
            long rolling12mToPreviousMonthFlightMinutes
        ) {
            this(
                crewId,
                rolling7dDutyMinutes,
                rolling14dDutyMinutes,
                rolling28dDutyMinutes,
                rolling28dFlightMinutes,
                rolling12mToPreviousMonthFlightMinutes,
                CrewHourWindow.empty(rolling7dDutyMinutes),
                CrewHourWindow.empty(rolling14dDutyMinutes),
                CrewHourWindow.empty(rolling28dDutyMinutes),
                CrewHourWindow.empty(rolling28dFlightMinutes),
                CrewHourWindow.empty(rolling12mToPreviousMonthFlightMinutes)
            );
        }
    }

    public record CrewHourWindow(
        Instant startUtc,
        Instant endUtc,
        long actualMinutes,
        String source,
        List<CrewHourContributor> contributors
    ) {
        public CrewHourWindow {
            contributors = List.copyOf(contributors);
        }

        public static CrewHourWindow empty(long actualMinutes) {
            return new CrewHourWindow(null, null, actualMinutes, "SNAPSHOT", List.of());
        }
    }

    public record CrewHourContributor(
        String source,
        Instant startUtc,
        Instant endUtc,
        long minutes
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
        boolean restContributesToContinuousDdoSpan,
        Instant baseDdoStartUtc,
        Instant baseDdoEndUtc,
        List<CrewHourContributor> localNightContributors
    ) {
        public DdoFact {
            localNightContributors = List.copyOf(localNightContributors);
        }
    }

    public record CrewDaySequenceFact(
        Long crewId,
        int consecutiveDutyDays,
        LocalDate startLocalDate,
        LocalDate endLocalDate,
        List<LocalDate> dutyLocalDates
    ) {
        public CrewDaySequenceFact {
            dutyLocalDates = List.copyOf(dutyLocalDates);
        }
    }

    public record DdoCrewSequenceFact(
        Long crewId,
        boolean rolling14dHasTwoConsecutiveDdo,
        Instant windowStartUtc,
        Instant windowEndUtc,
        int assessedWindowCount,
        int consecutiveDdoUnitsInWindow
    ) {
    }

    public record FdpRestFact(
        Long taskId,
        Long crewId,
        String startBand,
        long fdpMinutes,
        long allowableFdpMinutes,
        long previousDutyMinutes,
        int restLocalNights,
        boolean precededByReducedRest,
        boolean followingRestReduced,
        boolean extendedFdp,
        boolean specialAssessmentPassed,
        Instant fdpStartUtc,
        Instant fdpEndUtc,
        Instant followingRestStartUtc,
        Instant followingRestEndUtc
    ) {
    }
}
