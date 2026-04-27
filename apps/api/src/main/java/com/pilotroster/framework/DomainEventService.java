package com.pilotroster.framework;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DomainEventService {

    private final JdbcTemplate jdbcTemplate;

    public DomainEventService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void record(String eventType, String aggregateType, String aggregateId, String payloadJson) {
        jdbcTemplate.update(
            """
            INSERT INTO domain_event (event_type, aggregate_type, aggregate_id, payload_json)
            VALUES (?, ?, ?, ?)
            """,
            eventType,
            aggregateType,
            aggregateId,
            payloadJson
        );
    }
}
