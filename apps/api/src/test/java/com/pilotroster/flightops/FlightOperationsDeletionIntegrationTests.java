package com.pilotroster.flightops;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
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
class FlightOperationsDeletionIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void cleanTestRows() {
        jdbcTemplate.update("DELETE FROM task_plan_item WHERE task_code IN ('TEST9201', 'TEST9202', 'TEST9203')");
        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-BATCH-9200'");
        jdbcTemplate.update("DELETE FROM flight_route WHERE route_code IN ('TEST-ROUTE-9201', 'TEST-ROUTE-9202', 'TEST-ROUTE-9203')");
        jdbcTemplate.update("DELETE FROM aircraft_registry WHERE aircraft_no IN ('B-TEST9201', 'B-TEST9202', 'B-TEST9203')");
        jdbcTemplate.update("DELETE FROM airport_dictionary WHERE iata_code IN ('X92', 'Y92', 'Z92')");
    }

    @Test
    void unreferencedRouteCanBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        createAirport(token, "X92");
        createAirport(token, "Y92");
        Long routeId = createRoute(token, "TEST-ROUTE-9201", "X92", "Y92");

        mockMvc.perform(delete("/api/flight-operations/routes/" + routeId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(routeId));

        Integer remaining = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM flight_route WHERE id = ?",
            Integer.class,
            routeId
        );
        if (remaining == null || remaining != 0) {
            throw new AssertionError("Expected route to be physically deleted");
        }
    }

    @Test
    void referencedRouteCannotBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        createAirport(token, "Z92");
        Long routeId = createRoute(token, "TEST-ROUTE-9202", "MFM", "Z92");
        Long batchId = createBatch();
        createTask(batchId, "TEST9201", "UNASSIGNED", "MFM", "Z92", "B-TEST9201", "A330");

        mockMvc.perform(delete("/api/flight-operations/routes/" + routeId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());

        mockMvc.perform(put("/api/flight-operations/routes/" + routeId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "routeCode": "TEST-ROUTE-9202",
                      "departureAirport": "MFM",
                      "arrivalAirport": "SIN",
                      "standardDurationMinutes": 180,
                      "timeDifferenceMinutes": 0,
                      "crossTimezone": false,
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isConflict());
    }

    @Test
    void unreferencedAircraftCanBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long aircraftId = createAircraft(token, "B-TEST9201", "TEST-UNREF-9201");

        mockMvc.perform(delete("/api/flight-operations/aircraft/" + aircraftId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(aircraftId));

        Integer remaining = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM aircraft_registry WHERE id = ?",
            Integer.class,
            aircraftId
        );
        if (remaining == null || remaining != 0) {
            throw new AssertionError("Expected aircraft to be physically deleted");
        }
    }

    @Test
    void referencedAircraftCannotBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long aircraftId = createAircraft(token, "B-TEST9202", "A330");
        Long batchId = createBatch();
        createTask(batchId, "TEST9202", "UNASSIGNED", "MFM", "SIN", "B-TEST9202", "A330");

        mockMvc.perform(delete("/api/flight-operations/aircraft/" + aircraftId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());

        mockMvc.perform(put("/api/flight-operations/aircraft/" + aircraftId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST9202",
                      "aircraftType": "A321",
                      "fleet": "TEST",
                      "baseAirport": "MFM",
                      "seatCount": 260,
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isConflict());
    }

    @Test
    void aircraftReferencedByTypeCannotBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long aircraftId = createAircraft(token, "B-TEST9203", "A330");
        Long batchId = createBatch();
        createTask(batchId, "TEST9203", "UNASSIGNED", "MFM", "SIN", null, "A330");

        mockMvc.perform(delete("/api/flight-operations/aircraft/" + aircraftId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());

        mockMvc.perform(put("/api/flight-operations/aircraft/" + aircraftId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST9203-ALT",
                      "aircraftType": "A321",
                      "fleet": "TEST",
                      "baseAirport": "MFM",
                      "seatCount": 260,
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isConflict());
    }

    @Test
    void duplicateAircraftNumberReturnsConflict() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        createAircraft(token, "B-TEST9201", "TEST-DUP-9201");

        mockMvc.perform(post("/api/flight-operations/aircraft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST9201",
                      "aircraftType": "TEST-DUP-9202",
                      "fleet": "TEST",
                      "baseAirport": "MFM",
                      "seatCount": 260,
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isConflict());
    }

    private Long createRoute(String token, String routeCode, String departureAirport, String arrivalAirport) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/flight-operations/routes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "routeCode": "%s",
                      "departureAirport": "%s",
                      "arrivalAirport": "%s",
                      "standardDurationMinutes": 180,
                      "timeDifferenceMinutes": 0,
                      "crossTimezone": false,
                      "status": "ACTIVE"
                    }
                    """.formatted(routeCode, departureAirport, arrivalAirport)))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(result.getResponse().getContentAsString(), "\"id\":");
    }

    private Long createAirport(String token, String iataCode) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/airports")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "iataCode": "%s",
                      "nameZh": "测试机场",
                      "nameEn": "Test Airport",
                      "timezoneName": "Asia/Shanghai",
                      "utcOffsetMinutes": 480,
                      "countryCode": "CN",
                      "status": "ACTIVE"
                    }
                    """.formatted(iataCode)))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(result.getResponse().getContentAsString(), "\"id\":");
    }

    private Long createAircraft(String token, String aircraftNo, String aircraftType) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/flight-operations/aircraft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "%s",
                      "aircraftType": "%s",
                      "fleet": "TEST",
                      "baseAirport": "MFM",
                      "seatCount": 260,
                      "status": "ACTIVE"
                    }
                    """.formatted(aircraftNo, aircraftType)))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(result.getResponse().getContentAsString(), "\"id\":");
    }

    private Long createBatch() {
        jdbcTemplate.update("""
            INSERT INTO task_plan_import_batch (batch_no, source_name, status, imported_at_utc)
            VALUES ('TEST-BATCH-9200', 'TEST-SOURCE', 'IMPORTED', ?)
            """,
            Instant.parse("2026-05-01T00:00:00Z")
        );
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch WHERE batch_no = 'TEST-BATCH-9200'",
            Long.class
        );
    }

    private void createTask(
        Long batchId,
        String taskCode,
        String status,
        String departureAirport,
        String arrivalAirport,
        String aircraftNo,
        String aircraftType
    ) {
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
            ) VALUES (?, ?, 'FLIGHT', ?, ?, ?, ?, ?, ?, 1, ?, ?, 'PIC+FO', ?, 'MANUAL')
            """,
            batchId,
            taskCode,
            taskCode,
            taskCode,
            departureAirport,
            arrivalAirport,
            Instant.parse("2026-05-03T01:00:00Z"),
            Instant.parse("2026-05-03T05:00:00Z"),
            aircraftType,
            aircraftNo,
            status
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

    private Long extractLong(String body, String marker) {
        int start = body.indexOf(marker) + marker.length();
        int end = start;
        while (end < body.length() && Character.isDigit(body.charAt(end))) {
            end++;
        }
        return Long.valueOf(body.substring(start, end));
    }
}
