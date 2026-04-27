package com.pilotroster.workbench;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class ValidationPublishIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void resetUnassignedSeed() {
        jdbcTemplate.update("DELETE FROM violation_hit");
        jdbcTemplate.update("DELETE FROM timeline_block WHERE display_label IN ('TEST REST CONFLICT', 'TEST FLIGHT OVERLAP')");
        jdbcTemplate.update(
            """
            DELETE tb
            FROM timeline_block tb
            JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
            WHERE tpi.task_code IN ('NX8810', 'NX8811')
            """
        );
        jdbcTemplate.update("UPDATE task_plan_item SET status = 'UNASSIGNED' WHERE task_code IN ('NX8810', 'NX8811')");
    }

    @Test
    void validationPublishBlocksReleaseWhenFlightsRemainUnassigned() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get("/api/rostering-workbench/validation-publish").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.blockedCount").value(greaterThanOrEqualTo(2)))
            .andExpect(jsonPath("$.data.canPublish").value(false));

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.validatedAtUtc", notNullValue()))
            .andExpect(jsonPath("$.data.issues[*].taskCode").value(hasItem("NX8810")))
            .andExpect(jsonPath("$.data.issues[*].severity").value(hasItem("BLOCK")));

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/publish")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"managerConfirmed\":true}"))
            .andExpect(status().isConflict());
    }

    @Test
    void validationPublishUsesRuleHitPoolForCrewStatusAndTimeConflicts() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        Long crewId = jdbcTemplate.queryForObject(
            """
            SELECT crew_member_id
            FROM timeline_block
            WHERE crew_member_id IS NOT NULL
              AND block_type = 'FLIGHT'
              AND status <> 'CANCELLED'
            ORDER BY id
            LIMIT 1
            """,
            Long.class
        );
        Long taskId = jdbcTemplate.queryForObject(
            """
            SELECT task_plan_item_id
            FROM timeline_block
            WHERE crew_member_id = ?
              AND task_plan_item_id IS NOT NULL
              AND block_type = 'FLIGHT'
            ORDER BY id
            LIMIT 1
            """,
            Long.class,
            crewId
        );

        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            SELECT ?, ?, NULL, 'REST', scheduled_start_utc, scheduled_end_utc,
                   'TEST REST CONFLICT', 'PLANNED', 'EXTRA', 901
            FROM task_plan_item
            WHERE id = ?
            """,
            rosterVersionId,
            crewId,
            taskId
        );

        mockMvc.perform(post("/api/rostering-workbench/validation-publish/validate")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(hasItem("CREW_STATUS_CONFLICT")))
            .andExpect(jsonPath("$.data.issues[*].hitId").isNotEmpty())
            .andExpect(jsonPath("$.data.issues[*].targetType").value(hasItem("TIMELINE_BLOCK")));
    }

    private Long latestRosterVersionId() {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version ORDER BY id DESC LIMIT 1",
            Long.class
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
