package com.pilotroster.workbench;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.framework.AuditLogService;
import com.pilotroster.framework.DomainEventService;
import com.pilotroster.rule.RuleEvaluationService;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import com.pilotroster.workbench.RunDayAdjustmentDtos.CreateRunDayAdjustmentRequest;
import com.pilotroster.workbench.RunDayAdjustmentDtos.RunDayAdjustmentResponse;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RunDayAdjustmentService {

    private static final Set<String> SUPPORTED_TYPES = Set.of(
        "DELAY",
        "CANCEL",
        "STANDBY_CALLOUT",
        "CREW_REPLACEMENT",
        "REST_INSERT"
    );
    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_APPLIED = "APPLIED";
    private static final String TASK_STATUS_CANCELLED = "CANCELLED";
    private static final String BLOCK_STATUS_CANCELLED = "CANCELLED";
    private static final String BLOCK_STATUS_PLANNED = "PLANNED";
    private static final String BLOCK_TYPE_REST = "REST";
    private static final Set<String> SUPPORTED_REPLACEMENT_ROLES = Set.of("PIC", "FO", "RELIEF", "EXTRA");

    private final JdbcTemplate jdbcTemplate;
    private final TaskPlanItemRepository taskPlanItemRepository;
    private final AuditLogService auditLogService;
    private final DomainEventService domainEventService;
    private final RuleEvaluationService ruleEvaluationService;

    public RunDayAdjustmentService(
        JdbcTemplate jdbcTemplate,
        TaskPlanItemRepository taskPlanItemRepository,
        AuditLogService auditLogService,
        DomainEventService domainEventService,
        RuleEvaluationService ruleEvaluationService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.auditLogService = auditLogService;
        this.domainEventService = domainEventService;
        this.ruleEvaluationService = ruleEvaluationService;
    }

    @Transactional(readOnly = true)
    public List<RunDayAdjustmentResponse> list() {
        return jdbcTemplate.query(
            """
            SELECT rda.id,
                   rda.task_plan_item_id,
                   tpi.task_code,
                   tpi.departure_airport,
                   tpi.arrival_airport,
                   tpi.scheduled_start_utc,
                   tpi.scheduled_end_utc,
                   rda.adjustment_type,
                   rda.proposed_start_utc,
                   rda.proposed_end_utc,
                   rda.from_crew_id,
                   rda.to_crew_id,
                   rda.assignment_role,
                   rda.effective_start_utc,
                   rda.effective_end_utc,
                   rda.reason,
                   rda.status,
                   rda.created_at_utc
            FROM run_day_adjustment rda
            JOIN task_plan_item tpi ON tpi.id = rda.task_plan_item_id
            ORDER BY rda.created_at_utc DESC, rda.id DESC
            """,
            (rs, rowNum) -> new RunDayAdjustmentResponse(
                rs.getLong("id"),
                rs.getLong("task_plan_item_id"),
                rs.getString("task_code"),
                route(rs.getString("departure_airport"), rs.getString("arrival_airport")),
                rs.getTimestamp("scheduled_start_utc").toInstant(),
                rs.getTimestamp("scheduled_end_utc").toInstant(),
                rs.getString("adjustment_type"),
                nullableInstant(rs.getTimestamp("proposed_start_utc")),
                nullableInstant(rs.getTimestamp("proposed_end_utc")),
                nullableLong(rs.getObject("from_crew_id")),
                nullableLong(rs.getObject("to_crew_id")),
                rs.getString("assignment_role"),
                nullableInstant(rs.getTimestamp("effective_start_utc")),
                nullableInstant(rs.getTimestamp("effective_end_utc")),
                rs.getString("reason"),
                rs.getString("status"),
                rs.getTimestamp("created_at_utc").toInstant()
            )
        );
    }

    @Transactional
    public RunDayAdjustmentResponse create(CreateRunDayAdjustmentRequest request, AuthenticatedUser user) {
        validate(request);
        TaskPlanItem task = taskPlanItemRepository.findById(request.taskId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                """
                INSERT INTO run_day_adjustment (
                  task_plan_item_id,
                  adjustment_type,
                  proposed_start_utc,
                  proposed_end_utc,
                  from_crew_id,
                  to_crew_id,
                  assignment_role,
                  effective_start_utc,
                  effective_end_utc,
                  reason,
                  status,
                  created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, request.taskId());
            statement.setString(2, request.adjustmentType());
            statement.setTimestamp(3, timestampOrNull(request.proposedStartUtc()));
            statement.setTimestamp(4, timestampOrNull(request.proposedEndUtc()));
            statement.setObject(5, request.fromCrewId());
            statement.setObject(6, request.toCrewId());
            statement.setString(7, request.assignmentRole());
            statement.setTimestamp(8, timestampOrNull(request.effectiveStartUtc()));
            statement.setTimestamp(9, timestampOrNull(request.effectiveEndUtc()));
            statement.setString(10, request.reason().trim());
            statement.setLong(11, user.id());
            return statement;
        }, keyHolder);

        Number key = keyHolder.getKey();
        Long adjustmentId = key == null ? null : key.longValue();
        auditLogService.record(user.id(), "RUN_DAY_ADJUSTMENT_DRAFTED", "TaskPlanItem", task.getId().toString(), "OK");
        domainEventService.record("RunDayAdjustmentDrafted", "TaskPlanItem", task.getId().toString(), "{}");
        return find(adjustmentId);
    }

    @Transactional
    public RunDayAdjustmentResponse apply(Long adjustmentId, AuthenticatedUser user) {
        RunDayAdjustmentRecord adjustment = adjustment(adjustmentId);
        if (!STATUS_DRAFT.equals(adjustment.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only draft adjustments can be applied");
        }
        TaskPlanItem task = taskPlanItemRepository.findById(adjustment.taskId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        switch (adjustment.adjustmentType()) {
            case "DELAY", "STANDBY_CALLOUT" -> applyTimeChange(task, adjustment);
            case "CANCEL" -> applyCancellation(task);
            case "REST_INSERT" -> applyRestInsert(task, adjustment);
            case "CREW_REPLACEMENT" -> applyCrewReplacement(task, adjustment);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported adjustment type");
        }

        jdbcTemplate.update("UPDATE run_day_adjustment SET status = ? WHERE id = ?", STATUS_APPLIED, adjustmentId);
        ruleEvaluationService.evaluateLatestRoster();
        auditLogService.record(user.id(), "RUN_DAY_ADJUSTMENT_APPLIED", "RunDayAdjustment", adjustmentId.toString(), "OK");
        domainEventService.record("RunDayAdjustmentApplied", "RunDayAdjustment", adjustmentId.toString(), "{}");
        return find(adjustmentId);
    }

    private void applyTimeChange(TaskPlanItem task, RunDayAdjustmentRecord adjustment) {
        requireProposedWindow(adjustment);
        task.setScheduledStartUtc(adjustment.proposedStartUtc());
        task.setScheduledEndUtc(adjustment.proposedEndUtc());
        taskPlanItemRepository.save(task);
        jdbcTemplate.update(
            """
            UPDATE timeline_block
            SET start_utc = ?, end_utc = ?
            WHERE task_plan_item_id = ?
            """,
            Timestamp.from(adjustment.proposedStartUtc()),
            Timestamp.from(adjustment.proposedEndUtc()),
            task.getId()
        );
    }

    private void applyCancellation(TaskPlanItem task) {
        task.setStatus(TASK_STATUS_CANCELLED);
        taskPlanItemRepository.save(task);
        jdbcTemplate.update(
            "UPDATE timeline_block SET status = ? WHERE task_plan_item_id = ?",
            BLOCK_STATUS_CANCELLED,
            task.getId()
        );
    }

    private void applyRestInsert(TaskPlanItem task, RunDayAdjustmentRecord adjustment) {
        requireProposedWindow(adjustment);
        Long rosterVersionId = latestRosterVersionId();
        List<Long> crewIds = jdbcTemplate.queryForList(
            """
            SELECT DISTINCT crew_member_id
            FROM timeline_block
            WHERE task_plan_item_id = ? AND crew_member_id IS NOT NULL
            """,
            Long.class,
            task.getId()
        );
        for (int index = 0; index < crewIds.size(); index += 1) {
            jdbcTemplate.update(
                """
                INSERT INTO timeline_block (
                  roster_version_id,
                  crew_member_id,
                  task_plan_item_id,
                  block_type,
                  start_utc,
                  end_utc,
                  display_label,
                  status,
                  assignment_role,
                  display_order
                )
                VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
                """,
                rosterVersionId,
                crewIds.get(index),
                BLOCK_TYPE_REST,
                Timestamp.from(adjustment.proposedStartUtc()),
                Timestamp.from(adjustment.proposedEndUtc()),
                "REST " + task.getTaskCode(),
                BLOCK_STATUS_PLANNED,
                "EXTRA",
                900 + index
            );
        }
    }

    private void applyCrewReplacement(TaskPlanItem task, RunDayAdjustmentRecord adjustment) {
        if (adjustment.fromCrewId() == null || adjustment.toCrewId() == null || adjustment.assignmentRole() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Replacement crew, target crew, and assignment role are required");
        }
        if (adjustment.fromCrewId().equals(adjustment.toCrewId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Replacement crew must be different");
        }
        if (!SUPPORTED_REPLACEMENT_ROLES.contains(adjustment.assignmentRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported replacement role");
        }
        Instant effectiveStart = adjustment.effectiveStartUtc() == null ? task.getScheduledStartUtc() : adjustment.effectiveStartUtc();
        Instant effectiveEnd = adjustment.effectiveEndUtc() == null ? task.getScheduledEndUtc() : adjustment.effectiveEndUtc();
        if (!effectiveEnd.isAfter(effectiveStart)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Effective end must be later than effective start");
        }
        int updated = jdbcTemplate.update(
            """
            UPDATE timeline_block
            SET crew_member_id = ?,
                start_utc = ?,
                end_utc = ?,
                status = CASE WHEN status = 'PUBLISHED' THEN status ELSE 'PLANNED' END
            WHERE task_plan_item_id = ?
              AND crew_member_id = ?
              AND assignment_role = ?
              AND status <> 'CANCELLED'
            """,
            adjustment.toCrewId(),
            Timestamp.from(effectiveStart),
            Timestamp.from(effectiveEnd),
            task.getId(),
            adjustment.fromCrewId(),
            adjustment.assignmentRole()
        );
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Matching crew assignment block not found");
        }
    }

    private void requireProposedWindow(RunDayAdjustmentRecord adjustment) {
        if (adjustment.proposedStartUtc() == null || adjustment.proposedEndUtc() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proposed start and end are required");
        }
    }

    private RunDayAdjustmentResponse find(Long adjustmentId) {
        if (adjustmentId == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Adjustment id missing");
        }
        return list().stream()
            .filter(adjustment -> adjustment.id().equals(adjustmentId))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Adjustment not found"));
    }

    private RunDayAdjustmentRecord adjustment(Long adjustmentId) {
        List<RunDayAdjustmentRecord> adjustments = jdbcTemplate.query(
            """
            SELECT id,
                   task_plan_item_id,
                   adjustment_type,
                   proposed_start_utc,
                   proposed_end_utc,
                   from_crew_id,
                   to_crew_id,
                   assignment_role,
                   effective_start_utc,
                   effective_end_utc,
                   reason,
                   status
            FROM run_day_adjustment
            WHERE id = ?
            """,
            (rs, rowNum) -> new RunDayAdjustmentRecord(
                rs.getLong("id"),
                rs.getLong("task_plan_item_id"),
                rs.getString("adjustment_type"),
                nullableInstant(rs.getTimestamp("proposed_start_utc")),
                nullableInstant(rs.getTimestamp("proposed_end_utc")),
                nullableLong(rs.getObject("from_crew_id")),
                nullableLong(rs.getObject("to_crew_id")),
                rs.getString("assignment_role"),
                nullableInstant(rs.getTimestamp("effective_start_utc")),
                nullableInstant(rs.getTimestamp("effective_end_utc")),
                rs.getString("reason"),
                rs.getString("status")
            ),
            adjustmentId
        );
        if (adjustments.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Adjustment not found");
        }
        return adjustments.get(0);
    }

    private Long latestRosterVersionId() {
        List<Long> ids = jdbcTemplate.queryForList(
            "SELECT id FROM roster_version ORDER BY id DESC LIMIT 1",
            Long.class
        );
        if (ids.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Roster version not found");
        }
        return ids.get(0);
    }

    private void validate(CreateRunDayAdjustmentRequest request) {
        if (request == null || request.taskId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task is required");
        }
        if (request.adjustmentType() == null || !SUPPORTED_TYPES.contains(request.adjustmentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported adjustment type");
        }
        if (request.reason() == null || request.reason().trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required");
        }
        if ((request.proposedStartUtc() == null) != (request.proposedEndUtc() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proposed start and end must be provided together");
        }
        if (request.proposedStartUtc() != null && !request.proposedEndUtc().isAfter(request.proposedStartUtc())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proposed end must be later than proposed start");
        }
        if ((request.effectiveStartUtc() == null) != (request.effectiveEndUtc() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Effective start and end must be provided together");
        }
        if (request.effectiveStartUtc() != null && !request.effectiveEndUtc().isAfter(request.effectiveStartUtc())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Effective end must be later than effective start");
        }
        if ("CREW_REPLACEMENT".equals(request.adjustmentType())) {
            if (request.fromCrewId() == null || request.toCrewId() == null || request.assignmentRole() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Replacement crew fields are required");
            }
            if (!SUPPORTED_REPLACEMENT_ROLES.contains(request.assignmentRole())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported replacement role");
            }
        }
    }

    private static String route(String departureAirport, String arrivalAirport) {
        if (departureAirport == null || arrivalAirport == null) return "";
        return departureAirport + "-" + arrivalAirport;
    }

    private static Instant nullableInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static Long nullableLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(value.toString());
    }

    private static Timestamp timestampOrNull(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private record RunDayAdjustmentRecord(
        Long id,
        Long taskId,
        String adjustmentType,
        Instant proposedStartUtc,
        Instant proposedEndUtc,
        Long fromCrewId,
        Long toCrewId,
        String assignmentRole,
        Instant effectiveStartUtc,
        Instant effectiveEndUtc,
        String reason,
        String status
    ) {
    }
}
