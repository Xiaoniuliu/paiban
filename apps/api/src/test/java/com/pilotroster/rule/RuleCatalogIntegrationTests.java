package com.pilotroster.rule;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class RuleCatalogIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void resetRuleCatalogTestData() {
        jdbcTemplate.update(
            """
            DELETE vh
            FROM violation_hit vh
            WHERE vh.message LIKE 'TEST %'
            """
        );
        jdbcTemplate.update("DELETE FROM timeline_block WHERE display_label = 'TEST NON EVALUATION GATE'");
    }

    @Test
    void ruleCatalogExposesMetadataAndPhaseStatuses() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get("/api/rules").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].ruleId").value(hasItem("CREW_TIME_OVERLAP")))
            .andExpect(jsonPath("$.data[*].ruleId").value(not(hasItem("CREW_ASSIGNMENT_REQUIRED"))))
            .andExpect(jsonPath("$.data[*].ruleId").value(not(hasItem("CREW_PAIR_REQUIRED"))))
            .andExpect(jsonPath("$.data[*].ruleId").value(hasItem("RG-FDP-006")))
            .andExpect(jsonPath("$.data[*].ruleId").value(hasItem("RG-DDO-003")))
            .andExpect(jsonPath("$.data[*].ruleId").value(hasItem("RG-DISC-012")))
            .andExpect(jsonPath("$.data.length()", greaterThanOrEqualTo(142)))
            .andExpect(jsonPath("$.data[0].descriptionEn", notNullValue()))
            .andExpect(jsonPath("$.data[0].triggerSummaryEn", notNullValue()))
            .andExpect(jsonPath("$.data[*].phaseCode").value(hasItem("PHASE_3")))
            .andExpect(jsonPath("$.data[*].versionStatus").value(hasItem("ACTIVE")))
            .andExpect(jsonPath("$.data[*].ruleCategory").value(hasItem("强制阻断")))
            .andExpect(jsonPath("$.data[*].ruleCategory").value(hasItem("告警提醒")))
            .andExpect(jsonPath("$.data[*].ruleCategory").value(hasItem("参考信息")))
            .andExpect(jsonPath("$.data[?(@.ruleId=='RG-FDP-006')].catalogEntryType").value(hasItem("EVALUATION_RULE")))
            .andExpect(jsonPath("$.data[?(@.ruleId=='RG-TIME-001')].catalogEntryType").value(hasItem("CALCULATION_METHOD")))
            .andExpect(jsonPath("$.data[?(@.ruleId=='RG-FDP-006')].activeFlag").value(hasItem(true)))
            .andExpect(jsonPath("$.data[?(@.ruleId=='RG-FDP-006')].activationLocked").value(hasItem(true)))
            .andExpect(jsonPath("$.data[?(@.ruleId=='RG-BASE-009')].activationLocked").value(hasItem(false)))
            .andExpect(jsonPath("$.data[*].activationLocked").value(hasItem(true)));
    }

    @Test
    void ruleRecentHitsEndpointReturnsScopedList() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get("/api/rules/CREW_TIME_OVERLAP/recent-hits").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void ruleRecentHitsExcludeClosedHitsFromListAndCounts() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        Long gateRuleCatalogId = ruleCatalogId("CREW_TIME_OVERLAP");
        Long executableRuleCatalogId = ruleCatalogId("RG-BASE-008");

        jdbcTemplate.update(
            """
            INSERT INTO violation_hit (
              roster_version_id, rule_catalog_id, severity, status, target_type, evidence_json, message, recommended_action
            )
            VALUES (?, ?, 'BLOCK', 'CLOSED', 'TIMELINE_BLOCK', '{}', 'TEST CLOSED HIT', 'REVIEW')
            """,
            rosterVersionId,
            gateRuleCatalogId
        );

        mockMvc.perform(get("/api/rules/CREW_TIME_OVERLAP/recent-hits").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isEmpty());

        jdbcTemplate.update(
            """
            INSERT INTO violation_hit (
              roster_version_id, rule_catalog_id, severity, status, target_type, evidence_json, message, recommended_action
            )
            VALUES (?, ?, 'BLOCK', 'OPEN', 'TIMELINE_BLOCK', '{"phase":"test"}', 'TEST OPEN HIT', 'REVIEW')
            """,
            rosterVersionId,
            executableRuleCatalogId
        );

        mockMvc.perform(get("/api/rules/RG-BASE-008/recent-hits").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].evidenceJson").value(containsString("\"phase\"")))
            .andExpect(jsonPath("$.data[0].evidenceJson").value(containsString("\"test\"")));

        mockMvc.perform(get("/api/rules").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.ruleId=='CREW_TIME_OVERLAP')].hitCount").value(hasItem(0)))
            .andExpect(jsonPath("$.data[?(@.ruleId=='RG-BASE-008')].hitCount").value(hasItem(1)));
    }

    @Test
    void ruleEvaluationDoesNotPersistActiveNonEvaluationGateHits() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();

        jdbcTemplate.update(
            """
            INSERT INTO timeline_block (
              roster_version_id, crew_member_id, task_plan_item_id, block_type,
              start_utc, end_utc, display_label, status, assignment_role, display_order
            )
            VALUES (?, NULL, NULL, 'DUTY', '2036-03-01 04:00:00', '2036-03-01 03:00:00',
                    'TEST NON EVALUATION GATE', 'PLANNED', 'EXTRA', 902)
            """,
            rosterVersionId
        );

        mockMvc.perform(post("/api/rules/evaluate/latest-roster").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[*].ruleId").value(not(hasItem("RG-TIME-008"))));

        Integer persistedHits = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
            FROM violation_hit vh
            JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
            WHERE rc.rule_id = 'RG-TIME-008'
            """,
            Integer.class
        );
        org.assertj.core.api.Assertions.assertThat(persistedHits).isZero();
    }

    @Test
    void ruleEvaluationDoesNotCloseExternalEvaluationRuleHits() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");
        Long rosterVersionId = latestRosterVersionId();
        Long externalRuleCatalogId = ruleCatalogId("RG-FDP-006");

        jdbcTemplate.update(
            """
            INSERT INTO violation_hit (
              roster_version_id, rule_catalog_id, severity, status, target_type, evidence_json, message, recommended_action
            )
            VALUES (?, ?, 'BLOCK', 'OPEN', 'TASK', '{}', 'TEST EXTERNAL EVALUATION HIT', 'REVIEW')
            """,
            rosterVersionId,
            externalRuleCatalogId
        );

        mockMvc.perform(post("/api/rules/evaluate/latest-roster").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        String status = jdbcTemplate.queryForObject(
            """
            SELECT status
            FROM violation_hit
            WHERE roster_version_id = ?
              AND rule_catalog_id = ?
              AND message = 'TEST EXTERNAL EVALUATION HIT'
            """,
            String.class,
            rosterVersionId,
            externalRuleCatalogId
        );
        org.assertj.core.api.Assertions.assertThat(status).isEqualTo("OPEN");
    }

    @Test
    void ruleEvaluationEndpointsReturnRuleHitPoolResults() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(post("/api/rules/evaluate/latest-roster").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rosterVersionId", notNullValue()))
            .andExpect(jsonPath("$.data.issues").isArray());

        mockMvc.perform(post("/api/rules/trial")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scope\":\"LATEST_ROSTER\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.scope").value("LATEST_ROSTER"))
            .andExpect(jsonPath("$.data.result.issues").isArray());
    }

    @Test
    void p1P2RulesCanBeDeactivatedButP0RulesCannot() throws Exception {
        String token = loginToken("manager01", "Admin123!");

        mockMvc.perform(patch("/api/rules/MANAGER_REVIEW_REQUIRED/active")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activeFlag").value(false));

        mockMvc.perform(patch("/api/rules/CREW_TIME_OVERLAP/active")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":false}"))
            .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/rules/MANAGER_REVIEW_REQUIRED/active")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activeFlag").value(true));

        mockMvc.perform(patch("/api/rules/RG-BASE-009/active")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":true}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activeFlag").value(true));

        mockMvc.perform(patch("/api/rules/RG-BASE-009/active")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activeFlag").value(false));
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

    private Long latestRosterVersionId() {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM roster_version ORDER BY id DESC LIMIT 1",
            Long.class
        );
    }

    private Long ruleCatalogId(String ruleId) {
        return jdbcTemplate.queryForObject(
            "SELECT id FROM rule_catalog WHERE rule_id = ?",
            Long.class,
            ruleId
        );
    }
}
