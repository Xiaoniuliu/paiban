package com.pilotroster.workbench;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class ValidationPublishIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    @AfterEach
    void resetUnassignedSeed() {
        jdbcTemplate.update(
            """
            DELETE vh
            FROM violation_hit vh
            JOIN crew_member cm ON cm.id = vh.crew_id
            WHERE cm.crew_code IN ('TSTVALDDO01', 'TSTVALDDO02', 'TSTVALDDO03', 'TSTVALDDO04', 'TSTVALDDO05')
            """
        );
        jdbcTemplate.update(
            """
            DELETE vh
            FROM violation_hit vh
            LEFT JOIN task_plan_item tpi ON tpi.id = vh.task_id
            LEFT JOIN timeline_block tb ON tb.id = vh.timeline_block_id
            LEFT JOIN roster_version rv ON rv.id = vh.roster_version_id
            WHERE tpi.task_code IN (
                   'TEST_SCOPE_BLOCKED', 'TEST_SCOPE_WARNING', 'TEST_SCOPE_CURRENT',
                   'TEST_STATUS_BLOCKED', 'TEST_STATUS_WARNING', 'TEST_PUBLISH_CANCELLED',
                   'TEST_NIGHT_FDP', 'TEST_NIGHT_FDP_EXTRA', 'TEST_NIGHT_FDP_RELIEF',
                   'TEST_NIGHT_FDP_MISSING_FO', 'TEST_DDO_DUTY_1', 'TEST_DDO_DUTY_2',
                   'TEST_DDO_DUTY_3', 'TEST_DDO_DUTY_4', 'TEST_DDO_DUTY_5', 'TEST_DDO_DUTY_6',
                   'TEST_DDO_DUTY_7', 'TEST_DDO_ROLLING_CANCELLED_LINK', 'NX8810', 'NX8811'
               )
               OR tb.display_label IN (
                   'TEST REST CONFLICT', 'TEST FLIGHT OVERLAP', 'TEST SHORT DDO',
                   'TEST CANCELLED SHORT DDO', 'TEST CANCELLED PUBLISH ACTIVE',
                   'TEST CANCELLED PUBLISH BLOCK', 'TEST DDO ONE LOCAL NIGHT',
                   'TEST NIGHT FDP PIC', 'TEST NIGHT FDP FO', 'TEST NIGHT FDP EXTRA FO', 'TEST NIGHT FDP EXTRA',
                   'TEST NIGHT FDP RELIEF FO', 'TEST NIGHT FDP RELIEF', 'TEST NIGHT FDP MISSING FO PIC',
                   'TEST DDO DUTY 1', 'TEST DDO DUTY 2', 'TEST DDO DUTY 3', 'TEST DDO DUTY 4',
                   'TEST DDO DUTY 5', 'TEST DDO DUTY 6', 'TEST DDO DUTY 7',
                   'TEST DDO AFTER SIX DUTY DAYS', 'TEST DDO ROLLING CANCELLED LINK TWO UNITS'
               )
               OR rv.version_no LIKE 'RV-TEST-VALIDATION-%'
            """
        );
        jdbcTemplate.update(
            """
            DELETE FROM timeline_block
            WHERE display_label IN (
                'TEST REST CONFLICT', 'TEST FLIGHT OVERLAP', 'TEST SHORT DDO',
                'TEST CANCELLED SHORT DDO', 'TEST CANCELLED PUBLISH ACTIVE',
                'TEST CANCELLED PUBLISH BLOCK', 'TEST DDO ONE LOCAL NIGHT',
                'TEST NIGHT FDP PIC', 'TEST NIGHT FDP FO', 'TEST NIGHT FDP EXTRA FO', 'TEST NIGHT FDP EXTRA',
                'TEST NIGHT FDP RELIEF FO', 'TEST NIGHT FDP RELIEF', 'TEST NIGHT FDP MISSING FO PIC',
                'TEST DDO DUTY 1', 'TEST DDO DUTY 2', 'TEST DDO DUTY 3', 'TEST DDO DUTY 4',
                'TEST DDO DUTY 5', 'TEST DDO DUTY 6', 'TEST DDO DUTY 7',
                'TEST DDO AFTER SIX DUTY DAYS', 'TEST DDO ROLLING CANCELLED LINK TWO UNITS'
            )
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code IN (
                'TEST_SCOPE_BLOCKED', 'TEST_SCOPE_WARNING', 'TEST_SCOPE_CURRENT',
                'TEST_STATUS_BLOCKED', 'TEST_STATUS_WARNING', 'TEST_PUBLISH_CANCELLED',
                'TEST_NIGHT_FDP', 'TEST_NIGHT_FDP_EXTRA', 'TEST_NIGHT_FDP_RELIEF', 'TEST_NIGHT_FDP_MISSING_FO',
                'TEST_DDO_DUTY_1', 'TEST_DDO_DUTY_2', 'TEST_DDO_DUTY_3', 'TEST_DDO_DUTY_4',
                'TEST_DDO_DUTY_5', 'TEST_DDO_DUTY_6', 'TEST_DDO_DUTY_7', 'TEST_DDO_ROLLING_CANCELLED_LINK'
            )
            """
        );
        jdbcTemplate.update(
            """
            DELETE FROM task_plan_item
            WHERE task_code IN (
                'TEST_SCOPE_BLOCKED', 'TEST_SCOPE_WARNING', 'TEST_SCOPE_CURRENT',
                'TEST_STATUS_BLOCKED', 'TEST_STATUS_WARNING', 'TEST_PUBLISH_CANCELLED',
                'TEST_NIGHT_FDP', 'TEST_NIGHT_FDP_EXTRA', 'TEST_NIGHT_FDP_RELIEF', 'TEST_NIGHT_FDP_MISSING_FO',
                'TEST_DDO_DUTY_1', 'TEST_DDO_DUTY_2', 'TEST_DDO_DUTY_3', 'TEST_DDO_DUTY_4',
                'TEST_DDO_DUTY_5', 'TEST_DDO_DUTY_6', 'TEST_DDO_DUTY_7', 'TEST_DDO_ROLLING_CANCELLED_LINK'
            )
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN roster_version rv ON rv.id = tb.roster_version_id
            WHERE rv.version_no LIKE 'RV-TEST-VALIDATION-%'
            """
        );
        jdbcTemplate.update("DELETE FROM roster_version WHERE version_no LIKE 'RV-TEST-VALIDATION-%'");
        jdbcTemplate.update(
            """
            UPDATE rule_catalog
            SET active_flag = FALSE,
                version_status = 'CATALOG_ONLY'
            WHERE rule_id = 'RG-FDP-007'
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code IN ('NX8810', 'NX8811')
            """
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'UNASSIGNED' WHERE task_code IN ('NX8810', 'NX8811')");
        jdbcTemplate.update(
            "DELETE FROM crew_member WHERE crew_code IN ('TSTVALDDO01', 'TSTVALDDO02', 'TSTVALDDO03', 'TSTVALDDO04', 'TSTVALDDO05')"
        );
    }

    @Test
    void validationSummaryIgnoresBlockedAndWarningTasksOutsideLatestRosterBlocks() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );

        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES
              (?, 'TEST_SCOPE_BLOCKED', 'FLIGHT', 'TEST_SCOPE_BLOCKED', 'TEST_SCOPE_BLOCKED', 'MFM', 'SIN',
               '2036-02-01 00:00:00', '2036-02-01 04:00:00', 1, 'BLOCKED', 'A330', 'PIC+FO'),
              (?, 'TEST_SCOPE_WARNING', 'FLIGHT', 'TEST_SCOPE_WARNING', 'TEST_SCOPE_WARNING', 'MFM', 'SIN',
               '2036-02-02 00:00:00', '2036-02-02 04:00:00', 1, 'WARNING', 'A330', 'PIC+FO'),
              (?, 'TEST_SCOPE_CURRENT', 'FLIGHT', 'TEST_SCOPE_CURRENT', 'TEST_SCOPE_CURRENT', 'MFM', 'TPE',
               '2036-02-03 00:00:00', '2036-02-03 04:00:00', 1, 'ASSIGNED_DRAFT', 'A330', 'PIC+FO')
            """,
            batchId,
            batchId,
            batchId
        );
        Long oldRosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-OLD-SCOPE");
        Long currentRosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-CURRENT-SCOPE");
        insertValidationBlock(oldRosterVersionId, taskId("TEST_SCOPE_BLOCKED"), "TEST VALIDATION OLD BLOCKED");
        insertValidationBlock(oldRosterVersionId, taskId("TEST_SCOPE_WARNING"), "TEST VALIDATION OLD WARNING");
        insertValidationBlock(currentRosterVersionId, taskId("TEST_SCOPE_CURRENT"), "TEST VALIDATION CURRENT");

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("TASK_STATUS_BLOCKED"))))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("MANAGER_REVIEW_REQUIRED"))))
            .andExpect(jsonPath("$.data.publishableTasks").value(1));
    }

    @Test
    void validationIssueListExplainsCurrentRosterTaskStatusBlockers() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );

        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES
              (?, 'TEST_STATUS_BLOCKED', 'FLIGHT', 'TEST_STATUS_BLOCKED', 'TEST_STATUS_BLOCKED', 'MFM', 'SIN',
               '2036-03-01 00:00:00', '2036-03-01 04:00:00', 1, 'BLOCKED', 'A330', 'PIC+FO'),
              (?, 'TEST_STATUS_WARNING', 'FLIGHT', 'TEST_STATUS_WARNING', 'TEST_STATUS_WARNING', 'MFM', 'TPE',
               '2036-03-02 00:00:00', '2036-03-02 04:00:00', 1, 'WARNING', 'A330', 'PIC+FO')
            """,
            batchId,
            batchId
        );
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-STATUS-CURRENT");
        insertValidationBlock(rosterVersionId, taskId("TEST_STATUS_BLOCKED"), "TEST VALIDATION STATUS BLOCKED");
        insertValidationBlock(rosterVersionId, taskId("TEST_STATUS_WARNING"), "TEST VALIDATION STATUS WARNING");

        mockMvc.perform(get("/api/rostering-workbench/validation-publish/issues").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.blockedCount").value(1))
            .andExpect(jsonPath("$.data.warningCount").value(1))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("TASK_STATUS_BLOCKED")))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("MANAGER_REVIEW_REQUIRED")))
            .andExpect(jsonPath("$.data.issues[*].hitId").value(hasItem((Object) null)));
    }

    @Test
    void validationPublishDoesNotCreateRuleHitsForUnassignedFlights() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get("/api/rostering-workbench/validation-publish").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.blockedCount").value(0));

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.validatedAtUtc", notNullValue()))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("CREW_ASSIGNMENT_REQUIRED"))))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("CREW_PAIR_REQUIRED"))));
    }

    @Test
    void validationPublishUsesRuleHitPoolForEvaluationRules() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        insertShortDdo(rosterVersionId);

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-BASE-008")))
            .andExpect(jsonPath("$.data.issues[*].hitId").isNotEmpty())
            .andExpect(jsonPath("$.data.issues[*].targetType").value(hasItem("TIMELINE_BLOCK")));
    }

    @Test
    void validationIgnoresCancelledTimelineRuleArtifacts() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, NULL, NULL, 'DDO', '2036-01-01 00:00:00', '2036-01-01 02:00:00',
                    'TEST CANCELLED SHORT DDO', 'CANCELLED', 'EXTRA', 902)
            """,
            rosterVersionId
        );

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-BASE-008"))));
    }

    @Test
    void publishLeavesCancelledTimelineBlocksCancelled() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES (?, 'TEST_PUBLISH_CANCELLED', 'FLIGHT', 'TEST_PUBLISH_CANCELLED', 'TEST_PUBLISH_CANCELLED',
                    'MFM', 'SIN', '2036-04-01 00:00:00', '2036-04-01 04:00:00',
                    1, 'ASSIGNED_DRAFT', 'A330', 'PIC+FO')
            """,
            batchId
        );
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-PUBLISH-CANCELLED");
        Long taskId = taskId("TEST_PUBLISH_CANCELLED");
        insertValidationBlock(rosterVersionId, taskId, "TEST CANCELLED PUBLISH ACTIVE");
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            SELECT ?, (SELECT id FROM crew_member WHERE role_code = 'FIRST_OFFICER' ORDER BY id LIMIT 1),
                   id, 'FLIGHT', scheduled_start_utc, scheduled_end_utc,
                   'TEST CANCELLED PUBLISH BLOCK', 'CANCELLED', 'FO', 1
            FROM task_plan_item
            WHERE id = ?
            """,
            rosterVersionId,
            taskId
        );

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/publish")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"managerConfirmed\":true}"))
            .andExpect(status().isOk());

        assertThat(timelineBlockStatus("TEST CANCELLED PUBLISH ACTIVE")).isEqualTo("PUBLISHED");
        assertThat(timelineBlockStatus("TEST CANCELLED PUBLISH BLOCK")).isEqualTo("CANCELLED");
    }

    @Test
    void validationBlocksDdoWithInsufficientLocalNightsEvenWhenDurationIsLongEnough() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, NULL, NULL, 'DDO', '2036-01-01 09:00:00', '2036-01-02 20:00:00',
                    'TEST DDO ONE LOCAL NIGHT', 'PLANNED', 'EXTRA', 903)
            """,
            rosterVersionId
        );

        MvcResult result = mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-BASE-008")))
            .andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-BASE-008')].ruleTitleZh").isNotEmpty())
            .andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-BASE-008')].ruleTitleEn").isNotEmpty())
            .andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-BASE-008')].evidenceJson").isNotEmpty())
            .andReturn();

        JsonNode issue = StreamSupport.stream(
                objectMapper.readTree(result.getResponse().getContentAsString()).at("/data/issues").spliterator(),
                false
            )
            .filter(candidate -> "RG-BASE-008".equals(candidate.path("ruleId").asText()))
            .findFirst()
            .orElseThrow();
        JsonNode evidence = objectMapper.readTree(issue.path("evidenceJson").asText());

        assertThat(evidence.path("predicate").asText())
            .isEqualTo("ddoMinutes >= 2040 && localNights >= 2 && validDdoUnit == true");
        assertThat(evidence.path("actual").path("ddoMinutes").asLong()).isEqualTo(2100);
        assertThat(evidence.path("actual").path("localNights").asInt()).isEqualTo(1);
        assertThat(evidence.path("actual").path("validDdoUnit").asBoolean()).isFalse();
        assertThat(evidence.path("actual").path("consecutiveDdoAfter").asInt()).isZero();
        assertThat(evidence.path("limit").path("ddoMinutes").asLong()).isEqualTo(2040);
        assertThat(evidence.path("limit").path("localNights").asInt()).isEqualTo(2);
        assertThat(evidence.path("ddoWindow").path("startUtc").asText()).isEqualTo("2036-01-01T09:00:00Z");
        assertThat(evidence.path("ddoWindow").path("endUtc").asText()).isEqualTo("2036-01-02T20:00:00Z");
        assertThat(evidence.get("baseDdoStartUtc").isNull()).isTrue();
        assertThat(evidence.get("baseDdoEndUtc").isNull()).isTrue();
        assertThat(evidence.path("ddoMinutes").asLong()).isEqualTo(2100);
        assertThat(evidence.path("localNights").asInt()).isEqualTo(1);
        assertThat(evidence.path("validDdoUnit").asBoolean()).isFalse();
        assertThat(evidence.path("consecutiveDdoAfter").asInt()).isZero();
        assertThat(evidence.path("localNightContributors").isArray()).isTrue();
        assertThat(evidence.path("localNightContributors").size()).isEqualTo(1);
        JsonNode contributor = evidence.path("localNightContributors").get(0);
        assertThat(contributor.path("source").asText()).isEqualTo("LOCAL_NIGHT");
        assertThat(contributor.path("startUtc").asText()).isEqualTo("2036-01-01T14:00:00Z");
        assertThat(contributor.path("endUtc").asText()).isEqualTo("2036-01-02T00:00:00Z");
        assertThat(contributor.path("minutes").asLong()).isEqualTo(600);
    }

    @Test
    void validationBlocksCrewWithMoreThanSixConsecutiveDutyDays() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        Long crewId = insertActiveCrewForValidation("TSTVALDDO01");
        insertConsecutiveDutyDays(rosterVersionId, crewId, 7, "2036-02-01");

        MvcResult result = mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-DDO-001")))
            .andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-DDO-001')].evidenceJson").value(hasItem(
                org.hamcrest.Matchers.containsString("\"consecutiveDutyDays\": 7")
            )))
            .andReturn();
        JsonNode issues = objectMapper.readTree(result.getResponse().getContentAsString()).at("/data/issues");
        assertThat(issueRuleCount(issues, "RG-DDO-001")).isEqualTo(1);
        assertThat(issueRuleCount(issues, "RG-DDO-003")).isZero();
        assertThat(issueRuleCount(issues, "RG-DDO-004")).isZero();
    }

    @Test
    void validationBlocksDdoAfterSixDutyDaysWithoutTwoConsecutiveDdos() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        Long crewId = insertActiveCrewForValidation("TSTVALDDO02");
        insertConsecutiveDutyDays(rosterVersionId, crewId, 6, "2036-03-01");
        insertDdoAfterSixDutyDays(rosterVersionId, crewId);

        MvcResult result = mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-DDO-002")))
            .andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-DDO-002')].evidenceJson").value(hasItem(
                org.hamcrest.Matchers.containsString("\"consecutiveDdoAfter\": 1")
            )))
            .andReturn();
        JsonNode issues = objectMapper.readTree(result.getResponse().getContentAsString()).at("/data/issues");
        assertThat(issueRuleCount(issues, "RG-DDO-002")).isEqualTo(1);
        assertThat(issueRuleCount(issues, "RG-DDO-003")).isZero();
        assertThat(issueRuleCount(issues, "RG-DDO-004")).isZero();
    }

    @Test
    void validationBlocksRollingFourteenDaysWithoutTwoConsecutiveDdos() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-DDO-ROLLING-GAP");
        Long crewId = insertActiveCrewForValidation("TSTVALDDO03");
        insertRestDaysForValidation(rosterVersionId, crewId, "2036-06-01", 14, "TEST DDO ROLLING GAP REST ");

        MvcResult result = mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-DDO-003")))
            .andExpect(jsonPath("$.data.issues[?(@.ruleId == 'RG-DDO-003')].evidenceJson").isNotEmpty())
            .andReturn();
        JsonNode issues = objectMapper.readTree(result.getResponse().getContentAsString()).at("/data/issues");
        JsonNode evidence = evidenceForRule(issues, "RG-DDO-003");

        assertThat(evidence.path("actual").path("rolling14dHasTwoConsecutiveDdo").asBoolean()).isFalse();
        assertThat(evidence.path("actual").path("consecutiveDdoUnitsInWindow").asInt()).isZero();
        assertThat(evidence.path("limit").path("consecutiveDdoUnitsInWindow").asInt()).isEqualTo(2);
        assertThat(evidence.path("windowStartUtc").asText()).isEqualTo("2036-05-31T16:00:00Z");
        assertThat(evidence.path("windowEndUtc").asText()).isEqualTo("2036-06-14T16:00:00Z");
        assertThat(evidence.path("assessedWindowCount").asInt()).isEqualTo(1);
        assertThat(evidence.path("consecutiveDdoUnitsInWindow").asInt()).isZero();
        assertThat(issueRuleCount(issues, "RG-DDO-003")).isEqualTo(1);
        assertThat(issueRuleCount(issues, "RG-DDO-004")).isZero();
    }

    @Test
    void validationAllowsRollingFourteenDaysWithTwoConsecutiveDdos() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-DDO-ROLLING-PASS");
        Long crewId = insertActiveCrewForValidation("TSTVALDDO04");
        insertRestDaysForValidation(rosterVersionId, crewId, "2036-07-01", 14, "TEST DDO ROLLING PASS REST ");
        insertRollingTwoDdoUnitsForValidation(rosterVersionId, crewId);

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-DDO-003"))))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-DDO-004"))));
    }

    @Test
    void validationBlocksRollingFourteenDaysWhenConsecutiveDdosAreLinkedToCancelledTask() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-DDO-ROLLING-CANCELLED-LINK");
        Long crewId = insertActiveCrewForValidation("TSTVALDDO05");
        insertRestDaysForValidation(rosterVersionId, crewId, "2036-08-01", 14, "TEST DDO ROLLING CANCELLED LINK REST ");
        insertCancelledLinkedRollingTwoDdoUnitsForValidation(rosterVersionId, crewId);

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-DDO-003")))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-DDO-004"))));
    }

    @Test
    void validationBlocksTwoPilotNightFdpOverEightHoursWhenRuleIsEnabled() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        jdbcTemplate.update(
            """
            UPDATE rule_catalog
            SET active_flag = TRUE,
                version_status = 'ACTIVE'
            WHERE rule_id = 'RG-FDP-007'
            """
        );
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES (?, 'TEST_NIGHT_FDP', 'FLIGHT', 'TEST_NIGHT_FDP', 'TEST_NIGHT_FDP',
                    'MFM', 'SIN', '2036-05-01 17:00:00', '2036-05-02 01:30:00',
                    1, 'ASSIGNED_DRAFT', 'A330', 'PIC+FO')
            """,
            batchId
        );
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-NIGHT-FDP");
        Long taskId = taskId("TEST_NIGHT_FDP");
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP PIC");
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            SELECT ?, (SELECT id FROM crew_member WHERE role_code = 'FIRST_OFFICER' ORDER BY id LIMIT 1),
                   id, 'FLIGHT', scheduled_start_utc, scheduled_end_utc,
                   'TEST NIGHT FDP FO', 'PLANNED', 'FO', 1
            FROM task_plan_item
            WHERE id = ?
            """,
            rosterVersionId,
            taskId
        );

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-FDP-007")));
    }

    @Test
    void validationStillBlocksNightFdpWhenThirdCrewIsExtraNotRelief() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        jdbcTemplate.update(
            """
            UPDATE rule_catalog
            SET active_flag = TRUE,
                version_status = 'ACTIVE'
            WHERE rule_id = 'RG-FDP-007'
            """
        );
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES (?, 'TEST_NIGHT_FDP_EXTRA', 'FLIGHT', 'TEST_NIGHT_FDP_EXTRA', 'TEST_NIGHT_FDP_EXTRA',
                    'MFM', 'SIN', '2036-05-03 17:00:00', '2036-05-04 01:30:00',
                    1, 'ASSIGNED_DRAFT', 'A330', 'PIC+FO+EXTRA')
            """,
            batchId
        );
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-NIGHT-FDP-EXTRA");
        Long taskId = taskId("TEST_NIGHT_FDP_EXTRA");
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP PIC");
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP EXTRA FO", "FIRST_OFFICER", "FO", 1);
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP EXTRA", "FIRST_OFFICER", "EXTRA", 2);

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-FDP-007")));
    }

    @Test
    void validationAllowsNightFdpWhenReliefCrewIsAssigned() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        jdbcTemplate.update(
            """
            UPDATE rule_catalog
            SET active_flag = TRUE,
                version_status = 'ACTIVE'
            WHERE rule_id = 'RG-FDP-007'
            """
        );
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES (?, 'TEST_NIGHT_FDP_RELIEF', 'FLIGHT', 'TEST_NIGHT_FDP_RELIEF', 'TEST_NIGHT_FDP_RELIEF',
                    'MFM', 'SIN', '2036-05-05 17:00:00', '2036-05-06 01:30:00',
                    1, 'ASSIGNED_DRAFT', 'A330', 'PIC+FO+RELIEF')
            """,
            batchId
        );
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-NIGHT-FDP-RELIEF");
        Long taskId = taskId("TEST_NIGHT_FDP_RELIEF");
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP PIC");
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP RELIEF FO", "FIRST_OFFICER", "FO", 1);
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP RELIEF", "FIRST_OFFICER", "RELIEF", 2);

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-FDP-007"))));
    }

    @Test
    void validationDoesNotUseFdpAugmentationRuleForIncompleteTwoPilotCrew() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        jdbcTemplate.update(
            """
            UPDATE rule_catalog
            SET active_flag = TRUE,
                version_status = 'ACTIVE'
            WHERE rule_id = 'RG-FDP-007'
            """
        );
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES (?, 'TEST_NIGHT_FDP_MISSING_FO', 'FLIGHT', 'TEST_NIGHT_FDP_MISSING_FO', 'TEST_NIGHT_FDP_MISSING_FO',
                    'MFM', 'SIN', '2036-05-07 17:00:00', '2036-05-08 01:30:00',
                    1, 'ASSIGNED_DRAFT', 'A330', 'PIC+FO')
            """,
            batchId
        );
        Long rosterVersionId = insertValidationRoster("RV-TEST-VALIDATION-NIGHT-FDP-MISSING-FO");
        Long taskId = taskId("TEST_NIGHT_FDP_MISSING_FO");
        insertValidationBlock(rosterVersionId, taskId, "TEST NIGHT FDP MISSING FO PIC");

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-FDP-007"))));
    }

    @Test
    void validationIssueListEndpointReturnsSavedSnapshotWithoutImplicitValidation() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        insertShortDdo(rosterVersionId);

        mockMvc.perform(get("/api/rostering-workbench/validation-publish/issues").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rosterVersionNo", notNullValue()))
            .andExpect(jsonPath("$.data.blockedCount").value(0))
            .andExpect(jsonPath("$.data.warningCount").value(0))
            .andExpect(jsonPath("$.data.issues").isEmpty());
        assertThat(savedDdoHitIds(rosterVersionId)).isEmpty();
    }

    @Test
    void validationGetEndpointsKeepSavedHitSnapshotWhenFactsChange() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        insertShortDdo(rosterVersionId);

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-BASE-008")));
        List<Long> savedHitIds = savedDdoHitIds(rosterVersionId);
        assertThat(savedHitIds).isNotEmpty();

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-BASE-008")));
        assertThat(savedDdoHitIds(rosterVersionId)).containsExactlyElementsOf(savedHitIds);

        jdbcTemplate.update(
            """
            UPDATE timeline_block
            SET start_utc = '2036-01-01 14:00:00',
                end_utc = '2036-01-03 01:00:00'
            WHERE display_label = 'TEST SHORT DDO'
            """
        );

        mockMvc.perform(get("/api/rostering-workbench/validation-publish/issues").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rosterVersionNo", notNullValue()))
            .andExpect(jsonPath("$.data.blockedCount").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-BASE-008")))
            .andExpect(jsonPath("$.data.issues[*].targetType").value(hasItem("TIMELINE_BLOCK")));
        assertThat(savedDdoHitIds(rosterVersionId)).containsExactlyElementsOf(savedHitIds);

        mockMvc.perform(get("/api/rostering-workbench/validation-publish").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.blockedCount").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("RG-BASE-008")));
        assertThat(savedDdoHitIds(rosterVersionId)).containsExactlyElementsOf(savedHitIds);

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-BASE-008"))));
        assertThat(savedDdoHitIds(rosterVersionId)).isEmpty();
        assertThat(savedDdoHitStatuses(rosterVersionId)).contains("CLOSED");
    }

    private Long latestRosterVersionId() {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version ORDER BY id DESC LIMIT 1",
            Long.class
        );
    }

    private long issueRuleCount(JsonNode issues, String ruleId) {
        return StreamSupport.stream(issues.spliterator(), false)
            .filter(issue -> ruleId.equals(issue.path("ruleId").asText()))
            .count();
    }

    private JsonNode evidenceForRule(JsonNode issues, String ruleId) throws Exception {
        JsonNode issue = StreamSupport.stream(issues.spliterator(), false)
            .filter(candidate -> ruleId.equals(candidate.path("ruleId").asText()))
            .findFirst()
            .orElseThrow();
        return objectMapper.readTree(issue.path("evidenceJson").asText());
    }

    private int currentRosterPublishableTaskCount() {
        return jdbcTemplate.queryForObject(
            """
            SELECT COUNT(DISTINCT tpi.id)
            FROM task_plan_item tpi
            JOIN timeline_block tb ON tb.task_plan_item_id = tpi.id
            WHERE tb.roster_version_id = (
                SELECT rv.id
                FROM roster_version rv
                ORDER BY rv.id DESC
                LIMIT 1
            )
              AND tpi.status IN ('ASSIGNED_DRAFT', 'ASSIGNED', 'NEEDS_REVIEW', 'WARNING')
            """,
            Integer.class
        );
    }

    private Long insertValidationRoster(String versionNo) {
        jdbcTemplate.update(
            "INSERT INTO roster_version (version_no, status, created_by) VALUES (?, 'DRAFT', NULL)",
            versionNo
        );
        return jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version WHERE version_no = ?",
            Long.class,
            versionNo
        );
    }

    private Long taskId(String taskCode) {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            Long.class,
            taskCode
        );
    }

    private Long insertActiveCrewForValidation(String employeeNo) {
        jdbcTemplate.update(
            """
            INSERT INTO crew_member (
                crew_code, employee_no, name_zh, name_en, role_code, rank_code, home_base,
                aircraft_qualification, acclimatization_status, rolling_flight_hours_28d,
                rolling_duty_hours_28d, rolling_duty_hours_7d, rolling_duty_hours_14d,
                rolling_flight_hours_12m, status
            )
            VALUES (?, ?, ?, ?, 'CAPTAIN', 'CAPT', 'MFM', 'A330', 'ACCLIMATIZED', 0, 0, 0, 0, 0, 'ACTIVE')
            """,
            employeeNo,
            employeeNo,
            employeeNo,
            employeeNo
        );
        return jdbcTemplate.queryForObject("SELECT id FROM crew_member WHERE crew_code = ?", Long.class, employeeNo);
    }

    private void insertConsecutiveDutyDays(
        Long rosterVersionId,
        Long crewId,
        int dayCount,
        String firstDutyLocalDate
    ) {
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        java.time.LocalDate firstLocalDate = java.time.LocalDate.parse(firstDutyLocalDate);
        for (int index = 0; index < dayCount; index += 1) {
            java.time.LocalDate localDate = firstLocalDate.plusDays(index);
            String taskCode = "TEST_DDO_DUTY_" + (index + 1);
            jdbcTemplate.update(
                """
                INSERT INTO task_plan_item (
                  batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
                  scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
                )
                VALUES (?, ?, 'FLIGHT', ?, ?, 'MFM', 'SIN', ?, ?, 1, 'ASSIGNED_DRAFT', 'A330', 'PIC+FO')
                """,
                batchId,
                taskCode,
                taskCode,
                taskCode,
                localDate.atTime(0, 0).toString().replace('T', ' '),
                localDate.atTime(8, 0).toString().replace('T', ' ')
            );
            Long taskId = taskId(taskCode);
            jdbcTemplate.update(
                """
                INSERT INTO timeline_block (
                  roster_version_id, crew_member_id, task_plan_item_id, block_type,
                  start_utc, end_utc, display_label, status, assignment_role, display_order
                )
                VALUES (?, ?, ?, 'FLIGHT', ?, ?, ?, 'PLANNED', 'PIC', ?)
                """,
                rosterVersionId,
                crewId,
                taskId,
                localDate.atTime(0, 0).toString().replace('T', ' '),
                localDate.atTime(8, 0).toString().replace('T', ' '),
                "TEST DDO DUTY " + (index + 1),
                index
            );
        }
    }

    private void insertDdoAfterSixDutyDays(Long rosterVersionId, Long crewId) {
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, NULL, 'DDO', '2036-03-07 14:00:00', '2036-03-09 00:00:00',
                    'TEST DDO AFTER SIX DUTY DAYS', 'PLANNED', 'EXTRA', 907)
            """,
            rosterVersionId,
            crewId
        );
    }

    private void insertRestDaysForValidation(
        Long rosterVersionId,
        Long crewId,
        String firstRestLocalDate,
        int dayCount,
        String displayLabelPrefix
    ) {
        java.time.LocalDate firstLocalDate = java.time.LocalDate.parse(firstRestLocalDate);
        for (int index = 0; index < dayCount; index += 1) {
            java.time.LocalDate localDate = firstLocalDate.plusDays(index);
            jdbcTemplate.update(
                """
                INSERT INTO timeline_block (
                  roster_version_id, crew_member_id, task_plan_item_id, block_type,
                  start_utc, end_utc, display_label, status, assignment_role, display_order
                )
                VALUES (?, ?, NULL, 'REST', ?, ?, ?, 'PLANNED', 'EXTRA', ?)
                """,
                rosterVersionId,
                crewId,
                localDate.atTime(0, 0).toString().replace('T', ' '),
                localDate.atTime(1, 0).toString().replace('T', ' '),
                displayLabelPrefix + (index + 1),
                index
            );
        }
    }

    private void insertRollingTwoDdoUnitsForValidation(Long rosterVersionId, Long crewId) {
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, NULL, 'DDO', '2036-07-07 14:00:00', '2036-07-10 00:00:00',
                    'TEST DDO ROLLING TWO UNITS', 'PLANNED', 'EXTRA', 907)
            """,
            rosterVersionId,
            crewId
        );
    }

    private void insertCancelledLinkedRollingTwoDdoUnitsForValidation(Long rosterVersionId, Long crewId) {
        Long batchId = jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch ORDER BY id LIMIT 1",
            Long.class
        );
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id, task_code, task_type, title_zh, title_en, departure_airport, arrival_airport,
              scheduled_start_utc, scheduled_end_utc, sector_count, status, aircraft_type, required_crew_pattern
            )
            VALUES (?, 'TEST_DDO_ROLLING_CANCELLED_LINK', 'FLIGHT', 'TEST_DDO_ROLLING_CANCELLED_LINK',
                    'TEST_DDO_ROLLING_CANCELLED_LINK', 'MFM', 'SIN', '2036-08-07 14:00:00',
                    '2036-08-10 00:00:00', 1, 'CANCELLED', 'A330', 'PIC+FO')
            """,
            batchId
        );
        Long taskId = taskId("TEST_DDO_ROLLING_CANCELLED_LINK");
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, ?, ?, 'DDO', '2036-08-07 14:00:00', '2036-08-10 00:00:00',
                    'TEST DDO ROLLING CANCELLED LINK TWO UNITS', 'PLANNED', 'EXTRA', 907)
            """,
            rosterVersionId,
            crewId,
            taskId
        );
    }

    private void insertValidationBlock(Long rosterVersionId, Long taskId, String displayLabel) {
        insertValidationBlock(rosterVersionId, taskId, displayLabel, "CAPTAIN", "PIC", 0);
    }

    private void insertValidationBlock(
        Long rosterVersionId,
        Long taskId,
        String displayLabel,
        String roleCode,
        String assignmentRole,
        int displayOrder
    ) {
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            SELECT ?, (SELECT id FROM crew_member WHERE role_code = ? ORDER BY id LIMIT 1 OFFSET ?),
                   id, 'FLIGHT', scheduled_start_utc, scheduled_end_utc, ?, 'PLANNED', ?, ?
            FROM task_plan_item
            WHERE id = ?
            """,
            rosterVersionId,
            roleCode,
            displayOrder == 0 ? 0 : displayOrder - 1,
            displayLabel,
            assignmentRole,
            displayOrder,
            taskId
        );
    }

    private String timelineBlockStatus(String displayLabel) {
        return jdbcTemplate.queryForObject(
            "SELECT status FROM timeline_block WHERE display_label = ?",
            String.class,
            displayLabel
        );
    }

    private void insertShortDdo(Long rosterVersionId) {
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, NULL, NULL, 'DDO', '2036-01-01 00:00:00', '2036-01-01 02:00:00',
                    'TEST SHORT DDO', 'PLANNED', 'EXTRA', 901)
            """,
            rosterVersionId
        );
    }

    private List<Long> savedDdoHitIds(Long rosterVersionId) {
        return jdbcTemplate.queryForList(
            """
            SELECT vh.id
            FROM violation_hit vh
            JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
            WHERE vh.roster_version_id = ?
              AND rc.rule_id = 'RG-BASE-008'
              AND vh.status = 'OPEN'
            ORDER BY vh.id
            """,
            Long.class,
            rosterVersionId
        );
    }

    private List<String> savedDdoHitStatuses(Long rosterVersionId) {
        return jdbcTemplate.queryForList(
            """
            SELECT vh.status
            FROM violation_hit vh
            JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
            WHERE vh.roster_version_id = ?
              AND rc.rule_id = 'RG-BASE-008'
            ORDER BY vh.id
            """,
            String.class,
            rosterVersionId
        );
    }

    private String loginToken(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        int tokenStart = body.indexOf("\"token\":\"") + 9;
        int tokenEnd = body.indexOf('"', tokenStart);
        return body.substring(tokenStart, tokenEnd);
    }
}
