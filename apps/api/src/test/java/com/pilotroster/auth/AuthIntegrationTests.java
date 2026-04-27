package com.pilotroster.auth;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void loginReturnsJwtAndProfile() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"dispatcher01\",\"password\":\"Admin123!\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token", not(blankOrNullString())))
            .andExpect(jsonPath("$.data.user.role").value("DISPATCHER"));
    }

    @Test
    void wrongPasswordReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"dispatcher01\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpointRequiresToken() throws Exception {
        mockMvc.perform(get("/api/crew-members"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenAllowsProtectedEndpoints() throws Exception {
        String token = loginToken("dispatcher01", "Admin123!");

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.username").value("dispatcher01"));

        mockMvc.perform(get("/api/crew-members").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/rules").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/task-plan/batches").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].batchNo").value("BATCH-2026-05-W1"));

        mockMvc.perform(get("/api/task-plan/items").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].taskCode").value(hasItem("NX9001")));

        mockMvc.perform(get("/api/timeline-blocks").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[*].displayLabel").value(hasItem("NX9001 MFM-SIN")));
    }

    @Test
    void pilotCannotReadDispatcherWorklists() throws Exception {
        String token = loginToken("pilot01", "Admin123!");

        mockMvc.perform(get("/api/task-plan/items").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/timeline-blocks").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
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
