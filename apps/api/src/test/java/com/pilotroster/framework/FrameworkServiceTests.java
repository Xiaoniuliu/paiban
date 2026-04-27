package com.pilotroster.framework;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pilotroster.user.UserPreferenceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class FrameworkServiceTests {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private DomainEventService domainEventService;

    @Autowired
    private StateMachineService stateMachineService;

    @Autowired
    private UserPreferenceService userPreferenceService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void recordsAuditAndDomainEventSkeletonRows() {
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'dispatcher01'",
            Long.class
        );

        auditLogService.record(userId, "FRAMEWORK_TEST", "FRAMEWORK", "1", "SUCCESS");
        domainEventService.record("FRAMEWORK_TESTED", "FRAMEWORK", "1", "{}");

        Integer auditCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM audit_log WHERE action_code = 'FRAMEWORK_TEST'",
            Integer.class
        );
        Integer eventCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM domain_event WHERE event_type = 'FRAMEWORK_TESTED'",
            Integer.class
        );

        assertThat(auditCount).isGreaterThan(0);
        assertThat(eventCount).isGreaterThan(0);
    }

    @Test
    void supportsUserPreferenceDefaultsAndUpdates() {
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM sys_user WHERE username = 'manager01'",
            Long.class
        );

        assertThat(userPreferenceService.getOrCreate(userId).getLanguageCode()).isIn("zh-CN", "en-US");
        assertThat(userPreferenceService.update(userId, "en-US", "UTC").getDisplayTimezoneMode()).isEqualTo("UTC");
    }

    @Test
    void validatesRosterStateTransitions() {
        assertThat(stateMachineService.canTransition(RosterState.DRAFT, RosterState.VALIDATING)).isTrue();
        assertThatThrownBy(() -> stateMachineService.requireTransition(RosterState.ARCHIVED, RosterState.DRAFT))
            .isInstanceOf(IllegalStateException.class);
    }
}
