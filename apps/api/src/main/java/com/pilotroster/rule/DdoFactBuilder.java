package com.pilotroster.rule;

import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DdoFactBuilder {

    private static final String BLOCK_DDO = "DDO";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final long SINGLE_DDO_MINUTES = 34 * 60L;
    private static final long ADDITIONAL_CONSECUTIVE_DDO_MINUTES = 24 * 60L;
    private static final int SINGLE_DDO_LOCAL_NIGHTS = 2;
    private static final int ROLLING_DDO_WINDOW_DAYS = 14;
    private static final int REQUIRED_ROLLING_CONSECUTIVE_DDO_UNITS = 2;
    private static final long LOCAL_NIGHT_MINIMUM_OVERLAP_MINUTES = 8 * 60L;
    private static final ZoneOffset ROSTER_LOCAL_ZONE = ZoneOffset.ofHours(8);
    private static final LocalTime LOCAL_NIGHT_START = LocalTime.of(22, 0);
    private static final LocalTime LOCAL_NIGHT_END = LocalTime.of(8, 0);

    private final TimelineBlockRepository timelineBlockRepository;
    private final JdbcTemplate jdbcTemplate;

    public DdoFactBuilder(TimelineBlockRepository timelineBlockRepository, JdbcTemplate jdbcTemplate) {
        this.timelineBlockRepository = timelineBlockRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<Long, RuleDerivedFacts.DdoFact> build(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        List<TimelineBlock> blocks = timelineBlockRepository.findAllByRosterVersionIdOrderByStartUtcAsc(rosterVersionId);
        Set<Long> cancelledTaskIds = cancelledTaskIds(blocks);
        Map<Long, Set<LocalDate>> dutyDatesByCrewId = dutyDatesByCrewId(blocks, cancelledTaskIds);
        List<TimelineBlock> activeDdoBlocks = blocks.stream()
            .filter(block -> isActiveDdoBlock(block, cancelledTaskIds))
            .toList();
        Map<Long, DdoComputation> computationsByBlockId = activeDdoBlocks.stream()
            .collect(Collectors.toMap(TimelineBlock::getId, this::computeDdo, (left, right) -> left, LinkedHashMap::new));
        Map<Long, Integer> consecutiveDdoByBlockId = consecutiveDdoByBlockId(activeDdoBlocks, computationsByBlockId);
        DdoFactBuildResult factsByBlockId = new DdoFactBuildResult(
            crewDaySequenceFactsByCrewId(dutyDatesByCrewId),
            ddoSequenceFactsByCrewId(blocks, cancelledTaskIds, activeDdoBlocks, consecutiveDdoByBlockId)
        );
        activeDdoBlocks.forEach(block -> factsByBlockId.put(
            block.getId(),
            buildFact(block, dutyDatesByCrewId, computationsByBlockId.get(block.getId()), consecutiveDdoByBlockId)
        ));
        return factsByBlockId;
    }

    private boolean isActiveDdoBlock(TimelineBlock block, Set<Long> cancelledTaskIds) {
        return BLOCK_DDO.equals(block.getBlockType())
            && !STATUS_CANCELLED.equals(block.getStatus())
            && (block.getTaskPlanItemId() == null || !cancelledTaskIds.contains(block.getTaskPlanItemId()));
    }

    private RuleDerivedFacts.DdoFact buildFact(
        TimelineBlock block,
        Map<Long, Set<LocalDate>> dutyDatesByCrewId,
        DdoComputation computation,
        Map<Long, Integer> consecutiveDdoByBlockId
    ) {
        return new RuleDerivedFacts.DdoFact(
            block.getId(),
            block.getCrewMemberId(),
            computation.ddoMinutes(),
            computation.localNightContributors().size(),
            consecutiveDutyDaysBefore(block, dutyDatesByCrewId),
            consecutiveDdoByBlockId.getOrDefault(block.getId(), 0),
            computation.validDdoUnit(),
            true,
            computation.baseDdoStartUtc(),
            computation.baseDdoEndUtc(),
            computation.localNightContributors()
        );
    }

    private Map<Long, Set<LocalDate>> dutyDatesByCrewId(List<TimelineBlock> blocks, Set<Long> cancelledTaskIds) {
        Map<Long, Set<LocalDate>> dutyDatesByCrewId = new HashMap<>();
        blocks.stream()
            .filter(block -> isActiveDutyProducingBlock(block, cancelledTaskIds))
            .forEach(block -> dutyDatesByCrewId
                .computeIfAbsent(block.getCrewMemberId(), ignored -> new HashSet<>())
                .addAll(localDatesTouchedBy(block)));
        return dutyDatesByCrewId;
    }

    private boolean isActiveDutyProducingBlock(TimelineBlock block, Set<Long> cancelledTaskIds) {
        return block.getCrewMemberId() != null
            && !STATUS_CANCELLED.equals(block.getStatus())
            && (block.getTaskPlanItemId() == null || !cancelledTaskIds.contains(block.getTaskPlanItemId()))
            && isDutyProducingBlockType(block.getBlockType());
    }

    private Set<Long> cancelledTaskIds(List<TimelineBlock> blocks) {
        List<Long> taskIds = blocks.stream()
            .map(TimelineBlock::getTaskPlanItemId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (taskIds.isEmpty()) {
            return Set.of();
        }
        String placeholders = taskIds.stream()
            .map(ignored -> "?")
            .collect(Collectors.joining(","));
        return new HashSet<>(jdbcTemplate.queryForList(
            "SELECT id FROM task_plan_item WHERE status = ? AND id IN (" + placeholders + ")",
            Long.class,
            StreamArgs.cancelledTaskQueryArgs(taskIds)
        ));
    }

    private boolean isDutyProducingBlockType(String blockType) {
        return switch (blockType) {
            case "FLIGHT", "DUTY", "TRAINING", "STANDBY" -> true;
            default -> false;
        };
    }

    private Set<LocalDate> localDatesTouchedBy(TimelineBlock block) {
        if (!block.getEndUtc().isAfter(block.getStartUtc())) {
            return Set.of();
        }
        Set<LocalDate> dates = new HashSet<>();
        LocalDate cursor = block.getStartUtc().atZone(ROSTER_LOCAL_ZONE).toLocalDate();
        LocalDate last = block.getEndUtc().minusNanos(1).atZone(ROSTER_LOCAL_ZONE).toLocalDate();
        while (!cursor.isAfter(last)) {
            dates.add(cursor);
            cursor = cursor.plusDays(1);
        }
        return dates;
    }

    private Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> ddoSequenceFactsByCrewId(
        List<TimelineBlock> blocks,
        Set<Long> cancelledTaskIds,
        List<TimelineBlock> activeDdoBlocks,
        Map<Long, Integer> consecutiveDdoByBlockId
    ) {
        Map<Long, Set<LocalDate>> rosterDatesByCrewId = rosterDatesByCrewId(blocks, cancelledTaskIds);
        Map<Long, List<TimelineBlock>> ddoBlocksByCrewId = activeDdoBlocksByCrewId(activeDdoBlocks);
        Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> factsByCrewId = new LinkedHashMap<>();
        rosterDatesByCrewId.forEach((crewId, rosterDates) -> {
            RuleDerivedFacts.DdoCrewSequenceFact fact = rollingFourteenDayDdoFact(
                crewId,
                rosterDates,
                ddoBlocksByCrewId.getOrDefault(crewId, List.of()),
                consecutiveDdoByBlockId
            );
            if (fact != null) {
                factsByCrewId.put(crewId, fact);
            }
        });
        return factsByCrewId;
    }

    private Map<Long, Set<LocalDate>> rosterDatesByCrewId(List<TimelineBlock> blocks, Set<Long> cancelledTaskIds) {
        Map<Long, Set<LocalDate>> rosterDatesByCrewId = new HashMap<>();
        blocks.stream()
            .filter(block -> isActiveCrewTimelineBlock(block, cancelledTaskIds))
            .forEach(block -> rosterDatesByCrewId
                .computeIfAbsent(block.getCrewMemberId(), ignored -> new HashSet<>())
                .addAll(localDatesTouchedBy(block)));
        return rosterDatesByCrewId;
    }

    private boolean isActiveCrewTimelineBlock(TimelineBlock block, Set<Long> cancelledTaskIds) {
        return block.getCrewMemberId() != null
            && !STATUS_CANCELLED.equals(block.getStatus())
            && (block.getTaskPlanItemId() == null || !cancelledTaskIds.contains(block.getTaskPlanItemId()))
            && block.getEndUtc().isAfter(block.getStartUtc());
    }

    private RuleDerivedFacts.DdoCrewSequenceFact rollingFourteenDayDdoFact(
        Long crewId,
        Set<LocalDate> rosterDates,
        List<TimelineBlock> crewDdoBlocks,
        Map<Long, Integer> consecutiveDdoByBlockId
    ) {
        List<LocalDate> sortedDates = rosterDates.stream().sorted().toList();
        if (sortedDates.size() < ROLLING_DDO_WINDOW_DAYS) {
            return null;
        }
        int assessedWindowCount = 0;
        RuleDerivedFacts.DdoCrewSequenceFact firstPassingWindow = null;
        LocalDate firstDate = sortedDates.get(0);
        LocalDate lastWindowStart = sortedDates.get(sortedDates.size() - 1).minusDays(ROLLING_DDO_WINDOW_DAYS - 1L);
        for (LocalDate windowStart = firstDate; !windowStart.isAfter(lastWindowStart); windowStart = windowStart.plusDays(1)) {
            if (!hasCompleteRosterWindow(rosterDates, windowStart)) {
                continue;
            }
            assessedWindowCount += 1;
            LocalDate windowEndExclusive = windowStart.plusDays(ROLLING_DDO_WINDOW_DAYS);
            int consecutiveDdoUnitsInWindow = consecutiveDdoUnitsInWindow(
                crewDdoBlocks,
                consecutiveDdoByBlockId,
                windowStart,
                windowEndExclusive
            );
            RuleDerivedFacts.DdoCrewSequenceFact fact = new RuleDerivedFacts.DdoCrewSequenceFact(
                crewId,
                consecutiveDdoUnitsInWindow >= REQUIRED_ROLLING_CONSECUTIVE_DDO_UNITS,
                startOfLocalDateUtc(windowStart),
                startOfLocalDateUtc(windowEndExclusive),
                assessedWindowCount,
                consecutiveDdoUnitsInWindow
            );
            if (!fact.rolling14dHasTwoConsecutiveDdo()) {
                return fact;
            }
            if (firstPassingWindow == null) {
                firstPassingWindow = fact;
            }
        }
        return firstPassingWindow == null
            ? null
            : new RuleDerivedFacts.DdoCrewSequenceFact(
                crewId,
                true,
                firstPassingWindow.windowStartUtc(),
                firstPassingWindow.windowEndUtc(),
                assessedWindowCount,
                firstPassingWindow.consecutiveDdoUnitsInWindow()
            );
    }

    private boolean hasCompleteRosterWindow(Set<LocalDate> rosterDates, LocalDate windowStart) {
        for (int offset = 0; offset < ROLLING_DDO_WINDOW_DAYS; offset += 1) {
            if (!rosterDates.contains(windowStart.plusDays(offset))) {
                return false;
            }
        }
        return true;
    }

    private int consecutiveDdoUnitsInWindow(
        List<TimelineBlock> crewDdoBlocks,
        Map<Long, Integer> consecutiveDdoByBlockId,
        LocalDate windowStart,
        LocalDate windowEndExclusive
    ) {
        Instant windowStartUtc = startOfLocalDateUtc(windowStart);
        Instant windowEndUtc = startOfLocalDateUtc(windowEndExclusive);
        return crewDdoBlocks.stream()
            .filter(block -> !block.getStartUtc().isBefore(windowStartUtc))
            .filter(block -> twoConsecutiveDdoEndUtc(block).compareTo(windowEndUtc) <= 0)
            .mapToInt(block -> consecutiveDdoByBlockId.getOrDefault(block.getId(), 0))
            .max()
            .orElse(0);
    }

    private Instant twoConsecutiveDdoEndUtc(TimelineBlock block) {
        return block.getStartUtc().plus(Duration.ofMinutes(
            SINGLE_DDO_MINUTES + ADDITIONAL_CONSECUTIVE_DDO_MINUTES
        ));
    }

    private static Instant startOfLocalDateUtc(LocalDate localDate) {
        return localDate.atStartOfDay().toInstant(ROSTER_LOCAL_ZONE);
    }

    private int consecutiveDutyDaysBefore(TimelineBlock ddoBlock, Map<Long, Set<LocalDate>> dutyDatesByCrewId) {
        Set<LocalDate> dutyDates = dutyDatesByCrewId.getOrDefault(ddoBlock.getCrewMemberId(), Set.of());
        LocalDate cursor = ddoBlock.getStartUtc().atZone(ROSTER_LOCAL_ZONE).toLocalDate().minusDays(1);
        int consecutiveDays = 0;
        while (dutyDates.contains(cursor)) {
            consecutiveDays += 1;
            cursor = cursor.minusDays(1);
        }
        return consecutiveDays;
    }

    private Map<Long, RuleDerivedFacts.CrewDaySequenceFact> crewDaySequenceFactsByCrewId(
        Map<Long, Set<LocalDate>> dutyDatesByCrewId
    ) {
        Map<Long, RuleDerivedFacts.CrewDaySequenceFact> factsByCrewId = new LinkedHashMap<>();
        dutyDatesByCrewId.forEach((crewId, dutyDates) -> {
            List<LocalDate> sortedDates = dutyDates.stream().sorted().toList();
            RuleDerivedFacts.CrewDaySequenceFact fact = longestDutySequence(crewId, sortedDates);
            if (fact != null) {
                factsByCrewId.put(crewId, fact);
            }
        });
        return factsByCrewId;
    }

    private RuleDerivedFacts.CrewDaySequenceFact longestDutySequence(Long crewId, List<LocalDate> sortedDates) {
        if (sortedDates.isEmpty()) {
            return null;
        }
        LocalDate currentStart = sortedDates.get(0);
        LocalDate currentEnd = currentStart;
        LocalDate bestStart = currentStart;
        LocalDate bestEnd = currentEnd;
        int bestLength = 1;
        int currentLength = 1;
        for (int index = 1; index < sortedDates.size(); index += 1) {
            LocalDate date = sortedDates.get(index);
            if (date.equals(currentEnd.plusDays(1))) {
                currentEnd = date;
                currentLength += 1;
            } else {
                currentStart = date;
                currentEnd = date;
                currentLength = 1;
            }
            if (currentLength > bestLength) {
                bestStart = currentStart;
                bestEnd = currentEnd;
                bestLength = currentLength;
            }
        }
        return new RuleDerivedFacts.CrewDaySequenceFact(crewId, bestLength, bestStart, bestEnd, sortedDates);
    }

    private Map<Long, Integer> consecutiveDdoByBlockId(
        List<TimelineBlock> activeDdoBlocks,
        Map<Long, DdoComputation> computationsByBlockId
    ) {
        Map<Long, Integer> consecutiveDdoByBlockId = new HashMap<>();
        activeDdoBlocksByCrewId(activeDdoBlocks)
            .values()
            .forEach(crewDdoBlocks ->
                putConsecutiveDdoForCrew(crewDdoBlocks, computationsByBlockId, consecutiveDdoByBlockId)
            );
        return consecutiveDdoByBlockId;
    }

    private Map<Long, List<TimelineBlock>> activeDdoBlocksByCrewId(List<TimelineBlock> activeDdoBlocks) {
        Map<Long, List<TimelineBlock>> blocksByCrewId = new LinkedHashMap<>();
        activeDdoBlocks.forEach(block -> blocksByCrewId
            .computeIfAbsent(block.getCrewMemberId(), ignored -> new ArrayList<>())
            .add(block));
        return blocksByCrewId;
    }

    private void putConsecutiveDdoForCrew(
        List<TimelineBlock> crewDdoBlocks,
        Map<Long, DdoComputation> computationsByBlockId,
        Map<Long, Integer> consecutiveDdoByBlockId
    ) {
        for (int index = 0; index < crewDdoBlocks.size(); index += 1) {
            TimelineBlock block = crewDdoBlocks.get(index);
            DdoComputation computation = computationsByBlockId.get(block.getId());
            if (computation == null || !computation.validDdoUnit()) {
                consecutiveDdoByBlockId.put(block.getId(), 0);
                continue;
            }
            int units = 0;
            Instant expectedStartUtc = block.getStartUtc();
            Instant spanEndUtc = block.getStartUtc();
            for (int cursor = index; cursor < crewDdoBlocks.size(); cursor += 1) {
                TimelineBlock candidate = crewDdoBlocks.get(cursor);
                if (!candidate.getStartUtc().equals(expectedStartUtc)) {
                    break;
                }
                spanEndUtc = candidate.getEndUtc();
                units = computeDdo(block.getStartUtc(), spanEndUtc).consecutiveDdoAfter();
                expectedStartUtc = candidate.getEndUtc();
            }
            consecutiveDdoByBlockId.put(block.getId(), units);
        }
    }

    private DdoComputation computeDdo(TimelineBlock block) {
        return computeDdo(block.getStartUtc(), block.getEndUtc());
    }

    private DdoComputation computeDdo(Instant startUtc, Instant endUtc) {
        List<RuleDerivedFacts.CrewHourContributor> nights =
            localNightContributors(startUtc, endUtc);
        long ddoMinutes = positiveDurationMinutes(startUtc, endUtc);
        BaseDdoWindow base = findBaseDdoWindow(startUtc, endUtc, nights);
        if (base == null) {
            return new DdoComputation(ddoMinutes, nights, false, 0, null, null);
        }
        int additionalByDuration = (int) (
            Duration.between(base.endUtc(), endUtc).toMinutes() / ADDITIONAL_CONSECUTIVE_DDO_MINUTES
        );
        long nightsAfterBase = nights.stream()
            .filter(night -> !night.startUtc().isBefore(base.endUtc()))
            .count();
        int units = 1 + Math.min(additionalByDuration, (int) nightsAfterBase);
        return new DdoComputation(ddoMinutes, nights, true, units, base.startUtc(), base.endUtc());
    }

    private static long positiveDurationMinutes(Instant startUtc, Instant endUtc) {
        if (!endUtc.isAfter(startUtc)) {
            return 0;
        }
        return Duration.between(startUtc, endUtc).toMinutes();
    }

    private BaseDdoWindow findBaseDdoWindow(
        Instant blockStartUtc,
        Instant blockEndUtc,
        List<RuleDerivedFacts.CrewHourContributor> nights
    ) {
        Instant baseEndUtc = blockStartUtc.plus(Duration.ofMinutes(SINGLE_DDO_MINUTES));
        if (baseEndUtc.isAfter(blockEndUtc)) {
            return null;
        }
        long baseLocalNights = nights.stream()
            .filter(night -> overlapMinutes(blockStartUtc, baseEndUtc, night.startUtc(), night.endUtc())
                >= LOCAL_NIGHT_MINIMUM_OVERLAP_MINUTES)
            .count();
        if (baseLocalNights < SINGLE_DDO_LOCAL_NIGHTS) {
            return null;
        }
        return new BaseDdoWindow(blockStartUtc, baseEndUtc);
    }

    private List<RuleDerivedFacts.CrewHourContributor> localNightContributors(Instant startUtc, Instant endUtc) {
        if (!endUtc.isAfter(startUtc)) {
            return List.of();
        }
        List<RuleDerivedFacts.CrewHourContributor> contributors = new ArrayList<>();
        LocalDate cursor = startUtc.atZone(ROSTER_LOCAL_ZONE).toLocalDate().minusDays(1);
        LocalDate last = endUtc.atZone(ROSTER_LOCAL_ZONE).toLocalDate();
        while (!cursor.isAfter(last)) {
            Instant localNightStart = LocalDateTime.of(cursor, LOCAL_NIGHT_START).toInstant(ROSTER_LOCAL_ZONE);
            Instant localNightEnd = LocalDateTime.of(cursor.plusDays(1), LOCAL_NIGHT_END).toInstant(ROSTER_LOCAL_ZONE);
            long overlapMinutes = overlapMinutes(startUtc, endUtc, localNightStart, localNightEnd);
            if (overlapMinutes >= LOCAL_NIGHT_MINIMUM_OVERLAP_MINUTES) {
                contributors.add(new RuleDerivedFacts.CrewHourContributor(
                    "LOCAL_NIGHT",
                    localNightStart,
                    localNightEnd,
                    overlapMinutes
                ));
            }
            cursor = cursor.plusDays(1);
        }
        return List.copyOf(contributors);
    }

    private static long overlapMinutes(Instant start, Instant end, Instant windowStart, Instant windowEnd) {
        Instant overlapStart = start.isAfter(windowStart) ? start : windowStart;
        Instant overlapEnd = end.isBefore(windowEnd) ? end : windowEnd;
        if (!overlapEnd.isAfter(overlapStart)) {
            return 0;
        }
        return Duration.between(overlapStart, overlapEnd).toMinutes();
    }

    private record DdoComputation(
        long ddoMinutes,
        List<RuleDerivedFacts.CrewHourContributor> localNightContributors,
        boolean validDdoUnit,
        int consecutiveDdoAfter,
        Instant baseDdoStartUtc,
        Instant baseDdoEndUtc
    ) {
    }

    private record BaseDdoWindow(
        Instant startUtc,
        Instant endUtc
    ) {
    }

    public static final class DdoFactBuildResult extends LinkedHashMap<Long, RuleDerivedFacts.DdoFact> {

        private final Map<Long, RuleDerivedFacts.CrewDaySequenceFact> crewDaySequenceFactsByCrewId;
        private final Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> ddoSequenceFactsByCrewId;

        DdoFactBuildResult(
            Map<Long, RuleDerivedFacts.CrewDaySequenceFact> crewDaySequenceFactsByCrewId,
            Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> ddoSequenceFactsByCrewId
        ) {
            this.crewDaySequenceFactsByCrewId = Map.copyOf(crewDaySequenceFactsByCrewId);
            this.ddoSequenceFactsByCrewId = Map.copyOf(ddoSequenceFactsByCrewId);
        }

        Map<Long, RuleDerivedFacts.CrewDaySequenceFact> crewDaySequenceFactsByCrewId() {
            return crewDaySequenceFactsByCrewId;
        }

        Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> ddoSequenceFactsByCrewId() {
            return ddoSequenceFactsByCrewId;
        }
    }

    private static final class StreamArgs {

        private StreamArgs() {
        }

        private static Object[] cancelledTaskQueryArgs(List<Long> taskIds) {
            Object[] args = new Object[taskIds.size() + 1];
            args[0] = STATUS_CANCELLED;
            for (int index = 0; index < taskIds.size(); index += 1) {
                args[index + 1] = taskIds.get(index);
            }
            return args;
        }
    }
}
