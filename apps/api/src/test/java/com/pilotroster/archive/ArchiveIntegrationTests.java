package com.pilotroster.archive;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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
            WHERE tpi.task_code IN ('NX8801', 'NX8810', 'NX9001', 'TSTNOCR', 'TSTSCOP', 'TSTSCOP2')
            """
        );
        jdbcTemplate.update(
            """
            DELETE fac
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code IN ('NX8801', 'NX8810', 'NX9001', 'TSTNOCR', 'TSTSCOP', 'TSTSCOP2')
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code IN ('TSTSCOP', 'TSTSCOP2')
            """
        );
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code = 'NX9001'
              AND (tb.roster_version_id <> 1 OR tb.display_label <> 'NX9001 MFM-SIN')
            """
        );
        jdbcTemplate.update(
            """
            DELETE de
            FROM domain_event de
            LEFT JOIN roster_version rv ON rv.id = CAST(de.aggregate_id AS UNSIGNED)
            WHERE de.event_type = 'RosterPublished'
              AND de.aggregate_type = 'RosterVersion'
              AND rv.version_no LIKE 'RV-TEST-ARCHIVE-%'
            """
        );
        jdbcTemplate.update("DELETE FROM roster_version WHERE version_no LIKE 'RV-TEST-ARCHIVE-%'");
        jdbcTemplate.update(
            """
            DELETE FROM domain_event
            WHERE event_type = 'RosterPublished'
              AND aggregate_type = 'RosterVersion'
              AND aggregate_id = '1'
              AND JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.testFixture')) = 'archive-integration'
            """
        );
        jdbcTemplate.update(
            """
            DELETE FROM task_plan_item
            WHERE task_code IN ('TSTNOCR', 'TSTSCOP', 'TSTSCOP2')
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
              'PUBLISHED',
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
                status = 'PUBLISHED'
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
              'PUBLISHED',
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
                tb.status = 'PUBLISHED'
            WHERE tpi.task_code = 'NX9001'
            """
        );
        jdbcTemplate.update(
            """
            UPDATE timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            JOIN crew_member c ON c.crew_code = CASE tb.assignment_role
                WHEN 'PIC' THEN 'CPT002'
                WHEN 'FO' THEN 'FO003'
                ELSE c.crew_code
            END
            SET tb.crew_member_id = c.id
            WHERE tpi.task_code = 'NX9001'
              AND tb.roster_version_id = 1
              AND tb.assignment_role IN ('PIC', 'FO')
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
              AND tb.roster_version_id = 1
              AND tb.status = 'PUBLISHED'
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
        insertSeedRosterPublishedEvent();
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
        insertSeedRosterPublishedEvent();

        mockMvc.perform(get(timelinePath("2026-04-24T00:00:00Z", "2026-04-27T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(greaterThanOrEqualTo(2)));

        mockMvc.perform(get(timelinePath("2046-06-01T00:00:00Z", "2046-06-08T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void eligibleFinishedAssignedFlightGetsArchiveCaseAutomatically() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        insertSeedRosterPublishedEvent();

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
        insertSeedRosterPublishedEvent();
        Long caseId = archiveCaseId();
        Long firstFormId = archiveFormId(0);
        jdbcTemplate.update(
            """
            UPDATE task_plan_item
            SET scheduled_start_utc = '2036-05-02 01:00:00',
                scheduled_end_utc = '2036-05-02 05:15:00',
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

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/archive/forms/" + firstFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isForbidden());
    }

    @Test
    void assignedDraftFlightIsHiddenFromArchiveQueue() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        insertSeedRosterPublishedEvent();
        Long caseId = archiveCaseId();
        Long firstFormId = archiveFormId(0);
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'ASSIGNED_DRAFT' WHERE task_code = 'NX9001'");
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX9001')].archiveStatus").isEmpty());

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/archive/forms/" + firstFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isForbidden());
    }

    @Test
    void flightWithoutCrewBlocksDoesNotEnterArchiveQueue() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        insertSeedRosterPublishedEvent();
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
    void syncCreatesArchiveCaseAndFormsFromLatestPublishedRosterScope() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long wrongRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-WRONG-COPY");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-PUBLISHED");
        Long wrongCrewId = crewId("CPT002");
        Long publishedCrewId = crewId("FO003");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(wrongRosterId, wrongCrewId, taskId, "PIC", 0, "TEST ARCHIVE WRONG COPY");
        insertArchiveTimelineBlock(publishedRosterId, publishedCrewId, taskId, "FO", 1, "TEST ARCHIVE PUBLISHED");
        insertRosterPublishedEvent(publishedRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        Long caseId = archiveCaseId("TSTSCOP");
        assertEquals(publishedRosterId, archiveCaseRosterVersionId(caseId));
        assertThat(archiveFormCrewIds(caseId)).containsExactly(publishedCrewId);
    }

    @Test
    void archiveSyncDoesNotCreateCasesWithoutPublishedRosterEvent() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long staleRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-NO-EVENT");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(staleRosterId, crewId("CPT002"), taskId, "PIC", 0, "TEST ARCHIVE NO EVENT");

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        assertEquals(0, archiveCaseCount("TSTSCOP"));
    }

    @Test
    void archiveSyncFallsBackToLatestPublishedRosterWithPublishedBlocks() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-PUBLISHED-WITH-BLOCKS");
        Long emptyPublishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-PUBLISHED-EMPTY");
        Long staleStatusRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-PUBLISHED-STALE-STATUS");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        Long staleStatusTaskId = insertArchiveScopedTask("TSTSCOP2", "ASSIGNED_DRAFT");
        Long crewId = crewId("FO003");
        insertArchiveTimelineBlock(publishedRosterId, crewId, taskId, "FO", 1, "TEST ARCHIVE PUBLISHED FALLBACK");
        insertRosterPublishedEvent(publishedRosterId);
        insertRosterPublishedEvent(emptyPublishedRosterId);
        insertArchiveTimelineBlock(staleStatusRosterId, crewId, staleStatusTaskId, "FO", 1, "TEST ARCHIVE STALE STATUS FALLBACK");
        insertRosterPublishedEvent(staleStatusRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        Long caseId = archiveCaseId("TSTSCOP");
        assertEquals(publishedRosterId, archiveCaseRosterVersionId(caseId));
        assertThat(archiveFormCrewIds(caseId)).containsExactly(crewId);
    }

    @Test
    void archiveSyncIgnoresPublishedBlocksWhenTaskIsNotPublishedInSelectedRoster() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-PUBLISHED-MIXED-TASKS");
        Long publishedTaskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        Long assignedTaskId = insertArchiveScopedTask("TSTSCOP2", "ASSIGNED");
        Long crewId = crewId("FO003");
        insertArchiveTimelineBlock(publishedRosterId, crewId, publishedTaskId, "FO", 1, "TEST ARCHIVE MIXED PUBLISHED TASK");
        insertArchiveTimelineBlock(publishedRosterId, crewId, assignedTaskId, "FO", 1, "TEST ARCHIVE MIXED ASSIGNED TASK");
        insertRosterPublishedEvent(publishedRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        Long caseId = archiveCaseId("TSTSCOP");
        assertEquals(publishedRosterId, archiveCaseRosterVersionId(caseId));
        assertEquals(0, archiveCaseCount("TSTSCOP2"));
    }

    @Test
    void archiveFormsIgnoreNonPublishedBlocksInPublishedRosterScope() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-FORM-SCOPE");
        Long publishedCrewId = crewId("FO003");
        Long staleCrewId = crewId("CPT002");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(publishedRosterId, publishedCrewId, taskId, "FO", 1, "TEST ARCHIVE FORM PUBLISHED");
        insertArchiveTimelineBlock(publishedRosterId, staleCrewId, taskId, "PIC", 0, "TEST ARCHIVE FORM DRAFT", "ASSIGNED_DRAFT");
        insertRosterPublishedEvent(publishedRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        assertThat(archiveFormCrewIds(archiveCaseId("TSTSCOP"))).containsExactly(publishedCrewId);
    }

    @Test
    void archiveDetailAndSaveHideExistingFormsOutsidePublishedRosterScope() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-FORM-VISIBILITY");
        Long publishedCrewId = crewId("FO003");
        Long staleCrewId = crewId("CPT002");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(publishedRosterId, publishedCrewId, taskId, "FO", 1, "TEST ARCHIVE FORM VISIBLE");
        insertRosterPublishedEvent(publishedRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        Long caseId = archiveCaseId("TSTSCOP");
        Long staleFormId = insertArchiveForm(caseId, taskId, staleCrewId);

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewForms.length()").value(1))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(hasItem(publishedCrewId.intValue())))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(not(hasItem(staleCrewId.intValue()))));

        mockMvc.perform(get(timelinePath("2026-04-24T00:00:00Z", "2026-04-27T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'TEST ARCHIVE FORM VISIBLE')].crewArchiveSummary.total").value(hasItem(1)));

        jdbcTemplate.update("UPDATE flight_archive_case SET archive_status = ? WHERE id = ?", ArchiveStatus.ARCHIVED, caseId);
        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewForms.length()").value(1))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(hasItem(publishedCrewId.intValue())))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(not(hasItem(staleCrewId.intValue()))));

        mockMvc.perform(put("/api/archive/forms/" + staleFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isForbidden());
    }

    @Test
    void archiveDetailAndSaveHideFormsWithMismatchedFlightIdentity() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-FORM-FLIGHT-SCOPE");
        Long publishedCrewId = crewId("FO003");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(publishedRosterId, publishedCrewId, taskId, "FO", 1, "TEST ARCHIVE FORM FLIGHT VISIBLE");
        insertRosterPublishedEvent(publishedRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        Long caseId = archiveCaseId("TSTSCOP");
        Long mismatchedFormId = archiveFormId(caseId, publishedCrewId);
        jdbcTemplate.update(
            "UPDATE crew_archive_form SET flight_id = ? WHERE id = ?",
            taskId("NX9001"),
            mismatchedFormId
        );

        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewForms.length()").value(0))
            .andExpect(jsonPath("$.data.crewForms[*].flightId").value(not(hasItem(taskId("NX9001").intValue()))));

        mockMvc.perform(put("/api/archive/forms/" + mismatchedFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        assertThat(archiveFormCrewIds(caseId)).containsExactly(publishedCrewId);
    }

    @Test
    void syncMovesExistingArchiveCaseToLatestPublishedRosterScope() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long oldRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-OLD-SCOPE");
        Long newRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-NEW-SCOPE");
        Long oldCrewId = crewId("CPT002");
        Long newCrewId = crewId("FO003");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(oldRosterId, oldCrewId, taskId, "PIC", 0, "TEST ARCHIVE OLD SCOPE");
        insertArchiveTimelineBlock(newRosterId, newCrewId, taskId, "FO", 1, "TEST ARCHIVE NEW SCOPE");
        Long caseId = insertArchiveCase(taskId, oldRosterId);
        Long oldFormId = insertArchiveForm(caseId, taskId, oldCrewId);
        insertRosterPublishedEvent(newRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        assertEquals(newRosterId, archiveCaseRosterVersionId(caseId));
        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewForms.length()").value(1))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(hasItem(newCrewId.intValue())))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(not(hasItem(oldCrewId.intValue()))));

        assertEquals(0, archiveFormCountById(oldFormId));
        mockMvc.perform(put("/api/archive/forms/" + oldFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isNotFound());
    }

    @Test
    void syncMigratesStartedUnarchivedCaseToLatestScopeAndKeepsCurrentFormsVisible() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long oldRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-OLD-STARTED-SCOPE");
        Long newRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-NEW-STARTED-SCOPE");
        Long oldCrewId = crewId("CPT002");
        Long newCrewId = crewId("FO003");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(oldRosterId, oldCrewId, taskId, "PIC", 0, "TEST ARCHIVE OLD STARTED SCOPE");
        insertArchiveTimelineBlock(newRosterId, newCrewId, taskId, "FO", 1, "TEST ARCHIVE NEW STARTED SCOPE");
        Long caseId = insertArchiveCase(taskId, oldRosterId);
        Long oldFormId = insertArchiveForm(caseId, taskId, oldCrewId);
        jdbcTemplate.update(
            "UPDATE crew_archive_form SET entered_at_utc = '2026-04-25 06:00:00' WHERE id = ?",
            oldFormId
        );
        insertRosterPublishedEvent(newRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        assertEquals(newRosterId, archiveCaseRosterVersionId(caseId));
        assertEquals(1, archiveFormCountById(oldFormId));
        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewForms.length()").value(1))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(hasItem(newCrewId.intValue())))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(not(hasItem(oldCrewId.intValue()))));
    }

    @Test
    void syncPreservesStartedArchiveFormsWhenPublishedRosterScopeChangesForSameCrew() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long oldRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-OLD-SAME-CREW");
        Long newRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-NEW-SAME-CREW");
        Long crewId = crewId("FO003");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(oldRosterId, crewId, taskId, "FO", 1, "TEST ARCHIVE OLD SAME CREW");
        insertArchiveTimelineBlock(newRosterId, crewId, taskId, "FO", 1, "TEST ARCHIVE NEW SAME CREW");
        Long caseId = insertArchiveCase(taskId, oldRosterId);
        Long oldFormId = insertArchiveForm(caseId, taskId, crewId);
        jdbcTemplate.update(
            """
            UPDATE crew_archive_form
            SET form_status = 'Completed',
                actual_duty_start_utc = '2026-04-25 01:00:00',
                actual_duty_end_utc = '2026-04-25 05:15:00',
                actual_fdp_start_utc = '2026-04-25 01:00:00',
                actual_fdp_end_utc = '2026-04-25 05:15:00',
                flying_hour_minutes = 255,
                confirmed_at_utc = '2026-04-25 06:00:00'
            WHERE id = ?
            """,
            oldFormId
        );
        jdbcTemplate.update(
            """
            UPDATE flight_archive_case
            SET archive_status = 'Archived',
                completed_count = 1,
                total_count = 1
            WHERE id = ?
            """,
            caseId
        );
        insertRosterPublishedEvent(newRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        assertEquals(oldRosterId, archiveCaseRosterVersionId(caseId));
        assertEquals(1, archiveFormCountById(oldFormId));
        assertEquals(1, archiveFormCount(caseId));
        assertEquals(CrewArchiveFormStatus.COMPLETED, archiveFormStatus(caseId, crewId));
        assertEquals(1, archiveCaseIntColumn(caseId, "completed_count"));
        assertThat(archiveCaseStringColumn(caseId, "archive_status")).isEqualTo(ArchiveStatus.ARCHIVED);

        jdbcTemplate.update(
            "UPDATE timeline_block SET status = 'ASSIGNED_DRAFT' WHERE roster_version_id = ? AND task_plan_item_id = ?",
            oldRosterId,
            taskId
        );
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        assertEquals(oldRosterId, archiveCaseRosterVersionId(caseId));
        assertEquals(1, archiveFormCountById(oldFormId));
        assertEquals(1, archiveCaseIntColumn(caseId, "completed_count"));
        assertThat(archiveCaseStringColumn(caseId, "archive_status")).isEqualTo(ArchiveStatus.ARCHIVED);
        mockMvc.perform(get("/api/archive/cases/" + caseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewForms.length()").value(1))
            .andExpect(jsonPath("$.data.crewForms[*].crewId").value(hasItem(crewId.intValue())));
    }

    @Test
    void pilotArchiveSummaryHidesFormsOutsidePublishedRosterScope() throws Exception {
        String token = loginToken("pilot01", "Admin123!");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-PILOT-FORM-VISIBILITY");
        Long pilotCrewId = pilotCrewId();
        Long publishedCrewId = crewId("FO003").equals(pilotCrewId) ? crewId("CPT002") : crewId("FO003");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(publishedRosterId, publishedCrewId, taskId, "FO", 1, "TEST ARCHIVE PILOT VISIBLE");
        insertRosterPublishedEvent(publishedRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + loginToken("dispatcher01", "Admin123!"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        Long caseId = archiveCaseId("TSTSCOP");
        insertArchiveForm(caseId, taskId, pilotCrewId);

        mockMvc.perform(get("/api/pilot/me/archive-summary").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].taskCode").value(not(hasItem("TSTSCOP"))));
    }

    @Test
    void ganttTimelineShowsCurrentRosterBlocksButOnlyAttachesArchiveSummaryToPublishedTruth() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long publishedRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-GANTT-SCOPE");
        Long taskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        insertArchiveTimelineBlock(publishedRosterId, crewId("FO003"), taskId, "FO", 1, "TEST ARCHIVE GANTT PUBLISHED");
        insertArchiveTimelineBlock(publishedRosterId, crewId("CPT002"), taskId, "PIC", 0, "TEST ARCHIVE GANTT DRAFT", "ASSIGNED_DRAFT");
        insertRosterPublishedEvent(publishedRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get(timelinePath("2026-04-24T00:00:00Z", "2026-04-27T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].displayLabel").value(hasItem("TEST ARCHIVE GANTT PUBLISHED")))
            .andExpect(jsonPath("$.data[*].displayLabel").value(hasItem("TEST ARCHIVE GANTT DRAFT")))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'TEST ARCHIVE GANTT PUBLISHED')].archiveCaseId").value(hasItem(notNullValue())))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'TEST ARCHIVE GANTT PUBLISHED')].crewArchiveSummary.total").value(hasItem(1)))
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'TEST ARCHIVE GANTT DRAFT' && @.archiveCaseId != null)]").value(empty()));
    }

    @Test
    void pilotArchiveSummaryHidesInvisibleCasesForLinkedCrew() throws Exception {
        String token = loginToken("pilot01", "Admin123!");
        Long caseId = archiveCaseId();
        Long pilotCrewId = pilotCrewId();
        jdbcTemplate.update(
            """
            INSERT INTO crew_archive_form (
              archive_case_id, flight_id, crew_id, no_flying_hour_flag, form_status, revision
            )
            SELECT id, flight_id, ?, FALSE, 'NotStarted', 0
            FROM flight_archive_case
            WHERE id = ?
              AND NOT EXISTS (
                SELECT 1
                FROM crew_archive_form existing
                WHERE existing.archive_case_id = flight_archive_case.id
                  AND existing.crew_id = ?
              )
            """,
            pilotCrewId,
            caseId,
            pilotCrewId
        );
        jdbcTemplate.update(
            """
            UPDATE task_plan_item
            SET scheduled_start_utc = '2036-05-02 01:00:00',
                scheduled_end_utc = '2036-05-02 05:15:00',
                status = 'ASSIGNED_DRAFT'
            WHERE task_code = 'NX9001'
            """
        );

        mockMvc.perform(get("/api/pilot/me/archive-summary").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].taskCode").value(not(hasItem("NX9001"))));
    }

    @Test
    void newerPublishedRosterHidesUnarchivedCasesFromPreviousPublishedScope() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long oldRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-STALE-OLD");
        Long newRosterId = insertTestRosterVersion("RV-TEST-ARCHIVE-STALE-NEW");
        Long oldTaskId = insertArchiveScopedTask("TSTSCOP", "PUBLISHED");
        Long newTaskId = insertArchiveScopedTask("TSTSCOP2", "PUBLISHED");
        Long crewId = crewId("FO003");
        insertArchiveTimelineBlock(oldRosterId, crewId, oldTaskId, "FO", 1, "TEST ARCHIVE STALE OLD");
        insertRosterPublishedEvent(oldRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        Long staleCaseId = archiveCaseId("TSTSCOP");
        Long staleFormId = archiveFormId(staleCaseId, crewId);
        insertArchiveTimelineBlock(newRosterId, crewId, newTaskId, "FO", 1, "TEST ARCHIVE STALE NEW");
        insertRosterPublishedEvent(newRosterId);

        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].taskCode").value(not(hasItem("TSTSCOP"))))
            .andExpect(jsonPath("$.data[*].taskCode").value(hasItem("TSTSCOP2")));
        mockMvc.perform(get("/api/archive/cases/" + staleCaseId).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/archive/forms/" + staleFormId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(savePayload(0, false, 255)))
            .andExpect(status().isForbidden());
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
        insertSeedRosterPublishedEvent();
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
        insertSeedRosterPublishedEvent();
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

        insertSeedRosterPublishedEvent();
        mockMvc.perform(post("/api/archive/sync").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/archive/cases").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'NX8801')].archiveStatus").value(hasItem(ArchiveStatus.OVERDUE)));
    }

    @Test
    void ganttTimelineDoesNotCreateFormsOrRefreshArchiveCase() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        insertSeedRosterPublishedEvent();
        Long caseId = archiveCaseId();
        jdbcTemplate.update("DELETE FROM crew_archive_form WHERE archive_case_id = ?", caseId);
        jdbcTemplate.update(
            """
            UPDATE flight_archive_case
            SET archive_status = 'Unarchived',
                completed_count = 7,
                total_count = 9,
                revision = 3
            WHERE id = ?
            """,
            caseId
        );

        mockMvc.perform(get(timelinePath("2026-04-24T00:00:00Z", "2026-04-27T00:00:00Z")).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.displayLabel == 'NX9001 MFM-SIN')].archiveStatus").value(hasItem(ArchiveStatus.UNARCHIVED)));

        assertEquals(0, archiveFormCount(caseId));
        assertEquals(ArchiveStatus.UNARCHIVED, archiveCaseStringColumn(caseId, "archive_status"));
        assertEquals(7, archiveCaseIntColumn(caseId, "completed_count"));
        assertEquals(9, archiveCaseIntColumn(caseId, "total_count"));
        assertEquals(3, archiveCaseIntColumn(caseId, "revision"));
    }

    private Long archiveCaseId() {
        return archiveCaseId("NX9001");
    }

    private Long archiveCaseId(String taskCode) {
        return jdbcTemplate.queryForObject(
            """
            SELECT fac.id
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code = ?
            """,
            Long.class,
            taskCode
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

    private Integer archiveFormCount(Long caseId) {
        return jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM crew_archive_form WHERE archive_case_id = ?",
            Integer.class,
            caseId
        );
    }

    private Integer archiveFormCountById(Long formId) {
        return jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM crew_archive_form WHERE id = ?",
            Integer.class,
            formId
        );
    }

    private String archiveFormStatus(Long caseId, Long crewId) {
        return jdbcTemplate.queryForObject(
            """
            SELECT form_status
            FROM crew_archive_form
            WHERE archive_case_id = ?
              AND crew_id = ?
            """,
            String.class,
            caseId,
            crewId
        );
    }

    private Long archiveFormId(Long caseId, Long crewId) {
        return jdbcTemplate.queryForObject(
            """
            SELECT id
            FROM crew_archive_form
            WHERE archive_case_id = ?
              AND crew_id = ?
            """,
            Long.class,
            caseId,
            crewId
        );
    }

    private Integer archiveCaseCount(String taskCode) {
        return jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM flight_archive_case fac
            JOIN task_plan_item tpi ON tpi.id = fac.flight_id
            WHERE tpi.task_code = ?
            """,
            Integer.class,
            taskCode
        );
    }

    private String archiveCaseStringColumn(Long caseId, String columnName) {
        return jdbcTemplate.queryForObject(
            "SELECT " + columnName + " FROM flight_archive_case WHERE id = ?",
            String.class,
            caseId
        );
    }

    private Integer archiveCaseIntColumn(Long caseId, String columnName) {
        return jdbcTemplate.queryForObject(
            "SELECT " + columnName + " FROM flight_archive_case WHERE id = ?",
            Integer.class,
            caseId
        );
    }

    private Long archiveCaseRosterVersionId(Long caseId) {
        return jdbcTemplate.queryForObject(
            "SELECT roster_version_id FROM flight_archive_case WHERE id = ?",
            Long.class,
            caseId
        );
    }

    private Long taskId(String taskCode) {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            Long.class,
            taskCode
        );
    }

    private java.util.List<Long> archiveFormCrewIds(Long caseId) {
        return jdbcTemplate.queryForList(
            "SELECT crew_id FROM crew_archive_form WHERE archive_case_id = ? ORDER BY id",
            Long.class,
            caseId
        );
    }

    private Long insertTestRosterVersion(String versionNo) {
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

    private void insertRosterPublishedEvent(Long rosterVersionId) {
        jdbcTemplate.update(
            """
            INSERT INTO domain_event (event_type, aggregate_type, aggregate_id, payload_json)
            VALUES ('RosterPublished', 'RosterVersion', ?, '{"testFixture":"archive-integration"}')
            """,
            rosterVersionId.toString()
        );
    }

    private void insertSeedRosterPublishedEvent() {
        insertRosterPublishedEvent(1L);
    }

    private Long insertArchiveScopedTask(String taskCode, String status) {
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
            SELECT id, ?, 'FLIGHT', 'MFM', 'TPE', '2026-04-25 01:00:00', '2026-04-25 05:15:00',
                   1, ?, ?, ?, 'A330', 'B-SCOPE', 'PIC+FO', 'MANUAL'
            FROM task_plan_import_batch
            WHERE batch_no = 'BATCH-2026-05-W1'
            """,
            taskCode,
            status,
            taskCode,
            taskCode
        );
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_item WHERE task_code = ?",
            Long.class,
            taskCode
        );
    }

    private void insertArchiveTimelineBlock(
        Long rosterVersionId,
        Long crewId,
        Long taskId,
        String assignmentRole,
        int displayOrder,
        String displayLabel
    ) {
        insertArchiveTimelineBlock(rosterVersionId, crewId, taskId, assignmentRole, displayOrder, displayLabel, "PUBLISHED");
    }

    private void insertArchiveTimelineBlock(
        Long rosterVersionId,
        Long crewId,
        Long taskId,
        String assignmentRole,
        int displayOrder,
        String displayLabel,
        String status
    ) {
        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            SELECT ?, ?, id, 'FLIGHT', scheduled_start_utc, scheduled_end_utc, ?, ?, ?, ?
            FROM task_plan_item
            WHERE id = ?
            """,
            rosterVersionId,
            crewId,
            displayLabel,
            status,
            assignmentRole,
            displayOrder,
            taskId
        );
    }

    private Long crewId(String crewCode) {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM crew_member WHERE crew_code = ?",
            Long.class,
            crewCode
        );
    }

    private Long pilotCrewId() {
        return jdbcTemplate.queryForObject(
            "SELECT crew_id FROM sys_user WHERE username = 'pilot01'",
            Long.class
        );
    }

    private Long insertArchiveForm(Long caseId, Long taskId, Long crewId) {
        jdbcTemplate.update(
            """
            INSERT INTO crew_archive_form (
              archive_case_id, flight_id, crew_id, no_flying_hour_flag, form_status, revision
            )
            VALUES (?, ?, ?, FALSE, 'NotStarted', 0)
            """,
            caseId,
            taskId,
            crewId
        );
        return jdbcTemplate.queryForObject(
            """
            SELECT id
            FROM crew_archive_form
            WHERE archive_case_id = ?
              AND crew_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            Long.class,
            caseId,
            crewId
        );
    }

    private Long insertArchiveCase(Long taskId, Long rosterVersionId) {
        jdbcTemplate.update(
            """
            INSERT INTO flight_archive_case (
              flight_id, roster_version_id, archive_status, archive_deadline_at_utc,
              archived_at_utc, completed_count, total_count, revision
            )
            VALUES (?, ?, 'Unarchived', '2026-04-27 05:15:00', NULL, 0, 1, 0)
            """,
            taskId,
            rosterVersionId
        );
        return jdbcTemplate.queryForObject(
            "SELECT id FROM flight_archive_case WHERE flight_id = ?",
            Long.class,
            taskId
        );
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
