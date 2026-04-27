package com.pilotroster.flightops;

import static org.hamcrest.Matchers.hasItem;
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
class OperationsMasterDataIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void cleanTestRows() {
        jdbcTemplate.update("DELETE FROM crew_external_work WHERE description LIKE 'TEST-MASTER-%'");
        jdbcTemplate.update("DELETE FROM crew_qualification WHERE qualification_code = 'TEST-A330'");
        jdbcTemplate.update("DELETE FROM crew_member WHERE crew_code = 'TESTCREW01'");
        jdbcTemplate.update("DELETE FROM task_plan_item WHERE task_code = 'TEST9001'");
        jdbcTemplate.update("DELETE FROM aircraft_registry WHERE aircraft_no = 'B-TEST01'");
        jdbcTemplate.update("DELETE FROM flight_route WHERE route_code = 'MFM-TEST'");
        jdbcTemplate.update("DELETE FROM airport_dictionary WHERE iata_code = 'TST'");
    }

    @Test
    void flightOperationsMasterDataCrudUsesSoftDisable() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(post("/api/airports")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "iataCode": "TST",
                      "nameZh": "测试机场",
                      "nameEn": "Test Airport",
                      "timezoneName": "Asia/Macau",
                      "utcOffsetMinutes": 480,
                      "countryCode": "TS",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.iataCode").value("TST"));

        MvcResult routeResult = mockMvc.perform(post("/api/flight-operations/routes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "routeCode": "MFM-TEST",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TST",
                      "standardDurationMinutes": 300,
                      "timeDifferenceMinutes": 0,
                      "crossTimezone": false,
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.routeCode").value("MFM-TEST"))
            .andReturn();
        Long routeId = extractLong(routeResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult aircraftResult = mockMvc.perform(post("/api/flight-operations/aircraft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST01",
                      "aircraftType": "A330",
                      "fleet": "A330F",
                      "baseAirport": "MFM",
                      "seatCount": 0,
                      "maxPayload": 60.5,
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.aircraftNo").value("B-TEST01"))
            .andReturn();
        Long aircraftId = extractLong(aircraftResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(get("/api/flight-operations/routes").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].routeCode").value(hasItem("MFM-TEST")));

        mockMvc.perform(delete("/api/flight-operations/routes/" + routeId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("INACTIVE"));

        mockMvc.perform(delete("/api/flight-operations/aircraft/" + aircraftId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @Test
    void crewResourceMasterDataCrudIncludesQualificationAndExternalWork() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        MvcResult crewResult = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREW01",
                      "employeeNo": "TESTCREW01",
                      "nameZh": "测试机组",
                      "nameEn": "Test Crew",
                      "roleCode": "FIRST_OFFICER",
                      "rankCode": "FO",
                      "homeBase": "MFM",
                      "aircraftQualification": "A330",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 20,
                      "externalEmploymentFlag": false,
                      "availabilityStatus": "AVAILABLE",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewCode").value("TESTCREW01"))
            .andReturn();
        Long crewId = extractLong(crewResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult qualificationResult = mockMvc.perform(post("/api/crew-members/" + crewId + "/qualifications")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "qualificationType": "AIRCRAFT",
                      "qualificationCode": "TEST-A330",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.qualificationCode").value("TEST-A330"))
            .andReturn();
        Long qualificationId = extractLong(qualificationResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult workResult = mockMvc.perform(post("/api/crew-members/" + crewId + "/external-work")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "externalType": "UNAVAILABLE",
                      "startUtc": "2026-05-02T00:00:00Z",
                      "endUtc": "2026-05-02T08:00:00Z",
                      "description": "TEST-MASTER-unavailable",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.description").value("TEST-MASTER-unavailable"))
            .andReturn();
        Long workId = extractLong(workResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(get("/api/crew-members/external-work").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].description").value(hasItem("TEST-MASTER-unavailable")));

        mockMvc.perform(delete("/api/crew-members/" + crewId + "/qualifications/" + qualificationId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("INACTIVE"));

        mockMvc.perform(delete("/api/crew-members/" + crewId + "/external-work/" + workId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("INACTIVE"));
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
