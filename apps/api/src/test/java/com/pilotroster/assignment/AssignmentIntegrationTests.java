package com.pilotroster.assignment;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class AssignmentIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @AfterEach
    void resetAssignmentSeed() {
        jdbcTemplate.update(
            """
            DELETE caf
            FROM crew_archive_form caf
            JOIN task_plan_item tpi ON tpi.id = caf.flight_id
            WHERE tpi.task_code = 'TESTDRT01'
            """
        );
        jdbcTemplate.update(
            """
            DELETE fac
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code = 'TESTDRT01'
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code = 'TESTDRT01'
            """
        );
        jdbcTemplate.update(
            """
            DELETE vh
            FROM violation_hit vh
            JOIN task_plan_item tpi ON tpi.id = vh.task_id
            WHERE tpi.task_code = 'TESTDRT01'
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code = 'TESTCXL01'
            """
        );
        jdbcTemplate.update("DELETE FROM task_plan_item WHERE task_code = 'TESTCXL01'");
        jdbcTemplate.update("DELETE FROM task_plan_item WHERE task_code = 'TESTDRT01'");
        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-DRAFT-QUEUE-01'");
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
        jdbcTemplate.update(
            """
            DELETE vh
            FROM violation_hit vh
            JOIN task_plan_item tpi ON tpi.id = vh.task_id
            WHERE tpi.task_code = 'NX8810'
            """
        );
        jdbcTemplate.update("DELETE FROM timeline_block WHERE display_label = 'TEST-ASSIGNMENT-CONFLICT'");
        jdbcTemplate.update(
            """
            DELETE tpi
            FROM task_plan_item tpi
            JOIN task_plan_import_batch tpb ON tpb.id = tpi.batch_id
            WHERE tpi.task_code = 'NX8810'
              AND tpb.batch_no = 'TEST-ASSIGNMENT-SEED-01'
            """
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'UNASSIGNED' WHERE task_code = 'NX8810'");
        restoreCrewSeed();
        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-ASSIGNMENT-SEED-01'");
    }

    @BeforeEach
    void ensureAssignmentTaskSeed() throws Exception {
        if (findTaskId("NX8810") != null) {
            return;
        }

        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-ASSIGNMENT-SEED-01'");

        String token = loginToken("dispatcher01", "Admin123!");
        MvcResult batchResult = mockMvc.perform(post("/api/task-plan/batches")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchNo": "TEST-ASSIGNMENT-SEED-01",
                      "sourceName": "TEST-ASSIGNMENT-SEED",
                      "status": "IMPORTED",
                      "importedAtUtc": "2026-04-25T00:00:00Z"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long batchId = extractLong(batchResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "NX8810",
                      "taskType": "FLIGHT",
                      "titleZh": "排班测试航班",
                      "titleEn": "Assignment Test Flight",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TPE",
                      "scheduledStartUtc": "2026-04-27T13:30:00Z",
                      "scheduledEndUtc": "2026-04-27T17:30:00Z",
                      "sectorCount": 1,
                      "aircraftType": "A330",
                      "aircraftNo": "B-LNM",
                      "requiredCrewPattern": "PIC+FO"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk());
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
            .andExpect(jsonPath("$.data.assignmentRequirements.length()").value(2))
            .andExpect(jsonPath("$.data.canClearDraft").value(false))
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
    void assignmentCandidatePoolsKeepRequiredRolesNarrowAndAdditionalCrewBroad() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.picCandidates[?(@.id == %d)].roleCode".formatted(picCrewId)).value(hasItem("CAPTAIN")))
            .andExpect(jsonPath("$.data.picCandidates[?(@.id == %d)]".formatted(foCrewId)).doesNotExist())
            .andExpect(jsonPath("$.data.foCandidates[?(@.id == %d)].roleCode".formatted(foCrewId)).value(hasItem("FIRST_OFFICER")))
            .andExpect(jsonPath("$.data.foCandidates[?(@.id == %d)]".formatted(picCrewId)).doesNotExist())
            .andExpect(jsonPath("$.data.additionalCandidates[?(@.id == %d)].roleCode".formatted(picCrewId)).value(hasItem("CAPTAIN")))
            .andExpect(jsonPath("$.data.additionalCandidates[?(@.id == %d)].roleCode".formatted(foCrewId)).value(hasItem("FIRST_OFFICER")));
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
    void archiveCaseBlocksDraftDetailSaveAndClearEvenBeforePublishedStatus() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = createDraftQueueTask(token);
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("ASSIGNED_DRAFT"));
        createArchiveCase(taskId);

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("ASSIGNED_DRAFT"))
            .andExpect(jsonPath("$.data.canEdit").value(false))
            .andExpect(jsonPath("$.data.canClearDraft").value(false))
            .andExpect(jsonPath("$.data.readOnlyReason").value("ARCHIVE_CASE_EXISTS"))
            .andExpect(jsonPath("$.data.runtimeSummary.draftEditingBlocked").value(true));

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());
    }

    @Test
    void saveAndClearDraftReturnAuditIdsAndRecordMeaningfulAuditPayloads() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = createDraftQueueTask(token);
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");
        Long reliefCrewId = crewId("FO002");

        MvcResult saveResult = mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayloadWithRelief(picCrewId, foCrewId, reliefCrewId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.auditLogId", notNullValue()))
            .andReturn();
        Long saveAuditLogId = extractLong(saveResult.getResponse().getContentAsString(), "\"auditLogId\":");

        assertAuditAndEventPayload(
            saveAuditLogId,
            "ASSIGNMENT_DRAFT_SAVED",
            "AssignmentDraftSaved",
            taskId,
            "2026-05-03T01:00:00Z",
            "2026-05-03T05:00:00Z",
            List.of(picCrewId, foCrewId, reliefCrewId),
            List.of(
                new ExpectedAssignment(picCrewId, "PIC", 0),
                new ExpectedAssignment(foCrewId, "FO", 1),
                new ExpectedAssignment(reliefCrewId, "RELIEF", 2)
            )
        );

        mockMvc.perform(get("/api/assignments/draft-rostering/tasks").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].draftAuditSummary.lastActionCode".formatted(taskId)).value(hasItem("ASSIGNMENT_DRAFT_SAVED")));

        MvcResult clearResult = mockMvc.perform(delete("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.auditLogId", notNullValue()))
            .andReturn();
        Long clearAuditLogId = extractLong(clearResult.getResponse().getContentAsString(), "\"auditLogId\":");

        assertAuditAndEventPayload(
            clearAuditLogId,
            "ASSIGNMENT_DRAFT_CLEARED",
            "AssignmentDraftCleared",
            taskId,
            "2026-05-03T01:00:00Z",
            "2026-05-03T05:00:00Z",
            List.of(picCrewId, foCrewId, reliefCrewId),
            List.of(
                new ExpectedAssignment(picCrewId, "PIC", 0),
                new ExpectedAssignment(foCrewId, "FO", 1),
                new ExpectedAssignment(reliefCrewId, "RELIEF", 2)
            )
        );

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.draftAuditSummary.hasDraftAudit").value(true))
            .andExpect(jsonPath("$.data.draftAuditSummary.lastActionCode").value("ASSIGNMENT_DRAFT_CLEARED"));
        mockMvc.perform(get("/api/assignments/draft-rostering/tasks").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].draftAuditSummary.lastActionCode".formatted(taskId)).value(hasItem("ASSIGNMENT_DRAFT_CLEARED")));
    }

    @Test
    void draftRosteringQueueListsShellTasksAndReflectsDraftStatus() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = createDraftQueueTask(token);
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(get("/api/assignments/draft-rostering/tasks").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].taskCode".formatted(taskId)).value(hasItem("TESTDRT01")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].taskStatus".formatted(taskId)).value(hasItem("UNASSIGNED")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].departureAirport".formatted(taskId)).value(hasItem("MFM")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].arrivalAirport".formatted(taskId)).value(hasItem("TPE")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].canOpenAssignment".formatted(taskId)).value(hasItem(true)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].canEditDraft".formatted(taskId)).value(hasItem(true)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].canClearDraft".formatted(taskId)).value(hasItem(false)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].runtimeSummary.taskStatus".formatted(taskId)).value(hasItem("UNASSIGNED")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].runtimeSummary.runtimeMarkCodes.length()".formatted(taskId)).value(hasItem(0)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].issueSummary.totalIssueCount".formatted(taskId)).value(hasItem(0)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].draftAuditSummary.hasDraftAudit".formatted(taskId)).value(hasItem(false)));

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "picCrewId": %d,
                      "foCrewId": %d
                    }
                    """.formatted(picCrewId, foCrewId)))
            .andExpect(status().isOk());
        insertOpenViolation(taskId, "P0 BLOCK", "Crew status conflict requires review");

        mockMvc.perform(get("/api/assignments/draft-rostering/tasks").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].taskStatus".formatted(taskId)).value(hasItem("ASSIGNED_DRAFT")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].canClearDraft".formatted(taskId)).value(hasItem(true)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].runtimeSummary.taskStatus".formatted(taskId)).value(hasItem("ASSIGNED_DRAFT")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].issueSummary.totalIssueCount".formatted(taskId)).value(hasItem(1)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].issueSummary.blockingIssueCount".formatted(taskId)).value(hasItem(1)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].issueSummary.latestIssueMessage".formatted(taskId)).value(hasItem("Crew status conflict requires review")))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].draftAuditSummary.hasDraftAudit".formatted(taskId)).value(hasItem(true)))
            .andExpect(jsonPath("$.data.tasks[?(@.taskId == %d)].draftAuditSummary.lastActionCode".formatted(taskId)).value(hasItem("ASSIGNMENT_DRAFT_SAVED")));
    }

    @Test
    void assignmentTaskDetailExposesPhase3DraftContextSummaries() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isOk());
        insertOpenViolation(taskId, "P0 BLOCK", "Draft has a blocking rule hit");

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.runtimeSummary.taskStatus").value("ASSIGNED_DRAFT"))
            .andExpect(jsonPath("$.data.runtimeSummary.runtimeMarkCodes.length()").value(0))
            .andExpect(jsonPath("$.data.runtimeSummary.draftEditingBlocked").value(false))
            .andExpect(jsonPath("$.data.issueSummary.totalIssueCount").value(1))
            .andExpect(jsonPath("$.data.issueSummary.blockingIssueCount").value(1))
            .andExpect(jsonPath("$.data.issueSummary.latestIssueMessage").value("Draft has a blocking rule hit"))
            .andExpect(jsonPath("$.data.draftAuditSummary.hasDraftAudit").value(true))
            .andExpect(jsonPath("$.data.draftAuditSummary.lastActionCode").value("ASSIGNMENT_DRAFT_SAVED"))
            .andExpect(jsonPath("$.data.draftAuditSummary.lastActionAtUtc", notNullValue()));
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
            .andExpect(status().isConflict());

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
    void dispatcherCannotSaveDraftWithBackendIneligibleCrew() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        jdbcTemplate.update("UPDATE crew_member SET status = 'INACTIVE' WHERE crew_code = 'CPT001'");
        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isConflict());
        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.picCandidates[?(@.id == %d)].eligibleForAssignment".formatted(picCrewId)).value(hasItem(false)))
            .andExpect(jsonPath("$.data.picCandidates[?(@.id == %d)].eligibilityReasonCodes[*]".formatted(picCrewId)).value(hasItem("CREW_INACTIVE")));

        restoreCrewSeed();
        jdbcTemplate.update("UPDATE crew_member SET availability_status = 'UNAVAILABLE' WHERE crew_code = 'CPT001'");
        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isConflict());

        restoreCrewSeed();
        jdbcTemplate.update("UPDATE crew_member SET aircraft_qualification = 'A320' WHERE crew_code = 'CPT001'");
        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isConflict());

        restoreCrewSeed();
        insertStatusConflict(picCrewId, taskId);
        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isConflict());
        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.picCandidates[?(@.id == %d)].eligibilityReasonCodes[*]".formatted(picCrewId)).value(hasItem("TIME_CONFLICT")));
    }

    @Test
    void cancelledAssignmentTimelineBlocksDoNotBlockDraftReassignment() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long taskId = taskId("NX8810");
        Long picCrewId = crewId("CPT001");
        Long foCrewId = crewId("FO001");

        insertCancelledAssignmentConflict(picCrewId, taskId);

        mockMvc.perform(get("/api/assignments/tasks/" + taskId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.picCandidates[?(@.id == %d)].eligibleForAssignment".formatted(picCrewId)).value(hasItem(true)));

        mockMvc.perform(put("/api/assignments/tasks/" + taskId + "/draft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(draftPayload(picCrewId, foCrewId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.task.status").value("ASSIGNED_DRAFT"));
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

    private Long findTaskId(String taskCode) {
        return jdbcTemplate.query(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            rs -> rs.next() ? rs.getLong(1) : null,
            taskCode
        );
    }

    private Long createDraftQueueTask(String token) throws Exception {
        MvcResult batchResult = mockMvc.perform(post("/api/task-plan/batches")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchNo": "TEST-DRAFT-QUEUE-01",
                      "sourceName": "TEST-DRAFT-QUEUE",
                      "status": "IMPORTED",
                      "importedAtUtc": "2026-05-01T00:00:00Z"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long batchId = extractLong(batchResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult taskResult = mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TESTDRT01",
                      "taskType": "FLIGHT",
                      "titleZh": "草稿排班测试航班",
                      "titleEn": "Draft Rostering Test Flight",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TPE",
                      "scheduledStartUtc": "2026-05-03T01:00:00Z",
                      "scheduledEndUtc": "2026-05-03T05:00:00Z",
                      "sectorCount": 1,
                      "aircraftType": "A330",
                      "aircraftNo": "B-LNM",
                      "requiredCrewPattern": "PIC+FO"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(taskResult.getResponse().getContentAsString(), "\"id\":");
    }

    private Long crewId(String crewCode) {
        return jdbcTemplate.queryForObject("SELECT id FROM crew_member WHERE crew_code = ?", Long.class, crewCode);
    }

    private void assertAuditAndEventPayload(
        Long auditLogId,
        String actionCode,
        String eventType,
        Long taskId,
        String windowStartUtc,
        String windowEndUtc,
        List<Long> affectedCrewIds,
        List<ExpectedAssignment> expectedAssignments
    ) throws Exception {
        String auditPayload = jdbcTemplate.queryForObject(
            """
            SELECT detail_json
            FROM audit_log
            WHERE id = ?
              AND action_code = ?
              AND object_type = 'TaskPlanItem'
              AND object_id = ?
            """,
            String.class,
            auditLogId,
            actionCode,
            String.valueOf(taskId)
        );
        assertDraftPayload(auditPayload, actionCode, taskId, windowStartUtc, windowEndUtc, affectedCrewIds, expectedAssignments);

        String eventPayload = jdbcTemplate.queryForObject(
            """
            SELECT payload_json
            FROM domain_event
            WHERE event_type = ?
              AND aggregate_type = 'TaskPlanItem'
              AND aggregate_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            String.class,
            eventType,
            String.valueOf(taskId)
        );
        assertDraftPayload(eventPayload, actionCode, taskId, windowStartUtc, windowEndUtc, affectedCrewIds, expectedAssignments);
    }

    private void assertDraftPayload(
        String payloadJson,
        String actionCode,
        Long taskId,
        String windowStartUtc,
        String windowEndUtc,
        List<Long> affectedCrewIds,
        List<ExpectedAssignment> expectedAssignments
    ) throws Exception {
        JsonNode payload = objectMapper.readTree(payloadJson);
        assertEquals(actionCode, payload.path("actionType").asText());
        assertEquals(true, payload.path("rosterVersionId").canConvertToLong());
        assertLongArray(affectedCrewIds, payload.path("affectedCrewIds"));
        assertLongArray(List.of(taskId), payload.path("affectedTaskIds"));
        assertEquals(windowStartUtc, payload.path("affectedWindow").path("startUtc").asText());
        assertEquals(windowEndUtc, payload.path("affectedWindow").path("endUtc").asText());

        JsonNode assignments = payload.path("assignments");
        assertEquals(expectedAssignments.size(), assignments.size());
        for (int index = 0; index < expectedAssignments.size(); index++) {
            ExpectedAssignment expected = expectedAssignments.get(index);
            JsonNode assignment = assignments.get(index);
            assertEquals(expected.crewId(), assignment.path("crewId").asLong());
            assertEquals(expected.assignmentRole(), assignment.path("assignmentRole").asText());
            assertEquals(expected.displayOrder(), assignment.path("displayOrder").asInt());
        }
    }

    private void assertLongArray(List<Long> expectedValues, JsonNode actualArray) {
        assertEquals(expectedValues.size(), actualArray.size());
        for (int index = 0; index < expectedValues.size(); index++) {
            assertEquals(expectedValues.get(index), actualArray.get(index).asLong());
        }
    }

    private void restoreCrewSeed() {
        jdbcTemplate.update(
            """
            UPDATE crew_member
            SET status = 'ACTIVE',
                availability_status = 'AVAILABLE',
                aircraft_qualification = 'A330'
            WHERE crew_code IN ('CPT001', 'FO001', 'FO002')
            """
        );
    }

    private String draftPayload(Long picCrewId, Long foCrewId) {
        return """
            {
              "picCrewId": %d,
              "foCrewId": %d
            }
            """.formatted(picCrewId, foCrewId);
    }

    private String draftPayloadWithRelief(Long picCrewId, Long foCrewId, Long reliefCrewId) {
        return """
            {
              "picCrewId": %d,
              "foCrewId": %d,
              "additionalAssignments": [
                { "crewId": %d, "assignmentRole": "RELIEF" }
              ]
            }
            """.formatted(picCrewId, foCrewId, reliefCrewId);
    }

    private record ExpectedAssignment(Long crewId, String assignmentRole, int displayOrder) {}

    private void insertStatusConflict(Long crewId, Long taskId) {
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id,
              crew_member_id,
              task_plan_item_id,
              block_type,
              start_utc,
              end_utc,
              display_label,
              status,
              assignment_role,
              display_order
            )
            SELECT
              rv.id,
              ?,
              NULL,
              'REST',
              tpi.scheduled_start_utc,
              tpi.scheduled_end_utc,
              'TEST-ASSIGNMENT-CONFLICT',
              'PLANNED',
              'STATUS',
              0
            FROM roster_version rv
            JOIN task_plan_item tpi ON tpi.id = ?
            WHERE rv.status = 'DRAFT'
            ORDER BY rv.id DESC
            LIMIT 1
            """,
            crewId,
            taskId
        );
    }

    private void insertCancelledAssignmentConflict(Long crewId, Long taskId) {
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id,
              task_code,
              task_type,
              title_zh,
              title_en,
              departure_airport,
              arrival_airport,
              scheduled_start_utc,
              scheduled_end_utc,
              sector_count,
              aircraft_type,
              aircraft_no,
              required_crew_pattern,
              status,
              source_status
            )
            SELECT
              batch_id,
              'TESTCXL01',
              task_type,
              '取消态冲突测试航班',
              'Cancelled conflict test flight',
              departure_airport,
              arrival_airport,
              scheduled_start_utc,
              scheduled_end_utc,
              sector_count,
              aircraft_type,
              aircraft_no,
              required_crew_pattern,
              'CANCELLED',
              source_status
            FROM task_plan_item
            WHERE id = ?
            """,
            taskId
        );
        Long cancelledTaskId = taskId("TESTCXL01");
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id,
              crew_member_id,
              task_plan_item_id,
              block_type,
              start_utc,
              end_utc,
              display_label,
              status,
              assignment_role,
              display_order
            )
            SELECT
              rv.id,
              ?,
              ?,
              'FLIGHT',
              tpi.scheduled_start_utc,
              tpi.scheduled_end_utc,
              'TEST-CANCELLED-ASSIGNMENT-CONFLICT',
              'CANCELLED',
              'PIC',
              0
            FROM roster_version rv
            JOIN task_plan_item tpi ON tpi.id = ?
            WHERE rv.status = 'DRAFT'
            ORDER BY rv.id DESC
            LIMIT 1
            """,
            crewId,
            cancelledTaskId,
            cancelledTaskId
        );
    }

    private void insertOpenViolation(Long taskId, String severity, String message) {
        jdbcTemplate.update(
            """
            INSERT INTO violation_hit (
              roster_version_id,
              rule_catalog_id,
              severity,
              status,
              target_type,
              target_id,
              task_id,
              evidence_json,
              evidence_window_start_utc,
              evidence_window_end_utc,
              message,
              recommended_action
            )
            SELECT
              rv.id,
              rc.id,
              ?,
              'OPEN',
              'TASK',
              ?,
              ?,
              '{}',
              tpi.scheduled_start_utc,
              tpi.scheduled_end_utc,
              ?,
              'REVIEW'
            FROM roster_version rv
            JOIN task_plan_item tpi ON tpi.id = ?
            JOIN rule_catalog rc ON rc.rule_id = 'CREW_STATUS_CONFLICT'
            WHERE rv.status = 'DRAFT'
            ORDER BY rv.id DESC
            LIMIT 1
            """,
            severity,
            taskId,
            taskId,
            message,
            taskId
        );
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
              (
                SELECT COUNT(DISTINCT tb.crew_member_id)
                FROM timeline_block tb
                WHERE tb.task_plan_item_id = tpi.id
                  AND tb.roster_version_id = rv.id
                  AND tb.crew_member_id IS NOT NULL
              ),
              0
            FROM task_plan_item tpi
            JOIN roster_version rv ON rv.status = 'DRAFT'
            WHERE tpi.id = ?
            ORDER BY rv.id DESC
            LIMIT 1
            """,
            taskId
        );
        Long archiveCaseId = jdbcTemplate.queryForObject(
            "SELECT id FROM flight_archive_case WHERE flight_id = ?",
            Long.class,
            taskId
        );
        jdbcTemplate.update(
            """
            INSERT INTO crew_archive_form (
              archive_case_id,
              flight_id,
              crew_id,
              form_status
            )
            SELECT DISTINCT
              fac.id,
              fac.flight_id,
              tb.crew_member_id,
              'NotStarted'
            FROM flight_archive_case fac
            JOIN timeline_block tb
              ON tb.task_plan_item_id = fac.flight_id
             AND tb.roster_version_id = fac.roster_version_id
            WHERE fac.id = ?
              AND tb.crew_member_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM crew_archive_form existing
                WHERE existing.archive_case_id = fac.id
                  AND existing.crew_id = tb.crew_member_id
              )
            """,
            archiveCaseId
        );
        return archiveCaseId;
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

    private Long extractLong(String body, String marker) {
        int start = body.indexOf(marker) + marker.length();
        int end = start;
        while (end < body.length() && Character.isDigit(body.charAt(end))) {
            end++;
        }
        return Long.valueOf(body.substring(start, end));
    }
}
