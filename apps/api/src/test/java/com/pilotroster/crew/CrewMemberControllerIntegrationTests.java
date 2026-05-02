package com.pilotroster.crew;

import static org.hamcrest.Matchers.contains;
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
class CrewMemberControllerIntegrationTests {

    private static final String RETIRED_EXTERNAL_WORK_MESSAGE =
        "Crew external work contract retired; use crew status timeline instead";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void cleanTestRows() {
        jdbcTemplate.update("DELETE FROM crew_external_work WHERE description = 'TEST-CREW-retired'");
        jdbcTemplate.update("DELETE FROM crew_member WHERE crew_code IN ('TESTCREWWB01', 'TESTCREWWB02')");
    }

    @Test
    void listUsesRuleDerivedCrewHourFactsForRollingHourCompatibilityFields() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        MvcResult activeCrewResult = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREWWB01",
                      "employeeNo": "TESTCREWWB01",
                      "nameZh": "测试机组",
                      "nameEn": "Test Crew Active",
                      "homeBase": "MFM",
                      "roleCode": "FIRST_OFFICER",
                      "rankCode": "FO",
                      "aircraftQualification": "A330",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 20,
                      "externalEmploymentFlag": false
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long activeCrewId = extractLong(activeCrewResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult inactiveCrewResult = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREWWB02",
                      "employeeNo": "TESTCREWWB02",
                      "nameZh": "测试机组停用",
                      "nameEn": "Test Crew Inactive",
                      "homeBase": "MFM",
                      "roleCode": "FIRST_OFFICER",
                      "rankCode": "FO",
                      "aircraftQualification": "A330",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 20,
                      "externalEmploymentFlag": false
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long inactiveCrewId = extractLong(inactiveCrewResult.getResponse().getContentAsString(), "\"id\":");

        jdbcTemplate.update(
            """
            UPDATE crew_member
            SET rolling_flight_hours_28d = 10.25,
                rolling_duty_hours_28d = 20.50,
                rolling_duty_hours_7d = 7.25,
                rolling_duty_hours_14d = 14.50,
                rolling_flight_hours_12m = 120.75,
                latest_actual_fdp_hours = 8.25,
                latest_actual_fdp_source = 'SYSTEM_FEED',
                status = 'ACTIVE'
            WHERE id = ?
            """,
            activeCrewId
        );
        jdbcTemplate.update(
            """
            UPDATE crew_member
            SET rolling_flight_hours_28d = 99.25,
                rolling_duty_hours_28d = 98.50,
                rolling_duty_hours_7d = 97.25,
                rolling_duty_hours_14d = 96.50,
                rolling_flight_hours_12m = 995.75,
                status = 'INACTIVE'
            WHERE id = ?
            """,
            inactiveCrewId
        );

        mockMvc.perform(get("/api/crew-members").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.id == %d)].rollingFlightHours28d", activeCrewId).value(contains(10.25)))
            .andExpect(jsonPath("$.data[?(@.id == %d)].rollingDutyHours28d", activeCrewId).value(contains(20.50)))
            .andExpect(jsonPath("$.data[?(@.id == %d)].rollingDutyHours7d", activeCrewId).value(contains(7.25)))
            .andExpect(jsonPath("$.data[?(@.id == %d)].rollingDutyHours14d", activeCrewId).value(contains(14.50)))
            .andExpect(jsonPath("$.data[?(@.id == %d)].rollingFlightHours12m", activeCrewId).value(contains(120.75)))
            .andExpect(jsonPath("$.data[?(@.id == %d)].latestActualFdpHours", activeCrewId).value(contains(8.25)))
            .andExpect(jsonPath("$.data[?(@.id == %d)].latestActualFdpSource", activeCrewId).value(contains("SYSTEM_FEED")))
            .andExpect(jsonPath("$.data[?(@.id == %d)].rollingFlightHours28d", inactiveCrewId).value(contains(99.25)));
    }

    @Test
    void crewProfileAndOperationalWritesUseSeparateContracts() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        MvcResult crewResult = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREWWB01",
                      "employeeNo": "TESTCREWWB01",
                      "nameZh": "测试机组",
                      "nameEn": "Test Crew",
                      "homeBase": "MFM",
                      "roleCode": "FIRST_OFFICER",
                      "rankCode": "FO",
                      "aircraftQualification": "A330",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 20,
                      "externalEmploymentFlag": false
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.roleCode").value("FIRST_OFFICER"))
            .andExpect(jsonPath("$.data.rankCode").value("FO"))
            .andExpect(jsonPath("$.data.aircraftQualification").value("A330"))
            .andExpect(jsonPath("$.data.acclimatizationStatus").value("ACCLIMATIZED"))
            .andExpect(jsonPath("$.data.bodyClockTimezone").value("Asia/Macau"))
            .andExpect(jsonPath("$.data.normalCommuteMinutes").value(20))
            .andExpect(jsonPath("$.data.externalEmploymentFlag").value(false))
            .andReturn();
        Long crewId = extractLong(crewResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(put("/api/crew-members/" + crewId + "/operational")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "roleCode": "FIRST_OFFICER",
                      "rankCode": "FO",
                      "aircraftQualification": "A330",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 20,
                      "externalEmploymentFlag": false
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.roleCode").value("FIRST_OFFICER"))
            .andExpect(jsonPath("$.data.aircraftQualification").value("A330"));

        jdbcTemplate.update(
            """
            UPDATE crew_member
            SET status = 'INACTIVE',
                availability_status = 'UNAVAILABLE',
                rolling_flight_hours_28d = 12.5,
                rolling_duty_hours_28d = 18.5,
                rolling_duty_hours_7d = 6.5,
                rolling_duty_hours_14d = 9.5,
                rolling_flight_hours_12m = 120.5,
                latest_actual_fdp_source = 'SYSTEM_FEED'
            WHERE id = ?
            """,
            crewId
        );

        mockMvc.perform(put("/api/crew-members/" + crewId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREWWB01",
                      "employeeNo": "TESTCREWWB01-UPDATED",
                      "nameZh": "测试机组更新",
                      "nameEn": "Test Crew Updated",
                      "homeBase": "MFM"
                    }
                    """))
            .andExpect(status().isGone());

        mockMvc.perform(put("/api/crew-members/" + crewId + "/profile")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREWWB01",
                      "employeeNo": "TESTCREWWB01-UPDATED",
                      "nameZh": "测试机组更新",
                      "nameEn": "Test Crew Updated",
                      "homeBase": "MFM"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.employeeNo").value("TESTCREWWB01-UPDATED"))
            .andExpect(jsonPath("$.data.roleCode").value("FIRST_OFFICER"))
            .andExpect(jsonPath("$.data.rankCode").value("FO"))
            .andExpect(jsonPath("$.data.aircraftQualification").value("A330"))
            .andExpect(jsonPath("$.data.acclimatizationStatus").value("ACCLIMATIZED"))
            .andExpect(jsonPath("$.data.bodyClockTimezone").value("Asia/Macau"))
            .andExpect(jsonPath("$.data.normalCommuteMinutes").value(20))
            .andExpect(jsonPath("$.data.externalEmploymentFlag").value(false))
            .andExpect(jsonPath("$.data.status").value("INACTIVE"))
            .andExpect(jsonPath("$.data.availabilityStatus").value("UNAVAILABLE"))
            .andExpect(jsonPath("$.data.rollingFlightHours28d").value(12.5))
            .andExpect(jsonPath("$.data.rollingDutyHours28d").value(18.5))
            .andExpect(jsonPath("$.data.rollingDutyHours7d").value(6.5))
            .andExpect(jsonPath("$.data.rollingDutyHours14d").value(9.5))
            .andExpect(jsonPath("$.data.rollingFlightHours12m").value(120.5))
            .andExpect(jsonPath("$.data.latestActualFdpSource").value("SYSTEM_FEED"));

        mockMvc.perform(put("/api/crew-members/" + crewId + "/profile-operational")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREWWB01",
                      "employeeNo": "TESTCREWWB01-ATOMIC",
                      "nameZh": "测试机组原子更新",
                      "nameEn": "Test Crew Atomic Update",
                      "homeBase": "MFM",
                      "roleCode": "CAPTAIN",
                      "rankCode": "CAPT",
                      "aircraftQualification": "A330",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 30,
                      "externalEmploymentFlag": true
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.employeeNo").value("TESTCREWWB01-ATOMIC"))
            .andExpect(jsonPath("$.data.roleCode").value("CAPTAIN"))
            .andExpect(jsonPath("$.data.rankCode").value("CAPT"))
            .andExpect(jsonPath("$.data.normalCommuteMinutes").value(30))
            .andExpect(jsonPath("$.data.externalEmploymentFlag").value(true))
            .andExpect(jsonPath("$.data.status").value("INACTIVE"))
            .andExpect(jsonPath("$.data.availabilityStatus").value("UNAVAILABLE"))
            .andExpect(jsonPath("$.data.latestActualFdpSource").value("SYSTEM_FEED"));
    }

    @Test
    void externalWorkContractIsRetiredAcrossAllEndpoints() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        MvcResult crewResult = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREWWB01",
                      "employeeNo": "TESTCREWWB01",
                      "nameZh": "测试机组",
                      "nameEn": "Test Crew",
                      "roleCode": "FIRST_OFFICER",
                      "rankCode": "FO",
                      "homeBase": "MFM",
                      "aircraftQualification": "A330",
                      "acclimatizationStatus": "ACCLIMATIZED",
                      "bodyClockTimezone": "Asia/Macau",
                      "normalCommuteMinutes": 20,
                      "externalEmploymentFlag": false
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long crewId = extractLong(crewResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(get("/api/crew-members/external-work").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.message").value(RETIRED_EXTERNAL_WORK_MESSAGE));

        mockMvc.perform(get("/api/crew-members/" + crewId + "/external-work").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.message").value(RETIRED_EXTERNAL_WORK_MESSAGE));

        mockMvc.perform(post("/api/crew-members/" + crewId + "/external-work")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "externalType": "UNAVAILABLE",
                      "startUtc": "2026-05-02T00:00:00Z",
                      "endUtc": "2026-05-02T08:00:00Z",
                      "description": "TEST-CREW-retired",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.message").value(RETIRED_EXTERNAL_WORK_MESSAGE));

        mockMvc.perform(put("/api/crew-members/" + crewId + "/external-work/999999")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "externalType": "UNAVAILABLE",
                      "startUtc": "2026-05-02T00:00:00Z",
                      "endUtc": "2026-05-02T08:00:00Z",
                      "description": "TEST-CREW-retired",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.message").value(RETIRED_EXTERNAL_WORK_MESSAGE));

        mockMvc.perform(delete("/api/crew-members/" + crewId + "/external-work/999999").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.message").value(RETIRED_EXTERNAL_WORK_MESSAGE));

        mockMvc.perform(get("/api/crew-members/" + crewId + "/duty-calendar").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.message").value(RETIRED_EXTERNAL_WORK_MESSAGE));

        Integer retiredRows = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM crew_external_work WHERE description = 'TEST-CREW-retired'",
            Integer.class
        );
        if (retiredRows == null || retiredRows != 0) {
            throw new AssertionError("Retired external-work endpoints must not persist any rows");
        }
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
