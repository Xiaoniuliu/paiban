package com.pilotroster.system;

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
class AirportDictionaryDeletionIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void cleanTestRows() {
        jdbcTemplate.update("DELETE FROM task_plan_item WHERE task_code = 'TEST9301'");
        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-BATCH-9300'");
        jdbcTemplate.update("DELETE FROM flight_route WHERE route_code = 'TEST-ROUTE-9301'");
        jdbcTemplate.update("DELETE FROM aircraft_registry WHERE aircraft_no = 'B-TEST9301'");
        jdbcTemplate.update("DELETE FROM airport_dictionary WHERE iata_code IN ('X93', 'Y93')");
    }

    @Test
    void unreferencedAirportCanBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long airportId = createAirport(token, "X93");

        mockMvc.perform(delete("/api/airports/" + airportId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(airportId));

        Integer remaining = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM airport_dictionary WHERE id = ?",
            Integer.class,
            airportId
        );
        if (remaining == null || remaining != 0) {
            throw new AssertionError("Expected airport to be physically deleted");
        }
    }

    @Test
    void referencedAirportCannotBePhysicallyDeleted() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long airportId = createAirport(token, "Y93");
        createRouteReference("Y93");
        createAircraftReference("Y93");
        Long batchId = createBatch();
        createTaskReference(batchId, "Y93");

        mockMvc.perform(delete("/api/airports/" + airportId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict());

        mockMvc.perform(put("/api/airports/" + airportId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "iataCode": "Y93",
                      "nameZh": "新名字",
                      "nameEn": "New Name",
                      "timezoneName": "Asia/Shanghai",
                      "utcOffsetMinutes": 480,
                      "countryCode": "CN",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isConflict());
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

    private void createRouteReference(String airportCode) {
        jdbcTemplate.update("""
            INSERT INTO flight_route (
              route_code,
              departure_airport,
              arrival_airport,
              standard_duration_minutes,
              time_difference_minutes,
              cross_timezone,
              status
            ) VALUES ('TEST-ROUTE-9301', ?, 'MFM', 120, 0, 0, 'ACTIVE')
            """,
            airportCode
        );
    }

    private void createAircraftReference(String airportCode) {
        jdbcTemplate.update("""
            INSERT INTO aircraft_registry (
              aircraft_no,
              aircraft_type,
              fleet,
              base_airport,
              seat_count,
              status
            ) VALUES ('B-TEST9301', 'A330', 'TEST', ?, 260, 'ACTIVE')
            """,
            airportCode
        );
    }

    private Long createBatch() {
        jdbcTemplate.update("""
            INSERT INTO task_plan_import_batch (batch_no, source_name, status, imported_at_utc)
            VALUES ('TEST-BATCH-9300', 'TEST-SOURCE', 'IMPORTED', ?)
            """,
            Instant.parse("2026-05-01T00:00:00Z")
        );
        return jdbcTemplate.queryForObject(
            "SELECT id FROM task_plan_import_batch WHERE batch_no = 'TEST-BATCH-9300'",
            Long.class
        );
    }

    private void createTaskReference(Long batchId, String airportCode) {
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
            ) VALUES (?, 'TEST9301', 'FLIGHT', 'TEST9301', 'TEST9301', ?, 'MFM', ?, ?, 1, 'A330', 'B-TEST9301', 'PIC+FO', 'UNASSIGNED', 'MANUAL')
            """,
            batchId,
            airportCode,
            Instant.parse("2026-05-03T01:00:00Z"),
            Instant.parse("2026-05-03T05:00:00Z")
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
