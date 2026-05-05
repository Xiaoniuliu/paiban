package com.pilotroster.rule;

import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
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

    private static final String STATUS_ASSIGNED_DRAFT = "ASSIGNED_DRAFT";
    private static final String STATUS_ASSIGNED = "ASSIGNED";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String BLOCK_FLIGHT = "FLIGHT";
    private static final String BLOCK_DDO = "DDO";
    private static final String BLOCK_STANDBY = "STANDBY";
    private static final ZoneOffset ROSTER_LOCAL_ZONE = ZoneOffset.ofHours(8);
    private static final LocalTime LOCAL_NIGHT_START = LocalTime.of(22, 0);
    private static final LocalTime LOCAL_NIGHT_END = LocalTime.of(8, 0);
    private static final LocalTime NIGHT_FDP_START = LocalTime.of(2, 0);
    private static final LocalTime NIGHT_FDP_END = LocalTime.of(6, 0);

    private static final Set<String> EVALUATOR_MANAGED_RULE_IDS = Set.of(
        "RG-BASE-001",
        "RG-BASE-002",
        "RG-BASE-003",
        "RG-BASE-008",
        "RG-DDO-001",
        "RG-DDO-002",
        "RG-DDO-003",
        "RG-FDP-006",
        "RG-FDP-008",
        "RG-FDP-007",
        "RG-HOUR-001",
        "RG-HOUR-002",
        "RG-HOUR-003",
        "RG-HOUR-006",
        "RG-HOUR-007",
        "RG-REST-004",
        "RG-REST-008"
    );

    private final JdbcTemplate jdbcTemplate;
    private final TaskPlanItemRepository taskPlanItemRepository;
    private final TimelineBlockRepository timelineBlockRepository;
    private final RuleDerivedFactService ruleDerivedFactService;

    public RuleEvaluationService(
        JdbcTemplate jdbcTemplate,
        TaskPlanItemRepository taskPlanItemRepository,
        TimelineBlockRepository timelineBlockRepository,
        RuleDerivedFactService ruleDerivedFactService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.timelineBlockRepository = timelineBlockRepository;
        this.ruleDerivedFactService = ruleDerivedFactService;
    }

    @Transactional
    public RuleEvaluationResult evaluateLatestRoster() {
        DraftRoster roster = latestRoster();
        List<TimelineBlock> blocks = timelineBlockRepository.findAllByRosterVersionIdOrderByStartUtcAsc(roster.id());
        List<TimelineBlock> statusActiveBlocks = blocks.stream()
            .filter(block -> !STATUS_CANCELLED.equals(block.getStatus()))
            .toList();
        Set<Long> latestRosterTaskIds = statusActiveBlocks.stream()
            .map(TimelineBlock::getTaskPlanItemId)
            .filter(taskId -> taskId != null)
            .collect(Collectors.toSet());
        List<TaskPlanItem> tasks = taskPlanItemRepository.findAllById(latestRosterTaskIds).stream()
            .sorted(Comparator.comparing(TaskPlanItem::getScheduledStartUtc).thenComparing(TaskPlanItem::getId))
            .toList();
        Map<Long, TaskPlanItem> tasksById = tasks.stream().collect(Collectors.toMap(TaskPlanItem::getId, task -> task));
        List<TimelineBlock> activeBlocks = statusActiveBlocks.stream()
            .filter(block -> isBlockTaskActive(block, tasksById))
            .toList();
        Map<Long, List<TimelineBlock>> blocksByTaskId = activeBlocks.stream()
            .filter(block -> block.getTaskPlanItemId() != null)
            .collect(Collectors.groupingBy(TimelineBlock::getTaskPlanItemId));
        Set<Long> latestRosterCrewIds = activeBlocks.stream()
            .map(TimelineBlock::getCrewMemberId)
            .filter(crewId -> crewId != null)
            .collect(Collectors.toSet());
        Set<Long> activeDdoBlockIds = activeBlocks.stream()
            .filter(block -> BLOCK_DDO.equals(block.getBlockType()))
            .map(TimelineBlock::getId)
            .collect(Collectors.toSet());
        RuleDerivedFacts rosterFacts = ruleDerivedFactService.buildLatestRosterFacts(roster.id());

        List<RuleHit> hits = new ArrayList<>();
        buildPhase3FoundationHits(tasks, activeBlocks, blocksByTaskId, tasksById, rosterFacts.ddoFactsByBlockId(), hits);
        buildCrewHourLimitHits(
            scopedCrewHourFacts(
                rosterFacts.crewHourFactsByCrewId(),
                latestRosterCrewIds
            ),
            hits
        );
        buildDdoSequenceHits(
            scopedCrewDaySequenceFacts(rosterFacts.crewDaySequenceFactsByCrewId(), latestRosterCrewIds),
            scopedDdoSequenceFacts(rosterFacts.ddoSequenceFactsByCrewId(), latestRosterCrewIds),
            scopedDdoFacts(rosterFacts.ddoFactsByBlockId(), activeDdoBlockIds, latestRosterCrewIds),
            hits
        );
        buildFdpRestHits(scopedFdpRestFacts(rosterFacts.fdpRestFacts(), latestRosterTaskIds, latestRosterCrewIds), activeBlocks, hits);

        Map<String, Long> ruleIdsByRuleId = ruleIdsByRuleId();
        Set<Long> managedRuleCatalogIds = new HashSet<>(ruleIdsByRuleId.values());
        Set<Long> activeHitIds = new HashSet<>();
        hits.stream()
            .filter(hit -> ruleIdsByRuleId.containsKey(hit.ruleId()))
            .forEach(hit -> {
                Long hitId = upsertHit(roster.id(), ruleIdsByRuleId.get(hit.ruleId()), hit);
                if (hitId != null) {
                    activeHitIds.add(hitId);
                }
            });
        closeStaleHits(roster.id(), managedRuleCatalogIds, activeHitIds);

        List<RuleHitIssue> issues = readIssues(roster.id());
        return new RuleEvaluationResult(roster.id(), roster.versionNo(), roster.status(), issues);
    }

    @Transactional(readOnly = true)
    public RuleEvaluationResult readLatestRosterSnapshot() {
        DraftRoster roster = latestRoster();
        return new RuleEvaluationResult(roster.id(), roster.versionNo(), roster.status(), readIssues(roster.id()));
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
              AND vh.status <> 'CLOSED'
              AND vh.roster_version_id = (
                  SELECT rv.id
                  FROM roster_version rv
                  ORDER BY rv.id DESC
                  LIMIT 1
              )
              AND rc.active_flag = TRUE
              AND rc.catalog_entry_type = 'EVALUATION_RULE'
              AND (rc.severity_default = 'P0'
                   OR rc.severity_default LIKE 'P0 %'
                   OR rc.severity_default = 'BLOCK')
            GROUP BY rc.rule_id
            """,
            (rs, rowNum) -> new RuleRecentHitCount(
                rs.getString("rule_id"),
                rs.getInt("hit_count"),
                nullableInstant(rs.getTimestamp("latest_hit_at"))
            )
        );
    }

    private void buildPhase3FoundationHits(
        List<TaskPlanItem> tasks,
        List<TimelineBlock> blocks,
        Map<Long, List<TimelineBlock>> blocksByTaskId,
        Map<Long, TaskPlanItem> tasksById,
        Map<Long, RuleDerivedFacts.DdoFact> ddoFactsByBlockId,
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
                List<TimelineBlock> flightCrewBlocks = blocksByTaskId.getOrDefault(task.getId(), List.of()).stream()
                    .filter(block -> BLOCK_FLIGHT.equals(block.getBlockType()))
                    .filter(block -> block.getCrewMemberId() != null)
                    .toList();
                boolean hasReliefCrew = flightCrewBlocks.stream()
                    .map(this::assignmentRole)
                    .anyMatch("RELIEF"::equals);
                boolean hasBasicTwoPilotCrew = flightCrewBlocks.stream().map(this::assignmentRole).anyMatch("PIC"::equals)
                    && flightCrewBlocks.stream().map(this::assignmentRole).anyMatch("FO"::equals);
                long fdpMinutes = Duration.between(task.getScheduledStartUtc(), task.getScheduledEndUtc()).toMinutes();
                if (hasBasicTwoPilotCrew
                    && !hasReliefCrew
                    && (fdpMinutes > 9 * 60L || (fdpMinutes > 8 * 60L && touchesNightFdp(task)))) {
                    hits.add(taskHit(
                        task,
                        "RG-FDP-007",
                        "BLOCK",
                        "Two-pilot flight exceeds the augmentation threshold for planned FDP.",
                        "ADD_RELIEF_CREW"
                    ));
                }
            }
        }

        for (TimelineBlock block : blocks) {
            TaskPlanItem task = task(block, tasksById);
            if (task != null && STATUS_CANCELLED.equals(task.getStatus())) {
                continue;
            }
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
            if (BLOCK_DDO.equals(block.getBlockType()) && invalidDdo(block, ddoFactsByBlockId.get(block.getId()))) {
                hits.add(ddoHit(block, task, ddoFactsByBlockId.get(block.getId())));
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

    private boolean invalidDdo(TimelineBlock block, RuleDerivedFacts.DdoFact ddoFact) {
        if (ddoFact != null) {
            return !ddoFact.validDdoUnit();
        }
        long ddoMinutes = Duration.between(block.getStartUtc(), block.getEndUtc()).toMinutes();
        return ddoMinutes < 34 * 60L || localNightCount(block.getStartUtc(), block.getEndUtc()) < 2;
    }

    private String assignmentRole(TimelineBlock block) {
        return block.getAssignmentRole() == null ? "" : block.getAssignmentRole().trim().toUpperCase();
    }

    private int localNightCount(Instant startUtc, Instant endUtc) {
        LocalDate cursor = startUtc.atZone(ROSTER_LOCAL_ZONE).toLocalDate().minusDays(1);
        LocalDate last = endUtc.atZone(ROSTER_LOCAL_ZONE).toLocalDate();
        int count = 0;
        while (!cursor.isAfter(last)) {
            Instant localNightStart = LocalDateTime.of(cursor, LOCAL_NIGHT_START).toInstant(ROSTER_LOCAL_ZONE);
            Instant localNightEnd = LocalDateTime.of(cursor.plusDays(1), LOCAL_NIGHT_END).toInstant(ROSTER_LOCAL_ZONE);
            if (overlapMinutes(startUtc, endUtc, localNightStart, localNightEnd) >= 8 * 60L) {
                count += 1;
            }
            cursor = cursor.plusDays(1);
        }
        return count;
    }

    private boolean touchesNightFdp(TaskPlanItem task) {
        LocalDate cursor = task.getScheduledStartUtc().atZone(ROSTER_LOCAL_ZONE).toLocalDate().minusDays(1);
        LocalDate last = task.getScheduledEndUtc().atZone(ROSTER_LOCAL_ZONE).toLocalDate();
        while (!cursor.isAfter(last)) {
            Instant nightStart = LocalDateTime.of(cursor, NIGHT_FDP_START).toInstant(ROSTER_LOCAL_ZONE);
            Instant nightEnd = LocalDateTime.of(cursor, NIGHT_FDP_END).toInstant(ROSTER_LOCAL_ZONE);
            if (overlapMinutes(task.getScheduledStartUtc(), task.getScheduledEndUtc(), nightStart, nightEnd) > 0) {
                return true;
            }
            cursor = cursor.plusDays(1);
        }
        return false;
    }

    private static long overlapMinutes(Instant start, Instant end, Instant windowStart, Instant windowEnd) {
        Instant overlapStart = start.isAfter(windowStart) ? start : windowStart;
        Instant overlapEnd = end.isBefore(windowEnd) ? end : windowEnd;
        if (!overlapEnd.isAfter(overlapStart)) {
            return 0;
        }
        return Duration.between(overlapStart, overlapEnd).toMinutes();
    }

    private void buildCrewHourLimitHits(
        Map<Long, RuleDerivedFacts.CrewHourFact> crewHourFactsByCrewId,
        List<RuleHit> hits
    ) {
        for (RuleDerivedFacts.CrewHourFact fact : crewHourFactsByCrewId.values()) {
            addCrewHourLimitHit(
                hits,
                fact.crewId(),
                "RG-HOUR-001",
                fact.rolling28dFlightMinutes(),
                6_000,
                fact.rolling28dFlightWindow(),
                "Rolling 28-day flight minutes exceed the 100-hour limit."
            );
            addCrewHourLimitHit(
                hits,
                fact.crewId(),
                "RG-HOUR-002",
                fact.rolling12mToPreviousMonthFlightMinutes(),
                54_000,
                fact.rolling12mToPreviousMonthFlightWindow(),
                "Rolling 12-month flight minutes to previous month exceed the 900-hour limit."
            );
            addCrewHourLimitHit(
                hits,
                fact.crewId(),
                "RG-HOUR-003",
                fact.rolling7dDutyMinutes(),
                3_300,
                fact.rolling7dDutyWindow(),
                "Rolling 7-day duty minutes exceed the 55-hour limit."
            );
            addCrewHourLimitHit(
                hits,
                fact.crewId(),
                "RG-HOUR-006",
                fact.rolling14dDutyMinutes(),
                5_700,
                fact.rolling14dDutyWindow(),
                "Rolling 14-day duty minutes exceed the 95-hour limit."
            );
            addCrewHourLimitHit(
                hits,
                fact.crewId(),
                "RG-HOUR-007",
                fact.rolling28dDutyMinutes(),
                11_400,
                fact.rolling28dDutyWindow(),
                "Rolling 28-day duty minutes exceed the 190-hour limit."
            );
        }
    }

    private void buildDdoSequenceHits(
        Map<Long, RuleDerivedFacts.CrewDaySequenceFact> crewDaySequenceFactsByCrewId,
        Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> ddoSequenceFactsByCrewId,
        Map<Long, RuleDerivedFacts.DdoFact> ddoFactsByBlockId,
        List<RuleHit> hits
    ) {
        for (RuleDerivedFacts.CrewDaySequenceFact fact : crewDaySequenceFactsByCrewId.values()) {
            if (fact.consecutiveDutyDays() > 6) {
                hits.add(ddoCrewSequenceHit(
                    fact,
                    "RG-DDO-001",
                    "Crew cannot exceed six consecutive duty days.",
                    "ADD_DDO"
                ));
            }
        }
        for (RuleDerivedFacts.DdoCrewSequenceFact fact : ddoSequenceFactsByCrewId.values()) {
            if (!fact.rolling14dHasTwoConsecutiveDdo()) {
                hits.add(ddoRollingSequenceHit(
                    fact,
                    "RG-DDO-003",
                    "Any rolling 14-day window must contain at least two consecutive valid DDO units.",
                    "ADD_DDO"
                ));
            }
        }
        for (RuleDerivedFacts.DdoFact fact : ddoFactsByBlockId.values()) {
            if (fact.crewId() != null && fact.consecutiveDutyDaysBefore() == 6 && fact.consecutiveDdoAfter() < 2) {
                hits.add(ddoBlockSequenceHit(
                    fact,
                    "RG-DDO-002",
                    "DDO following a six-duty-day sequence must provide at least two consecutive DDO units.",
                    "ADD_DDO"
                ));
            }
        }
    }

    private Map<Long, RuleDerivedFacts.CrewHourFact> scopedCrewHourFacts(
        Map<Long, RuleDerivedFacts.CrewHourFact> crewHourFactsByCrewId,
        Set<Long> latestRosterCrewIds
    ) {
        return crewHourFactsByCrewId.entrySet()
            .stream()
            .filter(entry -> latestRosterCrewIds.contains(entry.getKey()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private Map<Long, RuleDerivedFacts.CrewDaySequenceFact> scopedCrewDaySequenceFacts(
        Map<Long, RuleDerivedFacts.CrewDaySequenceFact> crewDaySequenceFactsByCrewId,
        Set<Long> latestRosterCrewIds
    ) {
        return crewDaySequenceFactsByCrewId.entrySet()
            .stream()
            .filter(entry -> latestRosterCrewIds.contains(entry.getKey()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> scopedDdoSequenceFacts(
        Map<Long, RuleDerivedFacts.DdoCrewSequenceFact> ddoSequenceFactsByCrewId,
        Set<Long> latestRosterCrewIds
    ) {
        return ddoSequenceFactsByCrewId.entrySet()
            .stream()
            .filter(entry -> latestRosterCrewIds.contains(entry.getKey()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private Map<Long, RuleDerivedFacts.DdoFact> scopedDdoFacts(
        Map<Long, RuleDerivedFacts.DdoFact> ddoFactsByBlockId,
        Set<Long> activeDdoBlockIds,
        Set<Long> latestRosterCrewIds
    ) {
        return ddoFactsByBlockId.entrySet()
            .stream()
            .filter(entry -> activeDdoBlockIds.contains(entry.getKey()))
            .filter(entry -> entry.getValue().crewId() != null)
            .filter(entry -> latestRosterCrewIds.contains(entry.getValue().crewId()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private List<RuleDerivedFacts.FdpRestFact> scopedFdpRestFacts(
        List<RuleDerivedFacts.FdpRestFact> fdpRestFacts,
        Set<Long> latestRosterTaskIds,
        Set<Long> latestRosterCrewIds
    ) {
        return fdpRestFacts.stream()
            .filter(fact -> latestRosterTaskIds.contains(fact.taskId()))
            .filter(fact -> latestRosterCrewIds.contains(fact.crewId()))
            .toList();
    }

    private void buildFdpRestHits(
        List<RuleDerivedFacts.FdpRestFact> fdpRestFacts,
        List<TimelineBlock> activeBlocks,
        List<RuleHit> hits
    ) {
        for (RuleDerivedFacts.FdpRestFact fact : fdpRestFacts) {
            TimelineBlock previousRest = previousRestBlock(fact, activeBlocks);
            if (fact.fdpMinutes() > fact.allowableFdpMinutes()) {
                hits.add(fdpRestHit(
                    fact,
                    "RG-FDP-006",
                    "Single FDP must not exceed the 14-hour P0 limit.",
                    "SHORTEN_FDP",
                    fdpEvidenceJson(fact)
                ));
            }
            if (fact.fdpMinutes() > 18 * 60L && fact.restLocalNights() < 1) {
                hits.add(fdpRestHit(
                    fact,
                    "RG-REST-004",
                    "Duty over 18 hours must be followed by rest containing at least one local night.",
                    "ADD_LOCAL_NIGHT_REST",
                    restLocalNightEvidenceJson(fact)
                ));
            }
            if (fact.precededByReducedRest()) {
                hits.add(fdpRestHit(
                    fact,
                    "RG-FDP-008",
                    "Reduced rest requires explicit special assessment before the following FDP is accepted.",
                    "COMPLETE_SPECIAL_ASSESSMENT",
                    reducedRestAssessmentEvidenceJson(fact, previousRest)
                ));
            }
            if (fact.precededByReducedRest() && fact.extendedFdp() && fact.followingRestReduced()) {
                hits.add(fdpRestHit(
                    fact,
                    "RG-REST-008",
                    "Reduced rest cannot be chained after an extended FDP when the following rest is also reduced.",
                    "BREAK_REDUCED_REST_CHAIN",
                    reducedRestChainEvidenceJson(fact, previousRest)
                ));
            }
        }
    }

    private TimelineBlock previousRestBlock(RuleDerivedFacts.FdpRestFact fact, List<TimelineBlock> activeBlocks) {
        List<TimelineBlock> precedingCrewBlocks = activeBlocks.stream()
            .filter(block -> java.util.Objects.equals(block.getCrewMemberId(), fact.crewId()))
            .filter(block -> block.getEndUtc().compareTo(fact.fdpStartUtc()) <= 0)
            .toList();
        for (int index = precedingCrewBlocks.size() - 1; index >= 0; index -= 1) {
            TimelineBlock block = precedingCrewBlocks.get(index);
            if ("REST".equals(block.getBlockType())) {
                return block;
            }
            if (isDutyProducingBlockType(block.getBlockType())) {
                return null;
            }
        }
        return null;
    }

    private boolean isDutyProducingBlockType(String blockType) {
        return switch (blockType) {
            case "FLIGHT", "DUTY", "TRAINING", "STANDBY" -> true;
            default -> false;
        };
    }

    private void addCrewHourLimitHit(
        List<RuleHit> hits,
        Long crewId,
        String ruleId,
        long actualMinutes,
        long limitMinutes,
        RuleDerivedFacts.CrewHourWindow window,
        String message
    ) {
        if (actualMinutes <= limitMinutes) {
            return;
        }
        hits.add(new RuleHit(
            ruleId,
            "BLOCK",
            "CREW",
            crewId,
            crewId,
            null,
            null,
            window.startUtc(),
            window.endUtc(),
            "",
            "",
            message + " Actual " + actualMinutes + " minutes, limit " + limitMinutes + " minutes.",
            "ADJUST_CREW_HOURS",
            hourEvidenceJson(ruleId, crewId, window, limitMinutes)
        ));
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

    private RuleHit ddoHit(TimelineBlock block, TaskPlanItem task, RuleDerivedFacts.DdoFact fact) {
        return new RuleHit(
            "RG-BASE-008",
            "NON_COMPLIANT",
            "TIMELINE_BLOCK",
            block.getId(),
            block.getCrewMemberId(),
            block.getTaskPlanItemId(),
            block.getId(),
            block.getStartUtc(),
            block.getEndUtc(),
            route(task),
            taskCode(task, block),
            "Planned DDO must be at least 34 hours and contain two local nights.",
            "EXTEND_DDO",
            ddoEvidenceJson(block, fact)
        );
    }

    private RuleHit ddoCrewSequenceHit(
        RuleDerivedFacts.CrewDaySequenceFact fact,
        String ruleId,
        String message,
        String recommendedAction
    ) {
        return new RuleHit(
            ruleId,
            "BLOCK",
            "CREW",
            fact.crewId(),
            fact.crewId(),
            null,
            null,
            startOfLocalDateUtc(fact.startLocalDate()),
            endOfLocalDateUtc(fact.endLocalDate()),
            "",
            "",
            message,
            recommendedAction,
            ddoCrewSequenceEvidenceJson(ruleId, fact)
        );
    }

    private RuleHit ddoBlockSequenceHit(
        RuleDerivedFacts.DdoFact fact,
        String ruleId,
        String message,
        String recommendedAction
    ) {
        return new RuleHit(
            ruleId,
            "BLOCK",
            "TIMELINE_BLOCK",
            fact.timelineBlockId(),
            fact.crewId(),
            null,
            fact.timelineBlockId(),
            fact.baseDdoStartUtc(),
            fact.baseDdoEndUtc(),
            "",
            "",
            message,
            recommendedAction,
            ddoBlockSequenceEvidenceJson(ruleId, fact)
        );
    }

    private RuleHit ddoRollingSequenceHit(
        RuleDerivedFacts.DdoCrewSequenceFact fact,
        String ruleId,
        String message,
        String recommendedAction
    ) {
        return new RuleHit(
            ruleId,
            "BLOCK",
            "CREW",
            fact.crewId(),
            fact.crewId(),
            null,
            null,
            fact.windowStartUtc(),
            fact.windowEndUtc(),
            "",
            "",
            message,
            recommendedAction,
            ddoRollingSequenceEvidenceJson(ruleId, fact)
        );
    }

    private RuleHit fdpRestHit(
        RuleDerivedFacts.FdpRestFact fact,
        String ruleId,
        String message,
        String recommendedAction,
        String evidenceJson
    ) {
        return new RuleHit(
            ruleId,
            "BLOCK",
            "TASK",
            fact.taskId(),
            fact.crewId(),
            fact.taskId(),
            null,
            fact.fdpStartUtc(),
            fact.fdpEndUtc(),
            "",
            "",
            message,
            recommendedAction,
            evidenceJson
        );
    }

    private Long upsertHit(Long rosterVersionId, Long ruleCatalogId, RuleHit hit) {
        Long existingHitId = findExistingHitId(rosterVersionId, ruleCatalogId, hit);
        if (existingHitId != null) {
            updateHit(existingHitId, hit);
            return existingHitId;
        }
        insertHit(rosterVersionId, ruleCatalogId, hit);
        return findExistingHitId(rosterVersionId, ruleCatalogId, hit);
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
            hit.evidenceJson()
        );
    }

    private Long findExistingHitId(Long rosterVersionId, Long ruleCatalogId, RuleHit hit) {
        List<Long> hitIds = jdbcTemplate.query(
            """
            SELECT id
            FROM violation_hit
            WHERE roster_version_id = ?
              AND rule_catalog_id = ?
              AND target_type = ?
              AND COALESCE(target_id, -1) = COALESCE(?, -1)
              AND COALESCE(crew_id, -1) = COALESCE(?, -1)
              AND COALESCE(task_id, -1) = COALESCE(?, -1)
              AND COALESCE(timeline_block_id, -1) = COALESCE(?, -1)
            ORDER BY id
            LIMIT 1
            """,
            (rs, rowNum) -> rs.getLong("id"),
            rosterVersionId,
            ruleCatalogId,
            hit.targetType(),
            hit.targetId(),
            hit.crewId(),
            hit.taskId(),
            hit.timelineBlockId()
        );
        return hitIds.isEmpty() ? null : hitIds.get(0);
    }

    private void updateHit(Long hitId, RuleHit hit) {
        jdbcTemplate.update(
            """
            UPDATE violation_hit
            SET timeline_block_id = ?,
                severity = ?,
                status = CASE WHEN status = 'CLOSED' THEN 'OPEN' ELSE status END,
                target_type = ?,
                target_id = ?,
                crew_id = ?,
                task_id = ?,
                evidence_window_start_utc = ?,
                evidence_window_end_utc = ?,
                message = ?,
                recommended_action = ?,
                evidence_json = ?
            WHERE id = ?
            """,
            hit.timelineBlockId(),
            hit.severity(),
            hit.targetType(),
            hit.targetId(),
            hit.crewId(),
            hit.taskId(),
            timestampOrNull(hit.evidenceWindowStartUtc()),
            timestampOrNull(hit.evidenceWindowEndUtc()),
            hit.message(),
            hit.recommendedAction(),
            hit.evidenceJson(),
            hitId
        );
    }

    private void closeStaleHits(Long rosterVersionId, Set<Long> managedRuleCatalogIds, Set<Long> activeHitIds) {
        if (managedRuleCatalogIds.isEmpty()) {
            return;
        }
        String managedRulePlaceholders = managedRuleCatalogIds.stream()
            .map(id -> "?")
            .collect(Collectors.joining(", "));
        if (activeHitIds.isEmpty()) {
            List<Object> params = new ArrayList<>();
            params.add(rosterVersionId);
            params.addAll(managedRuleCatalogIds);
            jdbcTemplate.update(
                "UPDATE violation_hit SET status = 'CLOSED' WHERE roster_version_id = ? AND status <> 'CLOSED' "
                    + "AND rule_catalog_id IN (" + managedRulePlaceholders + ")",
                params.toArray()
            );
            return;
        }
        String activeHitPlaceholders = activeHitIds.stream()
            .map(id -> "?")
            .collect(Collectors.joining(", "));
        List<Object> params = new ArrayList<>();
        params.add(rosterVersionId);
        params.addAll(managedRuleCatalogIds);
        params.addAll(activeHitIds);
        jdbcTemplate.update(
            "UPDATE violation_hit SET status = 'CLOSED' WHERE roster_version_id = ? AND status <> 'CLOSED' "
                + "AND rule_catalog_id IN (" + managedRulePlaceholders + ") "
                + "AND id NOT IN (" + activeHitPlaceholders + ")",
            params.toArray()
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
                   vh.evidence_json,
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
               AND vh.status <> 'CLOSED'
               AND rc.active_flag = TRUE
               AND rc.catalog_entry_type = 'EVALUATION_RULE'
               AND (rc.severity_default = 'P0'
                    OR rc.severity_default LIKE 'P0 %'
                    OR rc.severity_default = 'BLOCK')
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
                rs.getString("evidence_json"),
                rs.getString("task_code"),
                route(rs.getString("departure_airport"), rs.getString("arrival_airport"))
            ),
            rosterVersionId
        );
    }

    private Map<String, Long> ruleIdsByRuleId() {
        Map<String, Long> ids = new HashMap<>();
        jdbcTemplate.query(
            """
            SELECT id, rule_id
            FROM rule_catalog
            WHERE active_flag = TRUE
              AND catalog_entry_type = 'EVALUATION_RULE'
              AND (severity_default = 'P0'
                   OR severity_default LIKE 'P0 %'
                   OR severity_default = 'BLOCK')
            """,
            (RowCallbackHandler) rs -> ids.put(rs.getString("rule_id"), rs.getLong("id"))
        );
        return ids.entrySet()
            .stream()
            .filter(entry -> EVALUATOR_MANAGED_RULE_IDS.contains(entry.getKey()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
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

    private boolean isBlockTaskActive(TimelineBlock block, Map<Long, TaskPlanItem> tasksById) {
        TaskPlanItem task = task(block, tasksById);
        return task == null || !STATUS_CANCELLED.equals(task.getStatus());
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

    private static Instant startOfLocalDateUtc(LocalDate localDate) {
        return localDate == null ? null : localDate.atStartOfDay().toInstant(ROSTER_LOCAL_ZONE);
    }

    private static Instant endOfLocalDateUtc(LocalDate localDate) {
        return localDate == null ? null : localDate.plusDays(1).atStartOfDay().toInstant(ROSTER_LOCAL_ZONE);
    }

    private static String defaultEvidenceJson(String ruleId) {
        return ruleId.startsWith("RG-") ? "{\"phase\":\"PHASE_3\"}" : "{\"phase\":\"PHASE_2\"}";
    }

    private static String hourEvidenceJson(
        String ruleId,
        Long crewId,
        RuleDerivedFacts.CrewHourWindow window,
        long limitMinutes
    ) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"" + json(ruleId) + "\","
            + "\"crewId\":" + crewId + ","
            + "\"window\":{\"startUtc\":" + jsonInstant(window.startUtc())
            + ",\"endUtc\":" + jsonInstant(window.endUtc()) + "},"
            + "\"actual\":{\"minutes\":" + window.actualMinutes() + "},"
            + "\"limit\":{\"minutes\":" + limitMinutes + "},"
            + "\"source\":\"" + json(window.source()) + "\","
            + "\"contributors\":" + contributorJson(window.contributors()) + ","
            + "\"operator\":\">\"}";
    }

    private String ddoEvidenceJson(TimelineBlock block, RuleDerivedFacts.DdoFact fact) {
        long ddoMinutes = fact == null ? Duration.between(block.getStartUtc(), block.getEndUtc()).toMinutes() : fact.ddoMinutes();
        int localNights = fact == null ? localNightCount(block.getStartUtc(), block.getEndUtc()) : fact.localNights();
        boolean validDdoUnit = fact != null && fact.validDdoUnit();
        int consecutiveDdoAfter = fact == null ? 0 : fact.consecutiveDdoAfter();
        Instant baseDdoStartUtc = fact == null ? null : fact.baseDdoStartUtc();
        Instant baseDdoEndUtc = fact == null ? null : fact.baseDdoEndUtc();
        List<RuleDerivedFacts.CrewHourContributor> contributors = fact == null ? List.of() : fact.localNightContributors();
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"RG-BASE-008\","
            + "\"predicate\":\"ddoMinutes >= 2040 && localNights >= 2 && validDdoUnit == true\","
            + "\"actual\":{\"ddoMinutes\":" + ddoMinutes
            + ",\"localNights\":" + localNights
            + ",\"validDdoUnit\":" + validDdoUnit
            + ",\"consecutiveDdoAfter\":" + consecutiveDdoAfter + "},"
            + "\"limit\":{\"ddoMinutes\":2040,\"localNights\":2},"
            + "\"ddoWindow\":{\"startUtc\":" + jsonInstant(block.getStartUtc())
            + ",\"endUtc\":" + jsonInstant(block.getEndUtc()) + "},"
            + "\"baseDdoStartUtc\":" + jsonInstant(baseDdoStartUtc) + ","
            + "\"baseDdoEndUtc\":" + jsonInstant(baseDdoEndUtc) + ","
            + "\"ddoMinutes\":" + ddoMinutes + ","
            + "\"localNights\":" + localNights + ","
            + "\"validDdoUnit\":" + validDdoUnit + ","
            + "\"consecutiveDdoAfter\":" + consecutiveDdoAfter + ","
            + "\"localNightContributors\":" + contributorJson(contributors) + "}";
    }

    private static String ddoCrewSequenceEvidenceJson(String ruleId, RuleDerivedFacts.CrewDaySequenceFact fact) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"" + json(ruleId) + "\","
            + "\"predicate\":\"consecutiveDutyDays <= 6\","
            + "\"crewId\":" + fact.crewId() + ","
            + "\"consecutiveDutyDays\":" + fact.consecutiveDutyDays() + ","
            + "\"limit\":{\"consecutiveDutyDays\":6},"
            + "\"sequence\":{\"startLocalDate\":" + jsonLocalDate(fact.startLocalDate())
            + ",\"endLocalDate\":" + jsonLocalDate(fact.endLocalDate()) + "},"
            + "\"dutyLocalDates\":" + localDateArrayJson(fact.dutyLocalDates()) + "}";
    }

    private static String ddoBlockSequenceEvidenceJson(String ruleId, RuleDerivedFacts.DdoFact fact) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"" + json(ruleId) + "\","
            + "\"predicate\":\"consecutiveDutyDaysBefore == 6 && consecutiveDdoAfter >= 2\","
            + "\"crewId\":" + fact.crewId() + ","
            + "\"timelineBlockId\":" + fact.timelineBlockId() + ","
            + "\"conservativeLimitation\":\"applies when current facts show a DDO following a six-duty-day sequence\","
            + "\"actual\":{\"consecutiveDutyDaysBefore\":" + fact.consecutiveDutyDaysBefore()
            + ",\"consecutiveDdoAfter\":" + fact.consecutiveDdoAfter()
            + ",\"validDdoUnit\":" + fact.validDdoUnit() + "},"
            + "\"limit\":{\"consecutiveDdoAfter\":2},"
            + "\"baseDdoStartUtc\":" + jsonInstant(fact.baseDdoStartUtc()) + ","
            + "\"baseDdoEndUtc\":" + jsonInstant(fact.baseDdoEndUtc()) + "}";
    }

    private static String ddoRollingSequenceEvidenceJson(
        String ruleId,
        RuleDerivedFacts.DdoCrewSequenceFact fact
    ) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"" + json(ruleId) + "\","
            + "\"predicate\":\"rolling14dHasTwoConsecutiveDdo == true\","
            + "\"crewId\":" + fact.crewId() + ","
            + "\"window\":{\"startUtc\":" + jsonInstant(fact.windowStartUtc())
            + ",\"endUtc\":" + jsonInstant(fact.windowEndUtc()) + "},"
            + "\"actual\":{\"rolling14dHasTwoConsecutiveDdo\":" + fact.rolling14dHasTwoConsecutiveDdo()
            + ",\"consecutiveDdoUnitsInWindow\":" + fact.consecutiveDdoUnitsInWindow()
            + ",\"assessedWindowCount\":" + fact.assessedWindowCount() + "},"
            + "\"limit\":{\"consecutiveDdoUnitsInWindow\":2},"
            + "\"windowStartUtc\":" + jsonInstant(fact.windowStartUtc()) + ","
            + "\"windowEndUtc\":" + jsonInstant(fact.windowEndUtc()) + ","
            + "\"consecutiveDdoUnitsInWindow\":" + fact.consecutiveDdoUnitsInWindow() + ","
            + "\"assessedWindowCount\":" + fact.assessedWindowCount() + "}";
    }

    private static String fdpEvidenceJson(RuleDerivedFacts.FdpRestFact fact) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"RG-FDP-006\","
            + "\"predicate\":\"fdp_minutes <= 840\","
            + "\"actualMinutes\":" + fact.fdpMinutes() + ","
            + "\"limitMinutes\":" + fact.allowableFdpMinutes() + ","
            + "\"crewId\":" + fact.crewId() + ","
            + "\"taskId\":" + fact.taskId() + ","
            + "\"fdpStartUtc\":" + jsonInstant(fact.fdpStartUtc()) + ","
            + "\"fdpEndUtc\":" + jsonInstant(fact.fdpEndUtc()) + ","
            + "\"followingRestStartUtc\":" + jsonInstant(fact.followingRestStartUtc()) + ","
            + "\"followingRestEndUtc\":" + jsonInstant(fact.followingRestEndUtc()) + ","
            + "\"restLocalNights\":" + fact.restLocalNights() + "}";
    }

    private static String restLocalNightEvidenceJson(RuleDerivedFacts.FdpRestFact fact) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"RG-REST-004\","
            + "\"predicate\":\"fdp_minutes <= 1080 || rest_local_nights >= 1\","
            + "\"actualMinutes\":" + fact.fdpMinutes() + ","
            + "\"limitMinutes\":1080,"
            + "\"crewId\":" + fact.crewId() + ","
            + "\"taskId\":" + fact.taskId() + ","
            + "\"fdpStartUtc\":" + jsonInstant(fact.fdpStartUtc()) + ","
            + "\"fdpEndUtc\":" + jsonInstant(fact.fdpEndUtc()) + ","
            + "\"followingRestStartUtc\":" + jsonInstant(fact.followingRestStartUtc()) + ","
            + "\"followingRestEndUtc\":" + jsonInstant(fact.followingRestEndUtc()) + ","
            + "\"restLocalNights\":" + fact.restLocalNights() + "}";
    }

    private String reducedRestAssessmentEvidenceJson(
        RuleDerivedFacts.FdpRestFact fact,
        TimelineBlock previousRest
    ) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"RG-FDP-008\","
            + "\"predicate\":\"preceded_by_reduced_rest == false\","
            + "\"crewId\":" + fact.crewId() + ","
            + "\"taskId\":" + fact.taskId() + ","
            + "\"actual\":{\"precededByReducedRest\":" + fact.precededByReducedRest()
            + ",\"specialAssessmentSourceAvailable\":false"
            + ",\"specialAssessmentPassed\":" + fact.specialAssessmentPassed() + "},"
            + "\"previousRest\":" + restWindowJson(previousRest, fact.precededByReducedRest()) + ","
            + "\"fdp\":" + fdpWindowJson(fact) + ","
            + "\"nextRest\":" + nextRestWindowJson(fact) + ","
            + "\"chainReason\":\"REDUCED_REST_REQUIRES_SPECIAL_ASSESSMENT\"}";
    }

    private String reducedRestChainEvidenceJson(
        RuleDerivedFacts.FdpRestFact fact,
        TimelineBlock previousRest
    ) {
        return "{\"phase\":\"PHASE_3\","
            + "\"ruleId\":\"RG-REST-008\","
            + "\"predicate\":\"!(preceded_by_reduced_rest && extended_fdp && following_rest_reduced)\","
            + "\"crewId\":" + fact.crewId() + ","
            + "\"taskId\":" + fact.taskId() + ","
            + "\"actual\":{\"precededByReducedRest\":" + fact.precededByReducedRest()
            + ",\"extendedFdp\":" + fact.extendedFdp()
            + ",\"followingRestReduced\":" + fact.followingRestReduced() + "},"
            + "\"previousRest\":" + restWindowJson(previousRest, fact.precededByReducedRest()) + ","
            + "\"fdp\":" + fdpWindowJson(fact) + ","
            + "\"nextRest\":" + nextRestWindowJson(fact) + ","
            + "\"chainReason\":\"REDUCED_REST_AFTER_EXTENDED_FDP\"}";
    }

    private static String fdpWindowJson(RuleDerivedFacts.FdpRestFact fact) {
        return "{\"startUtc\":" + jsonInstant(fact.fdpStartUtc())
            + ",\"endUtc\":" + jsonInstant(fact.fdpEndUtc())
            + ",\"minutes\":" + fact.fdpMinutes()
            + ",\"allowableMinutes\":" + fact.allowableFdpMinutes()
            + ",\"extended\":" + fact.extendedFdp() + "}";
    }

    private static String nextRestWindowJson(RuleDerivedFacts.FdpRestFact fact) {
        return "{\"startUtc\":" + jsonInstant(fact.followingRestStartUtc())
            + ",\"endUtc\":" + jsonInstant(fact.followingRestEndUtc())
            + ",\"localNights\":" + fact.restLocalNights()
            + ",\"reduced\":" + fact.followingRestReduced() + "}";
    }

    private String restWindowJson(TimelineBlock restBlock, boolean reduced) {
        long minutes = restBlock == null ? 0 : Duration.between(restBlock.getStartUtc(), restBlock.getEndUtc()).toMinutes();
        int localNights = restBlock == null ? 0 : localNightCount(restBlock.getStartUtc(), restBlock.getEndUtc());
        return "{\"startUtc\":" + jsonInstant(restBlock == null ? null : restBlock.getStartUtc())
            + ",\"endUtc\":" + jsonInstant(restBlock == null ? null : restBlock.getEndUtc())
            + ",\"minutes\":" + minutes
            + ",\"localNights\":" + localNights
            + ",\"reduced\":" + reduced + "}";
    }

    private static String contributorJson(List<RuleDerivedFacts.CrewHourContributor> contributors) {
        return contributors.stream()
            .map(contributor -> "{\"source\":\"" + json(contributor.source()) + "\","
                + "\"startUtc\":" + jsonInstant(contributor.startUtc()) + ","
                + "\"endUtc\":" + jsonInstant(contributor.endUtc()) + ","
                + "\"minutes\":" + contributor.minutes() + "}")
            .collect(Collectors.joining(",", "[", "]"));
    }

    private static String jsonInstant(Instant instant) {
        return instant == null ? "null" : "\"" + instant + "\"";
    }

    private static String jsonLocalDate(LocalDate localDate) {
        return localDate == null ? "null" : "\"" + localDate + "\"";
    }

    private static String localDateArrayJson(List<LocalDate> localDates) {
        return localDates.stream()
            .map(RuleEvaluationService::jsonLocalDate)
            .collect(Collectors.joining(",", "[", "]"));
    }

    private static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
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
        String evidenceJson,
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
        String recommendedAction,
        String evidenceJson
    ) {
        private RuleHit(
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
            this(
                ruleId,
                severity,
                targetType,
                targetId,
                crewId,
                taskId,
                timelineBlockId,
                evidenceWindowStartUtc,
                evidenceWindowEndUtc,
                route,
                taskCode,
                message,
                recommendedAction,
                defaultEvidenceJson(ruleId)
            );
        }
    }

    private record DraftRoster(Long id, String versionNo, String status) {
    }
}
