package com.pilotroster.workbench;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.framework.AuditLogService;
import com.pilotroster.framework.DomainEventService;
import com.pilotroster.rule.RuleEvaluationService;
import com.pilotroster.rule.RuleEvaluationService.RuleEvaluationResult;
import com.pilotroster.rule.RuleEvaluationService.RuleHitIssue;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import com.pilotroster.workbench.ValidationPublishDtos.ValidationIssueListResponse;
import com.pilotroster.workbench.ValidationPublishDtos.PublishRosterRequest;
import com.pilotroster.workbench.ValidationPublishDtos.ValidationIssueResponse;
import com.pilotroster.workbench.ValidationPublishDtos.ValidationPublishSummaryResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ValidationPublishService {

    private static final String STATUS_UNASSIGNED = "UNASSIGNED";
    private static final String STATUS_ASSIGNED_DRAFT = "ASSIGNED_DRAFT";
    private static final String STATUS_ASSIGNED = "ASSIGNED";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_VALIDATION_FAILED = "VALIDATION_FAILED";
    private static final String STATUS_BLOCKED = "BLOCKED";
    private static final String STATUS_NEEDS_REVIEW = "NEEDS_REVIEW";
    private static final String STATUS_WARNING = "WARNING";
    private static final String STATUS_CANCELLED = "CANCELLED";

    private static final Set<String> PUBLISHABLE_STATUSES = Set.of(
        STATUS_ASSIGNED_DRAFT,
        STATUS_ASSIGNED,
        STATUS_NEEDS_REVIEW,
        STATUS_WARNING
    );

    private final TaskPlanItemRepository taskPlanItemRepository;
    private final TimelineBlockRepository timelineBlockRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AuditLogService auditLogService;
    private final DomainEventService domainEventService;
    private final RuleEvaluationService ruleEvaluationService;

    public ValidationPublishService(
        TaskPlanItemRepository taskPlanItemRepository,
        TimelineBlockRepository timelineBlockRepository,
        JdbcTemplate jdbcTemplate,
        AuditLogService auditLogService,
        DomainEventService domainEventService,
        RuleEvaluationService ruleEvaluationService
    ) {
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.timelineBlockRepository = timelineBlockRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.auditLogService = auditLogService;
        this.domainEventService = domainEventService;
        this.ruleEvaluationService = ruleEvaluationService;
    }

    @Transactional
    public ValidationPublishSummaryResponse summary() {
        return buildSummary(null, null, false);
    }

    @Transactional
    public ValidationIssueListResponse issues() {
        return buildIssueList(false);
    }

    @Transactional
    public ValidationPublishSummaryResponse validateDraft() {
        return buildSummary(Instant.now(), null, true);
    }

    @Transactional
    public ValidationPublishSummaryResponse publish(PublishRosterRequest request, AuthenticatedUser user) {
        Instant validatedAtUtc = Instant.now();
        ValidationPublishSummaryResponse validation = buildSummary(validatedAtUtc, null, true);
        if (validation.blockedCount() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Validation blockers must be resolved before publishing");
        }
        if (validation.warningCount() > 0 && (request == null || !request.managerConfirmed())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manager confirmation is required for warnings");
        }
        DraftRoster draft = currentDraft();
        List<TimelineBlock> currentRosterBlocks = timelineBlockRepository.findAllByRosterVersionIdOrderByStartUtcAsc(draft.id());
        List<TimelineBlock> publishableBlocks = currentRosterBlocks.stream()
            .filter(block -> !STATUS_CANCELLED.equals(block.getStatus()))
            .toList();
        Set<Long> currentRosterTaskIds = publishableBlocks.stream()
            .map(TimelineBlock::getTaskPlanItemId)
            .filter(taskId -> taskId != null)
            .collect(Collectors.toSet());
        List<TaskPlanItem> publishableTasks = taskPlanItemRepository.findAllById(currentRosterTaskIds).stream()
            .filter(task -> PUBLISHABLE_STATUSES.contains(task.getStatus()))
            .toList();
        if (publishableTasks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No publishable roster changes");
        }
        publishableTasks.forEach(task -> task.setStatus(STATUS_PUBLISHED));
        taskPlanItemRepository.saveAll(publishableTasks);

        Set<Long> publishableTaskIds = publishableTasks.stream()
            .map(TaskPlanItem::getId)
            .collect(Collectors.toSet());
        List<TimelineBlock> affectedBlocks = publishableBlocks.stream()
            .filter(block -> block.getTaskPlanItemId() != null)
            .filter(block -> publishableTaskIds.contains(block.getTaskPlanItemId()))
            .toList();
        affectedBlocks.forEach(block -> block.setStatus(STATUS_PUBLISHED));
        timelineBlockRepository.saveAll(affectedBlocks);

        List<String> inactiveRules = inactiveRuleIds();
        auditLogService.recordWithDetail(
            user.id(),
            "ROSTER_PUBLISHED",
            "RosterVersion",
            draft.id().toString(),
            "SUCCESS",
            "{\"inactiveRuleIds\":[" + inactiveRules.stream()
                .map(ruleId -> "\"" + json(ruleId) + "\"")
                .collect(Collectors.joining(",")) + "]}"
        );
        domainEventService.record("RosterPublished", "RosterVersion", draft.id().toString(), "{}");
        return buildSummary(validatedAtUtc, Instant.now(), true);
    }

    private ValidationIssueListResponse buildIssueList(boolean refreshIssues) {
        IssueListSnapshot snapshot = issueSnapshot(refreshIssues);
        return new ValidationIssueListResponse(
            snapshot.rosterVersionId(),
            snapshot.rosterVersionNo(),
            snapshot.rosterVersionStatus(),
            snapshot.blockedCount(),
            snapshot.warningCount(),
            snapshot.issues()
        );
    }

    private ValidationPublishSummaryResponse buildSummary(Instant validatedAtUtc, Instant publishedAtUtc, boolean refreshIssues) {
        List<TaskPlanItem> tasks = currentRosterTasks();
        IssueListSnapshot issueSnapshot = issueSnapshot(refreshIssues);
        List<ValidationIssueResponse> issues = issueSnapshot.issues();
        int blockedCount = issueSnapshot.blockedCount();
        int warningCount = issueSnapshot.warningCount();

        int assignedTasks = countStatus(tasks, STATUS_ASSIGNED) + countStatus(tasks, STATUS_ASSIGNED_DRAFT)
            + countStatus(tasks, STATUS_PUBLISHED) + countStatus(tasks, STATUS_NEEDS_REVIEW)
            + countStatus(tasks, STATUS_WARNING);
        int draftAssignedTasks = countStatus(tasks, STATUS_ASSIGNED_DRAFT);
        int unassignedTasks = countStatus(tasks, STATUS_UNASSIGNED);
        int publishedTasks = countStatus(tasks, STATUS_PUBLISHED);
        int publishableTasks = (int) tasks.stream()
            .filter(task -> PUBLISHABLE_STATUSES.contains(task.getStatus()))
            .count();

        return new ValidationPublishSummaryResponse(
            issueSnapshot.rosterVersionId(),
            issueSnapshot.rosterVersionNo(),
            issueSnapshot.rosterVersionStatus(),
            validatedAtUtc,
            publishedAtUtc,
            tasks.size(),
            assignedTasks,
            draftAssignedTasks,
            unassignedTasks,
            publishedTasks,
            blockedCount,
            warningCount,
            publishableTasks,
            blockedCount == 0 && publishableTasks > 0,
            warningCount > 0,
            inactiveRuleIds(),
            issues
        );
    }

    private IssueListSnapshot issueSnapshot(boolean refreshIssues) {
        RuleEvaluationResult evaluation = refreshIssues
            ? ruleEvaluationService.evaluateLatestRoster()
            : ruleEvaluationService.readLatestRosterSnapshot();
        List<ValidationIssueResponse> issues = new ArrayList<>(evaluation.issues().stream()
            .map(this::issueFromRuleHit)
            .toList());
        issues.addAll(taskStatusIssues(currentRosterTasks()));
        return new IssueListSnapshot(
            evaluation.rosterVersionId(),
            evaluation.rosterVersionNo(),
            evaluation.rosterVersionStatus(),
            countSeverity(issues, "BLOCK"),
            countSeverity(issues, "WARNING"),
            issues
        );
    }

    private List<ValidationIssueResponse> taskStatusIssues(List<TaskPlanItem> tasks) {
        return tasks.stream()
            .filter(task -> !STATUS_CANCELLED.equals(task.getStatus()))
            .filter(task -> STATUS_VALIDATION_FAILED.equals(task.getStatus())
                || STATUS_BLOCKED.equals(task.getStatus())
                || STATUS_NEEDS_REVIEW.equals(task.getStatus())
                || STATUS_WARNING.equals(task.getStatus()))
            .map(task -> {
                boolean blocked = STATUS_VALIDATION_FAILED.equals(task.getStatus()) || STATUS_BLOCKED.equals(task.getStatus());
                return new ValidationIssueResponse(
                    "TASK_STATUS_" + task.getId(),
                    null,
                    task.getId(),
                    null,
                    null,
                    "TASK",
                    task.getId(),
                    task.getTaskCode(),
                    route(task),
                    task.getScheduledStartUtc(),
                    task.getScheduledEndUtc(),
                    blocked ? "BLOCK" : "WARNING",
                    blocked ? "TASK_STATUS_BLOCKED" : "MANAGER_REVIEW_REQUIRED",
                    blocked ? "Task status blocked" : "Manager review required",
                    blocked ? "任务状态阻断" : "需要经理复核",
                    blocked ? "Task status blocked" : "Manager review required",
                    blocked
                        ? "Task status blocks publishing; repair the task or resolve the underlying blocker."
                        : "Task status requires manager confirmation before publishing.",
                    blocked ? "STATUS_REPAIR" : "REVIEW",
                    task.getStatus(),
                    task.getScheduledStartUtc(),
                    task.getScheduledEndUtc(),
                    null
                );
            })
            .toList();
    }

    private List<TaskPlanItem> currentRosterTasks() {
        Set<Long> taskIds = currentRosterTaskIds(currentDraft().id());
        return taskPlanItemRepository.findAllById(taskIds);
    }

    private Set<Long> currentRosterTaskIds(Long rosterVersionId) {
        return timelineBlockRepository.findAllByRosterVersionIdOrderByStartUtcAsc(rosterVersionId).stream()
            .filter(block -> !STATUS_CANCELLED.equals(block.getStatus()))
            .map(TimelineBlock::getTaskPlanItemId)
            .filter(taskId -> taskId != null)
            .collect(Collectors.toSet());
    }

    private ValidationIssueResponse issueFromRuleHit(RuleHitIssue hit) {
        Instant startUtc = hit.evidenceWindowStartUtc();
        Instant endUtc = hit.evidenceWindowEndUtc();
        return new ValidationIssueResponse(
            hit.hitId().toString(),
            hit.hitId(),
            hit.taskId(),
            hit.crewId(),
            hit.timelineBlockId(),
            hit.targetType(),
            hit.targetId(),
            hit.taskCode() == null ? "" : hit.taskCode(),
            hit.route() == null ? "" : hit.route(),
            startUtc,
            endUtc,
            hit.severity(),
            hit.ruleId(),
            hit.ruleTitleEn(),
            hit.ruleTitleZh(),
            hit.ruleTitleEn(),
            hit.message(),
            hit.recommendedAction(),
            hit.status(),
            startUtc,
            endUtc,
            hit.evidenceJson()
        );
    }

    private int countStatus(List<TaskPlanItem> tasks, String status) {
        return (int) tasks.stream().filter(task -> status.equals(task.getStatus())).count();
    }

    private int countSeverity(List<ValidationIssueResponse> issues, String severity) {
        return (int) issues.stream().filter(issue -> severity.equals(issue.severity())).count();
    }

    private String route(TaskPlanItem task) {
        if (task.getDepartureAirport() == null || task.getArrivalAirport() == null) {
            return "";
        }
        return task.getDepartureAirport() + "-" + task.getArrivalAirport();
    }

    private DraftRoster currentDraft() {
        List<DraftRoster> rosters = jdbcTemplate.query(
            """
            SELECT id, version_no, status
            FROM roster_version
            ORDER BY id DESC
            LIMIT 1
            """,
            (rs, rowNum) -> new DraftRoster(
                rs.getLong("id"),
                rs.getString("version_no"),
                rs.getString("status")
            )
        );
        if (rosters.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Roster version not found");
        }
        return rosters.get(0);
    }

    private record DraftRoster(Long id, String versionNo, String status) {
    }

    private record IssueListSnapshot(
        Long rosterVersionId,
        String rosterVersionNo,
        String rosterVersionStatus,
        int blockedCount,
        int warningCount,
        List<ValidationIssueResponse> issues
    ) {
    }

    private List<String> inactiveRuleIds() {
        return jdbcTemplate.query(
            """
            SELECT rule_id
            FROM rule_catalog
            WHERE active_flag = FALSE
            ORDER BY rule_id
            """,
            (rs, rowNum) -> rs.getString("rule_id")
        );
    }

    private static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
