package com.pilotroster.rule;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

@Component
public class CrewHourFactBuilder {

    private static final BigDecimal MINUTES_PER_HOUR = BigDecimal.valueOf(60);

    private final JdbcTemplate jdbcTemplate;

    public CrewHourFactBuilder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<Long, RuleDerivedFacts.CrewHourFact> build(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
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

    private static long toMinutes(BigDecimal hours) {
        if (hours == null) {
            return 0;
        }
        return hours.multiply(MINUTES_PER_HOUR)
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact();
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
