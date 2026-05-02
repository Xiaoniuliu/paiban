package com.pilotroster.rule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RuleDerivedFactServiceIntegrationTests {

    @Autowired
    private RuleDerivedFactService ruleDerivedFactService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void buildLatestRosterFactsReturnsCrewHourMinuteSnapshotsForActiveCrew() {
        Long crewId = jdbcTemplate.queryForObject(
            "SELECT id FROM crew_member WHERE crew_code = 'CPT001'",
            Long.class
        );
        Long rosterVersionId = jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version ORDER BY id LIMIT 1",
            Long.class
        );

        jdbcTemplate.update("""
            UPDATE crew_member
            SET rolling_duty_hours_7d = 6.50,
                rolling_duty_hours_14d = 9.50,
                rolling_duty_hours_28d = 18.50,
                rolling_flight_hours_28d = 12.50,
                rolling_flight_hours_12m = 120.50,
                status = 'ACTIVE'
            WHERE id = ?
            """, crewId);

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isEqualTo(390);
        assertThat(crewHourFact.rolling14dDutyMinutes()).isEqualTo(570);
        assertThat(crewHourFact.rolling28dDutyMinutes()).isEqualTo(1_110);
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(750);
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isEqualTo(7_230);
    }

    @Test
    void buildLatestRosterFactsRejectsNullRosterVersionId() {
        assertThatNullPointerException()
            .isThrownBy(() -> ruleDerivedFactService.buildLatestRosterFacts(null))
            .withMessage("rosterVersionId");
    }
}
