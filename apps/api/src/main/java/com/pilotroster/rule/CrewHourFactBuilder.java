package com.pilotroster.rule;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

@Component
public class CrewHourFactBuilder {

    private static final BigDecimal MINUTES_PER_HOUR = BigDecimal.valueOf(60);
    private static final Set<String> DUTY_BLOCK_TYPES = Set.of("FLIGHT", "POSITIONING", "STANDBY", "DUTY", "TRAINING");
    private static final String FLIGHT_BLOCK_TYPE = "FLIGHT";

    private final JdbcTemplate jdbcTemplate;

    public CrewHourFactBuilder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<Long, RuleDerivedFacts.CrewHourFact> buildProjection(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        Map<Long, MutableCrewHourProjection> projectionsByCrewId = new LinkedHashMap<>();
        for (Long crewId : loadActiveCrewIds()) {
            projectionsByCrewId.put(crewId, new MutableCrewHourProjection(crewId));
        }

        Set<CrewTaskKey> actualTaskKeys = addArchivedActualEvents(projectionsByCrewId);
        addRosterEstimateEvents(rosterVersionId, actualTaskKeys, projectionsByCrewId);

        Map<Long, RuleDerivedFacts.CrewHourFact> factsByCrewId = new LinkedHashMap<>();
        for (MutableCrewHourProjection projection : projectionsByCrewId.values()) {
            factsByCrewId.put(projection.crewId, projection.toFact());
        }
        return factsByCrewId;
    }

    private List<Long> loadActiveCrewIds() {
        return jdbcTemplate.query(
            "SELECT id FROM crew_member WHERE status = 'ACTIVE' ORDER BY id",
            (rs, rowNum) -> rs.getLong("id")
        );
    }

    public Map<Long, RuleDerivedFacts.CrewHourFact> buildLatestProjectionOrSnapshot() {
        List<Long> rosterVersionIds = jdbcTemplate.query(
            "SELECT id FROM roster_version ORDER BY id DESC LIMIT 1",
            (rs, rowNum) -> rs.getLong("id")
        );
        if (rosterVersionIds.isEmpty()) {
            return buildCompatibilitySnapshot();
        }
        return buildProjection(rosterVersionIds.get(0));
    }

    public Map<Long, RuleDerivedFacts.CrewHourFact> buildCompatibilitySnapshot() {
        List<RuleDerivedFacts.CrewHourFact> facts = jdbcTemplate.query("""
            SELECT
              id,
              COALESCE(rolling_duty_hours_7d, 0) AS rolling_duty_hours_7d,
              COALESCE(rolling_duty_hours_14d, 0) AS rolling_duty_hours_14d,
              COALESCE(rolling_duty_hours_28d, 0) AS rolling_duty_hours_28d,
              COALESCE(rolling_flight_hours_28d, 0) AS rolling_flight_hours_28d,
              COALESCE(rolling_flight_hours_12m, 0) AS rolling_flight_hours_12m
            FROM crew_member
            WHERE status = 'ACTIVE'
            ORDER BY id
            """, new CrewHourFactRowMapper());

        Map<Long, RuleDerivedFacts.CrewHourFact> factsByCrewId = new LinkedHashMap<>();
        for (RuleDerivedFacts.CrewHourFact fact : facts) {
            factsByCrewId.put(fact.crewId(), fact);
        }
        return factsByCrewId;
    }

    private Set<CrewTaskKey> addArchivedActualEvents(Map<Long, MutableCrewHourProjection> projectionsByCrewId) {
        Set<CrewTaskKey> actualTaskKeys = new HashSet<>();
        jdbcTemplate.query(
            """
            SELECT
              crew_id,
              flight_id,
              actual_duty_start_utc,
              actual_duty_end_utc,
              actual_fdp_end_utc,
              flying_hour_minutes,
              no_flying_hour_flag
            FROM crew_archive_form
            WHERE crew_id IS NOT NULL
            """,
            rs -> {
                Long crewId = rs.getLong("crew_id");
                Long flightId = rs.getLong("flight_id");
                MutableCrewHourProjection projection = projectionsByCrewId.get(crewId);
                if (projection == null) {
                    return;
                }
                actualTaskKeys.add(new CrewTaskKey(crewId, flightId));

                Instant dutyStart = nullableInstant(rs, "actual_duty_start_utc");
                Instant dutyEnd = nullableInstant(rs, "actual_duty_end_utc");
                if (validRange(dutyStart, dutyEnd)) {
                    projection.addDutyEvent(new HourEvent(dutyStart, dutyEnd, minutesBetween(dutyStart, dutyEnd)));
                }

                boolean noFlyingHour = rs.getBoolean("no_flying_hour_flag");
                Integer flyingHourMinutes = nullableInteger(rs, "flying_hour_minutes");
                Instant flightEnd = nullableInstant(rs, "actual_fdp_end_utc");
                if (!noFlyingHour && flyingHourMinutes != null && flyingHourMinutes > 0) {
                    Instant eventEnd = flightEnd == null ? dutyEnd : flightEnd;
                    if (eventEnd != null) {
                        projection.addFlightEvent(new HourEvent(eventEnd.minus(Duration.ofMinutes(flyingHourMinutes)), eventEnd, flyingHourMinutes));
                    }
                }
            }
        );
        return actualTaskKeys;
    }

