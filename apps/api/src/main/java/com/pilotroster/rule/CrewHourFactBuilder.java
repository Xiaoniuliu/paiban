package com.pilotroster.rule;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

@Component
public class CrewHourFactBuilder {

    private static final BigDecimal MINUTES_PER_HOUR = BigDecimal.valueOf(60);
    private static final ZoneOffset HOUR_WINDOW_ZONE = ZoneOffset.UTC;
    private static final Set<String> DUTY_BLOCK_TYPES = Set.of("FLIGHT", "POSITIONING", "STANDBY", "DUTY", "TRAINING");
    private static final String FLIGHT_BLOCK_TYPE = "FLIGHT";
    private static final String SOURCE_ARCHIVE_ACTUAL = "ARCHIVE_ACTUAL";
    private static final String SOURCE_ROSTER_PROJECTION = "ROSTER_PROJECTION";

    private final JdbcTemplate jdbcTemplate;
    private final Clock hourWindowClock;

    @Autowired
    public CrewHourFactBuilder(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, Clock.systemUTC());
    }

    CrewHourFactBuilder(JdbcTemplate jdbcTemplate, Clock hourWindowClock) {
        this.jdbcTemplate = jdbcTemplate;
        this.hourWindowClock = Objects.requireNonNull(hourWindowClock, "hourWindowClock");
    }

    public Map<Long, RuleDerivedFacts.CrewHourFact> buildProjection(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        Map<Long, MutableCrewHourProjection> projectionsByCrewId = new LinkedHashMap<>();
        Instant hourWindowBaselineUtc = rosterBaselineUtc(rosterVersionId);
        ProjectionEvaluationWindow evaluationWindow = rosterEvaluationWindow(rosterVersionId, hourWindowBaselineUtc);
        for (Long crewId : loadActiveCrewIds()) {
            projectionsByCrewId.put(crewId, new MutableCrewHourProjection(crewId, evaluationWindow));
        }

        ActualTaskKeys actualTaskKeys = addArchivedActualEvents(projectionsByCrewId, evaluationWindow);
        addRosterEstimateEvents(rosterVersionId, actualTaskKeys, projectionsByCrewId);

        Map<Long, RuleDerivedFacts.CrewHourFact> factsByCrewId = new LinkedHashMap<>();
        for (MutableCrewHourProjection projection : projectionsByCrewId.values()) {
            factsByCrewId.put(projection.crewId, projection.toFact());
        }
        return factsByCrewId;
    }

    private Instant rosterBaselineUtc(Long rosterVersionId) {
        return rosterAnchorUtc(rosterVersionId, true)
            .or(() -> rosterAnchorUtc(rosterVersionId, false))
            .orElse(hourWindowClock.instant());
    }

    private Optional<Instant> rosterAnchorUtc(Long rosterVersionId, boolean excludeConfirmedActuals) {
        String actualFilter = excludeConfirmedActuals
            ? """
              AND (
                  tb.task_plan_item_id IS NULL
                  OR NOT EXISTS (
                      SELECT 1
                      FROM crew_archive_form caf
                      WHERE caf.flight_id = tb.task_plan_item_id
                        AND caf.form_status IN ('Completed', 'NoFlyingHourConfirmed')
                        AND caf.confirmed_at_utc IS NOT NULL
                  )
              )
            """
            : "";
        Timestamp anchorUtc = jdbcTemplate.queryForObject(
            """
            SELECT MIN(tb.start_utc)
            FROM timeline_block tb
            LEFT JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tb.roster_version_id = ?
              AND tb.status <> 'CANCELLED'
              AND tb.start_utc IS NOT NULL
              AND tb.end_utc IS NOT NULL
              AND tb.start_utc < tb.end_utc
              AND (tpi.id IS NULL OR tpi.status <> 'CANCELLED')
            """ + actualFilter,
            Timestamp.class,
            rosterVersionId
        );
        return Optional.ofNullable(anchorUtc).map(Timestamp::toInstant);
    }

    private ProjectionEvaluationWindow rosterEvaluationWindow(Long rosterVersionId, Instant fallbackUtc) {
        return jdbcTemplate.query(
            """
            SELECT MIN(tb.start_utc) AS start_utc, MAX(tb.end_utc) AS end_utc
            FROM timeline_block tb
            LEFT JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tb.roster_version_id = ?
              AND tb.status <> 'CANCELLED'
              AND tb.start_utc IS NOT NULL
              AND tb.end_utc IS NOT NULL
              AND tb.start_utc < tb.end_utc
              AND (tpi.id IS NULL OR tpi.status <> 'CANCELLED')
            """,
            rs -> {
                if (!rs.next()) {
                    return new ProjectionEvaluationWindow(fallbackUtc, fallbackUtc);
                }
                Instant startUtc = nullableInstant(rs, "start_utc");
                Instant endUtc = nullableInstant(rs, "end_utc");
                if (!validRange(startUtc, endUtc)) {
                    return new ProjectionEvaluationWindow(fallbackUtc, fallbackUtc);
                }
                return new ProjectionEvaluationWindow(startUtc, endUtc);
            },
            rosterVersionId
        );
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

    private ActualTaskKeys addArchivedActualEvents(
        Map<Long, MutableCrewHourProjection> projectionsByCrewId,
        ProjectionEvaluationWindow evaluationWindow
    ) {
        Set<CrewTaskKey> actualDutyTaskKeys = new HashSet<>();
        Set<CrewTaskKey> actualFlightTaskKeys = new HashSet<>();
        Instant archiveLookbackStartUtc = evaluationWindow.archiveLookbackStartUtc();
        Instant archiveLookbackEndUtc = evaluationWindow.archiveLookbackEndUtc();
        jdbcTemplate.query(
            """
            SELECT DISTINCT
              caf.crew_id,
              caf.flight_id,
              caf.actual_duty_start_utc,
              caf.actual_duty_end_utc,
              caf.actual_fdp_start_utc,
              caf.actual_fdp_end_utc,
              caf.flying_hour_minutes,
              caf.no_flying_hour_flag
            FROM crew_archive_form caf
            JOIN flight_archive_case fac
              ON fac.id = caf.archive_case_id
             AND fac.flight_id = caf.flight_id
            JOIN timeline_block tb
              ON tb.roster_version_id = fac.roster_version_id
             AND tb.task_plan_item_id = caf.flight_id
             AND tb.crew_member_id = caf.crew_id
             AND tb.status = 'PUBLISHED'
            JOIN task_plan_item tpi
              ON tpi.id = caf.flight_id
             AND tpi.status = 'PUBLISHED'
            WHERE caf.crew_id IS NOT NULL
              AND caf.form_status IN ('Completed', 'NoFlyingHourConfirmed')
              AND caf.confirmed_at_utc IS NOT NULL
              AND COALESCE(caf.actual_duty_end_utc, caf.actual_fdp_end_utc) > ?
              AND COALESCE(caf.actual_duty_start_utc, caf.actual_fdp_start_utc) < ?
            """,
            rs -> {
                Long crewId = rs.getLong("crew_id");
                Long flightId = nullableLong(rs, "flight_id");
                MutableCrewHourProjection projection = projectionsByCrewId.get(crewId);
                if (projection == null) {
                    return;
                }
                CrewTaskKey crewTaskKey = flightId == null ? null : new CrewTaskKey(crewId, flightId);

                Instant dutyStart = nullableInstant(rs, "actual_duty_start_utc");
                Instant dutyEnd = nullableInstant(rs, "actual_duty_end_utc");
                if (validRange(dutyStart, dutyEnd)) {
                    projection.addDutyEvent(new HourEvent(
                        dutyStart,
                        dutyEnd,
                        minutesBetween(dutyStart, dutyEnd),
                        SOURCE_ARCHIVE_ACTUAL
                    ));
                    if (crewTaskKey != null) {
                        actualDutyTaskKeys.add(crewTaskKey);
                    }
                }

                boolean noFlyingHour = rs.getBoolean("no_flying_hour_flag");
                Integer flyingHourMinutes = nullableInteger(rs, "flying_hour_minutes");
                Instant fdpStart = nullableInstant(rs, "actual_fdp_start_utc");
                Instant flightEnd = nullableInstant(rs, "actual_fdp_end_utc");
                if (noFlyingHour) {
                    if (crewTaskKey != null) {
                        actualFlightTaskKeys.add(crewTaskKey);
                    }
                } else if (flyingHourMinutes != null && flyingHourMinutes > 0) {
                    Instant eventStart = validRange(fdpStart, flightEnd) ? fdpStart : dutyStart;
                    Instant eventEnd = validRange(fdpStart, flightEnd) ? flightEnd : dutyEnd;
                    if (validRange(eventStart, eventEnd)) {
                        int boundedFlyingMinutes = Math.min(
                            flyingHourMinutes,
                            Math.toIntExact(minutesBetween(eventStart, eventEnd))
                        );
                        if (boundedFlyingMinutes <= 0) {
                            return;
                        }
                        projection.addFlightEvent(new HourEvent(
                            eventEnd.minus(Duration.ofMinutes(boundedFlyingMinutes)),
                            eventEnd,
                            boundedFlyingMinutes,
                            SOURCE_ARCHIVE_ACTUAL
                        ));
                        if (crewTaskKey != null) {
                            actualFlightTaskKeys.add(crewTaskKey);
                        }
                    }
                }
            },
            Timestamp.from(archiveLookbackStartUtc),
            Timestamp.from(archiveLookbackEndUtc)
        );
        return new ActualTaskKeys(actualDutyTaskKeys, actualFlightTaskKeys);
    }

    private void addRosterEstimateEvents(
        Long rosterVersionId,
        ActualTaskKeys actualTaskKeys,
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
              AND tb.status <> 'CANCELLED'
              AND (tpi.id IS NULL OR tpi.status <> 'CANCELLED')
            """,
            rs -> {
                Long crewId = rs.getLong("crew_member_id");
                Long taskId = nullableLong(rs, "task_plan_item_id");
                CrewTaskKey crewTaskKey = taskId == null ? null : new CrewTaskKey(crewId, taskId);

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
                boolean hasActualDuty = crewTaskKey != null && actualTaskKeys.dutyTaskKeys().contains(crewTaskKey);
                if (DUTY_BLOCK_TYPES.contains(blockType) && !hasActualDuty) {
                    projection.addDutyEvent(new HourEvent(start, end, minutes, SOURCE_ROSTER_PROJECTION));
                }
                boolean hasActualFlight = crewTaskKey != null && actualTaskKeys.flightTaskKeys().contains(crewTaskKey);
                if ((FLIGHT_BLOCK_TYPE.equals(blockType) || FLIGHT_BLOCK_TYPE.equals(rs.getString("task_type"))) && !hasActualFlight) {
                    projection.addFlightEvent(new HourEvent(start, end, minutes, SOURCE_ROSTER_PROJECTION));
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

    private static RuleDerivedFacts.CrewHourWindow rollingPeakWindow(
        List<HourEvent> events,
        Duration window,
        String source,
        ProjectionEvaluationWindow evaluationWindow
    ) {
        long peak = 0;
        Instant peakStart = null;
        Instant peakEnd = null;
        List<RuleDerivedFacts.CrewHourContributor> peakContributors = List.of();
        TreeSet<Instant> checkpoints = new TreeSet<>();
        for (HourEvent event : events) {
            checkpoints.add(event.start());
            checkpoints.add(event.end());
            checkpoints.add(event.start().plus(window));
            checkpoints.add(event.end().plus(window));
        }
        for (Instant windowEnd : checkpoints) {
            Instant windowStart = windowEnd.minus(window);
            if (!evaluationWindow.intersects(windowStart, windowEnd)) {
                continue;
            }
            long total = 0;
            List<RuleDerivedFacts.CrewHourContributor> contributors = new ArrayList<>();
            for (HourEvent event : events) {
                long overlapMinutes = overlapMinutes(event, windowStart, windowEnd);
                total += overlapMinutes;
                if (overlapMinutes > 0) {
                    contributors.add(contributor(event, windowStart, windowEnd, overlapMinutes));
                }
            }
            if (total > peak) {
                peak = total;
                peakStart = windowStart;
                peakEnd = windowEnd;
                peakContributors = contributors;
            }
        }
        return new RuleDerivedFacts.CrewHourWindow(peakStart, peakEnd, peak, source, peakContributors);
    }

    private static RuleDerivedFacts.CrewHourWindow fixedTwelveMonthsToPreviousMonthWindow(
        List<HourEvent> events,
        Instant baselineUtc
    ) {
        YearMonth currentMonth = YearMonth.from(baselineUtc.atZone(HOUR_WINDOW_ZONE));
        return fixedTwelveMonthsToPreviousMonthWindow(events, currentMonth);
    }

    private static RuleDerivedFacts.CrewHourWindow twelveMonthsToPreviousMonthPeakWindow(
        List<HourEvent> events,
        ProjectionEvaluationWindow evaluationWindow
    ) {
        List<HourEvent> actualEvents = events.stream()
            .filter(event -> SOURCE_ARCHIVE_ACTUAL.equals(event.source()))
            .toList();
        YearMonth startMonth = YearMonth.from(evaluationWindow.startUtc().atZone(HOUR_WINDOW_ZONE));
        YearMonth endMonth = YearMonth.from(evaluationWindow.endUtc().atZone(HOUR_WINDOW_ZONE));
        RuleDerivedFacts.CrewHourWindow peakWindow = null;
        for (YearMonth month = startMonth; !month.isAfter(endMonth); month = month.plusMonths(1)) {
            RuleDerivedFacts.CrewHourWindow candidate = fixedTwelveMonthsToPreviousMonthWindow(actualEvents, month);
            if (peakWindow == null || candidate.actualMinutes() > peakWindow.actualMinutes()) {
                peakWindow = candidate;
            }
        }
        return peakWindow == null
            ? fixedTwelveMonthsToPreviousMonthWindow(actualEvents, startMonth)
            : peakWindow;
    }

    private static RuleDerivedFacts.CrewHourWindow fixedTwelveMonthsToPreviousMonthWindow(
        List<HourEvent> events,
        YearMonth currentMonth
    ) {
        Instant windowStart = currentMonth.minusMonths(12).atDay(1).atStartOfDay().toInstant(HOUR_WINDOW_ZONE);
        Instant windowEnd = currentMonth.atDay(1).atStartOfDay().toInstant(HOUR_WINDOW_ZONE);
        long total = 0;
        List<RuleDerivedFacts.CrewHourContributor> contributors = new ArrayList<>();
        for (HourEvent event : events) {
            long overlapMinutes = overlapMinutes(event, windowStart, windowEnd);
            total += overlapMinutes;
            if (overlapMinutes > 0) {
                contributors.add(contributor(event, windowStart, windowEnd, overlapMinutes));
            }
        }
        return new RuleDerivedFacts.CrewHourWindow(
            windowStart,
            windowEnd,
            total,
            "TWELVE_MONTHS_TO_PREVIOUS_MONTH",
            contributors
        );
    }

    private static Instant twelveMonthWindowStartUtc(Instant baselineUtc) {
        YearMonth currentMonth = YearMonth.from(baselineUtc.atZone(HOUR_WINDOW_ZONE));
        return currentMonth.minusMonths(12).atDay(1).atStartOfDay().toInstant(HOUR_WINDOW_ZONE);
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

    private static RuleDerivedFacts.CrewHourContributor contributor(
        HourEvent event,
        Instant windowStart,
        Instant windowEnd,
        long minutes
    ) {
        Instant overlapStart = event.start().isAfter(windowStart) ? event.start() : windowStart;
        Instant overlapEnd = event.end().isBefore(windowEnd) ? event.end() : windowEnd;
        return new RuleDerivedFacts.CrewHourContributor(event.source(), overlapStart, overlapEnd, minutes);
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

    private record ActualTaskKeys(Set<CrewTaskKey> dutyTaskKeys, Set<CrewTaskKey> flightTaskKeys) {
    }

    private record ProjectionEvaluationWindow(Instant startUtc, Instant endUtc) {
        private boolean intersects(Instant windowStartUtc, Instant windowEndUtc) {
            return windowEndUtc.isAfter(startUtc) && windowStartUtc.isBefore(endUtc);
        }

        private Instant archiveLookbackStartUtc() {
            Instant rollingLookbackStartUtc = startUtc.minus(Duration.ofDays(28));
            YearMonth firstEvaluationMonth = YearMonth.from(startUtc.atZone(HOUR_WINDOW_ZONE));
            Instant twelveMonthLookbackStartUtc = firstEvaluationMonth.minusMonths(12)
                .atDay(1)
                .atStartOfDay()
                .toInstant(HOUR_WINDOW_ZONE);
            return rollingLookbackStartUtc.isBefore(twelveMonthLookbackStartUtc)
                ? rollingLookbackStartUtc
                : twelveMonthLookbackStartUtc;
        }

        private Instant archiveLookbackEndUtc() {
            return endUtc;
        }
    }

    private record HourEvent(Instant start, Instant end, long minutes, String source) {
    }

    private static class MutableCrewHourProjection {
        private final Long crewId;
        private final ProjectionEvaluationWindow evaluationWindow;
        private final List<HourEvent> dutyEvents = new ArrayList<>();
        private final List<HourEvent> flightEvents = new ArrayList<>();

        private MutableCrewHourProjection(
            Long crewId,
            ProjectionEvaluationWindow evaluationWindow
        ) {
            this.crewId = crewId;
            this.evaluationWindow = evaluationWindow;
        }

        private void addDutyEvent(HourEvent event) {
            dutyEvents.add(event);
        }

        private void addFlightEvent(HourEvent event) {
            flightEvents.add(event);
        }

        private RuleDerivedFacts.CrewHourFact toFact() {
            RuleDerivedFacts.CrewHourWindow rolling7dDutyWindow = rollingPeakWindow(
                dutyEvents,
                Duration.ofDays(7),
                "ROLLING_7D_DUTY",
                evaluationWindow
            );
            RuleDerivedFacts.CrewHourWindow rolling14dDutyWindow = rollingPeakWindow(
                dutyEvents,
                Duration.ofDays(14),
                "ROLLING_14D_DUTY",
                evaluationWindow
            );
            RuleDerivedFacts.CrewHourWindow rolling28dDutyWindow = rollingPeakWindow(
                dutyEvents,
                Duration.ofDays(28),
                "ROLLING_28D_DUTY",
                evaluationWindow
            );
            RuleDerivedFacts.CrewHourWindow rolling28dFlightWindow = rollingPeakWindow(
                flightEvents,
                Duration.ofDays(28),
                "ROLLING_28D_FLIGHT",
                evaluationWindow
            );
            RuleDerivedFacts.CrewHourWindow rolling12mToPreviousMonthFlightWindow =
                twelveMonthsToPreviousMonthPeakWindow(flightEvents, evaluationWindow);
            return new RuleDerivedFacts.CrewHourFact(
                crewId,
                rolling7dDutyWindow.actualMinutes(),
                rolling14dDutyWindow.actualMinutes(),
                rolling28dDutyWindow.actualMinutes(),
                rolling28dFlightWindow.actualMinutes(),
                rolling12mToPreviousMonthFlightWindow.actualMinutes(),
                rolling7dDutyWindow,
                rolling14dDutyWindow,
                rolling28dDutyWindow,
                rolling28dFlightWindow,
                rolling12mToPreviousMonthFlightWindow
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
