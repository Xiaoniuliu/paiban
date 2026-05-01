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
        jdbcTemplate.update("DELETE FROM crew_member WHERE crew_code = 'TESTCREW02'");
        jdbcTemplate.update("DELETE FROM task_plan_item WHERE task_code = 'TEST9001'");
        jdbcTemplate.update("DELETE FROM task_plan_import_batch WHERE batch_no = 'TEST-BATCH-9000'");
        jdbcTemplate.update("DELETE FROM aircraft_registry WHERE aircraft_no = 'B-TEST01'");
        jdbcTemplate.update("DELETE FROM flight_route WHERE route_code = 'MFM-TEST'");
        jdbcTemplate.update("DELETE FROM airport_dictionary WHERE iata_code = 'TST'");
    }

    @Test
    void flightOperationsMasterDataCrudSupportsPhysicalDeleteForUnreferencedRecords() throws Exception {
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
                      "aircraftType": "TEST-UNREF-01",
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
            .andExpect(status().isOk());

        mockMvc.perform(delete("/api/flight-operations/aircraft/" + aircraftId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void runDataCreateAndUpdateIgnoreRetiredStatusInputAndStayActive() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        MvcResult airportResult = mockMvc.perform(post("/api/airports")
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
                      "status": "INACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andReturn();
        Long airportId = extractLong(airportResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(put("/api/airports/" + airportId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "iataCode": "TST",
                      "nameZh": "测试机场更新",
                      "nameEn": "Test Airport Updated",
                      "timezoneName": "Asia/Macau",
                      "utcOffsetMinutes": 480,
                      "countryCode": "TS",
                      "status": "INACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));

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
                      "status": "INACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andReturn();
        Long routeId = extractLong(routeResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(put("/api/flight-operations/routes/" + routeId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "routeCode": "MFM-TEST",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TST",
                      "standardDurationMinutes": 360,
                      "timeDifferenceMinutes": 0,
                      "crossTimezone": false,
                      "status": "INACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        MvcResult aircraftResult = mockMvc.perform(post("/api/flight-operations/aircraft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST01",
                      "aircraftType": "TEST-UNREF-01",
                      "fleet": "A330F",
                      "baseAirport": "MFM",
                      "seatCount": 0,
                      "maxPayload": 60.5,
                      "status": "INACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andReturn();
        Long aircraftId = extractLong(aircraftResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(put("/api/flight-operations/aircraft/" + aircraftId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST01",
                      "aircraftType": "TEST-UNREF-01",
                      "fleet": "A330F",
                      "baseAirport": "MFM",
                      "seatCount": 0,
                      "maxPayload": 60.5,
                      "status": "INACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void flightOperationsReferenceProtectionComesFromBackendContract() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);

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
                      "countryCode": "TS"
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/flight-operations/routes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "routeCode": "MFM-TEST",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TST",
                      "standardDurationMinutes": 300,
                      "timeDifferenceMinutes": 0,
                      "crossTimezone": false
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/flight-operations/aircraft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST01",
                      "aircraftType": "TEST-UNREF-01",
                      "fleet": "A330F",
                      "baseAirport": "TST",
                      "seatCount": 0,
                      "maxPayload": 60.5
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TEST9001",
                      "taskType": "FLIGHT",
                      "titleZh": "测试航班",
                      "titleEn": "Test Flight",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TST",
                      "scheduledStartUtc": "2026-05-03T01:00:00Z",
                      "scheduledEndUtc": "2026-05-03T05:00:00Z",
                      "sectorCount": 1,
                      "aircraftType": "TEST-UNREF-01",
                      "aircraftNo": "B-TEST01",
                      "requiredCrewPattern": "PIC+FO"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/flight-operations/reference-protection").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.referencedRouteCodes").value(hasItem("MFM-TEST")))
            .andExpect(jsonPath("$.data.referencedAircraftNos").value(hasItem("B-TEST01")))
            .andExpect(jsonPath("$.data.referencedAirportCodes").value(hasItem("TST")))
            .andExpect(jsonPath("$.data.referencedAirportCodes").value(hasItem("MFM")));
    }

    @Test
    void cancelledTasksDoNotBlockRunDataMaintenance() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long batchId = createBatch(token);

        MvcResult airportResult = mockMvc.perform(post("/api/airports")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "iataCode": "TST",
                      "nameZh": "测试机场",
                      "nameEn": "Test Airport",
                      "timezoneName": "Asia/Macau",
                      "utcOffsetMinutes": 480,
                      "countryCode": "TS"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long airportId = extractLong(airportResult.getResponse().getContentAsString(), "\"id\":");

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
                      "crossTimezone": false
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long routeId = extractLong(routeResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult aircraftResult = mockMvc.perform(post("/api/flight-operations/aircraft")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST01",
                      "aircraftType": "TEST-UNREF-01",
                      "fleet": "A330F",
                      "baseAirport": "MFM",
                      "seatCount": 0,
                      "maxPayload": 60.5
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long aircraftId = extractLong(aircraftResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(post("/api/task-plan/items")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchId": %d,
                      "taskCode": "TEST9001",
                      "taskType": "FLIGHT",
                      "titleZh": "测试航班",
                      "titleEn": "Test Flight",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TST",
                      "scheduledStartUtc": "2026-05-03T01:00:00Z",
                      "scheduledEndUtc": "2026-05-03T05:00:00Z",
                      "sectorCount": 1,
                      "aircraftType": "TEST-UNREF-01",
                      "aircraftNo": "B-TEST01",
                      "requiredCrewPattern": "PIC+FO"
                    }
                    """.formatted(batchId)))
            .andExpect(status().isOk());
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'CANCELLED' WHERE task_code = 'TEST9001'");

        mockMvc.perform(put("/api/flight-operations/routes/" + routeId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "routeCode": "MFM-TEST",
                      "departureAirport": "MFM",
                      "arrivalAirport": "TST",
                      "standardDurationMinutes": 330,
                      "timeDifferenceMinutes": 0,
                      "crossTimezone": false
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/flight-operations/aircraft/" + aircraftId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "aircraftNo": "B-TEST01",
                      "aircraftType": "TEST-UNREF-01",
                      "fleet": "A330F",
                      "baseAirport": "MFM",
                      "seatCount": 1,
                      "maxPayload": 60.5
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(delete("/api/flight-operations/routes/" + routeId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mockMvc.perform(delete("/api/flight-operations/aircraft/" + aircraftId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mockMvc.perform(delete("/api/airports/" + airportId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void crewProfileWritesIgnoreAvailabilityAndLimitLayerFields() throws Exception {
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
                      "availabilityStatus": "UNAVAILABLE",
                      "status": "INACTIVE",
                      "rollingFlightHours28d": 99.5,
                      "rollingDutyHours28d": 88.5,
                      "rollingDutyHours7d": 11.5,
                      "rollingDutyHours14d": 22.5,
                      "rollingFlightHours12m": 333.5,
                      "latestActualFdpSource": "MANUAL_OVERRIDE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.crewCode").value("TESTCREW01"))
            .andExpect(jsonPath("$.data.availabilityStatus").value("AVAILABLE"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.rollingFlightHours28d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours28d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours7d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours14d").value(0))
            .andExpect(jsonPath("$.data.rollingFlightHours12m").value(0))
            .andExpect(jsonPath("$.data.latestActualFdpSource").value("ACTUAL_ONLY"))
            .andReturn();
        Long crewId = extractLong(crewResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(put("/api/crew-members/" + crewId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREW01",
                      "employeeNo": "TESTCREW01-UPDATED",
                      "nameZh": "测试机组更新",
                      "nameEn": "Test Crew Updated",
                      "roleCode": "CAPTAIN",
                      "rankCode": "CPT",
                      "homeBase": "MFM",
                      "aircraftQualification": "A320",
                      "acclimatizationStatus": "NON_ACCLIMATIZED",
                      "bodyClockTimezone": "UTC",
                      "normalCommuteMinutes": 35,
                      "externalEmploymentFlag": true,
                      "availabilityStatus": "UNAVAILABLE",
                      "status": "INACTIVE",
                      "rollingFlightHours28d": 199.5,
                      "rollingDutyHours28d": 188.5,
                      "rollingDutyHours7d": 111.5,
                      "rollingDutyHours14d": 122.5,
                      "rollingFlightHours12m": 433.5,
                      "latestActualFdpSource": "MANUAL_OVERRIDE_2"
                    }
                    """))
            .andExpect(status().isGone());

        mockMvc.perform(put("/api/crew-members/" + crewId + "/profile")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREW01",
                      "employeeNo": "TESTCREW01-UPDATED",
                      "nameZh": "测试机组更新",
                      "nameEn": "Test Crew Updated",
                      "homeBase": "MFM"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.employeeNo").value("TESTCREW01-UPDATED"))
            .andExpect(jsonPath("$.data.roleCode").value("FIRST_OFFICER"))
            .andExpect(jsonPath("$.data.rankCode").value("FO"))
            .andExpect(jsonPath("$.data.homeBase").value("MFM"))
            .andExpect(jsonPath("$.data.aircraftQualification").value("A330"))
            .andExpect(jsonPath("$.data.availabilityStatus").value("AVAILABLE"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.rollingFlightHours28d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours28d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours7d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours14d").value(0))
            .andExpect(jsonPath("$.data.rollingFlightHours12m").value(0))
            .andExpect(jsonPath("$.data.latestActualFdpSource").value("ACTUAL_ONLY"));

        mockMvc.perform(put("/api/crew-members/" + crewId + "/operational")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "roleCode": "CAPTAIN",
                      "rankCode": "CPT",
                      "aircraftQualification": "A320",
                      "acclimatizationStatus": "NON_ACCLIMATIZED",
                      "bodyClockTimezone": "UTC",
                      "normalCommuteMinutes": 35,
                      "externalEmploymentFlag": true
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.employeeNo").value("TESTCREW01-UPDATED"))
            .andExpect(jsonPath("$.data.roleCode").value("CAPTAIN"))
            .andExpect(jsonPath("$.data.rankCode").value("CPT"))
            .andExpect(jsonPath("$.data.homeBase").value("MFM"))
            .andExpect(jsonPath("$.data.aircraftQualification").value("A320"))
            .andExpect(jsonPath("$.data.acclimatizationStatus").value("NON_ACCLIMATIZED"))
            .andExpect(jsonPath("$.data.bodyClockTimezone").value("UTC"))
            .andExpect(jsonPath("$.data.normalCommuteMinutes").value(35))
            .andExpect(jsonPath("$.data.externalEmploymentFlag").value(true))
            .andExpect(jsonPath("$.data.availabilityStatus").value("AVAILABLE"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.rollingFlightHours28d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours28d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours7d").value(0))
            .andExpect(jsonPath("$.data.rollingDutyHours14d").value(0))
            .andExpect(jsonPath("$.data.rollingFlightHours12m").value(0))
            .andExpect(jsonPath("$.data.latestActualFdpSource").value("ACTUAL_ONLY"));

        mockMvc.perform(delete("/api/crew-members/" + crewId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("INACTIVE"))
            .andExpect(jsonPath("$.data.availabilityStatus").value("UNAVAILABLE"));

        mockMvc.perform(post("/api/crew-members/" + crewId + "/reactivate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.availabilityStatus").value("AVAILABLE"));
    }

    @Test
    void crewResourceMasterDataKeepsQualificationCrudAndArchivesRetiredAvailabilityContract() throws Exception {
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

        mockMvc.perform(get("/api/crew-members/external-work").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone());

        mockMvc.perform(get("/api/crew-members/" + crewId + "/external-work").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone());

        mockMvc.perform(post("/api/crew-members/" + crewId + "/external-work")
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
            .andExpect(status().isGone());

        mockMvc.perform(put("/api/crew-members/" + crewId + "/external-work/999999")
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
            .andExpect(status().isGone());

        mockMvc.perform(delete("/api/crew-members/" + crewId + "/external-work/999999").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone());

        mockMvc.perform(get("/api/crew-members/" + crewId + "/duty-calendar").header("Authorization", "Bearer " + token))
            .andExpect(status().isGone());

        mockMvc.perform(delete("/api/crew-members/" + crewId + "/qualifications/" + qualificationId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @Test
    void pilotCanOnlyReadLinkedCrewData() throws Exception {
        String token = loginToken("pilot01", "Admin123!");
        Long linkedCrewId = jdbcTemplate.queryForObject("SELECT crew_id FROM sys_user WHERE username = 'pilot01'", Long.class);
        Long otherCrewId = jdbcTemplate.queryForObject("SELECT id FROM crew_member WHERE id <> ? ORDER BY id LIMIT 1", Long.class, linkedCrewId);

        mockMvc.perform(get("/api/crew-members/" + linkedCrewId).header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/crew-members/" + otherCrewId).header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/crew-members/" + otherCrewId + "/qualifications").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void nestedCrewQualificationResourcesCannotBeMovedAcrossCrewIds() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        MvcResult firstCrewResult = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREW01",
                      "employeeNo": "TESTCREW01",
                      "nameZh": "娴嬭瘯鏈虹粍A",
                      "nameEn": "Test Crew A",
                      "roleCode": "FIRST_OFFICER",
                      "rankCode": "FO",
                      "homeBase": "MFM",
                      "aircraftQualification": "A330",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long firstCrewId = extractLong(firstCrewResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult secondCrewResult = mockMvc.perform(post("/api/crew-members")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "crewCode": "TESTCREW02",
                      "employeeNo": "TESTCREW02",
                      "nameZh": "娴嬭瘯鏈虹粍B",
                      "nameEn": "Test Crew B",
                      "roleCode": "CAPTAIN",
                      "rankCode": "CPT",
                      "homeBase": "MFM",
                      "aircraftQualification": "A330",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        Long secondCrewId = extractLong(secondCrewResult.getResponse().getContentAsString(), "\"id\":");

        MvcResult qualificationResult = mockMvc.perform(post("/api/crew-members/" + firstCrewId + "/qualifications")
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
            .andReturn();
        Long qualificationId = extractLong(qualificationResult.getResponse().getContentAsString(), "\"id\":");

        mockMvc.perform(put("/api/crew-members/" + secondCrewId + "/qualifications/" + qualificationId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "qualificationType": "AIRCRAFT",
                      "qualificationCode": "TEST-A330",
                      "status": "ACTIVE"
                    }
                    """))
            .andExpect(status().isNotFound());
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

    private Long createBatch(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/task-plan/batches")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "batchNo": "TEST-BATCH-9000",
                      "sourceName": "TEST-SOURCE",
                      "status": "IMPORTED",
                      "importedAtUtc": "2026-05-01T00:00:00Z"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn();
        return extractLong(result.getResponse().getContentAsString(), "\"id\":");
    }
}
