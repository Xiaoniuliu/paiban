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
    private RuleEvaluationService ruleEvaluationService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void buildLatestRosterFactsUsesArchivedActualsAndFutureRosterProjectionForCrewHourFacts() {
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );

        jdbcTemplate.update("""
            INSERT INTO crew_member (
                crew_code, employee_no, name_zh, name_en, role_code, rank_code, home_base,
                aircraft_qualification, acclimatization_status, rolling_flight_hours_28d,
                rolling_duty_hours_28d, rolling_duty_hours_7d, rolling_duty_hours_14d,
                rolling_flight_hours_12m, status
            )
            VALUES (
                'TSTHOUR01', 'TSTHOUR01', '测试小时', 'Test Hour', 'CAPTAIN', 'CAPT', 'MFM',
                'A330', 'ACCLIMATIZED', 0, 0, 0, 0, 0, 'ACTIVE'
            )
            """);
        Long crewId = jdbcTemplate.queryForObject(
            "SELECT id FROM crew_member WHERE crew_code = 'TSTHOUR01'",
            Long.class
        );
        jdbcTemplate.update("""
            INSERT INTO roster_version (version_no, status, created_by)
            VALUES ('RV-TST-HOUR-PROJECTION', 'DRAFT', ?)
            """, userId);
        Long rosterVersionId = jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version WHERE version_no = 'RV-TST-HOUR-PROJECTION'",
            Long.class
        );

        jdbcTemplate.update("""
            INSERT INTO task_plan_item (
                batch_id, task_code, task_type, departure_airport, arrival_airport,
                scheduled_start_utc, scheduled_end_utc, sector_count, status
            )
            VALUES (?, 'TST-ACTUAL-001', 'FLIGHT', 'MFM', 'TPE',
                    '2026-05-01 00:00:00', '2026-05-01 04:00:00', 1, 'ASSIGNED')
            """, batchId);
        jdbcTemplate.update("""
            INSERT INTO task_plan_item (
                batch_id, task_code, task_type, departure_airport, arrival_airport,
                scheduled_start_utc, scheduled_end_utc, sector_count, status
            )
            VALUES (?, 'TST-FUTURE-001', 'FLIGHT', 'MFM', 'SIN',
                    '2026-05-03 00:00:00', '2026-05-03 06:00:00', 1, 'ASSIGNED')
            """, batchId);
        Long actualTaskId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = 'TST-ACTUAL-001'",
            Long.class
        );
        Long futureTaskId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = 'TST-FUTURE-001'",
            Long.class
        );

        jdbcTemplate.update("""
            INSERT INTO timeline_block (
                roster_version_id, crew_member_id, task_plan_item_id, block_type,
                start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, ?, 'FLIGHT', '2026-05-01 00:00:00', '2026-05-01 04:00:00',
                    'TST-ACTUAL-001 MFM-TPE', 'PLANNED', 'PIC', 0)
            """, rosterVersionId, crewId, actualTaskId);
        jdbcTemplate.update("""
            INSERT INTO timeline_block (
                roster_version_id, crew_member_id, task_plan_item_id, block_type,
                start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, ?, 'FLIGHT', '2026-05-03 00:00:00', '2026-05-03 06:00:00',
                    'TST-FUTURE-001 MFM-SIN', 'PLANNED', 'PIC', 0)
            """, rosterVersionId, crewId, futureTaskId);

        jdbcTemplate.update("""
            INSERT INTO flight_archive_case (
                flight_id, roster_version_id, archive_status, archive_deadline_at_utc,
                archived_at_utc, completed_count, total_count
            )
            VALUES (?, ?, 'ARCHIVED', '2026-05-02 04:00:00', '2026-05-02 02:00:00', 1, 1)
            """, actualTaskId, rosterVersionId);
        Long archiveCaseId = jdbcTemplate.queryForObject(
            "SELECT id FROM flight_archive_case WHERE flight_id = ?",
            Long.class,
            actualTaskId
        );
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-01 00:00:00', '2026-05-01 05:00:00',
                    '2026-05-01 00:20:00', '2026-05-01 04:10:00', 210,
                    FALSE, 'Completed', ?, '2026-05-02 01:00:00', '2026-05-02 01:00:00')
            """, archiveCaseId, actualTaskId, crewId, userId);

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isEqualTo(660);
        assertThat(crewHourFact.rolling14dDutyMinutes()).isEqualTo(660);
        assertThat(crewHourFact.rolling28dDutyMinutes()).isEqualTo(660);
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(570);
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isEqualTo(570);
    }

    @Test
    void buildLatestRosterFactsStartsAtZeroWhenCrewHasNoProjectionEvents() {
        Long crewId = insertActiveCrew("TSTSNAP01");
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
        assertThat(crewHourFact.rolling7dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling14dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling28dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling28dFlightMinutes()).isZero();
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isZero();
    }

    @Test
    void buildCrewHourCompatibilityFactsUsesLatestProjectionWithoutLegacyCrewSnapshot() {
        Long crewId = insertActiveCrew("TSTSNAP02");

        jdbcTemplate.update("""
            UPDATE crew_member
            SET rolling_duty_hours_7d = 3.25,
                rolling_duty_hours_14d = 4.25,
                rolling_duty_hours_28d = 5.25,
                rolling_flight_hours_28d = 6.25,
                rolling_flight_hours_12m = 7.25,
                status = 'ACTIVE'
            WHERE id = ?
            """, crewId);

        RuleDerivedFacts.CrewHourFact crewHourFact = ruleDerivedFactService
            .buildCrewHourCompatibilityFacts()
            .get(crewId);

        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling14dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling28dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling28dFlightMinutes()).isZero();
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isZero();
    }

    @Test
    void evaluateLatestRosterCreatesHourRuleHitsFromProjectedRosterHours() {
        Long crewId = insertActiveCrew("TSTHIT01");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-HIT");
        Long taskId = insertFlightTask(
            "TST-HIT-001",
            "2026-05-01 00:00:00",
            "2026-06-08 00:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            taskId,
            "2026-05-01 00:00:00",
            "2026-06-08 00:00:00"
        );

        RuleEvaluationService.RuleEvaluationResult result = ruleEvaluationService.evaluateLatestRoster();

        assertThat(result.issues())
            .filteredOn(issue -> crewId.equals(issue.crewId()))
            .extracting(RuleEvaluationService.RuleHitIssue::ruleId)
            .contains(
                "RG-HOUR-001",
                "RG-HOUR-002",
                "RG-HOUR-003",
                "RG-HOUR-006",
                "RG-HOUR-007"
            );
        assertThat(result.issues())
            .filteredOn(issue -> crewId.equals(issue.crewId()) && issue.ruleId().startsWith("RG-HOUR-"))
            .allSatisfy(issue -> {
                assertThat(issue.severity()).isEqualTo("BLOCK");
                assertThat(issue.status()).isEqualTo("OPEN");
                assertThat(issue.targetType()).isEqualTo("CREW");
                assertThat(issue.targetId()).isEqualTo(crewId);
            });
    }

    @Test
    void buildLatestRosterFactsRejectsNullRosterVersionId() {
        assertThatNullPointerException()
            .isThrownBy(() -> ruleDerivedFactService.buildLatestRosterFacts(null))
            .withMessage("rosterVersionId");
    }

    private Long insertActiveCrew(String crewCode) {
        jdbcTemplate.update("""
            INSERT INTO crew_member (
                crew_code, employee_no, name_zh, name_en, role_code, rank_code, home_base,
                aircraft_qualification, acclimatization_status, rolling_flight_hours_28d,
                rolling_duty_hours_28d, rolling_duty_hours_7d, rolling_duty_hours_14d,
                rolling_flight_hours_12m, status
            )
            VALUES (?, ?, ?, ?, 'CAPTAIN', 'CAPT', 'MFM', 'A330', 'ACCLIMATIZED', 0, 0, 0, 0, 0, 'ACTIVE')
            """, crewCode, crewCode, "测试" + crewCode, "Test " + crewCode);
        return jdbcTemplate.queryForObject(
            "SELECT id FROM crew_member WHERE crew_code = ?",
            Long.class,
            crewCode
        );
    }

    private Long insertRosterVersion(String versionNo) {
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        jdbcTemplate.update(
            "INSERT INTO roster_version (version_no, status, created_by) VALUES (?, 'DRAFT', ?)",
            versionNo,
            userId
        );
        return jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version WHERE version_no = ?",
            Long.class,
            versionNo
        );
    }

    private Long insertFlightTask(String taskCode, String startUtc, String endUtc) {
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        jdbcTemplate.update("""
            INSERT INTO task_plan_item (
                batch_id, task_code, task_type, departure_airport, arrival_airport,
                scheduled_start_utc, scheduled_end_utc, sector_count, status
            )
            VALUES (?, ?, 'FLIGHT', 'MFM', 'TPE', ?, ?, 1, 'ASSIGNED')
            """, batchId, taskCode, startUtc, endUtc);
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            Long.class,
            taskCode
        );
    }

    private void insertFlightBlock(Long rosterVersionId, Long crewId, Long taskId, String startUtc, String endUtc) {
        jdbcTemplate.update("""
            INSERT INTO timeline_block (
                roster_version_id, crew_member_id, task_plan_item_id, block_type,
                start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, ?, 'FLIGHT', ?, ?, 'TEST HOUR FLIGHT', 'PLANNED', 'PIC', 0)
            """, rosterVersionId, crewId, taskId, startUtc, endUtc);
    }
}
