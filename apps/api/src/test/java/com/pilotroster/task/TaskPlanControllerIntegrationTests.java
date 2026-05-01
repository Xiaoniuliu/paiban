package com.pilotroster.task;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import static org.hamcrest.Matchers.hasItem;
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
class TaskPlanControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void cleanTestRows() {
        jdbcTemplate.update("DELETE FROM timeline_block WHERE crew_member_id IN (SELECT id FROM crew_member WHERE crew_code IN ('TESTCREW91', 'TESTCREW92', 'TESTCREW93'))");
        jdbcTemplate.update("DELETE FROM crew_qualification WHERE crew_member_id IN (SELECT id FROM crew_member WHERE crew_code IN ('TESTCREW91', 'TESTCREW92', 'TESTCREW93'))");
        jdbcTemplate.update("DELETE FROM crew_member WHERE crew_code IN ('TESTCREW91', 'TESTCREW92', 'TESTCREW93')");
        jdbcTemplate.update("DELETE FROM task_plan_item WHERE task_code IN ('TEST9101', 'TEST9102', 'TEST9103', 'TEST9104', 'TEST9105', 'TEST9106', 'TEST9107')");
        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-BATCH-9100'");
    }

    @Test
    void createItemUsesManualSourceStatusAndDoesNotAcceptPublishedWorkflowStatusFromClient() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);

        mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TEST9101",
                      "taskType": "FLIGHT",
                      "titleZh": "测试航班",
                      "titleEn": "Test Flight",
                      "departureAirport": "MFM",
                      "arrivalAirport": "SIN",
                      "scheduledStartUtc": "2026-05-03T01:00:00Z",
                      "scheduledEndUtc": "2026-05-03T05:00:00Z",
                      "sectorCount": 1,
                      "aircraftType": "A330",
                      "aircraftNo": "B-TEST91",
                      "requiredCrewPattern": "PIC+FO",
                      "status": "PUBLISHED"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("UNASSIGNED"))
            .andExpect(jsonPath("$.data.sourceStatus").value("MANUAL"));
    }

    @Test
    void draftAssignedTaskCannotBeEditedThroughTaskCrud() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        Long taskId = createTask(batchId, "TEST9102", "ASSIGNED_DRAFT");

        mockMvc.perform(put("/api/task-plan/items/" + taskId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TEST9102",
                      "taskType": "FLIGHT",
                      "titleZh": "测试航班二",
                      "titleEn": "Test Flight Two",
                      "departureAirport": "MFM",
                      "arrivalAirport": "BKK",
                      "scheduledStartUtc": "2026-05-03T03:00:00Z",
                      "scheduledEndUtc": "2026-05-03T08:00:00Z",
                      "sectorCount": 1,
                      "aircraftType": "A330",
                      "aircraftNo": "B-TEST92",
                      "requiredCrewPattern": "PIC+FO",
                      "status": "UNASSIGNED",
                      "sourceStatus": "MANUAL"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isConflict());
    }

    @Test
    void draftAssignedTaskCannotBeCancelledThroughTaskCrud() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        Long taskId = createTask(batchId, "TEST9103", "ASSIGNED_DRAFT");

        mockMvc.perform(delete("/api/task-plan/items/" + taskId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());
    }

    @Test
    void taskMaintenanceUpdateDoesNotRewriteSourceStatus() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        Long taskId = createTask(batchId, "TEST9104", "UNASSIGNED");

        mockMvc.perform(put("/api/task-plan/items/" + taskId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TEST9104",
                      "taskType": "FLIGHT",
                      "titleZh": "测试航班四",
                      "titleEn": "Test Flight Four",
                      "departureAirport": "MFM",
                      "arrivalAirport": "BKK",
                      "scheduledStartUtc": "2026-05-03T04:00:00Z",
                      "scheduledEndUtc": "2026-05-03T09:00:00Z",
                      "sectorCount": 1,
                      "aircraftType": "A330",
                      "aircraftNo": "B-TEST94",
                      "requiredCrewPattern": "PIC+FO",
                      "sourceStatus": "EXTERNAL"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sourceStatus").value("MANUAL"));
    }

    @Test
    void itemsEndpointCanonicalizesLegacyAssignedStatusToAssignedDraft() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        createTask(batchId, "TEST9105", "ASSIGNED");

        mockMvc.perform(get("/api/task-plan/items")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.taskCode == 'TEST9105')].status").value(hasItem("ASSIGNED_DRAFT")));

        String storedStatus = jdbcTemplate.queryForObject(
            "SELECT status FROM task_plan_item WHERE task_code = ?",
            String.class,
            "TEST9105"
        );
        if (!"ASSIGNED_DRAFT".equals(storedStatus)) {
            throw new AssertionError("Expected TEST9105 to be normalized to ASSIGNED_DRAFT but was " + storedStatus);
        }
    }

    @Test
    void unassignedTaskCanBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        Long taskId = createTask(batchId, "TEST9101", "UNASSIGNED");

        mockMvc.perform(delete("/api/task-plan/items/" + taskId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(taskId));

        Integer remaining = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM task_plan_item WHERE id = ?",
            Integer.class,
            taskId
        );
        if (remaining == null || remaining != 0) {
            throw new AssertionError("Expected TEST9101 task row to be physically deleted");
        }
    }

    @Test
    void publishedTaskCannotBePhysicallyDeletedThroughTaskCrud() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        Long taskId = createTask(batchId, "TEST9102", "PUBLISHED");

        mockMvc.perform(delete("/api/task-plan/items/" + taskId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());
    }

    @Test
    void assignmentReadinessContractComesFromBackendOwnedTaskCrewBridge() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);
        Long blockedCrewId = createCrew(token, "TESTCREW91", "CAPTAIN", "A330");
        createCrew(token, "TESTCREW92", "FIRST_OFFICER", "A330");

        mockMvc.perform(post("/api/timeline-blocks/crew-status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewMemberId": %d,
                      "blockType": "REST",
                      "startUtc": "%s",
                      "endUtc": "%s"
                    }
                    """.formatted(
                    blockedCrewId,
                    Instant.now().minusSeconds(1800),
                    Instant.now().plusSeconds(1800)
                )))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TEST9106",
                      "taskType": "GROUND",
                      "titleZh": "地面任务",
                      "titleEn": "Ground Task",
                      "scheduledStartUtc": "2026-05-03T00:00:00Z",
                      "scheduledEndUtc": "2026-05-03T02:00:00Z",
                      "sectorCount": 1,
                      "requiredCrewPattern": "PIC+FO"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TEST9107",
                      "taskType": "FLIGHT",
                      "titleZh": "航班任务",
                      "titleEn": "Flight Task",
                      "departureAirport": "MFM",
                      "arrivalAirport": "SIN",
                      "scheduledStartUtc": "2026-05-03T03:00:00Z",
                      "scheduledEndUtc": "2026-05-03T07:00:00Z",
                      "sectorCount": 1,
                      "aircraftType": "A330",
                      "aircraftNo": "B-TEST97",
                      "requiredCrewPattern": "PIC+FO"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/task-plan/assignment-readiness")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode data = new ObjectMapper().readTree(result.getResponse().getContentAsString()).path("data");
        JsonNode groundTask = findByCode(data.path("tasks"), "taskCode", "TEST9106");
        JsonNode flightTask = findByCode(data.path("tasks"), "taskCode", "TEST9107");
        JsonNode blockedCrew = findByCode(data.path("crews"), "crewCode", "TESTCREW91");
        JsonNode availableCrew = findByCode(data.path("crews"), "crewCode", "TESTCREW92");

        assertBoolean(groundTask, "requiresCrewAssignment", false);
        assertSize(groundTask.path("assignmentRequirements"), 0);

        assertBoolean(flightTask, "requiresCrewAssignment", true);
        assertSize(flightTask.path("assignmentRequirements"), 2);
        assertText(flightTask.path("assignmentRequirements").get(0), "assignmentRole", "PIC");
        assertText(flightTask.path("assignmentRequirements").get(0), "requiredRoleCode", "CAPTAIN");
        assertText(flightTask.path("assignmentRequirements").get(0), "requiredQualificationCode", "A330");
        assertText(flightTask.path("assignmentRequirements").get(1), "assignmentRole", "FO");
        assertText(flightTask.path("assignmentRequirements").get(1), "requiredRoleCode", "FIRST_OFFICER");
        assertText(flightTask.path("assignmentRequirements").get(1), "requiredQualificationCode", "A330");

        assertBoolean(blockedCrew, "availableForAssignmentNow", false);
        assertText(blockedCrew, "unavailableBlockType", "REST");
        assertBoolean(availableCrew, "availableForAssignmentNow", true);
        if (!availableCrew.path("unavailableBlockType").isNull()) {
            throw new AssertionError("Expected TESTCREW92 to have no active timeline unavailability block");
        }
    }

    @Test
    void assignmentReadinessMarksInactiveOrUnavailableCrewAsNotAssignableWithoutTimelineBlock() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        createBatch(token);
        createCrew(token, "TESTCREW93", "CAPTAIN", "A330");
        jdbcTemplate.update("""
            UPDATE crew_member
            SET status = 'INACTIVE',
                availability_status = 'UNAVAILABLE'
            WHERE crew_code = 'TESTCREW93'
            """);

        MvcResult result = mockMvc.perform(get("/api/task-plan/assignment-readiness")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode data = new ObjectMapper().readTree(result.getResponse().getContentAsString()).path("data");
        JsonNode unavailableCrew = findByCode(data.path("crews"), "crewCode", "TESTCREW93");

        assertBoolean(unavailableCrew, "availableForAssignmentNow", false);
    }

    private Long createBatch(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/task-plan/batches")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchNo": "TEST-BATCH-9100",
                      "sourceName": "TEST-SOURCE",
                      "status": "IMPORTED",
                      "importedAtUtc": "2026-05-01T00:00:00Z"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(result.getResponse().getContentAsString(), "\"id\":");
    }

    private Long createCrew(String token, String crewCode, String roleCode, String aircraftQualification) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "%s",
                      "employeeNo": "%s",
                      "nameZh": "%s",
                      "nameEn": "%s",
                      "roleCode": "%s",
                      "rankCode": "%s",
                      "homeBase": "MFM",
                      "aircraftQualification": "%s",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 20,
                      "externalEmploymentFlag": false
                    }
                    """.formatted(
                    crewCode,
                    crewCode,
                    crewCode,
                    crewCode,
                    roleCode,
                    "CAPTAIN".equals(roleCode) ? "CPT" : "FO",
                    aircraftQualification
                )))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(result.getResponse().getContentAsString(), "\"id\":");
    }

    private JsonNode findByCode(JsonNode array, String fieldName, String expectedValue) {
        for (JsonNode node : array) {
            if (expectedValue.equals(node.path(fieldName).asText())) {
                return node;
            }
        }
        throw new AssertionError("Expected to find node where " + fieldName + "=" + expectedValue);
    }

    private void assertBoolean(JsonNode node, String fieldName, boolean expectedValue) {
        if (node.path(fieldName).asBoolean() != expectedValue) {
            throw new AssertionError("Expected " + fieldName + "=" + expectedValue + " but was " + node.path(fieldName));
        }
    }

    private void assertText(JsonNode node, String fieldName, String expectedValue) {
        if (!expectedValue.equals(node.path(fieldName).asText())) {
            throw new AssertionError("Expected " + fieldName + "=" + expectedValue + " but was " + node.path(fieldName));
        }
    }

    private void assertSize(JsonNode array, int expectedSize) {
        if (!array.isArray() || array.size() != expectedSize) {
            throw new AssertionError("Expected array size " + expectedSize + " but was " + array.size());
        }
    }

    private Long createTask(Long batchId, String taskCode, String status) {
        jdbcTemplate.update("""
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
            ) VALUES (?, ?, 'FLIGHT', ?, ?, 'MFM', 'SIN', ?, ?, 1, 'A330', 'B-TEST90', 'PIC+FO', ?, 'MANUAL')
            """,
            batchId,
            taskCode,
            taskCode,
            taskCode,
            Instant.parse("2026-05-03T01:00:00Z"),
            Instant.parse("2026-05-03T05:00:00Z"),
            status
        );
        return jdbcTemplate.queryForObject("SELECT id FROM task_plan_item WHERE task_code = ?", Long.class, taskCode);
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
