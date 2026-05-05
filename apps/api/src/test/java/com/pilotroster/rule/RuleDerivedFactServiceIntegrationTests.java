package com.pilotroster.rule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
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
    private DdoFactBuilder ddoFactBuilder;

    @Autowired
    private FdpRestFactBuilder fdpRestFactBuilder;

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
                    '2026-05-01 00:00:00', '2026-05-01 04:00:00', 1, 'PUBLISHED')
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
                    'TST-ACTUAL-001 MFM-TPE', 'PUBLISHED', 'PIC', 0)
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

        RuleDerivedFacts facts = fixedClockService("2026-05-02T00:00:00Z").buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isEqualTo(660);
        assertThat(crewHourFact.rolling14dDutyMinutes()).isEqualTo(660);
        assertThat(crewHourFact.rolling28dDutyMinutes()).isEqualTo(660);
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(570);
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isZero();
    }

    @Test
    void buildLatestRosterFactsIgnoresIncompleteArchivedActualsForCrewHourFacts() {
        Long crewId = insertActiveCrew("TSTHOUR02");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-INCOMPLETE");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long notStartedTaskId = insertFlightTask(
            "TST-INCOMPLETE-001",
            "2026-05-04 00:00:00",
            "2026-05-04 04:00:00"
        );
        Long unconfirmedTaskId = insertFlightTask(
            "TST-INCOMPLETE-002",
            "2026-05-05 00:00:00",
            "2026-05-05 06:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            notStartedTaskId,
            "2026-05-04 00:00:00",
            "2026-05-04 04:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            unconfirmedTaskId,
            "2026-05-05 00:00:00",
            "2026-05-05 06:00:00"
        );

        Long notStartedArchiveCaseId = insertArchiveCase(notStartedTaskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, no_flying_hour_flag,
                form_status, entered_by, entered_at_utc
            )
            VALUES (?, ?, ?, FALSE, 'NotStarted', ?, '2026-05-04 08:00:00')
            """, notStartedArchiveCaseId, notStartedTaskId, crewId, userId);
        Long unconfirmedArchiveCaseId = insertArchiveCase(unconfirmedTaskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc
            )
            VALUES (?, ?, ?, '2026-05-05 00:00:00', '2026-05-05 02:00:00',
                    '2026-05-05 00:10:00', '2026-05-05 01:40:00', 90,
                    FALSE, 'Completed', ?, '2026-05-05 08:00:00')
            """, unconfirmedArchiveCaseId, unconfirmedTaskId, crewId, userId);

        RuleDerivedFacts facts = fixedClockService("2026-05-02T00:00:00Z").buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isEqualTo(600);
        assertThat(crewHourFact.rolling14dDutyMinutes()).isEqualTo(600);
        assertThat(crewHourFact.rolling28dDutyMinutes()).isEqualTo(600);
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(600);
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isZero();
    }

    @Test
    void buildLatestRosterFactsSuppressesPlannedEventOnlyWhenArchivedActualHasValidHourEvent() {
        Long crewId = insertActiveCrew("TSTHOUR03");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-ACTUAL-VALIDITY");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long invalidActualTaskId = insertFlightTask(
            "TST-ACTUAL-INVALID-001",
            "2026-05-07 00:00:00",
            "2026-05-07 04:00:00"
        );
        Long validActualTaskId = insertFlightTask(
            "TST-ACTUAL-VALID-001",
            "2026-05-08 00:00:00",
            "2026-05-08 04:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            invalidActualTaskId,
            "2026-05-07 00:00:00",
            "2026-05-07 04:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            validActualTaskId,
            "2026-05-08 00:00:00",
            "2026-05-08 04:00:00"
        );

        Long invalidArchiveCaseId = insertArchiveCase(invalidActualTaskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, no_flying_hour_flag,
                form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, FALSE, 'Completed', ?, '2026-05-07 08:00:00', '2026-05-07 08:00:00')
            """, invalidArchiveCaseId, invalidActualTaskId, crewId, userId);
        Long validArchiveCaseId = insertArchiveCase(validActualTaskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-08 00:30:00', '2026-05-08 02:30:00',
                    '2026-05-08 00:45:00', '2026-05-08 02:15:00', 90,
                    FALSE, 'Completed', ?, '2026-05-08 08:00:00', '2026-05-08 08:00:00')
            """, validArchiveCaseId, validActualTaskId, crewId, userId);

        RuleDerivedFacts facts = fixedClockService("2026-05-02T00:00:00Z").buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isEqualTo(360);
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(330);
    }

    @Test
    void buildLatestRosterFactsKeepsPlannedFlightWhenArchivedActualOnlyHasDutyHours() {
        Long crewId = insertActiveCrew("TSTHOUR03B");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-ACTUAL-PARTIAL");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long taskId = insertFlightTask(
            "TST-ACTUAL-PARTIAL-001",
            "2026-05-08 00:00:00",
            "2026-05-08 04:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            taskId,
            "2026-05-08 00:00:00",
            "2026-05-08 04:00:00"
        );
        Long archiveCaseId = insertArchiveCase(taskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-08 00:30:00', '2026-05-08 02:30:00',
                    '2026-05-08 00:45:00', '2026-05-08 02:15:00', NULL,
                    FALSE, 'Completed', ?, '2026-05-08 08:00:00', '2026-05-08 08:00:00')
            """, archiveCaseId, taskId, crewId, userId);

        RuleDerivedFacts facts = fixedClockService("2026-05-02T00:00:00Z").buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isEqualTo(120);
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(240);
    }

    @Test
    void buildLatestRosterFactsCapsArchivedFlyingHoursToActualFdpBounds() {
        Long crewId = insertActiveCrew("TSTHOUR03D");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-ACTUAL-CAPPED");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long taskId = insertFlightTask(
            "TST-ACTUAL-CAPPED-001",
            "2026-05-08 00:00:00",
            "2026-05-08 08:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            taskId,
            "2026-05-08 00:00:00",
            "2026-05-08 08:00:00"
        );
        Long archiveCaseId = insertArchiveCase(taskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-08 00:00:00', '2026-05-08 08:00:00',
                    '2026-05-08 01:00:00', '2026-05-08 03:00:00', 600,
                    FALSE, 'Completed', ?, '2026-05-08 08:30:00', '2026-05-08 08:30:00')
            """, archiveCaseId, taskId, crewId, userId);

        RuleDerivedFacts facts = fixedClockService("2026-05-02T00:00:00Z").buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(120);
    }

    @Test
    void buildLatestRosterFactsIgnoresArchivedActualsOutsidePublishedRosterScope() {
        Long crewId = insertActiveCrew("TSTHOUR03C");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-ACTUAL-SCOPE");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long taskId = insertFlightTask(
            "TST-ACTUAL-SCOPE-001",
            "2026-05-08 00:00:00",
            "2026-05-08 04:00:00"
        );
        Long archiveCaseId = insertArchiveCase(taskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-08 00:00:00', '2026-05-08 04:00:00',
                    '2026-05-08 00:00:00', '2026-05-08 04:00:00', 240,
                    FALSE, 'Completed', ?, '2026-05-08 08:00:00', '2026-05-08 08:00:00')
            """, archiveCaseId, taskId, crewId, userId);

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling28dFlightMinutes()).isZero();
    }

    @Test
    void buildLatestRosterFactsIgnoresArchivedActualsWhenTaskIsNoLongerPublished() {
        Long crewId = insertActiveCrew("TSTHOUR03E");
        Long staleRosterVersionId = insertRosterVersion("RV-TST-HOUR-ACTUAL-STALE-TASK");
        Long staleTaskId = insertFlightTask(
            "TST-ACTUAL-STALE-TASK-001",
            "2026-04-10 00:00:00",
            "2026-04-20 00:00:00"
        );
        insertFlightBlock(
            staleRosterVersionId,
            crewId,
            staleTaskId,
            "2026-04-10 00:00:00",
            "2026-04-20 00:00:00"
        );
        Long archiveCaseId = insertArchiveCase(staleTaskId, staleRosterVersionId);
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'ASSIGNED_DRAFT' WHERE id = ?", staleTaskId);
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-04-10 00:00:00', '2026-04-20 00:00:00',
                    '2026-04-10 00:00:00', '2026-04-20 00:00:00', 14400,
                    FALSE, 'Completed', ?, '2026-04-20 01:00:00', '2026-04-20 01:00:00')
            """, archiveCaseId, staleTaskId, crewId, userId);

        Long currentRosterVersionId = insertRosterVersion("RV-TST-HOUR-ACTUAL-CURRENT-TASK");
        Long currentTaskId = insertFlightTask(
            "TST-ACTUAL-CURRENT-TASK-001",
            "2026-05-01 00:00:00",
            "2026-05-01 02:00:00"
        );
        insertFlightBlock(
            currentRosterVersionId,
            crewId,
            currentTaskId,
            "2026-05-01 00:00:00",
            "2026-05-01 02:00:00"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(currentRosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling28dDutyMinutes()).isEqualTo(120);
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(120);
    }

    @Test
    void buildLatestRosterFactsExcludesCancelledTasksAndBlocksFromCrewHourProjection() {
        Long crewId = insertActiveCrew("TSTHOUR04");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-CANCELLED");
        Long cancelledTaskId = insertFlightTask(
            "TST-CANCELLED-001",
            "2026-05-09 00:00:00",
            "2026-05-09 10:00:00"
        );
        Long cancelledBlockTaskId = insertFlightTask(
            "TST-CANCELLED-BLOCK-001",
            "2026-05-10 00:00:00",
            "2026-05-10 10:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            cancelledTaskId,
            "2026-05-09 00:00:00",
            "2026-05-09 10:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            cancelledBlockTaskId,
            "2026-05-10 00:00:00",
            "2026-05-10 10:00:00"
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'CANCELLED' WHERE id = ?", cancelledTaskId);
        jdbcTemplate.update("UPDATE timeline_block SET status = 'CANCELLED' WHERE task_plan_item_id = ?", cancelledBlockTaskId);

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling14dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling28dDutyMinutes()).isZero();
        assertThat(crewHourFact.rolling28dFlightMinutes()).isZero();
    }

    @Test
    void buildLatestRosterFactsCalculatesTwelveMonthFlightHoursOnlyThroughPreviousMonth() {
        Long crewId = insertActiveCrew("TSTHOUR05");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-12M-CALENDAR");
        Long aprilTaskId = insertFlightTask(
            "TST-APRIL-ACTUAL-001",
            "2026-03-20 00:00:00",
            "2026-03-20 02:00:00"
        );
        Long currentMonthTaskId = insertFlightTask(
            "TST-CURRENT-MONTH-001",
            "2026-05-01 00:00:00",
            "2026-05-01 10:00:00"
        );
        Long futureTaskId = insertFlightTask(
            "TST-FUTURE-MONTH-001",
            "2026-06-01 00:00:00",
            "2026-06-01 10:00:00"
        );
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long aprilArchiveCaseId = insertArchiveCase(aprilTaskId, rosterVersionId);
        insertFlightBlock(
            rosterVersionId,
            crewId,
            aprilTaskId,
            "2026-03-20 00:00:00",
            "2026-03-20 02:00:00"
        );
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-03-20 00:00:00', '2026-03-20 02:00:00',
                    '2026-03-20 00:00:00', '2026-03-20 02:00:00', 120,
                    FALSE, 'Completed', ?, '2026-03-20 08:00:00', '2026-03-20 08:00:00')
            """, aprilArchiveCaseId, aprilTaskId, crewId, userId);
        insertFlightBlock(
            rosterVersionId,
            crewId,
            currentMonthTaskId,
            "2026-05-01 00:00:00",
            "2026-05-01 10:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            futureTaskId,
            "2026-06-01 00:00:00",
            "2026-06-01 10:00:00"
        );

        RuleDerivedFacts facts = fixedClockService("2026-05-02T00:00:00Z").buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling28dFlightMinutes()).isEqualTo(600);
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isEqualTo(120);
    }

    @Test
    void buildLatestRosterFactsUsesRosterBaselineForTwelveMonthPreviousMonthFlightWindow() {
        Long crewId = insertActiveCrew("TSTHOUR06");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-12M-FIXED-CLOCK");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long aprilTaskId = insertFlightTask(
            "TST-FIXED-CLOCK-APRIL-001",
            "2026-04-20 00:00:00",
            "2026-04-20 12:00:00"
        );
        Long mayTaskId = insertFlightTask(
            "TST-FIXED-CLOCK-MAY-001",
            "2026-05-01 01:00:00",
            "2026-05-01 03:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            aprilTaskId,
            "2026-04-20 00:00:00",
            "2026-04-20 12:00:00"
        );
        Long aprilArchiveCaseId = insertArchiveCase(aprilTaskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-04-20 00:00:00', '2026-04-20 12:00:00',
                    '2026-04-20 00:00:00', '2026-04-20 12:00:00', 720,
                    FALSE, 'Completed', ?, '2026-04-20 13:00:00', '2026-04-20 13:00:00')
            """, aprilArchiveCaseId, aprilTaskId, crewId, userId);
        insertFlightBlock(
            rosterVersionId,
            crewId,
            mayTaskId,
            "2026-05-01 01:00:00",
            "2026-05-01 11:00:00"
        );

        RuleDerivedFacts mayClockFacts = fixedClockService("2026-05-15T12:00:00Z")
            .buildLatestRosterFacts(rosterVersionId);
        RuleDerivedFacts juneClockFacts = fixedClockService("2026-06-15T12:00:00Z")
            .buildLatestRosterFacts(rosterVersionId);

        assertThat(mayClockFacts.crewHourFactsByCrewId().get(crewId).rolling12mToPreviousMonthFlightMinutes())
            .isEqualTo(720);
        assertThat(juneClockFacts.crewHourFactsByCrewId().get(crewId).rolling12mToPreviousMonthFlightMinutes())
            .isEqualTo(720);
    }

    @Test
    void buildLatestRosterFactsEvaluatesTwelveMonthPreviousMonthAcrossRosterMonths() {
        Long crewId = insertActiveCrew("TSTHOUR06C");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-12M-CROSS-MONTH");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long mayActualTaskId = insertFlightTask(
            "TST-CROSS-MONTH-MAY-ACTUAL",
            "2026-05-10 00:00:00",
            "2026-05-10 10:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            mayActualTaskId,
            "2026-05-10 00:00:00",
            "2026-05-10 10:00:00"
        );
        Long archiveCaseId = insertArchiveCase(mayActualTaskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-10 00:00:00', '2026-05-10 10:00:00',
                    '2026-05-10 00:00:00', '2026-05-10 10:00:00', 600,
                    FALSE, 'Completed', ?, '2026-05-10 11:00:00', '2026-05-10 11:00:00')
            """, archiveCaseId, mayActualTaskId, crewId, userId);
        Long mayProjectionTaskId = insertFlightTask(
            "TST-CROSS-MONTH-MAY-PROJECTION",
            "2026-05-31 00:00:00",
            "2026-05-31 01:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            mayProjectionTaskId,
            "2026-05-31 00:00:00",
            "2026-05-31 01:00:00"
        );
        Long juneTaskId = insertFlightTask(
            "TST-CROSS-MONTH-JUNE-CURRENT",
            "2026-06-02 00:00:00",
            "2026-06-02 02:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            juneTaskId,
            "2026-06-02 00:00:00",
            "2026-06-02 02:00:00"
        );

        RuleDerivedFacts facts = fixedClockService("2026-07-15T12:00:00Z")
            .buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isEqualTo(600);
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightWindow().startUtc())
            .isEqualTo(Instant.parse("2025-06-01T00:00:00Z"));
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightWindow().endUtc())
            .isEqualTo(Instant.parse("2026-06-01T00:00:00Z"));
    }

    @Test
    void buildLatestRosterFactsLoadsTwelveMonthHistoryForFirstEvaluatedRosterMonth() {
        Long crewId = insertActiveCrew("TSTHOUR06D");
        Long historyRosterVersionId = insertRosterVersion("RV-TST-HOUR-12M-FIRST-MONTH-HISTORY");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long historyTaskId = insertFlightTask(
            "TST-FIRST-MONTH-HISTORY-ACTUAL",
            "2025-05-10 00:00:00",
            "2025-05-10 10:00:00"
        );
        insertFlightBlock(
            historyRosterVersionId,
            crewId,
            historyTaskId,
            "2025-05-10 00:00:00",
            "2025-05-10 10:00:00"
        );
        Long historyArchiveCaseId = insertArchiveCase(historyTaskId, historyRosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2025-05-10 00:00:00', '2025-05-10 10:00:00',
                    '2025-05-10 00:00:00', '2025-05-10 10:00:00', 600,
                    FALSE, 'Completed', ?, '2025-05-10 11:00:00', '2025-05-10 11:00:00')
            """, historyArchiveCaseId, historyTaskId, crewId, userId);

        Long currentRosterVersionId = insertRosterVersion("RV-TST-HOUR-12M-FIRST-MONTH-CURRENT");
        Long mayNoFlightTaskId = insertFlightTask(
            "TST-FIRST-MONTH-MAY-NO-FLIGHT",
            "2026-05-10 00:00:00",
            "2026-05-10 02:00:00"
        );
        insertFlightBlock(
            currentRosterVersionId,
            crewId,
            mayNoFlightTaskId,
            "2026-05-10 00:00:00",
            "2026-05-10 02:00:00"
        );
        Long mayArchiveCaseId = insertArchiveCase(mayNoFlightTaskId, currentRosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-10 00:00:00', '2026-05-10 02:00:00',
                    '2026-05-10 00:00:00', '2026-05-10 02:00:00', NULL,
                    TRUE, 'NoFlyingHourConfirmed', ?, '2026-05-10 03:00:00', '2026-05-10 03:00:00')
            """, mayArchiveCaseId, mayNoFlightTaskId, crewId, userId);
        Long juneTaskId = insertFlightTask(
            "TST-FIRST-MONTH-JUNE-PROJECTION",
            "2026-06-02 00:00:00",
            "2026-06-02 01:00:00"
        );
        insertFlightBlock(
            currentRosterVersionId,
            crewId,
            juneTaskId,
            "2026-06-02 00:00:00",
            "2026-06-02 01:00:00"
        );

        RuleDerivedFacts facts = fixedClockService("2026-07-15T12:00:00Z")
            .buildLatestRosterFacts(currentRosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightMinutes()).isEqualTo(600);
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightWindow().startUtc())
            .isEqualTo(Instant.parse("2025-05-01T00:00:00Z"));
        assertThat(crewHourFact.rolling12mToPreviousMonthFlightWindow().endUtc())
            .isEqualTo(Instant.parse("2026-05-01T00:00:00Z"));
    }

    @Test
    void buildLatestRosterFactsKeepsArchivedOnlyRosterBaselineStableAcrossClockMonths() {
        Long crewId = insertActiveCrew("TSTHOUR06B");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-12M-ARCHIVED-ONLY");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long taskId = insertFlightTask(
            "TST-ARCHIVED-ONLY-001",
            "2026-05-01 00:00:00",
            "2026-05-01 02:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            taskId,
            "2026-05-01 00:00:00",
            "2026-05-01 02:00:00"
        );
        Long archiveCaseId = insertArchiveCase(taskId, rosterVersionId);
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-05-01 00:00:00', '2026-05-01 02:00:00',
                    '2026-05-01 00:00:00', '2026-05-01 02:00:00', 120,
                    FALSE, 'Completed', ?, '2026-05-01 03:00:00', '2026-05-01 03:00:00')
            """, archiveCaseId, taskId, crewId, userId);

        RuleDerivedFacts mayClockFacts = fixedClockService("2026-05-15T12:00:00Z")
            .buildLatestRosterFacts(rosterVersionId);
        RuleDerivedFacts juneClockFacts = fixedClockService("2026-06-15T12:00:00Z")
            .buildLatestRosterFacts(rosterVersionId);

        assertThat(mayClockFacts.crewHourFactsByCrewId().get(crewId).rolling12mToPreviousMonthFlightMinutes())
            .isZero();
        assertThat(juneClockFacts.crewHourFactsByCrewId().get(crewId).rolling12mToPreviousMonthFlightMinutes())
            .isZero();
    }

    @Test
    void buildLatestRosterFactsFindsRollingDutyPeakAtWindowBoundaryWithOverlaps() {
        Long crewId = insertActiveCrew("TSTHOUR07");
        Long rosterVersionId = insertRosterVersion("RV-TST-HOUR-PEAK-BOUNDARY");
        Long firstOverlapTaskId = insertFlightTask(
            "TST-PEAK-A-001",
            "2026-05-01 00:00:00",
            "2026-05-01 10:00:00"
        );
        Long secondOverlapTaskId = insertFlightTask(
            "TST-PEAK-A-002",
            "2026-05-01 00:00:00",
            "2026-05-01 10:00:00"
        );
        Long boundaryTaskId = insertFlightTask(
            "TST-PEAK-B-001",
            "2026-05-07 23:00:00",
            "2026-05-08 05:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            firstOverlapTaskId,
            "2026-05-01 00:00:00",
            "2026-05-01 10:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            secondOverlapTaskId,
            "2026-05-01 00:00:00",
            "2026-05-01 10:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            boundaryTaskId,
            "2026-05-07 23:00:00",
            "2026-05-08 05:00:00"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.CrewHourFact crewHourFact = facts.crewHourFactsByCrewId().get(crewId);
        assertThat(crewHourFact).isNotNull();
        assertThat(crewHourFact.rolling7dDutyMinutes()).isEqualTo(1_260);
        assertThat(crewHourFact.rolling7dDutyWindow().endUtc()).isEqualTo(Instant.parse("2026-05-08T00:00:00Z"));
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
        Long laterTaskId = insertFlightTask(
            "TST-HIT-LATER-001",
            "2026-08-01 00:00:00",
            "2026-08-01 01:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            taskId,
            "2026-05-01 00:00:00",
            "2026-06-08 00:00:00"
        );
        Long laterCrewId = insertActiveCrew("TSTHIT02");
        insertFlightBlock(
            rosterVersionId,
            laterCrewId,
            laterTaskId,
            "2026-08-01 00:00:00",
            "2026-08-01 01:00:00"
        );
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        Long archiveTaskId = insertFlightTask(
            "TST-HIT-ARCHIVE-001",
            "2026-04-01 00:00:00",
            "2026-04-30 23:00:00"
        );
        Long archiveCaseId = insertArchiveCase(archiveTaskId, rosterVersionId);
        insertFlightBlock(
            rosterVersionId,
            crewId,
            archiveTaskId,
            "2026-04-01 00:00:00",
            "2026-04-30 23:00:00"
        );
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-03-01 00:00:00', '2026-04-30 23:00:00',
                    '2026-03-01 00:00:00', '2026-04-30 23:00:00', 55001,
                    FALSE, 'Completed', ?, '2026-04-30 23:30:00', '2026-04-30 23:30:00')
            """, archiveCaseId, archiveTaskId, crewId, userId);

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
                assertThat(issue.evidenceWindowStartUtc()).isNotNull();
                assertThat(issue.evidenceWindowEndUtc()).isNotNull();
                assertThat(issue.evidenceWindowEndUtc().toString()).isNotEqualTo("2026-08-01T01:00:00Z");
            });
        var hourHitEvidence = jdbcTemplate.queryForList(
            """
            SELECT rc.rule_id, vh.evidence_json
            FROM violation_hit vh
            JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
            WHERE vh.roster_version_id = ?
              AND vh.crew_id = ?
              AND rc.rule_id LIKE 'RG-HOUR-%'
            ORDER BY rc.rule_id
            """,
            rosterVersionId,
            crewId
        );
        assertThat(hourHitEvidence).isNotEmpty();
        assertThat(hourHitEvidence).allSatisfy(row -> {
            String ruleId = row.get("rule_id").toString();
            String evidenceJson = row.get("evidence_json").toString();
            assertThat(evidenceJson)
                .contains("\"phase\"")
                .contains("\"PHASE_3\"")
                .contains("\"ruleId\"")
                .contains("\"" + ruleId + "\"")
                .contains("\"window\"")
                .contains("\"actual\"")
                .contains("\"limit\"")
                .contains("\"source\"")
                .contains("\"contributors\"");
            assertThat(evidenceJson)
                .containsAnyOf("\"predicate\"", "\"operator\"");
        });
    }

    @Test
    void evaluateLatestRosterIgnoresCrewHourLimitFactsForCrewOutsideLatestRoster() {
        Long rosteredCrewId = insertActiveCrew("TSTHIT03");
        Long offRosterCrewId = insertActiveCrew("TSTHIT04");
        Long rosterVersionId = insertRosterVersion("RV-TST-HIT-HOUR-SCOPE");
        Long rosteredTaskId = insertFlightTask(
            "TST-HIT-SCOPE-ROSTERED",
            "2026-05-01 00:00:00",
            "2026-05-01 01:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            rosteredCrewId,
            rosteredTaskId,
            "2026-05-01 00:00:00",
            "2026-05-01 01:00:00"
        );
        Long offRosterTaskId = insertFlightTask(
            "TST-HIT-SCOPE-OFF-ROSTER",
            "2026-04-01 00:00:00",
            "2026-04-10 00:00:00"
        );
        Long archiveCaseId = insertArchiveCase(offRosterTaskId, rosterVersionId);
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-04-01 00:00:00', '2026-04-10 00:00:00',
                    '2026-04-01 00:00:00', '2026-04-10 00:00:00', 12960,
                    FALSE, 'Completed', ?, '2026-04-10 01:00:00', '2026-04-10 01:00:00')
            """, archiveCaseId, offRosterTaskId, offRosterCrewId, userId);

        RuleEvaluationService.RuleEvaluationResult result = ruleEvaluationService.evaluateLatestRoster();

        assertThat(result.issues())
            .filteredOn(issue -> offRosterCrewId.equals(issue.crewId()))
            .extracting(RuleEvaluationService.RuleHitIssue::ruleId)
            .doesNotContain(
                "RG-HOUR-001",
                "RG-HOUR-002",
                "RG-HOUR-003",
                "RG-HOUR-006",
                "RG-HOUR-007"
            );
    }

    @Test
    void evaluateLatestRosterIgnoresCrewHourLimitFactsWhenOnlyCurrentBlockTaskIsCancelled() {
        Long crewId = insertActiveCrew("TSTHIT06");
        Long historyRosterVersionId = insertRosterVersion("RV-TST-HIT-HOUR-CANCELLED-HISTORY");
        Long historyTaskId = insertFlightTask(
            "TST-HIT-CANCELLED-HISTORY",
            "2026-03-01 00:00:00",
            "2026-04-15 00:00:00"
        );
        insertFlightBlock(
            historyRosterVersionId,
            crewId,
            historyTaskId,
            "2026-03-01 00:00:00",
            "2026-04-15 00:00:00"
        );
        Long archiveCaseId = insertArchiveCase(historyTaskId, historyRosterVersionId);
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2026-03-01 00:00:00', '2026-04-15 00:00:00',
                    '2026-03-01 00:00:00', '2026-04-15 00:00:00', 60000,
                    FALSE, 'Completed', ?, '2026-04-15 01:00:00', '2026-04-15 01:00:00')
            """, archiveCaseId, historyTaskId, crewId, userId);

        Long currentRosterVersionId = insertRosterVersion("RV-TST-HIT-HOUR-CANCELLED-CURRENT");
        Long cancelledTaskId = insertFlightTask(
            "TST-HIT-CANCELLED-CURRENT",
            "2026-05-01 00:00:00",
            "2026-05-01 01:00:00"
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'CANCELLED' WHERE id = ?", cancelledTaskId);
        insertFlightBlock(
            currentRosterVersionId,
            crewId,
            cancelledTaskId,
            "2026-05-01 00:00:00",
            "2026-05-01 01:00:00"
        );
        activateHourEvaluationRules();

        RuleEvaluationService.RuleEvaluationResult result = ruleEvaluationService.evaluateLatestRoster();

        assertThat(result.issues())
            .filteredOn(issue -> crewId.equals(issue.crewId()))
            .extracting(RuleEvaluationService.RuleHitIssue::ruleId)
            .doesNotContain(
                "RG-HOUR-001",
                "RG-HOUR-002",
                "RG-HOUR-003",
                "RG-HOUR-006",
                "RG-HOUR-007"
            );
    }

    @Test
    void evaluateLatestRosterIgnoresHistoricalCrewHourPeaksOutsideRosterLookback() {
        Long crewId = insertActiveCrew("TSTHIT05");
        Long oldRosterVersionId = insertRosterVersion("RV-TST-HIT-HOUR-HISTORICAL-OLD");
        Long oldTaskId = insertFlightTask(
            "TST-HIT-HISTORICAL-OLD",
            "2020-01-01 00:00:00",
            "2020-02-20 00:00:00"
        );
        insertFlightBlock(
            oldRosterVersionId,
            crewId,
            oldTaskId,
            "2020-01-01 00:00:00",
            "2020-02-20 00:00:00"
        );
        Long archiveCaseId = insertArchiveCase(oldTaskId, oldRosterVersionId);
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );
        jdbcTemplate.update("""
            INSERT INTO crew_archive_form (
                archive_case_id, flight_id, crew_id, actual_duty_start_utc, actual_duty_end_utc,
                actual_fdp_start_utc, actual_fdp_end_utc, flying_hour_minutes,
                no_flying_hour_flag, form_status, entered_by, entered_at_utc, confirmed_at_utc
            )
            VALUES (?, ?, ?, '2020-01-01 00:00:00', '2020-02-20 00:00:00',
                    '2020-01-01 00:00:00', '2020-02-20 00:00:00', 60000,
                    FALSE, 'Completed', ?, '2020-02-20 01:00:00', '2020-02-20 01:00:00')
            """, archiveCaseId, oldTaskId, crewId, userId);

        Long currentRosterVersionId = insertRosterVersion("RV-TST-HIT-HOUR-HISTORICAL-CURRENT");
        Long currentTaskId = insertFlightTask(
            "TST-HIT-HISTORICAL-CURRENT",
            "2026-05-01 00:00:00",
            "2026-05-01 02:00:00"
        );
        insertFlightBlock(
            currentRosterVersionId,
            crewId,
            currentTaskId,
            "2026-05-01 00:00:00",
            "2026-05-01 02:00:00"
        );

        RuleEvaluationService.RuleEvaluationResult result = ruleEvaluationService.evaluateLatestRoster();

        assertThat(result.issues())
            .filteredOn(issue -> crewId.equals(issue.crewId()))
            .extracting(RuleEvaluationService.RuleHitIssue::ruleId)
            .doesNotContain(
                "RG-HOUR-001",
                "RG-HOUR-002",
                "RG-HOUR-003",
                "RG-HOUR-006",
                "RG-HOUR-007"
            );
    }

    @Test
    void buildLatestRosterFactsRejectsNullRosterVersionId() {
        assertThatNullPointerException()
            .isThrownBy(() -> ruleDerivedFactService.buildLatestRosterFacts(null))
            .withMessage("rosterVersionId");
    }

    @Test
    void buildLatestRosterFactsBuildsDdoFactsFromRosterTimeline() {
        Long crewId = insertActiveCrew("TSTDDO01");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-FACTS");
        Long validDdoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-01-01 14:00:00",
            "2036-01-03 00:00:00",
            "TEST DDO VALID 34H",
            "PLANNED"
        );
        Long oneLocalNightBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-01-01 01:00:00",
            "2036-01-02 12:00:00",
            "TEST DDO ONE LOCAL NIGHT FACT",
            "PLANNED"
        );
        Long cancelledBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-01-01 14:00:00",
            "2036-01-03 00:00:00",
            "TEST DDO CANCELLED FACT",
            "CANCELLED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId()).containsOnlyKeys(validDdoBlockId, oneLocalNightBlockId);
        assertThat(facts.ddoFactsByBlockId()).doesNotContainKey(cancelledBlockId);

        RuleDerivedFacts.DdoFact validDdoFact = facts.ddoFactsByBlockId().get(validDdoBlockId);
        assertThat(validDdoFact.crewId()).isEqualTo(crewId);
        assertThat(validDdoFact.ddoMinutes()).isEqualTo(34 * 60L);
        assertThat(validDdoFact.localNights()).isEqualTo(2);
        assertThat(validDdoFact.validDdoUnit()).isTrue();
        assertThat(validDdoFact.consecutiveDdoAfter()).isEqualTo(1);

        RuleDerivedFacts.DdoFact oneLocalNightFact = facts.ddoFactsByBlockId().get(oneLocalNightBlockId);
        assertThat(oneLocalNightFact.ddoMinutes()).isEqualTo(35 * 60L);
        assertThat(oneLocalNightFact.localNights()).isEqualTo(1);
        assertThat(oneLocalNightFact.validDdoUnit()).isFalse();
        assertThat(oneLocalNightFact.consecutiveDdoAfter()).isZero();
        assertThat(facts.fdpRestFactsByTaskId()).isEmpty();
    }

    @Test
    void buildLatestRosterFactsCountsConsecutiveDdoUnitsByDurationAndLocalNights() {
        Long crewId = insertActiveCrew("TSTDDO02");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-CONSECUTIVE");
        Long twoDdoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-01-01 14:00:00",
            "2036-01-04 00:00:00",
            "TEST DDO TWO UNITS",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.DdoFact twoDdoFact = facts.ddoFactsByBlockId().get(twoDdoBlockId);
        assertThat(twoDdoFact.ddoMinutes()).isEqualTo(58 * 60L);
        assertThat(twoDdoFact.localNights()).isEqualTo(3);
        assertThat(twoDdoFact.validDdoUnit()).isTrue();
        assertThat(twoDdoFact.consecutiveDdoAfter()).isEqualTo(2);
    }

    @Test
    void buildLatestRosterFactsCountsConsecutiveDdoUnitsAcrossAdjacentDdoBlocks() {
        Long crewId = insertActiveCrew("TSTDDO02B");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-ADJACENT");
        Long firstDdoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-02-01 14:00:00",
            "2036-02-03 00:00:00",
            "TEST DDO ADJACENT FIRST",
            "PLANNED"
        );
        Long secondDdoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-02-03 00:00:00",
            "2036-02-04 00:00:00",
            "TEST DDO ADJACENT SECOND",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId().get(firstDdoBlockId).consecutiveDdoAfter()).isEqualTo(2);
        assertThat(facts.ddoFactsByBlockId().get(secondDdoBlockId).consecutiveDdoAfter()).isZero();
    }

    @Test
    void buildLatestRosterFactsKeepsAdjacentDdoContinuityWhenOtherCrewDdoIsInterleaved() {
        Long crewId = insertActiveCrew("TSTDDO02C");
        Long otherCrewId = insertActiveCrew("TSTDDO02D");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-INTERLEAVED");
        Long firstDdoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-02-01 14:00:00",
            "2036-02-03 00:00:00",
            "TEST DDO INTERLEAVED FIRST",
            "PLANNED"
        );
        Long otherCrewDdoBlockId = insertDdoBlock(
            rosterVersionId,
            otherCrewId,
            "2036-02-02 00:00:00",
            "2036-02-03 10:00:00",
            "TEST DDO INTERLEAVED OTHER CREW",
            "PLANNED"
        );
        Long secondDdoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-02-03 00:00:00",
            "2036-02-04 00:00:00",
            "TEST DDO INTERLEAVED SECOND",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId().get(firstDdoBlockId).consecutiveDdoAfter()).isEqualTo(2);
        assertThat(facts.ddoFactsByBlockId().get(secondDdoBlockId).consecutiveDdoAfter()).isZero();
        assertThat(facts.ddoFactsByBlockId().get(otherCrewDdoBlockId).crewId()).isEqualTo(otherCrewId);
    }

    @Test
    void buildLatestRosterFactsDoesNotCountContinuousDdoWithoutValidBaseDdo() {
        Long crewId = insertActiveCrew("TSTDDO03");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-NO-BASE");
        Long blockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-01-01 01:00:00",
            "2036-01-03 11:00:00",
            "TEST DDO DURATION WITHOUT VALID BASE",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        RuleDerivedFacts.DdoFact fact = facts.ddoFactsByBlockId().get(blockId);
        assertThat(fact.ddoMinutes()).isEqualTo(58 * 60L);
        assertThat(fact.localNights()).isEqualTo(2);
        assertThat(fact.validDdoUnit()).isFalse();
        assertThat(fact.consecutiveDdoAfter()).isZero();
    }

    @Test
    void buildLatestRosterFactsCountsConsecutiveDutyDaysBeforeDdo() {
        Long crewId = insertActiveCrew("TSTDDO04");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-DUTY-SEQUENCE");
        for (int day = 1; day <= 6; day += 1) {
            Long taskId = insertFlightTask(
                "TST-DDO-DUTY-" + day,
                "2036-01-0" + day + " 00:00:00",
                "2036-01-0" + day + " 08:00:00"
            );
            insertFlightBlock(
                rosterVersionId,
                crewId,
                taskId,
                "2036-01-0" + day + " 00:00:00",
                "2036-01-0" + day + " 08:00:00"
            );
        }
        Long ddoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-01-07 14:00:00",
            "2036-01-09 00:00:00",
            "TEST DDO AFTER SIX DUTY DAYS",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId().get(ddoBlockId).consecutiveDutyDaysBefore()).isEqualTo(6);
    }

    @Test
    void buildLatestRosterFactsExcludesCancelledLinkedDutyTaskFromDdoDutySequence() {
        Long crewId = insertActiveCrew("TSTDDO05");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-CANCELLED-TASK");
        for (int day = 1; day <= 6; day += 1) {
            Long taskId = insertFlightTask(
                "TST-DDO-CANCELLED-DUTY-" + day,
                "2036-03-0" + day + " 00:00:00",
                "2036-03-0" + day + " 08:00:00"
            );
            insertFlightBlock(
                rosterVersionId,
                crewId,
                taskId,
                "2036-03-0" + day + " 00:00:00",
                "2036-03-0" + day + " 08:00:00"
            );
            if (day == 3) {
                jdbcTemplate.update("UPDATE task_plan_item SET status = 'CANCELLED' WHERE id = ?", taskId);
            }
        }
        Long ddoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-03-07 14:00:00",
            "2036-03-09 00:00:00",
            "TEST DDO AFTER CANCELLED DUTY TASK",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId().get(ddoBlockId).consecutiveDutyDaysBefore()).isEqualTo(3);
        assertThat(facts.crewDaySequenceFactsByCrewId().get(crewId).consecutiveDutyDays()).isEqualTo(3);
    }

    @Test
    void buildLatestRosterFactsGroupsDutyDatesByUtcPlusEightLocalDate() {
        Long crewId = insertActiveCrew("TSTDDO06");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-UTC8-GROUPING");
        Long firstTaskId = insertFlightTask(
            "TST-DDO-UTC8-DUTY-1",
            "2036-04-01 16:30:00",
            "2036-04-01 17:30:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            firstTaskId,
            "2036-04-01 16:30:00",
            "2036-04-01 17:30:00"
        );
        Long secondTaskId = insertFlightTask(
            "TST-DDO-UTC8-DUTY-2",
            "2036-04-02 23:00:00",
            "2036-04-03 01:00:00"
        );
        insertFlightBlock(
            rosterVersionId,
            crewId,
            secondTaskId,
            "2036-04-02 23:00:00",
            "2036-04-03 01:00:00"
        );
        Long ddoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-04-04 14:00:00",
            "2036-04-06 00:00:00",
            "TEST DDO AFTER UTC8 DUTY DAYS",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId().get(ddoBlockId).consecutiveDutyDaysBefore()).isEqualTo(2);
        assertThat(facts.crewDaySequenceFactsByCrewId().get(crewId).dutyLocalDates())
            .containsExactlyInAnyOrder(
                java.time.LocalDate.parse("2036-04-02"),
                java.time.LocalDate.parse("2036-04-03")
            );
    }

    @Test
    void buildLatestRosterFactsExposesSevenDayDutySequenceWithoutFollowingDdo() {
        Long crewId = insertActiveCrew("TSTDDO07");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-NO-DDO-SEQUENCE");
        for (int day = 1; day <= 7; day += 1) {
            Long taskId = insertFlightTask(
                "TST-DDO-NO-DDO-DUTY-" + day,
                "2036-05-0" + day + " 00:00:00",
                "2036-05-0" + day + " 08:00:00"
            );
            insertFlightBlock(
                rosterVersionId,
                crewId,
                taskId,
                "2036-05-0" + day + " 00:00:00",
                "2036-05-0" + day + " 08:00:00"
            );
        }

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId()).isEmpty();
        assertThat(facts.crewDaySequenceFactsByCrewId().get(crewId))
            .satisfies(sequence -> {
                assertThat(sequence.consecutiveDutyDays()).isEqualTo(7);
                assertThat(sequence.startLocalDate()).isEqualTo(java.time.LocalDate.parse("2036-05-01"));
                assertThat(sequence.endLocalDate()).isEqualTo(java.time.LocalDate.parse("2036-05-07"));
            });
    }

    @Test
    void buildLatestRosterFactsDetectsRollingFourteenDayDdoGap() {
        Long crewId = insertActiveCrew("TSTDDO08");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-ROLLING-GAP");
        java.time.LocalDate firstDate = java.time.LocalDate.parse("2036-06-01");
        for (int index = 0; index < 14; index += 1) {
            java.time.LocalDate localDate = firstDate.plusDays(index);
            Long taskId = insertFlightTask(
                "TST-DDO-ROLLING-GAP-" + (index + 1),
                localDate.atTime(0, 0).toString().replace('T', ' '),
                localDate.atTime(8, 0).toString().replace('T', ' ')
            );
            insertFlightBlock(
                rosterVersionId,
                crewId,
                taskId,
                localDate.atTime(0, 0).toString().replace('T', ' '),
                localDate.atTime(8, 0).toString().replace('T', ' ')
            );
        }

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoSequenceFactsByCrewId().get(crewId))
            .satisfies(sequence -> {
                assertThat(sequence.rolling14dHasTwoConsecutiveDdo()).isFalse();
                assertThat(sequence.windowStartUtc()).isEqualTo(Instant.parse("2036-05-31T16:00:00Z"));
                assertThat(sequence.windowEndUtc()).isEqualTo(Instant.parse("2036-06-14T16:00:00Z"));
                assertThat(sequence.assessedWindowCount()).isEqualTo(1);
                assertThat(sequence.consecutiveDdoUnitsInWindow()).isZero();
            });
    }

    @Test
    void buildLatestRosterFactsAllowsRollingFourteenDayWindowWithTwoConsecutiveDdos() {
        Long crewId = insertActiveCrew("TSTDDO09");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-ROLLING-PASS");
        java.time.LocalDate firstDate = java.time.LocalDate.parse("2036-07-01");
        for (int index = 0; index < 14; index += 1) {
            java.time.LocalDate localDate = firstDate.plusDays(index);
            insertRestBlock(
                rosterVersionId,
                crewId,
                localDate.atTime(0, 0).toString().replace('T', ' '),
                localDate.atTime(1, 0).toString().replace('T', ' '),
                "TEST DDO ROLLING REST " + (index + 1)
            );
        }
        insertDdoBlock(
            rosterVersionId,
            crewId,
            "2036-07-07 14:00:00",
            "2036-07-10 00:00:00",
            "TEST DDO ROLLING TWO UNITS",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoSequenceFactsByCrewId().get(crewId))
            .satisfies(sequence -> {
                assertThat(sequence.rolling14dHasTwoConsecutiveDdo()).isTrue();
                assertThat(sequence.windowStartUtc()).isEqualTo(Instant.parse("2036-06-30T16:00:00Z"));
                assertThat(sequence.windowEndUtc()).isEqualTo(Instant.parse("2036-07-14T16:00:00Z"));
                assertThat(sequence.assessedWindowCount()).isEqualTo(1);
                assertThat(sequence.consecutiveDdoUnitsInWindow()).isEqualTo(2);
            });
    }

    @Test
    void buildLatestRosterFactsExcludesCancelledLinkedDdoTaskFromRollingFourteenDayWindow() {
        Long crewId = insertActiveCrew("TSTDDO10");
        Long rosterVersionId = insertRosterVersion("RV-TST-DDO-ROLLING-CANCELLED-LINK");
        java.time.LocalDate firstDate = java.time.LocalDate.parse("2036-08-01");
        for (int index = 0; index < 14; index += 1) {
            java.time.LocalDate localDate = firstDate.plusDays(index);
            insertRestBlock(
                rosterVersionId,
                crewId,
                localDate.atTime(0, 0).toString().replace('T', ' '),
                localDate.atTime(1, 0).toString().replace('T', ' '),
                "TEST DDO ROLLING CANCELLED LINK REST " + (index + 1)
            );
        }
        Long cancelledTaskId = insertFlightTask(
            "TST-DDO-ROLLING-CANCELLED-LINK",
            "2036-08-07 14:00:00",
            "2036-08-10 00:00:00"
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'CANCELLED' WHERE id = ?", cancelledTaskId);
        Long cancelledLinkedDdoBlockId = insertDdoBlock(
            rosterVersionId,
            crewId,
            cancelledTaskId,
            "2036-08-07 14:00:00",
            "2036-08-10 00:00:00",
            "TEST DDO ROLLING CANCELLED LINK TWO UNITS",
            "PLANNED"
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.ddoFactsByBlockId()).doesNotContainKey(cancelledLinkedDdoBlockId);
        assertThat(facts.ddoSequenceFactsByCrewId().get(crewId))
            .satisfies(sequence -> {
                assertThat(sequence.rolling14dHasTwoConsecutiveDdo()).isFalse();
                assertThat(sequence.windowStartUtc()).isEqualTo(Instant.parse("2036-07-31T16:00:00Z"));
                assertThat(sequence.windowEndUtc()).isEqualTo(Instant.parse("2036-08-14T16:00:00Z"));
                assertThat(sequence.consecutiveDdoUnitsInWindow()).isZero();
            });
    }

    @Test
    void buildLatestRosterFactsKeepsFdpRestFactsEmptyAtUnsupportedPlaceholderBoundary() {
        Long rosterVersionId = jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version ORDER BY id LIMIT 1",
            Long.class
        );

        RuleDerivedFacts facts = ruleDerivedFactService.buildLatestRosterFacts(rosterVersionId);

        assertThat(facts.fdpRestFactsByTaskId()).isEmpty();
    }

    private RuleDerivedFactService fixedClockService(String instant) {
        Clock fixedClock = Clock.fixed(Instant.parse(instant), ZoneOffset.UTC);
        return new RuleDerivedFactService(
            new CrewHourFactBuilder(jdbcTemplate, fixedClock),
            ddoFactBuilder,
            fdpRestFactBuilder
        );
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

    private Long insertArchiveCase(Long taskId, Long rosterVersionId) {
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'PUBLISHED' WHERE id = ?", taskId);
        jdbcTemplate.update("""
            INSERT INTO flight_archive_case (
                flight_id, roster_version_id, archive_status, archive_deadline_at_utc,
                archived_at_utc, completed_count, total_count
            )
            VALUES (?, ?, 'ARCHIVED', '2026-05-06 04:00:00', '2026-05-06 02:00:00', 1, 1)
            """, taskId, rosterVersionId);
        return jdbcTemplate.queryForObject(
            "SELECT id FROM flight_archive_case WHERE flight_id = ?",
            Long.class,
            taskId
        );
    }

    private void insertFlightBlock(Long rosterVersionId, Long crewId, Long taskId, String startUtc, String endUtc) {
        jdbcTemplate.update("""
            INSERT INTO timeline_block (
                roster_version_id, crew_member_id, task_plan_item_id, block_type,
                start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, ?, 'FLIGHT', ?, ?, 'TEST HOUR FLIGHT', 'PUBLISHED', 'PIC', 0)
            """, rosterVersionId, crewId, taskId, startUtc, endUtc);
    }

    private Long insertDdoBlock(
        Long rosterVersionId,
        Long crewId,
        String startUtc,
        String endUtc,
        String displayLabel,
        String status
    ) {
        return insertDdoBlock(rosterVersionId, crewId, null, startUtc, endUtc, displayLabel, status);
    }

    private Long insertDdoBlock(
        Long rosterVersionId,
        Long crewId,
        Long taskId,
        String startUtc,
        String endUtc,
        String displayLabel,
        String status
    ) {
        jdbcTemplate.update("""
            INSERT INTO timeline_block (
                roster_version_id, crew_member_id, task_plan_item_id, block_type,
                start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, ?, 'DDO', ?, ?, ?, ?, 'EXTRA', 0)
            """, rosterVersionId, crewId, taskId, startUtc, endUtc, displayLabel, status);
        return jdbcTemplate.queryForObject(
            "SELECT id FROM timeline_block WHERE display_label = ?",
            Long.class,
            displayLabel
        );
    }

    private void insertRestBlock(
        Long rosterVersionId,
        Long crewId,
        String startUtc,
        String endUtc,
        String displayLabel
    ) {
        jdbcTemplate.update("""
            INSERT INTO timeline_block (
                roster_version_id, crew_member_id, task_plan_item_id, block_type,
                start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, NULL, 'REST', ?, ?, ?, 'PLANNED', 'EXTRA', 0)
            """, rosterVersionId, crewId, startUtc, endUtc, displayLabel);
    }

    private void activateHourEvaluationRules() {
        jdbcTemplate.update("""
            UPDATE rule_catalog
            SET active_flag = TRUE,
                catalog_entry_type = 'EVALUATION_RULE',
                severity_default = 'P0 BLOCK'
            WHERE rule_id IN (
                'RG-HOUR-001',
                'RG-HOUR-002',
                'RG-HOUR-003',
                'RG-HOUR-006',
                'RG-HOUR-007'
            )
            """);
    }
}
