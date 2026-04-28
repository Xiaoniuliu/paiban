package com.pilotroster.assignment;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class AssignmentIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void resetAssignmentSeed() {
        jdbcTemplate.update(
            """
            DELETE caf
            FROM crew_archive_form caf
            JOIN task_plan_item tpi ON tpi.id = caf.flight_id
            WHERE tpi.task_code = 'NX8810'
            """
        );
        jdbcTemplate.update(
            """
            DELETE fac
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code = 'NX8810'
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code = 'NX8810'
            """
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'UNASSIGNED' WHERE task_code = 'NX8810'");
    }

    @Test
    void dispatcherAssignsUnassignedTaskIntoDraftTimelineBlocks() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(get(timelinePath()).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX8810 MFM-TPE')].taskStatus").value(hasItem("UNASSIGNED")))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX8810 MFM-TPE')].crewId").value(hasItem((Object) null)));

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("UNASSIGNED"))
            .andExpect(jsonPath("$.data.picCandidates.length()").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.foCandidates.length()").value(greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.canEdit").value(true));

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d
                    }
                    """.formatted(picCrewId, foCrewId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("ASSIGNED_DRAFT"))
            .andExpect(jsonPath("$.data.timelineBlocks.length()").value(2))
            .andExpect(jsonPath("$.data.timelineBlocks[0].id", notNullValue()));

        mockMvc.perform(get(timelinePath()).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX8810 MFM-TPE')].taskStatus").value(hasItem("ASSIGNED_DRAFT")))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX8810 MFM-TPE')].crewId").value(hasItem(picCrewId.intValue())));
    }

    @Test
    void dispatcherClearsDraftAssignmentBackToUnassigned() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d
                    }
                    """.formatted(picCrewId, foCrewId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("ASSIGNED_DRAFT"));

        mockMvc.perform(delete("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("UNASSIGNED"))
            .andExpect(jsonPath("$.data.affectedCrewIds.length()").value(2))
            .andExpect(jsonPath("$.data.affectedTaskIds[0]").value(taskId));

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("UNASSIGNED"))
            .andExpect(jsonPath("$.data.currentAssignments.length()").value(0))
            .andExpect(jsonPath("$.data.timelineBlocks.length()").value(0));

        mockMvc.perform(get(timelinePath()).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX8810 MFM-TPE')].taskStatus").value(hasItem("UNASSIGNED")))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX8810 MFM-TPE')].crewId").value(hasItem((Object) null)));
    }

    @Test
    void dispatcherAssignsAdditionalReliefCrewAndArchiveFormsFollowAllAssignedCrew() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");
        Long reliefCrewId = crewId("FO002");

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d,
                      "additionalAssignments": [
                        { "crewId": %d, "assignmentRole": "RELIEF" }
                      ]
                    }
                    """.formatted(picCrewId, foCrewId, reliefCrewId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("ASSIGNED_DRAFT"))
            .andExpect(jsonPath("$.data.timelineBlocks.length()").value(3))
            .andExpect(jsonPath("$.data.timelineBlocks[*].assignmentRole").value(hasItem("RELIEF")));

        mockMvc.perform(get(timelinePath()).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX8810 MFM-TPE')].crewId").value(hasItem(reliefCrewId.intValue())));

        Long archiveCaseId = createArchiveCase(taskId);
        mockMvc.perform(get("/api/archive/cases/" + archiveCaseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewForms.length()").value(3))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(hasItem(reliefCrewId.intValue())));

        Long reliefFormId = jdbcTemplate.queryForObject(
            "SELECT id FROM crew_archive_form WHERE flight_id = ? AND crew_id = ?",
            Long.class,
            taskId,
            reliefCrewId
        );
        mockMvc.perform(put("/api/archive/forms/" + reliefFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "expectedRevision": 0,
                      "actualDutyStartUtc": "2026-04-27T13:30:00Z",
                      "actualDutyEndUtc": "2026-04-27T19:00:00Z",
                      "actualFdpStartUtc": "2026-04-27T14:00:00Z",
                      "actualFdpEndUtc": "2026-04-27T18:40:00Z",
                      "flyingHourMinutes": null,
                      "noFlyingHourFlag": true
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewArchiveForm.formStatus").value("NoFlyingHourConfirmed"));
    }

    @Test
    void dispatcherCannotAssignDuplicateCrewOrWrongRequiredRoles() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d,
                      "additionalAssignments": [
                        { "crewId": %d, "assignmentRole": "RELIEF" }
                      ]
                    }
                    """.formatted(picCrewId, foCrewId, picCrewId)))
            .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d
                    }
                    """.formatted(foCrewId, picCrewId)))
            .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": null,
                      "foCrewId": %d
                    }
                    """.formatted(foCrewId)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void managerCanReadButCannotSaveAssignmentDraft() throws Exception {
        String token = loginToken("manager01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.canEdit").value(false));

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d
                    }
                    """.formatted(picCrewId, foCrewId)))
            .andExpect(status().isForbidden());
    }

    @Test
    void publishedTaskIsReadOnlyAndCannotBeChangedThroughAssignmentDrawer() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");

        jdbcTemplate.update("UPDATE task_plan_item SET status = 'PUBLISHED' WHERE id = ?", taskId);

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.canEdit").value(false))
            .andExpect(jsonPath("$.data.readOnlyReason").value("PUBLISHED_LOCKED_RUN_DAY_ADJUSTMENT_REQUIRED"));

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d
                    }
                    """.formatted(crewId("CPT001"), crewId("FO001"))))
            .andExpect(status().isConflict());
    }

    private String timelinePath() {
        return "/api/gantt-timeline?windowStartUtc=2026-04-25T00:00:00Z&windowEndUtc=2026-04-29T00:00:00Z&viewMode=FLIGHT";
    }

    private Long taskId(String taskCode) {
        return jdbcTemplate.queryForObject("SELECT id FROM task_plan_item WHERE task_code = ?", Long.class, taskCode);
    }

    private Long crewId(String crewCode) {
        return jdbcTemplate.queryForObject("SELECT id FROM crew_member WHERE crew_code = ?", Long.class, crewCode);
    }

    private Long createArchiveCase(Long taskId) {
        jdbcTemplate.update(
            """
            INSERT INTO flight_archive_case (
              flight_id,
              roster_version_id,
              archive_status,
              archive_deadline_at_utc,
              completed_count,
              total_count,
              revision
            )
            SELECT
              tpi.id,
              rv.id,
              'Unarchived',
              DATE_ADD(tpi.scheduled_end_utc, INTERVAL 24 HOUR),
              0,
              0,
              0
            FROM task_plan_item tpi
            JOIN roster_version rv ON rv.status = 'DRAFT'
            WHERE tpi.id = ?
            ORDER BY rv.id DESC
            LIMIT 1
            """,
            taskId
        );
        return jdbcTemplate.queryForObject(
            "SELECT id FROM flight_archive_case WHERE flight_id = ?",
            Long.class,
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
}
