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
        return buildSummary(null, null);
    }

    @Transactional
    public ValidationIssueListResponse issues() {
        return buildIssueList();
    }

    @Transactional
    public ValidationPublishSummaryResponse validateDraft() {
        return buildSummary(Instant.now(), null);
    }

    @Transactional
    public ValidationPublishSummaryResponse publish(PublishRosterRequest request, AuthenticatedUser user) {
        Instant validatedAtUtc = Instant.now();
        ValidationPublishSummaryResponse validation = buildSummary(validatedAtUtc, null);
        if (validation.blockedCount() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Validation blockers must be resolved before publishing");
        }
        if (validation.warningCount() > 0 && (request == null || !request.managerConfirmed())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manager confirmation is required for warnings");
        }
        if (validation.publishableTasks() == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No publishable roster changes");
        }

        DraftRoster draft = currentDraft();
        List<TaskPlanItem> tasks = taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc();
        List<TaskPlanItem> publishableTasks = tasks.stream()
            .filter(task -> PUBLISHABLE_STATUSES.contains(task.getStatus()))
            .toList();
        publishableTasks.forEach(task -> task.setStatus(STATUS_PUBLISHED));
        taskPlanItemRepository.saveAll(publishableTasks);

        Set<Long> publishableTaskIds = publishableTasks.stream()
            .map(TaskPlanItem::getId)
            .collect(Collectors.toSet());
        List<TimelineBlock> affectedBlocks = timelineBlockRepository.findAllByRosterVersionIdOrderByStartUtcAsc(draft.id())
            .stream()
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
        return buildSummary(validatedAtUtc, Instant.now());
    }

    private ValidationIssueListResponse buildIssueList() {
        IssueListSnapshot snapshot = evaluateIssues();
        return new ValidationIssueListResponse(
            snapshot.rosterVersionNo(),
            snapshot.rosterVersionStatus(),
            snapshot.blockedCount(),
            snapshot.warningCount(),
            snapshot.issues()
        );
    }

    private ValidationPublishSummaryResponse buildSummary(Instant validatedAtUtc, Instant publishedAtUtc) {
        List<TaskPlanItem> tasks = taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc();
        IssueListSnapshot issueSnapshot = evaluateIssues();
        List<ValidationIssueResponse> issues = issueSnapshot.issues();

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
            issueSnapshot.rosterVersionNo(),
            issueSnapshot.rosterVersionStatus(),
            validatedAtUtc,
            publishedAtUtc,
            tasks.size(),
            assignedTasks,
            draftAssignedTasks,
            unassignedTasks,
            publishedTasks,
            issueSnapshot.blockedCount(),
            issueSnapshot.warningCount(),
            publishableTasks,
            issueSnapshot.blockedCount() == 0 && publishableTasks > 0,
            issueSnapshot.warningCount() > 0,
            inactiveRuleIds(),
            issues
        );
    }

    private IssueListSnapshot evaluateIssues() {
        RuleEvaluationResult evaluation = ruleEvaluationService.evaluateLatestRoster();
        List<ValidationIssueResponse> issues = evaluation.issues().stream()
            .map(this::issueFromRuleHit)
            .toList();
        return new IssueListSnapshot(
            evaluation.rosterVersionNo(),
            evaluation.rosterVersionStatus(),
            countSeverity(issues, "BLOCK"),
            countSeverity(issues, "WARNING"),
            issues
        );
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
            hit.message(),
            hit.recommendedAction(),
            hit.status(),
            startUtc,
            endUtc
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
