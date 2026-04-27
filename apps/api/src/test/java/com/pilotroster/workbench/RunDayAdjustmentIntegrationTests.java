package com.pilotroster.workbench;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class RunDayAdjustmentIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void resetRunDayAdjustments() {
        jdbcTemplate.update("DELETE FROM violation_hit");
        jdbcTemplate.update("DELETE FROM run_day_adjustment");
        jdbcTemplate.update(
            """
            DELETE caf
            FROM crew_archive_form caf
            JOIN task_plan_item tpi ON tpi.id = caf.flight_id
            WHERE tpi.task_code = 'NX9001'
            """
        );
        jdbcTemplate.update(
            """
            DELETE fac
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code = 'NX9001'
            """
        );
        jdbcTemplate.update("DELETE FROM timeline_block WHERE task_plan_item_id IS NULL AND display_label = 'REST NX9001'");
        jdbcTemplate.update(
            """
            UPDATE task_plan_item
            SET scheduled_start_utc = '2026-05-01 01:00:00',
                scheduled_end_utc = '2026-05-01 05:15:00',
                status = 'UNASSIGNED'
            WHERE task_code = 'NX9001'
            """
        );
        jdbcTemplate.update(
            """
            UPDATE timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            SET tb.start_utc = tpi.scheduled_start_utc,
                tb.end_utc = tpi.scheduled_end_utc,
                tb.status = 'PUBLISHED'
            WHERE tpi.task_code = 'NX9001'
            """
        );
        jdbcTemplate.update(
            """
            UPDATE timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            SET tb.crew_member_id = (SELECT id FROM crew_member WHERE role_code = 'CAPTAIN' ORDER BY id LIMIT 1)
            WHERE tpi.task_code = 'NX9001' AND tb.assignment_role = 'PIC'
            """
        );
        jdbcTemplate.update(
            """
            UPDATE timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            SET tb.crew_member_id = (SELECT id FROM crew_member WHERE role_code = 'FIRST_OFFICER' ORDER BY id LIMIT 1)
            WHERE tpi.task_code = 'NX9001' AND tb.assignment_role = 'FO'
            """
        );
    }

    @Test
    void dispatcherCanCreateAndListRunDayAdjustmentDraft() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX9001");

        mockMvc.perform(get("/api/rostering-workbench/run-day-adjustments").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "taskId": %d,
                      "adjustmentType": "DELAY",
                      "proposedStartUtc": "2026-05-01T02:00:00Z",
                      "proposedEndUtc": "2026-05-01T07:00:00Z",
                      "reason": "ATC delay"
                    }
                    """.formatted(taskId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.taskCode").value("NX9001"))
            .andExpect(jsonPath("$.data.adjustmentType").value("DELAY"))
            .andExpect(jsonPath("$.data.status").value("DRAFT"));

        mockMvc.perform(get("/api/rostering-workbench/run-day-adjustments").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].taskCode").value(hasItem("NX9001")))
            .andExpect(jsonPath("$.data[*].adjustmentType").value(hasItem("DELAY")));
    }

    @Test
    void managerCannotCreateRunDayAdjustmentDraft() throws Exception {
        String token = loginToken("manager01", "Admin123!");
        Long taskId = taskId("NX9001");

        mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "taskId": %d,
                      "adjustmentType": "DELAY",
                      "proposedStartUtc": "2026-05-01T02:00:00Z",
                      "proposedEndUtc": "2026-05-01T07:00:00Z",
                      "reason": "ATC delay"
                    }
                    """.formatted(taskId)))
            .andExpect(status().isForbidden());
    }

    @Test
    void dispatcherAppliesDelayToTaskAndTimelineBlocks() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX9001");

        Long adjustmentId = createAdjustment(
            token,
            taskId,
            "DELAY",
            "2026-05-01T02:00:00Z",
            "2026-05-01T07:00:00Z"
        );

        mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments/" + adjustmentId + "/apply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("APPLIED"));

        mockMvc.perform(get("/api/task-plan/items").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')].scheduledStartUtc").value(hasItem("2026-05-01T02:00:00Z")))
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')].scheduledEndUtc").value(hasItem("2026-05-01T07:00:00Z")));

        mockMvc.perform(get("/api/gantt-timeline?windowStartUtc=2026-05-01T00:00:00Z&windowEndUtc=2026-05-02T00:00:00Z&viewMode=CREW")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX9001 MFM-SIN')].startUtc").value(hasItem("2026-05-01T02:00:00Z")))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX9001 MFM-SIN')].endUtc").value(hasItem("2026-05-01T07:00:00Z")));
    }

    @Test
    void dispatcherAppliesCancellationAndFlightLeavesArchiveQueue() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX9001");

        Long adjustmentId = createAdjustment(
            token,
            taskId,
            "CANCEL",
            null,
            null
        );

        mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments/" + adjustmentId + "/apply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("APPLIED"));

        mockMvc.perform(get("/api/task-plan/items").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')].status").value(hasItem("CANCELLED")));

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')]").isEmpty());
    }

    @Test
    void dispatcherAppliesRestInsertForAssignedCrewRows() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX9001");

        Long adjustmentId = createAdjustment(
            token,
            taskId,
            "REST_INSERT",
            "2026-05-01T08:00:00Z",
            "2026-05-01T19:00:00Z"
        );

        mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments/" + adjustmentId + "/apply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("APPLIED"));

        mockMvc.perform(get("/api/gantt-timeline?windowStartUtc=2026-05-01T00:00:00Z&windowEndUtc=2026-05-02T00:00:00Z&viewMode=CREW")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.blockType == 'REST')].displayLabel").value(hasItem("REST NX9001")));
    }

    @Test
    void dispatcherAppliesCrewReplacementToTimelineBlockAndRevalidates() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX9001");
        Long fromCrewId = jdbcTemplate.queryForObject(
            """
            SELECT crew_member_id
            FROM timeline_block
            WHERE task_plan_item_id = ?
              AND assignment_role = 'PIC'
              AND crew_member_id IS NOT NULL
            ORDER BY id
            LIMIT 1
            """,
            Long.class,
            taskId
        );
        Long toCrewId = jdbcTemplate.queryForObject(
            "SELECT id FROM crew_member WHERE id <> ? ORDER BY id DESC LIMIT 1",
            Long.class,
            fromCrewId
        );

        Long adjustmentId = createCrewReplacementAdjustment(token, taskId, fromCrewId, toCrewId);

        mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments/" + adjustmentId + "/apply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("APPLIED"))
            .andExpect(jsonPath("$.data.fromCrewId").value(fromCrewId.intValue()))
            .andExpect(jsonPath("$.data.toCrewId").value(toCrewId.intValue()));

        mockMvc.perform(get("/api/gantt-timeline?windowStartUtc=2026-05-01T00:00:00Z&windowEndUtc=2026-05-02T00:00:00Z&viewMode=CREW")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX9001 MFM-SIN')].crewId").value(hasItem(toCrewId.intValue())));
    }

    private Long taskId(String taskCode) {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            Long.class,
            taskCode
        );
    }

    private Long createAdjustment(String token, Long taskId, String type, String startUtc, String endUtc) throws Exception {
        String startValue = startUtc == null ? "null" : "\"" + startUtc + "\"";
        String endValue = endUtc == null ? "null" : "\"" + endUtc + "\"";
        MvcResult result = mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "taskId": %d,
                      "adjustmentType": "%s",
                      "proposedStartUtc": %s,
                      "proposedEndUtc": %s,
                      "reason": "Ops update"
                    }
                    """.formatted(taskId, type, startValue, endValue)))
            .andExpect(status().isOk())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        int idStart = body.indexOf("\"id\":") + 5;
        int idEnd = body.indexOf(',', idStart);
        return Long.parseLong(body.substring(idStart, idEnd));
    }

    private Long createCrewReplacementAdjustment(String token, Long taskId, Long fromCrewId, Long toCrewId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/rostering-workbench/run-day-adjustments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "taskId": %d,
                      "adjustmentType": "CREW_REPLACEMENT",
                      "proposedStartUtc": null,
                      "proposedEndUtc": null,
                      "fromCrewId": %d,
                      "toCrewId": %d,
                      "assignmentRole": "PIC",
                      "effectiveStartUtc": "2026-05-01T01:00:00Z",
                      "effectiveEndUtc": "2026-05-01T05:15:00Z",
                      "reason": "Crew sick leave"
                    }
                    """.formatted(taskId, fromCrewId, toCrewId)))
            .andExpect(status().isOk())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        int idStart = body.indexOf("\"id\":") + 5;
        int idEnd = body.indexOf(',', idStart);
        return Long.parseLong(body.substring(idStart, idEnd));
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
