package com.pilotroster.publish;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
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
class PublishResultIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void ensurePublishSeeds() throws Exception {
        if (findTaskId("NX8810") != null && findTaskId("NX8811") != null) {
            return;
        }

        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-PUBLISH-SEED-01'");
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        if (findTaskId("NX8810") == null) {
            createTask(token, batchId, "NX8810", "MFM", "TPE", "2026-04-27T13:30:00Z", "2026-04-27T17:30:00Z");
        }
        if (findTaskId("NX8811") == null) {
            createTask(token, batchId, "NX8811", "MFM", "BKK", "2026-04-28T03:30:00Z", "2026-04-28T08:10:00Z");
        }
    }

    @AfterEach
    void resetPublishFixtures() {
        jdbcTemplate.update("DELETE FROM violation_hit");
        jdbcTemplate.update("DELETE FROM timeline_block WHERE display_label LIKE 'TEST PUBLISH %'");
        jdbcTemplate.update(
            """
            UPDATE timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            SET tb.status = 'ASSIGNED_DRAFT'
            WHERE tpi.task_code = 'NX9001'
            """
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'UNASSIGNED' WHERE task_code IN ('NX8810', 'NX8811')");
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'UNASSIGNED' WHERE task_code IN ('NX9001', 'TEST001')");
        jdbcTemplate.update(
            """
            DELETE tpi
            FROM task_plan_item tpi
            JOIN task_plan_import_batch tpb ON tpb.id = tpi.batch_id
            WHERE tpi.task_code IN ('NX8810', 'NX8811')
              AND tpb.batch_no = 'TEST-PUBLISH-SEED-01'
            """
        );
        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-PUBLISH-SEED-01'");
    }

    @Test
    void publishEndpointStillBlocksWhenValidationBlockersRemain() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get("/api/publish/results").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.summary.blockedCount").value(greaterThanOrEqualTo(2)))
            .andExpect(jsonPath("$.data.summary.canPublish").value(false));

        mockMvc.perform(get("/api/publish-results").header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/publish/results/publish")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"managerConfirmed\":true}"))
            .andExpect(status().isConflict());
    }

    @Test
    void publishViewAndExportReflectPublishedFlightAndCrewResults() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        neutralizeSeedBlockers();
        preparePublishableDrafts();

        mockMvc.perform(post("/api/publish/results/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.summary.validatedAtUtc", notNullValue()))
            .andExpect(jsonPath("$.data.summary.blockedCount").value(0));

        mockMvc.perform(post("/api/publish/results/publish")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"managerConfirmed\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.summary.publishedTasks").value(greaterThanOrEqualTo(2)))
            .andExpect(jsonPath("$.data.flightResults[*].taskCode").value(hasItem("NX8810")))
            .andExpect(jsonPath("$.data.flightResults[*].taskCode").value(hasItem("NX8811")))
            .andExpect(jsonPath("$.data.crewResults[*].tasks[*].taskCode").value(hasItem("NX8810")))
            .andExpect(jsonPath("$.data.crewResults[*].tasks[*].taskCode").value(hasItem("NX8811")));

        mockMvc.perform(get("/api/publish/results/export?view=flight").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.fileName").value("publish-results-flight.csv"))
            .andExpect(jsonPath("$.data.csv").value(containsString("Task Code,Route")))
            .andExpect(jsonPath("$.data.csv").value(containsString("NX8810")));

        mockMvc.perform(get("/api/publish/results/export?view=crew").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.fileName").value("publish-results-crew.csv"))
            .andExpect(jsonPath("$.data.csv").value(containsString("Crew Code,Name ZH")))
            .andExpect(jsonPath("$.data.csv").value(containsString("NX8811")));

        mockMvc.perform(get("/api/publish/results/export?view=bad-view").header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/task-plan/items/" + taskId("NX8810"))
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(taskUpdatePayload(taskId("NX8810"))))
            .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/task-plan/items/" + taskId("NX8810"))
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());
    }

    private void preparePublishableDrafts() {
        Long rosterVersionId = latestDraftRosterVersionId();
        List<Long> captains = jdbcTemplate.queryForList(
            "SELECT id FROM crew_member WHERE role_code = 'CAPTAIN' ORDER BY id LIMIT 2",
            Long.class
        );
        List<Long> firstOfficers = jdbcTemplate.queryForList(
            "SELECT id FROM crew_member WHERE role_code = 'FIRST_OFFICER' ORDER BY id LIMIT 2",
            Long.class
        );
        List<String> taskCodes = List.of("NX8810", "NX8811");
        for (int index = 0; index < taskCodes.size(); index += 1) {
            String taskCode = taskCodes.get(index);
            Long taskId = taskId(taskCode);
            Long captainId = captains.get(Math.min(index, captains.size() - 1));
            Long firstOfficerId = firstOfficers.get(Math.min(index, firstOfficers.size() - 1));
            jdbcTemplate.update("UPDATE task_plan_item SET status = 'ASSIGNED_DRAFT' WHERE id = ?", taskId);
            insertPublishedCandidateBlock(rosterVersionId, captainId, taskId, "PIC", 0, "TEST PUBLISH PIC " + taskCode);
            insertPublishedCandidateBlock(rosterVersionId, firstOfficerId, taskId, "FO", 1, "TEST PUBLISH FO " + taskCode);
        }
    }

    private void neutralizeSeedBlockers() {
        jdbcTemplate.update(
            """
            UPDATE timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            SET tb.status = 'CANCELLED'
            WHERE tpi.task_code = 'NX9001'
            """
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'CANCELLED' WHERE task_code IN ('NX9001', 'TEST001')");
        jdbcTemplate.update("DELETE FROM violation_hit");
    }

    private void insertPublishedCandidateBlock(
        Long rosterVersionId,
        Long crewId,
        Long taskId,
        String assignmentRole,
        int displayOrder,
        String displayLabel
    ) {
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            SELECT ?, ?, id, 'FLIGHT', scheduled_start_utc, scheduled_end_utc, ?, 'ASSIGNED_DRAFT', ?, ?
            FROM task_plan_item
            WHERE id = ?
            """,
            rosterVersionId,
            crewId,
            displayLabel,
            assignmentRole,
            displayOrder,
            taskId
        );
    }

    private Long latestDraftRosterVersionId() {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version WHERE status = 'DRAFT' ORDER BY id DESC LIMIT 1",
            Long.class
        );
    }

    private Long taskId(String taskCode) {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            Long.class,
            taskCode
        );
    }

    private Long findTaskId(String taskCode) {
        return jdbcTemplate.query(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            rs -> rs.next() ? rs.getLong(1) : null,
            taskCode
        );
    }

    private String taskUpdatePayload(Long taskId) {
        return jdbcTemplate.queryForObject(
            """
            SELECT CONCAT(
              '{"batchId":', batch_id,
              ',"taskCode":"', task_code,
              '","taskType":"', task_type,
              '","titleZh":"', COALESCE(title_zh, task_code),
              '","titleEn":"', COALESCE(title_en, task_code),
              '","departureAirport":"', departure_airport,
              '","arrivalAirport":"', arrival_airport,
              '","scheduledStartUtc":"', DATE_FORMAT(scheduled_start_utc, '%Y-%m-%dT%H:%i:%sZ'),
              '","scheduledEndUtc":"', DATE_FORMAT(scheduled_end_utc, '%Y-%m-%dT%H:%i:%sZ'),
              '","sectorCount":', sector_count,
              ',"aircraftType":"', COALESCE(aircraft_type, ''),
              '","aircraftNo":"', COALESCE(aircraft_no, ''),
              '","requiredCrewPattern":"', COALESCE(required_crew_pattern, 'PIC+FO'),
              '"}'
            )
            FROM task_plan_item
            WHERE id = ?
            """,
            String.class,
            taskId
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

    private Long createBatch(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/task-plan/batches")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchNo": "TEST-PUBLISH-SEED-01",
                      "sourceName": "TEST-PUBLISH-SEED",
                      "status": "IMPORTED",
                      "importedAtUtc": "2026-05-01T00:00:00Z"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(result.getResponse().getContentAsString(), "\"id\":");
    }

    private void createTask(
        String token,
        Long batchId,
        String taskCode,
        String departureAirport,
        String arrivalAirport,
        String startUtc,
        String endUtc
    ) throws Exception {
        mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "%s",
                      "taskType": "FLIGHT",
                      "titleZh": "%s",
                      "titleEn": "%s",
                      "departureAirport": "%s",
                      "arrivalAirport": "%s",
                      "scheduledStartUtc": "%s",
                      "scheduledEndUtc": "%s",
                      "sectorCount": 1,
                      "aircraftType": "A330",
                      "aircraftNo": "B-LNM",
                      "requiredCrewPattern": "PIC+FO"
                    }
                    """.formatted(
                    batchId,
                    taskCode,
                    taskCode,
                    taskCode,
                    departureAirport,
                    arrivalAirport,
                    startUtc,
                    endUtc
                )))
            .andExpect(status().isOk());
    }

    private Long extractLong(String body, String marker) {
        int start = body.indexOf(marker) + marker.length();
        int end = start;
        while (end < body.length() && Character.isDigit(body.charAt(end))) {
            end++;
        }
        return Long.valueOf(body.substring(start, end));
    }
}