    private void addRosterEstimateEvents(
        Long rosterVersionId,
        Set<CrewTaskKey> actualTaskKeys,
        Map<Long, MutableCrewHourProjection> projectionsByCrewId
    ) {
        jdbcTemplate.query(
            """
            SELECT
              tb.crew_member_id,
              tb.task_plan_item_id,
              tb.block_type,
              tb.start_utc,
              tb.end_utc,
              tpi.task_type
            FROM timeline_block tb
            LEFT JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tb.roster_version_id = ?
              AND tb.crew_member_id IS NOT NULL
              AND tb.start_utc IS NOT NULL
              AND tb.end_utc IS NOT NULL
            """,
            rs -> {
                Long crewId = rs.getLong("crew_member_id");
                Long taskId = nullableLong(rs, "task_plan_item_id");
                if (taskId != null && actualTaskKeys.contains(new CrewTaskKey(crewId, taskId))) {
                    return;
                }

                MutableCrewHourProjection projection = projectionsByCrewId.get(crewId);
                if (projection == null) {
                    return;
                }

                Instant start = rs.getTimestamp("start_utc").toInstant();
                Instant end = rs.getTimestamp("end_utc").toInstant();
                if (!validRange(start, end)) {
                    return;
                }

                String blockType = rs.getString("block_type");
                long minutes = minutesBetween(start, end);
                if (DUTY_BLOCK_TYPES.contains(blockType)) {
                    projection.addDutyEvent(new HourEvent(start, end, minutes));
                }
                if (FLIGHT_BLOCK_TYPE.equals(blockType) || FLIGHT_BLOCK_TYPE.equals(rs.getString("task_type"))) {
                    projection.addFlightEvent(new HourEvent(start, end, minutes));
                }
            },
            rosterVersionId
        );
    }

    private static long toMinutes(BigDecimal hours) {
        if (hours == null) {
            return 0;
        }
        return hours.multiply(MINUTES_PER_HOUR)
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact();
    }

    private static boolean validRange(Instant start, Instant end) {
        return start != null && end != null && start.isBefore(end);
    }

    private static long minutesBetween(Instant start, Instant end) {
        return Duration.between(start, end).toMinutes();
    }

    private static long rollingPeakMinutes(List<HourEvent> events, Duration window) {
        long peak = 0;
        for (HourEvent checkpoint : events) {
            Instant windowEnd = checkpoint.end();
            Instant windowStart = windowEnd.minus(window);
            long total = 0;
            for (HourEvent event : events) {
                total += overlapMinutes(event, windowStart, windowEnd);
            }
            peak = Math.max(peak, total);
        }
        return peak;
    }

    private static long overlapMinutes(HourEvent event, Instant windowStart, Instant windowEnd) {
        Instant overlapStart = event.start().isAfter(windowStart) ? event.start() : windowStart;
        Instant overlapEnd = event.end().isBefore(windowEnd) ? event.end() : windowEnd;
        if (!overlapStart.isBefore(overlapEnd)) {
            return 0;
        }
        long eventMinutes = minutesBetween(event.start(), event.end());
        if (eventMinutes == event.minutes()) {
            return minutesBetween(overlapStart, overlapEnd);
        }
        return Math.min(event.minutes(), minutesBetween(overlapStart, overlapEnd));
    }

    private static Instant nullableInstant(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static Integer nullableInteger(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record CrewTaskKey(Long crewId, Long taskId) {
    }

    private record HourEvent(Instant start, Instant end, long minutes) {
    }

    private static class MutableCrewHourProjection {
        private final Long crewId;
        private final List<HourEvent> dutyEvents = new ArrayList<>();
        private final List<HourEvent> flightEvents = new ArrayList<>();

        private MutableCrewHourProjection(Long crewId) {
            this.crewId = crewId;
        }

        private void addDutyEvent(HourEvent event) {
            dutyEvents.add(event);
        }

        private void addFlightEvent(HourEvent event) {
            flightEvents.add(event);
        }

        private RuleDerivedFacts.CrewHourFact toFact() {
            return new RuleDerivedFacts.CrewHourFact(
                crewId,
                rollingPeakMinutes(dutyEvents, Duration.ofDays(7)),
                rollingPeakMinutes(dutyEvents, Duration.ofDays(14)),
                rollingPeakMinutes(dutyEvents, Duration.ofDays(28)),
                rollingPeakMinutes(flightEvents, Duration.ofDays(28)),
                rollingPeakMinutes(flightEvents, Duration.ofDays(366))
            );
        }
    }

    private static class CrewHourFactRowMapper implements RowMapper<RuleDerivedFacts.CrewHourFact> {
        @Override
        public RuleDerivedFacts.CrewHourFact mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new RuleDerivedFacts.CrewHourFact(
                rs.getLong("id"),
                toMinutes(rs.getBigDecimal("rolling_duty_hours_7d")),
                toMinutes(rs.getBigDecimal("rolling_duty_hours_14d")),
                toMinutes(rs.getBigDecimal("rolling_duty_hours_28d")),
                toMinutes(rs.getBigDecimal("rolling_flight_hours_28d")),
                toMinutes(rs.getBigDecimal("rolling_flight_hours_12m"))
            );
        }
    }
}
