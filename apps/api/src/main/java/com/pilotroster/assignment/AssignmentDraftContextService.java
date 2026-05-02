package com.pilotroster.assignment;

import com.pilotroster.assignment.AssignmentDtos.DraftAuditSummaryResponse;
import com.pilotroster.assignment.AssignmentDtos.DraftIssueSummaryResponse;
import com.pilotroster.assignment.AssignmentDtos.DraftRuntimeSummaryResponse;
import com.pilotroster.task.TaskPlanItem;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AssignmentDraftContextService {

    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String REASON_ARCHIVE_CASE_EXISTS = "ARCHIVE_CASE_EXISTS";
    private static final String REASON_CANCELLED_TASK = "CANCELLED_TASK";
    private static final String REASON_PUBLISHED_LOCKED = "PUBLISHED_LOCKED_RUN_DAY_ADJUSTMENT_REQUIRED";

    private final JdbcTemplate jdbcTemplate;

    public AssignmentDraftContextService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public DraftRuntimeSummaryResponse runtimeSummary(TaskPlanItem task, String readOnlyReason) {
        List<String> runtimeMarkCodes = new ArrayList<>();
        if (STATUS_CANCELLED.equals(task.getStatus())) {
            runtimeMarkCodes.add("CANCELLED");
        }
        return new DraftRuntimeSummaryResponse(
            task.getStatus(),
            runtimeMarkCodes,
            draftEditingBlocked(readOnlyReason)
        );
    }

    private boolean draftEditingBlocked(String readOnlyReason) {
        return REASON_ARCHIVE_CASE_EXISTS.equals(readOnlyReason)
            || REASON_CANCELLED_TASK.equals(readOnlyReason)
            || REASON_PUBLISHED_LOCKED.equals(readOnlyReason);
    }

    public DraftIssueSummaryResponse issueSummary(Long taskId) {
        return jdbcTemplate.query(
            """
            SELECT
              COUNT(*) AS total_count,
              SUM(CASE WHEN UPPER(vh.severity) LIKE '%BLOCK%' OR UPPER(vh.severity) LIKE '%NON_COMPLIANT%' THEN 1 ELSE 0 END) AS blocking_count,
              SUM(CASE WHEN UPPER(vh.severity) LIKE '%WARNING%' OR UPPER(vh.severity) LIKE '%ALERT%' THEN 1 ELSE 0 END) AS warning_count,
              (
                SELECT latest.severity
                FROM violation_hit latest
                WHERE latest.status = 'OPEN'
                  AND (latest.task_id = ? OR latest.target_type = 'TASK' AND latest.target_id = ?)
                ORDER BY latest.created_at DESC, latest.id DESC
                LIMIT 1
              ) AS latest_severity,
              (
                SELECT latest.message
                FROM violation_hit latest
                WHERE latest.status = 'OPEN'
                  AND (latest.task_id = ? OR latest.target_type = 'TASK' AND latest.target_id = ?)
                ORDER BY latest.created_at DESC, latest.id DESC
                LIMIT 1
              ) AS latest_message
            FROM violation_hit vh
            WHERE vh.status = 'OPEN'
              AND (vh.task_id = ? OR vh.target_type = 'TASK' AND vh.target_id = ?)
            """,
            rs -> {
                if (!rs.next()) {
                    return emptyIssueSummary();
                }
                return new DraftIssueSummaryResponse(
                    rs.getInt("total_count"),
                    rs.getInt("blocking_count"),
                    rs.getInt("warning_count"),
                    rs.getString("latest_severity"),
                    rs.getString("latest_message")
                );
            },
            taskId,
            taskId,
            taskId,
            taskId,
            taskId,
            taskId
        );
    }

    public DraftAuditSummaryResponse draftAuditSummary(Long taskId) {
        return jdbcTemplate.query(
            """
            SELECT id, action_code, actor_user_id, created_at
            FROM audit_log
            WHERE object_type = 'TaskPlanItem'
              AND object_id = ?
              AND action_code IN ('ASSIGNMENT_DRAFT_SAVED', 'ASSIGNMENT_DRAFT_CLEARED')
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            rs -> {
                if (!rs.next()) {
                    return new DraftAuditSummaryResponse(false, null, null, null);
                }
                return new DraftAuditSummaryResponse(
                    true,
                    rs.getString("action_code"),
                    nullableLong(rs.getObject("actor_user_id")),
                    nullableInstant(rs.getTimestamp("created_at"))
                );
            },
            String.valueOf(taskId)
        );
    }

    private DraftIssueSummaryResponse emptyIssueSummary() {
        return new DraftIssueSummaryResponse(0, 0, 0, null, null);
    }

    private Long nullableLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(value.toString());
    }

    private Instant nullableInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
