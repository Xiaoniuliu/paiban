package com.pilotroster.rule;

import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class FdpRestFactBuilder {

    private static final String BLOCK_FLIGHT = "FLIGHT";
    private static final String BLOCK_REST = "REST";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final long INITIAL_ALLOWABLE_FDP_MINUTES = 14 * 60L;
    private static final int REQUIRED_REST_LOCAL_NIGHTS = 2;
    private static final long LOCAL_NIGHT_MINIMUM_OVERLAP_MINUTES = 8 * 60L;
    private static final ZoneOffset ROSTER_LOCAL_ZONE = ZoneOffset.ofHours(8);
    private static final LocalTime LOCAL_NIGHT_START = LocalTime.of(22, 0);
    private static final LocalTime LOCAL_NIGHT_END = LocalTime.of(8, 0);

    private final TimelineBlockRepository timelineBlockRepository;
    private final JdbcTemplate jdbcTemplate;

    public FdpRestFactBuilder(TimelineBlockRepository timelineBlockRepository, JdbcTemplate jdbcTemplate) {
        this.timelineBlockRepository = timelineBlockRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<RuleDerivedFacts.FdpRestFact> build(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        List<TimelineBlock> blocks = timelineBlockRepository.findAllByRosterVersionIdOrderByStartUtcAsc(rosterVersionId);
        Set<Long> cancelledTaskIds = cancelledTaskIds(blocks);
        List<TimelineBlock> activeBlocks = blocks.stream()
            .filter(block -> isActiveCrewBlock(block, cancelledTaskIds))
            .toList();
        List<TimelineBlock> activeFlights = activeBlocks.stream()
            .filter(block -> BLOCK_FLIGHT.equals(block.getBlockType()))
            .filter(block -> block.getTaskPlanItemId() != null)
            .toList();
        return activeFlights.stream()
            .map(flight -> buildFact(flight, activeBlocks))
            .toList();
    }

    private RuleDerivedFacts.FdpRestFact buildFact(TimelineBlock flight, List<TimelineBlock> activeBlocks) {
        TimelineBlock previousDuty = previousDutyBlock(flight, activeBlocks);
        TimelineBlock precedingRest = precedingRestBlock(flight, activeBlocks);
        TimelineBlock followingRest = followingRestBlock(flight, activeBlocks);
        long fdpMinutes = minutesBetween(flight.getStartUtc(), flight.getEndUtc());
        long previousDutyMinutes = previousDuty == null ? 0 : minutesBetween(previousDuty.getStartUtc(), previousDuty.getEndUtc());
        int precedingRestLocalNights = precedingRest == null ? REQUIRED_REST_LOCAL_NIGHTS : localNights(precedingRest);
        int followingRestLocalNights = followingRest == null ? 0 : localNights(followingRest);
        boolean precededByReducedRest = precedingRest != null && precedingRestLocalNights < REQUIRED_REST_LOCAL_NIGHTS;
        boolean followingRestReduced = followingRest != null && followingRestLocalNights < REQUIRED_REST_LOCAL_NIGHTS;
        boolean extendedFdp = fdpMinutes > INITIAL_ALLOWABLE_FDP_MINUTES;
        return new RuleDerivedFacts.FdpRestFact(
            flight.getTaskPlanItemId(),
            flight.getCrewMemberId(),
            startBand(flight.getStartUtc()),
            fdpMinutes,
            INITIAL_ALLOWABLE_FDP_MINUTES,
            previousDutyMinutes,
            followingRestLocalNights,
            precededByReducedRest,
            followingRestReduced,
            extendedFdp,
            false,
            flight.getStartUtc(),
            flight.getEndUtc(),
            followingRest == null ? null : followingRest.getStartUtc(),
            followingRest == null ? null : followingRest.getEndUtc()
        );
    }

    private boolean isActiveCrewBlock(TimelineBlock block, Set<Long> cancelledTaskIds) {
        return block.getCrewMemberId() != null
            && block.getEndUtc().isAfter(block.getStartUtc())
            && !STATUS_CANCELLED.equals(block.getStatus())
            && (block.getTaskPlanItemId() == null || !cancelledTaskIds.contains(block.getTaskPlanItemId()));
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
        Object[] args = new Object[taskIds.size() + 1];
        args[0] = STATUS_CANCELLED;
        for (int index = 0; index < taskIds.size(); index += 1) {
            args[index + 1] = taskIds.get(index);
        }
        return new HashSet<>(jdbcTemplate.queryForList(
            "SELECT id FROM task_plan_item WHERE status = ? AND id IN (" + placeholders + ")",
            Long.class,
            args
        ));
    }

    private TimelineBlock previousDutyBlock(TimelineBlock flight, List<TimelineBlock> activeBlocks) {
        return activeBlocks.stream()
            .filter(block -> sameCrew(block, flight))
            .filter(block -> isDutyProducingBlockType(block.getBlockType()))
            .filter(block -> block.getEndUtc().compareTo(flight.getStartUtc()) <= 0)
            .reduce((ignored, current) -> current)
            .orElse(null);
    }

    private TimelineBlock precedingRestBlock(TimelineBlock flight, List<TimelineBlock> activeBlocks) {
        List<TimelineBlock> precedingCrewBlocks = activeBlocks.stream()
            .filter(block -> sameCrew(block, flight))
            .filter(block -> block.getEndUtc().compareTo(flight.getStartUtc()) <= 0)
            .toList();
        for (int index = precedingCrewBlocks.size() - 1; index >= 0; index -= 1) {
            TimelineBlock block = precedingCrewBlocks.get(index);
            if (BLOCK_REST.equals(block.getBlockType())) {
                return block;
            }
            if (isDutyProducingBlockType(block.getBlockType())) {
                return null;
            }
        }
        return null;
    }

    private TimelineBlock followingRestBlock(TimelineBlock flight, List<TimelineBlock> activeBlocks) {
        List<TimelineBlock> followingCrewBlocks = activeBlocks.stream()
            .filter(block -> sameCrew(block, flight))
            .filter(block -> block.getStartUtc().compareTo(flight.getEndUtc()) >= 0)
            .toList();
        for (TimelineBlock block : followingCrewBlocks) {
            if (BLOCK_REST.equals(block.getBlockType())) {
                return block;
            }
            if (isDutyProducingBlockType(block.getBlockType())) {
                return null;
            }
        }
        return null;
    }

    private boolean sameCrew(TimelineBlock left, TimelineBlock right) {
        return Objects.equals(left.getCrewMemberId(), right.getCrewMemberId());
    }

    private boolean isDutyProducingBlockType(String blockType) {
        return switch (blockType) {
            case "FLIGHT", "DUTY", "TRAINING", "STANDBY" -> true;
            default -> false;
        };
    }

    private long minutesBetween(Instant startUtc, Instant endUtc) {
        return Duration.between(startUtc, endUtc).toMinutes();
    }

    private String startBand(Instant startUtc) {
        int hour = startUtc.atZone(ROSTER_LOCAL_ZONE).getHour();
        int bandStart = (hour / 4) * 4;
        int bandEnd = bandStart + 3;
        return "%02d:00-%02d:59".formatted(bandStart, bandEnd);
    }

    private int localNights(TimelineBlock restBlock) {
        int localNights = 0;
        LocalDate cursor = restBlock.getStartUtc().atZone(ROSTER_LOCAL_ZONE).toLocalDate().minusDays(1);
        LocalDate last = restBlock.getEndUtc().minusNanos(1).atZone(ROSTER_LOCAL_ZONE).toLocalDate();
        while (!cursor.isAfter(last)) {
            Instant nightStartUtc = LocalDateTime.of(cursor, LOCAL_NIGHT_START)
                .toInstant(ROSTER_LOCAL_ZONE);
            Instant nightEndUtc = LocalDateTime.of(cursor.plusDays(1), LOCAL_NIGHT_END)
                .toInstant(ROSTER_LOCAL_ZONE);
            Instant overlapStart = max(restBlock.getStartUtc(), nightStartUtc);
            Instant overlapEnd = min(restBlock.getEndUtc(), nightEndUtc);
            if (overlapEnd.isAfter(overlapStart)
                && minutesBetween(overlapStart, overlapEnd) >= LOCAL_NIGHT_MINIMUM_OVERLAP_MINUTES) {
                localNights += 1;
            }
            cursor = cursor.plusDays(1);
        }
        return localNights;
    }

    private Instant max(Instant left, Instant right) {
        return left.compareTo(right) >= 0 ? left : right;
    }

    private Instant min(Instant left, Instant right) {
        return left.compareTo(right) <= 0 ? left : right;
    }
}
