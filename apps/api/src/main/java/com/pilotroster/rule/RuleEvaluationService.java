package com.pilotroster.rule;

import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RuleEvaluationService {

    private static final String STATUS_UNASSIGNED = "UNASSIGNED";
    private static final String STATUS_ASSIGNED_DRAFT = "ASSIGNED_DRAFT";
    private static final String STATUS_ASSIGNED = "ASSIGNED";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_VALIDATION_FAILED = "VALIDATION_FAILED";
    private static final String STATUS_BLOCKED = "BLOCKED";
    private static final String STATUS_NEEDS_REVIEW = "NEEDS_REVIEW";
    private static final String STATUS_WARNING = "WARNING";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String ROLE_PIC = "PIC";
    private static final String ROLE_FO = "FO";
    private static final String BLOCK_FLIGHT = "FLIGHT";
    private static final String BLOCK_DDO = "DDO";
    private static final String BLOCK_STANDBY = "STANDBY";

    private static final Set<String> CREW_PAIR_STATUSES = Set.of(
        STATUS_ASSIGNED_DRAFT,
        STATUS_ASSIGNED,
        STATUS_PUBLISHED,
        STATUS_NEEDS_REVIEW,
        STATUS_WARNING
    );
    private static final Set<String> DUTY_CONFLICT_BLOCK_TYPES = Set.of(
        "REST",
        "DDO",
        "TRAINING",
        "STANDBY",
        "DUTY",
        "RECOVERY"
    );

    private final JdbcTemplate jdbcTemplate;
    private final TaskPlanItemRepository taskPlanItemRepository;
    private final TimelineBlockRepository timelineBlockRepository;

    public RuleEvaluationService(
        JdbcTemplate jdbcTemplate,
        TaskPlanItemRepository taskPlanItemRepository,
        TimelineBlockRepository timelineBlockRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.timelineBlockRepository = timelineBlockRepository;
    }

    @Transactional
    public RuleEvaluationResult evaluateLatestRoster() {
        DraftRoster roster = latestRoster();
        List<TaskPlanItem> tasks = taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc();
        List<TimelineBlock> blocks = timelineBlockRepository.findAllByRosterVersionIdOrderByStartUtcAsc(roster.id());
        Map<Long, TaskPlanItem> tasksById = tasks.stream().collect(Collectors.toMap(TaskPlanItem::getId, task -> task));
        Map<Long, List<TimelineBlock>> blocksByTaskId = blocks.stream()
            .filter(block -> block.getTaskPlanItemId() != null)
            .collect(Collectors.groupingBy(TimelineBlock::getTaskPlanItemId));

        List<RuleHit> hits = new ArrayList<>();
        buildPublishGateHits(tasks, blocksByTaskId, hits);
        buildCrewTimeConflictHits(blocks, tasksById, hits);
        buildPhase3FoundationHits(tasks, blocks, blocksByTaskId, tasksById, hits);

        Map<String, Long> ruleIdsByRuleId = ruleIdsByRuleId();
        jdbcTemplate.update("DELETE FROM violation_hit WHERE roster_version_id = ?", roster.id());
        hits.stream()
            .filter(hit -> ruleIdsByRuleId.containsKey(hit.ruleId()))
            .forEach(hit -> insertHit(roster.id(), ruleIdsByRuleId.get(hit.ruleId()), hit));

        List<RuleHitIssue> issues = readIssues(roster.id());
        return new RuleEvaluationResult(roster.id(), roster.versionNo(), roster.status(), issues);
    }

    @Transactional(readOnly = true)
    public List<RuleRecentHitCount> recentHitCountsByRuleId() {
        return jdbcTemplate.query(
            """
            SELECT rc.rule_id,
                   COUNT(vh.id) AS hit_count,
                   MAX(vh.created_at) AS latest_hit_at
            FROM rule_catalog rc
            LEFT JOIN violation_hit vh ON vh.rule_catalog_id = rc.id
            GROUP BY rc.rule_id
            """,
            (rs, rowNum) -> new RuleRecentHitCount(
                rs.getString("rule_id"),
                rs.getInt("hit_count"),
                nullableInstant(rs.getTimestamp("latest_hit_at"))
            )
        );
    }

    private void buildPublishGateHits(
        List<TaskPlanItem> tasks,
        Map<Long, List<TimelineBlock>> blocksByTaskId,
        List<RuleHit> hits
    ) {
        for (TaskPlanItem task : tasks) {
            if (STATUS_CANCELLED.equals(task.getStatus())) {
                continue;
            }
            if (STATUS_UNASSIGNED.equals(task.getStatus())) {
                hits.add(taskHit(
                    task,
                    "CREW_ASSIGNMENT_REQUIRED",
                    "BLOCK",
                    "The flight remains unassigned. Save a draft assignment before publishing.",
                    "ASSIGNMENT_DRAWER"
                ));
                continue;
            }
            if (STATUS_VALIDATION_FAILED.equals(task.getStatus()) || STATUS_BLOCKED.equals(task.getStatus())) {
                hits.add(taskHit(
                    task,
                    "TASK_STATUS_BLOCKED",
                    "BLOCK",
                    "Fix the assignment or resolve the rule hit, then run validation again.",
                    "STATUS_REPAIR"
                ));
                continue;
            }
            if (CREW_PAIR_STATUSES.contains(task.getStatus()) && !hasRequiredCrewPair(blocksByTaskId.getOrDefault(task.getId(), List.of()))) {
                hits.add(taskHit(
                    task,
                    "CREW_PAIR_REQUIRED",
                    "BLOCK",
                    "Assigned flights must have both PIC and FO timeline blocks.",
                    "ASSIGNMENT_DRAWER"
                ));
                continue;
            }
            if (STATUS_NEEDS_REVIEW.equals(task.getStatus()) || STATUS_WARNING.equals(task.getStatus())) {
                hits.add(taskHit(
                    task,
                    "MANAGER_REVIEW_REQUIRED",
                    "WARNING",
                    "This flight requires manager confirmation or an exception flow before publishing.",
                    "REVIEW"
                ));
            }
        }
    }

    private void buildCrewTimeConflictHits(
        List<TimelineBlock> blocks,
        Map<Long, TaskPlanItem> tasksById,
        List<RuleHit> hits
    ) {
        Map<Long, List<TimelineBlock>> blocksByCrewId = blocks.stream()
            .filter(block -> block.getCrewMemberId() != null)
            .filter(block -> !STATUS_CANCELLED.equals(block.getStatus()))
            .collect(Collectors.groupingBy(TimelineBlock::getCrewMemberId));

        for (Map.Entry<Long, List<TimelineBlock>> entry : blocksByCrewId.entrySet()) {
            List<TimelineBlock> crewBlocks = entry.getValue().stream()
                .sorted(Comparator.comparing(TimelineBlock::getStartUtc).thenComparing(TimelineBlock::getId))
                .toList();
            for (int leftIndex = 0; leftIndex < crewBlocks.size(); leftIndex += 1) {
                TimelineBlock left = crewBlocks.get(leftIndex);
                for (int rightIndex = leftIndex + 1; rightIndex < crewBlocks.size(); rightIndex += 1) {
                    TimelineBlock right = crewBlocks.get(rightIndex);
                    if (!overlaps(left, right)) {
                        break;
                    }
                    TaskPlanItem rightTask = task(right, tasksById);
                    String ruleId = hasFlightStatusConflict(left, right) ? "CREW_STATUS_CONFLICT" : "CREW_TIME_OVERLAP";
                    String message = "Crew member has overlapping timeline blocks: " + left.getDisplayLabel() + " / " + right.getDisplayLabel();
                    hits.add(new RuleHit(
                        ruleId,
                        "BLOCK",
                        "TIMELINE_BLOCK",
                        right.getId(),
                        entry.getKey(),
                        right.getTaskPlanItemId(),
                        right.getId(),
                        max(left.getStartUtc(), right.getStartUtc()),
                        min(left.getEndUtc(), right.getEndUtc()),
                        route(rightTask),
                        taskCode(rightTask, right),
                        message,
                        "REVIEW"
                    ));
                }
            }
        }
    }

    private void buildPhase3FoundationHits(
        List<TaskPlanItem> tasks,
        List<TimelineBlock> blocks,
        Map<Long, List<TimelineBlock>> blocksByTaskId,
        Map<Long, TaskPlanItem> tasksById,
        List<RuleHit> hits
    ) {
        for (TaskPlanItem task : tasks) {
            if (STATUS_CANCELLED.equals(task.getStatus())) {
                continue;
            }
            if (!task.getScheduledEndUtc().isAfter(task.getScheduledStartUtc())) {
                hits.add(taskHit(
                    task,
                    "RG-TIME-008",
                    "NON_COMPLIANT",
                    "Task end time must be later than start time.",
                    "FIX_TASK_TIME"
                ));
            }
            if (BLOCK_FLIGHT.equals(task.getTaskType())) {
                if (task.getSectorCount() == null || task.getSectorCount() <= 0) {
                    hits.add(taskHit(
                        task,
                        "RG-FDP-003",
                        "BLOCK",
                        "Flight sector count is missing, so FDP cannot be calculated.",
                        "FIX_FLIGHT_PLAN"
                    ));
                }
                long assignedCrewCount = blocksByTaskId.getOrDefault(task.getId(), List.of()).stream()
                    .filter(block -> BLOCK_FLIGHT.equals(block.getBlockType()))
                    .filter(block -> block.getCrewMemberId() != null)
                    .map(TimelineBlock::getCrewMemberId)
                    .distinct()
                    .count();
                if (Duration.between(task.getScheduledStartUtc(), task.getScheduledEndUtc()).toMinutes() > 9 * 60L
                    && assignedCrewCount <= 2) {
                    hits.add(taskHit(
                        task,
                        "RG-FDP-007",
                        "BLOCK",
                        "Two-pilot flight is planned longer than 9 hours and requires augmentation.",
                        "ADD_RELIEF_CREW"
                    ));
                }
            }
        }

        for (TimelineBlock block : blocks) {
            TaskPlanItem task = task(block, tasksById);
            if (!block.getEndUtc().isAfter(block.getStartUtc())) {
                hits.add(blockHit(
                    block,
                    task,
                    "RG-TIME-008",
                    "NON_COMPLIANT",
                    "Timeline block end time must be later than start time.",
                    "FIX_TIMELINE_BLOCK"
                ));
            }
            if (BLOCK_DDO.equals(block.getBlockType())
                && Duration.between(block.getStartUtc(), block.getEndUtc()).toMinutes() < 34 * 60L) {
                hits.add(blockHit(
                    block,
                    task,
                    "RG-BASE-008",
                    "NON_COMPLIANT",
                    "Planned DDO is shorter than 34 hours. Local-night validation will be added in the full Phase 3 engine.",
                    "EXTEND_DDO"
                ));
            }
            if (BLOCK_STANDBY.equals(block.getBlockType())
                && Duration.between(block.getStartUtc(), block.getEndUtc()).toMinutes() > 12 * 60L) {
                hits.add(blockHit(
                    block,
                    task,
                    "RG-STBY-002",
                    "NON_COMPLIANT",
                    "Standby block exceeds 12 hours.",
                    "SHORTEN_STANDBY"
                ));
            }
        }
    }

    private boolean hasRequiredCrewPair(List<TimelineBlock> blocks) {
        boolean hasPic = blocks.stream()
            .filter(block -> BLOCK_FLIGHT.equals(block.getBlockType()))
            .anyMatch(block -> ROLE_PIC.equals(block.getAssignmentRole()));
        boolean hasFo = blocks.stream()
            .filter(block -> BLOCK_FLIGHT.equals(block.getBlockType()))
            .anyMatch(block -> ROLE_FO.equals(block.getAssignmentRole()));
        return hasPic && hasFo;
    }

    private boolean overlaps(TimelineBlock left, TimelineBlock right) {
        return left.getStartUtc().isBefore(right.getEndUtc()) && right.getStartUtc().isBefore(left.getEndUtc());
    }

    private boolean hasFlightStatusConflict(TimelineBlock left, TimelineBlock right) {
        return (BLOCK_FLIGHT.equals(left.getBlockType()) && DUTY_CONFLICT_BLOCK_TYPES.contains(right.getBlockType()))
            || (BLOCK_FLIGHT.equals(right.getBlockType()) && DUTY_CONFLICT_BLOCK_TYPES.contains(left.getBlockType()));
    }

    private RuleHit taskHit(
        TaskPlanItem task,
        String ruleId,
        String severity,
        String message,
        String recommendedAction
    ) {
        return new RuleHit(
            ruleId,
            severity,
            "TASK",
            task.getId(),
            null,
            task.getId(),
            null,
            task.getScheduledStartUtc(),
            task.getScheduledEndUtc(),
            route(task),
            task.getTaskCode(),
            message,
            recommendedAction
        );
    }

    private RuleHit blockHit(
        TimelineBlock block,
        TaskPlanItem task,
        String ruleId,
        String severity,
        String message,
        String recommendedAction
    ) {
        return new RuleHit(
            ruleId,
            severity,
            "TIMELINE_BLOCK",
            block.getId(),
            block.getCrewMemberId(),
            block.getTaskPlanItemId(),
            block.getId(),
            block.getStartUtc(),
            block.getEndUtc(),
            route(task),
            taskCode(task, block),
            message,
            recommendedAction
        );
    }

    private void insertHit(Long rosterVersionId, Long ruleCatalogId, RuleHit hit) {
        jdbcTemplate.update(
            """
            INSERT INTO violation_hit (
              roster_version_id,
              timeline_block_id,
              rule_catalog_id,
              severity,
              status,
              target_type,
              target_id,
              crew_id,
              task_id,
              evidence_window_start_utc,
              evidence_window_end_utc,
              message,
              recommended_action,
              evidence_json
            )
            VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rosterVersionId,
            hit.timelineBlockId(),
            ruleCatalogId,
            hit.severity(),
            hit.targetType(),
            hit.targetId(),
            hit.crewId(),
            hit.taskId(),
            timestampOrNull(hit.evidenceWindowStartUtc()),
            timestampOrNull(hit.evidenceWindowEndUtc()),
            hit.message(),
            hit.recommendedAction(),
            hit.ruleId().startsWith("RG-") ? "{\"phase\":\"PHASE_3\"}" : "{\"phase\":\"PHASE_2\"}"
        );
    }

    private List<RuleHitIssue> readIssues(Long rosterVersionId) {
        return jdbcTemplate.query(
            """
            SELECT vh.id,
                   vh.task_id,
                   vh.crew_id,
                   vh.timeline_block_id,
                   vh.target_type,
                   vh.target_id,
                   vh.evidence_window_start_utc,
                   vh.evidence_window_end_utc,
                   vh.severity,
                   vh.status,
                   vh.message,
                   vh.recommended_action,
                   rc.rule_id,
                   rc.title_zh,
                   rc.title_en,
                   rc.rule_category,
                   rc.source_section,
                   rc.source_clause,
                   rc.source_page,
                   tpi.task_code,
                   tpi.departure_airport,
                   tpi.arrival_airport
            FROM violation_hit vh
            JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
            LEFT JOIN task_plan_item tpi ON tpi.id = vh.task_id
            WHERE vh.roster_version_id = ?
            ORDER BY CASE vh.severity WHEN 'BLOCK' THEN 0 WHEN 'NON_COMPLIANT' THEN 0 WHEN 'WARNING' THEN 1 ELSE 2 END,
                     vh.evidence_window_start_utc,
                     vh.id
            """,
            (rs, rowNum) -> new RuleHitIssue(
                rs.getLong("id"),
                nullableLong(rs.getObject("task_id")),
                nullableLong(rs.getObject("crew_id")),
                nullableLong(rs.getObject("timeline_block_id")),
                rs.getString("target_type"),
                nullableLong(rs.getObject("target_id")),
                nullableInstant(rs.getTimestamp("evidence_window_start_utc")),
                nullableInstant(rs.getTimestamp("evidence_window_end_utc")),
                normalizeSeverity(rs.getString("severity")),
                rs.getString("status"),
                rs.getString("rule_id"),
                rs.getString("title_zh"),
                rs.getString("title_en"),
                rs.getString("rule_category"),
                rs.getString("source_section"),
                rs.getString("source_clause"),
                rs.getInt("source_page"),
                rs.getString("message"),
                rs.getString("recommended_action"),
                rs.getString("task_code"),
                route(rs.getString("departure_airport"), rs.getString("arrival_airport"))
            ),
            rosterVersionId
        );
    }

    private Map<String, Long> ruleIdsByRuleId() {
        Map<String, Long> ids = new HashMap<>();
        jdbcTemplate.query(
            "SELECT id, rule_id FROM rule_catalog WHERE active_flag = TRUE",
            (RowCallbackHandler) rs -> ids.put(rs.getString("rule_id"), rs.getLong("id"))
        );
        return ids;
    }

    private DraftRoster latestRoster() {
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

    private TaskPlanItem task(TimelineBlock block, Map<Long, TaskPlanItem> tasksById) {
        return block.getTaskPlanItemId() == null ? null : tasksById.get(block.getTaskPlanItemId());
    }

    private String taskCode(TaskPlanItem task, TimelineBlock block) {
        return task == null ? block.getDisplayLabel() : task.getTaskCode();
    }

    private String route(TaskPlanItem task) {
        return task == null ? "" : route(task.getDepartureAirport(), task.getArrivalAirport());
    }

    private String route(String departureAirport, String arrivalAirport) {
        if (departureAirport == null || arrivalAirport == null) {
            return "";
        }
        return departureAirport + "-" + arrivalAirport;
    }

    private Instant min(Instant left, Instant right) {
        return left.isBefore(right) ? left : right;
    }

    private Instant max(Instant left, Instant right) {
        return left.isAfter(right) ? left : right;
    }

    private String normalizeSeverity(String severity) {
        if ("NON_COMPLIANT".equals(severity)) {
            return "BLOCK";
        }
        return severity;
    }

    private static Long nullableLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(value.toString());
    }

    private static Instant nullableInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static Timestamp timestampOrNull(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    public record RuleEvaluationResult(
        Long rosterVersionId,
        String rosterVersionNo,
        String rosterVersionStatus,
        List<RuleHitIssue> issues
    ) {
    }

    public record RuleHitIssue(
        Long hitId,
        Long taskId,
        Long crewId,
        Long timelineBlockId,
        String targetType,
        Long targetId,
        Instant evidenceWindowStartUtc,
        Instant evidenceWindowEndUtc,
        String severity,
        String status,
        String ruleId,
        String ruleTitleZh,
        String ruleTitleEn,
        String ruleCategory,
        String sourceSection,
        String sourceClause,
        Integer sourcePage,
        String message,
        String recommendedAction,
        String taskCode,
        String route
    ) {
    }

    public record RuleRecentHitCount(
        String ruleId,
        int hitCount,
        Instant latestHitAtUtc
    ) {
    }

    private record RuleHit(
        String ruleId,
        String severity,
        String targetType,
        Long targetId,
        Long crewId,
        Long taskId,
        Long timelineBlockId,
        Instant evidenceWindowStartUtc,
        Instant evidenceWindowEndUtc,
        String route,
        String taskCode,
        String message,
        String recommendedAction
    ) {
    }

    private record DraftRoster(Long id, String versionNo, String status) {
    }
}
