package com.pilotroster.framework;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.Statement;

@Service
public class AuditLogService {

    private final JdbcTemplate jdbcTemplate;

    public AuditLogService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void record(Long actorUserId, String actionCode, String objectType, String objectId, String resultCode) {
        jdbcTemplate.update(
            """
            INSERT INTO audit_log (actor_user_id, action_code, object_type, object_id, result_code)
            VALUES (?, ?, ?, ?, ?)
            """,
            actorUserId,
            actionCode,
            objectType,
            objectId,
            resultCode
        );
    }

    public void recordWithDetail(
        Long actorUserId,
        String actionCode,
        String objectType,
        String objectId,
        String resultCode,
        String detailJson
    ) {
        jdbcTemplate.update(
            """
            INSERT INTO audit_log (actor_user_id, action_code, object_type, object_id, result_code, detail_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            actorUserId,
            actionCode,
            objectType,
            objectId,
            resultCode,
            detailJson
        );
    }

    public Long recordAndReturnId(Long actorUserId, String actionCode, String objectType, String objectId, String resultCode) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                """
                INSERT INTO audit_log (actor_user_id, action_code, object_type, object_id, result_code)
                VALUES (?, ?, ?, ?, ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setObject(1, actorUserId);
            statement.setString(2, actionCode);
            statement.setString(3, objectType);
            statement.setString(4, objectId);
            statement.setString(5, resultCode);
            return statement;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? null : key.longValue();
    }
}
