package com.pilotroster.archive;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
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
class ArchiveIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void resetArchiveSeed() {
        jdbcTemplate.update(
            """
            DELETE caf
            FROM crew_archive_form caf
            JOIN flight_archive_case fac ON fac.id = caf.archive_case_id
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code IN ('NX8801', 'NX8810', 'NX9001', 'TSTNOCR')
            """
        );
        jdbcTemplate.update(
            """
            DELETE fac
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code IN ('NX8801', 'NX8810', 'NX9001', 'TSTNOCR')
            """
        );
        jdbcTemplate.update(
            """
            DELETE FROM task_plan_item
            WHERE task_code = 'TSTNOCR'
            """
        );
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id,
              task_code,
              task_type,
              departure_airport,
              arrival_airport,
              scheduled_start_utc,
              scheduled_end_utc,
              sector_count,
              status,
              title_zh,
              title_en,
              aircraft_type,
              aircraft_no,
              required_crew_pattern,
              source_status
            )
            SELECT
              id,
              'NX9001',
              'FLIGHT',
              'MFM',
              'SIN',
              '2026-04-26 01:00:00',
              '2026-04-26 05:15:00',
              1,
              'ASSIGNED',
              'NX9001',
              'NX9001',
              'A330',
              'B-MOCK9001',
              'PIC+FO',
              'MANUAL'
            FROM task_plan_import_batch
            WHERE batch_no = 'BATCH-2026-05-W1'
              AND NOT EXISTS (
                SELECT 1 FROM task_plan_item existing WHERE existing.task_code = 'NX9001'
              )
            """
        );
        jdbcTemplate.update(
            """
            UPDATE task_plan_item
            SET scheduled_start_utc = '2026-04-26 01:00:00',
                scheduled_end_utc = '2026-04-26 05:15:00',
                status = 'ASSIGNED'
            WHERE task_code = 'NX9001'
            """
        );
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
              1,
              c.id,
              tpi.id,
              'FLIGHT',
              tpi.scheduled_start_utc,
              tpi.scheduled_end_utc,
              'NX9001 MFM-SIN',
              'ASSIGNED',
              seeded.assignment_role,
              seeded.display_order
            FROM task_plan_item tpi
            JOIN (
              SELECT 'CPT002' AS crew_code, 'PIC' AS assignment_role, 0 AS display_order
              UNION ALL
              SELECT 'FO003', 'FO', 1
            ) seeded
            JOIN crew_member c ON c.crew_code = seeded.crew_code
            WHERE tpi.task_code = 'NX9001'
              AND NOT EXISTS (
                SELECT 1
                FROM timeline_block existing
                WHERE existing.task_plan_item_id = tpi.id
                  AND existing.assignment_role = seeded.assignment_role
              )
            """
        );
        jdbcTemplate.update(
            """
            UPDATE timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            SET tb.start_utc = tpi.scheduled_start_utc,
                tb.end_utc = tpi.scheduled_end_utc,
                tb.display_label = 'NX9001 MFM-SIN',
                tb.status = 'ASSIGNED'
            WHERE tpi.task_code = 'NX9001'
            """
        );
        jdbcTemplate.update(
            """
            INSERT INTO flight_archive_case (
              flight_id,
              roster_version_id,
              archive_status,
              archive_deadline_at_utc,
              archived_at_utc,
              completed_count,
              total_count,
              revision
            )
            SELECT
              tpi.id,
              1,
              'Unarchived',
              DATE_ADD(tpi.scheduled_end_utc, INTERVAL 24 HOUR),
              NULL,
              0,
              2,
              0
            FROM task_plan_item tpi
            WHERE tpi.task_code = 'NX9001'
              AND NOT EXISTS (
                SELECT 1 FROM flight_archive_case fac WHERE fac.flight_id = tpi.id
              )
            """
        );
        jdbcTemplate.update(
            """
            INSERT INTO crew_archive_form (
              archive_case_id,
              flight_id,
              crew_id,
              actual_duty_start_utc,
              actual_duty_end_utc,
              actual_fdp_start_utc,
              actual_fdp_end_utc,
              flying_hour_minutes,
              no_flying_hour_flag,
              form_status,
              entered_by,
              entered_at_utc,
              confirmed_at_utc,
              revision
            )
            SELECT
              fac.id,
              fac.flight_id,
              tb.crew_member_id,
              NULL,
              NULL,
              NULL,
              NULL,
              NULL,
              FALSE,
              'NotStarted',
              NULL,
              NULL,
              NULL,
              0
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            JOIN timeline_block tb ON tb.task_plan_item_id = tpi.id
            WHERE tpi.task_code = 'NX9001'
              AND tb.crew_member_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM crew_archive_form existing
                WHERE existing.archive_case_id = fac.id
                  AND existing.crew_id = tb.crew_member_id
              )
            """
        );
    }

    @Test
    void dispatcherCompletesArchiveVerticalSlice() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());
        Long caseId = archiveCaseId();
        Long firstFormId = archiveFormId(0);
        Long secondFormId = archiveFormId(1);

        mockMvc.perform(get(timelinePath("2026-04-24T00:00:00Z", "2026-04-27T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX9001 MFM-SIN')].archiveStatus").value(hasItem(ArchiveStatus.OVERDUE)))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX9001 MFM-SIN')].canEditArchive").value(hasItem(true)))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX9001 MFM-SIN')].archiveDeadlineAtUtc").value(hasItem(notNullValue())));

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.archiveCase.archiveStatus").value(ArchiveStatus.OVERDUE))
            .andExpect(jsonPath("$.data.archiveCase.canEditArchive").value(true))
            .andExpect(jsonPath("$.data.crewForms.length()").value(2));

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')].archiveStatus").value(hasItem(ArchiveStatus.OVERDUE)));

        mockMvc.perform(put("/api/archive/forms/" + firstFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewArchiveForm.formStatus").value(CrewArchiveFormStatus.COMPLETED))
            .andExpect(jsonPath("$.data.archiveCase.archiveStatus").value(ArchiveStatus.OVERDUE))
            .andExpect(jsonPath("$.data.auditLogId", notNullValue()));

        mockMvc.perform(put("/api/archive/forms/" + secondFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, true, null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewArchiveForm.formStatus").value(CrewArchiveFormStatus.NO_FLYING_HOUR_CONFIRMED))
            .andExpect(jsonPath("$.data.archiveCase.archiveStatus").value(ArchiveStatus.ARCHIVED));
    }

    @Test
    void ganttTimelineUsesWindowIntersection() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get(timelinePath("2026-04-24T00:00:00Z", "2026-04-27T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(greaterThanOrEqualTo(2)));

        mockMvc.perform(get(timelinePath("2026-06-01T00:00:00Z", "2026-06-08T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void eligibleFinishedAssignedFlightGetsArchiveCaseAutomatically() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX8801')].archiveStatus").value(hasItem(ArchiveStatus.OVERDUE)));
    }

    @Test
    void futureFlightIsHiddenEvenWhenArchiveCaseAlreadyExists() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        jdbcTemplate.update(
            """
            UPDATE task_plan_item
            SET scheduled_start_utc = '2026-05-02 01:00:00',
                scheduled_end_utc = '2026-05-02 05:15:00',
                status = 'ASSIGNED'
            WHERE task_code = 'NX9001'
            """
        );
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')].archiveStatus").isEmpty());
    }

    @Test
    void assignedDraftFlightIsHiddenFromArchiveQueue() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'ASSIGNED_DRAFT' WHERE task_code = 'NX9001'");
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')].archiveStatus").isEmpty());
    }

    @Test
    void flightWithoutCrewBlocksDoesNotEnterArchiveQueue() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        jdbcTemplate.update(
            """
            INSERT INTO task_plan_item (
              batch_id,
              task_code,
              task_type,
              departure_airport,
              arrival_airport,
              scheduled_start_utc,
              scheduled_end_utc,
              sector_count,
              status
            )
            SELECT id, 'TSTNOCR', 'FLIGHT', 'MFM', 'SIN', '2026-04-26 01:00:00', '2026-04-26 05:15:00', 1, 'ASSIGNED'
            FROM task_plan_import_batch
            WHERE batch_no = 'BATCH-2026-05-W1'
            """
        );
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'TSTNOCR')].archiveStatus").isEmpty());
    }

    @Test
    void revisionConflictIsRejected() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long firstFormId = archiveFormId(0);

        mockMvc.perform(put("/api/archive/forms/" + firstFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(99, false, 255)))
            .andExpect(status().isConflict());
    }

    @Test
    void managerCanViewArchiveButCannotEdit() throws Exception {
        String token = loginToken("manager01", "Admin123!");
        Long caseId = archiveCaseId();
        Long firstFormId = archiveFormId(0);

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.archiveCase.canEditArchive").value(false))
            .andExpect(jsonPath("$.data.crewForms[0].canEdit").value(false));

        mockMvc.perform(put("/api/archive/forms/" + firstFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isForbidden());
    }

    @Test
    void pilotUsesCrewScopedMeEndpointOnly() throws Exception {
        String token = loginToken("pilot01", "Admin123!");
        Long caseId = archiveCaseId();

        mockMvc.perform(get(timelinePath("2026-04-28T00:00:00Z", "2026-05-05T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/pilot/me/archive-summary").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].taskCode").value("NX8804"));
    }

    @Test
    void unboundPilotHasNoBusinessDataPermission() throws Exception {
        String token = loginToken("pilot_unbound", "Admin123!");

        mockMvc.perform(get("/api/pilot/me/archive-summary").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void overdueCaseIsRefreshedFromDeadline() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());
        Long caseId = archiveCaseId();
        jdbcTemplate.update("UPDATE flight_archive_case SET archive_deadline_at_utc = '2026-01-01 00:00:00' WHERE id = ?", caseId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.archiveCase.archiveStatus").value(ArchiveStatus.OVERDUE));
    }

    @Test
    void archivedFormIsReadOnlyEvenForDispatcher() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());
        Long firstFormId = archiveFormId(0);
        Long secondFormId = archiveFormId(1);

        mockMvc.perform(put("/api/archive/forms/" + firstFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/archive/forms/" + secondFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, true, null)))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/archive/forms/" + firstFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(1, false, 260)))
            .andExpect(status().isForbidden());
    }

    @Test
    void archiveQueriesDoNotCreateCasesWithoutExplicitSync() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX8801')]").isEmpty());

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX8801')].archiveStatus").value(hasItem(ArchiveStatus.OVERDUE)));
    }

    private Long archiveCaseId() {
        return jdbcTemplate.queryForObject(
            """
            SELECT fac.id
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code = 'NX9001'
            """,
            Long.class
        );
    }

    private Long archiveFormId(int index) {
        return jdbcTemplate.queryForList(
            """
            SELECT caf.id
            FROM crew_archive_form caf
            JOIN flight_archive_case fac ON fac.id = caf.archive_case_id
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code = 'NX9001'
            ORDER BY caf.id
            """,
            Long.class
        ).get(index);
    }

    private String timelinePath(String windowStartUtc, String windowEndUtc) {
        return "/api/gantt-timeline?windowStartUtc=" + windowStartUtc + "&windowEndUtc=" + windowEndUtc + "&viewMode=FLIGHT";
    }

    private String savePayload(int expectedRevision, boolean noFlyingHourFlag, Integer flyingHourMinutes) {
        return """
            {
              "expectedRevision": %d,
              "actualDutyStartUtc": "2026-05-01T00:30:00Z",
              "actualDutyEndUtc": "2026-05-01T05:45:00Z",
              "actualFdpStartUtc": "2026-05-01T00:45:00Z",
              "actualFdpEndUtc": "2026-05-01T05:30:00Z",
              "flyingHourMinutes": %s,
              "noFlyingHourFlag": %s
            }
            """.formatted(expectedRevision, flyingHourMinutes == null ? "null" : flyingHourMinutes, noFlyingHourFlag);
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
