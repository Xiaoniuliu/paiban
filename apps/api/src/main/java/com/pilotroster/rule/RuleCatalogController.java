package com.pilotroster.rule;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import com.pilotroster.framework.AuditLogService;
import com.pilotroster.rule.RuleEvaluationService.RuleRecentHitCount;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/rules")
public class RuleCatalogController {

    private final RuleCatalogRepository ruleCatalogRepository;
    private final RuleEvaluationService ruleEvaluationService;
    private final JdbcTemplate jdbcTemplate;
    private final AuditLogService auditLogService;

    public RuleCatalogController(
        RuleCatalogRepository ruleCatalogRepository,
        RuleEvaluationService ruleEvaluationService,
        JdbcTemplate jdbcTemplate,
        AuditLogService auditLogService
    ) {
        this.ruleCatalogRepository = ruleCatalogRepository;
        this.ruleEvaluationService = ruleEvaluationService;
        this.jdbcTemplate = jdbcTemplate;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<RuleCatalogResponse>> list() {
        Map<String, RuleRecentHitCount> hitCounts = ruleEvaluationService.recentHitCountsByRuleId()
            .stream()
            .collect(Collectors.toMap(RuleRecentHitCount::ruleId, item -> item));
        return ApiResponse.ok(ruleCatalogRepository.findAll().stream()
            .map(rule -> {
                RuleRecentHitCount count = hitCounts.get(rule.getRuleId());
                return new RuleCatalogResponse(
                    rule.getId(),
                    rule.getRuleId(),
                    rule.getTitleZh(),
                    rule.getTitleEn(),
                    rule.getRuleCategory(),
                    rule.getSeverityDefault(),
                    rule.getSourceSection(),
                    rule.getSourceClause(),
                    rule.getSourcePage(),
                    rule.getPhaseCode(),
                    rule.getActiveFlag(),
                    rule.getApplicability(),
                    rule.getDescriptionZh(),
                    rule.getDescriptionEn(),
                    rule.getTriggerSummaryZh(),
                    rule.getTriggerSummaryEn(),
                    rule.getHandlingMethodZh(),
                    rule.getHandlingMethodEn(),
                    rule.getExceptionAllowed(),
                    rule.getPdfDeeplink(),
                    rule.getVersionStatus(),
                    rule.getCatalogEntryType(),
                    rule.getDisplayRuleCode(),
                    rule.getSourceRuleIds(),
                    rule.getEffectiveFromUtc(),
                    rule.getEffectiveToUtc(),
                    count == null ? 0 : count.hitCount(),
                    count == null ? null : count.latestHitAtUtc(),
                    activationLocked(rule)
                );
            })
            .toList());
    }

    @PatchMapping("/{ruleId}/active")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<RuleCatalogResponse> updateActiveFlag(
        @PathVariable String ruleId,
        @RequestBody RuleActivationRequest request,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        RuleCatalog rule = ruleCatalogRepository.findByRuleId(ruleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rule not found"));
        if (activationLocked(rule) && !request.active()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mandatory red rules cannot be deactivated");
        }
        rule.setActiveFlag(request.active());
        RuleCatalog saved = ruleCatalogRepository.save(rule);
        auditLogService.recordWithDetail(
            user.id(),
            request.active() ? "RULE_ACTIVATED" : "RULE_DEACTIVATED",
            "RuleCatalog",
            saved.getRuleId(),
            "SUCCESS",
            "{\"ruleId\":\"" + json(saved.getRuleId()) + "\",\"active\":" + request.active() + "}"
        );
        return ApiResponse.ok(toResponse(saved));
    }

    @GetMapping("/{ruleId}/recent-hits")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<RuleRecentHitResponse>> recentHits(@PathVariable String ruleId) {
        return ApiResponse.ok(jdbcTemplate.query(
            """
            SELECT vh.id,
                   vh.severity,
                   vh.status,
                   vh.target_type,
                   vh.target_id,
                   vh.crew_id,
                   vh.task_id,
                   vh.timeline_block_id,
                   vh.evidence_window_start_utc,
                   vh.evidence_window_end_utc,
                   vh.message,
                   vh.recommended_action,
                   vh.created_at,
                   tpi.task_code,
                   tpi.departure_airport,
                   tpi.arrival_airport,
                   cm.crew_code,
                   cm.name_en AS crew_name
            FROM violation_hit vh
            JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
            LEFT JOIN task_plan_item tpi ON tpi.id = vh.task_id
            LEFT JOIN crew_member cm ON cm.id = vh.crew_id
            WHERE rc.rule_id = ?
            ORDER BY vh.created_at DESC, vh.id DESC
            LIMIT 10
            """,
            (rs, rowNum) -> new RuleRecentHitResponse(
                rs.getLong("id"),
                ruleId,
                rs.getString("severity"),
                rs.getString("status"),
                rs.getString("target_type"),
                nullableLong(rs.getObject("target_id")),
                nullableLong(rs.getObject("crew_id")),
                nullableLong(rs.getObject("task_id")),
                nullableLong(rs.getObject("timeline_block_id")),
                nullableInstant(rs.getTimestamp("evidence_window_start_utc")),
                nullableInstant(rs.getTimestamp("evidence_window_end_utc")),
                rs.getString("message"),
                rs.getString("recommended_action"),
                nullableInstant(rs.getTimestamp("created_at")),
                rs.getString("task_code"),
                route(rs.getString("departure_airport"), rs.getString("arrival_airport")),
                rs.getString("crew_code"),
                rs.getString("crew_name")
            ),
            ruleId
        ));
    }

    @PostMapping("/evaluate/latest-roster")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<RuleEvaluationService.RuleEvaluationResult> evaluateLatestRoster() {
        return ApiResponse.ok(ruleEvaluationService.evaluateLatestRoster());
    }

    @PostMapping("/evaluate/task/{taskId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<RuleEvaluationService.RuleEvaluationResult> evaluateTask(@PathVariable Long taskId) {
        RuleEvaluationService.RuleEvaluationResult result = ruleEvaluationService.evaluateLatestRoster();
        return ApiResponse.ok(new RuleEvaluationService.RuleEvaluationResult(
            result.rosterVersionId(),
            result.rosterVersionNo(),
            result.rosterVersionStatus(),
            result.issues().stream()
                .filter(issue -> taskId.equals(issue.taskId()) || taskId.equals(issue.targetId()) && "TASK".equals(issue.targetType()))
                .toList()
        ));
    }

    @PostMapping("/evaluate/crew/{crewId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<RuleEvaluationService.RuleEvaluationResult> evaluateCrew(@PathVariable Long crewId) {
        RuleEvaluationService.RuleEvaluationResult result = ruleEvaluationService.evaluateLatestRoster();
        return ApiResponse.ok(new RuleEvaluationService.RuleEvaluationResult(
            result.rosterVersionId(),
            result.rosterVersionNo(),
            result.rosterVersionStatus(),
            result.issues().stream()
                .filter(issue -> crewId.equals(issue.crewId()))
                .toList()
        ));
    }

    @PostMapping("/trial")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<RuleTrialResponse> trial(@RequestBody(required = false) RuleTrialRequest request) {
        RuleEvaluationService.RuleEvaluationResult result = ruleEvaluationService.evaluateLatestRoster();
        String scope = request == null || request.scope() == null ? "LATEST_ROSTER" : request.scope();
        return ApiResponse.ok(new RuleTrialResponse(
            scope,
            Instant.now(),
            "Phase 3 trial currently evaluates the latest roster with active catalog rules and returns rule-hit-pool issues.",
            result
        ));
    }

    public record RuleCatalogResponse(
        Long id,
        String ruleId,
        String titleZh,
        String titleEn,
        String ruleCategory,
        String severityDefault,
        String sourceSection,
        String sourceClause,
        Integer sourcePage,
        String phaseCode,
        Boolean activeFlag,
        String applicability,
        String descriptionZh,
        String descriptionEn,
        String triggerSummaryZh,
        String triggerSummaryEn,
        String handlingMethodZh,
        String handlingMethodEn,
        Boolean exceptionAllowed,
        String pdfDeeplink,
        String versionStatus,
        String catalogEntryType,
        String displayRuleCode,
        String sourceRuleIds,
        Instant effectiveFromUtc,
        Instant effectiveToUtc,
        int hitCount,
        Instant latestHitAtUtc,
        boolean activationLocked
    ) {
    }

    public record RuleActivationRequest(boolean active) {
    }

    public record RuleTrialRequest(String scope, Long taskId, Long crewId) {
    }

    public record RuleTrialResponse(
        String scope,
        Instant evaluatedAtUtc,
        String note,
        RuleEvaluationService.RuleEvaluationResult result
    ) {
    }

    public record RuleRecentHitResponse(
        Long hitId,
        String ruleId,
        String severity,
        String status,
        String targetType,
        Long targetId,
        Long crewId,
        Long taskId,
        Long timelineBlockId,
        Instant evidenceWindowStartUtc,
        Instant evidenceWindowEndUtc,
        String message,
        String recommendedAction,
        Instant createdAtUtc,
        String taskCode,
        String route,
        String crewCode,
        String crewName
    ) {
    }

    private static Long nullableLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(value.toString());
    }

    private static Instant nullableInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static String route(String departureAirport, String arrivalAirport) {
        if (departureAirport == null || arrivalAirport == null) {
            return "";
        }
        return departureAirport + "-" + arrivalAirport;
    }

    private RuleCatalogResponse toResponse(RuleCatalog rule) {
        RuleRecentHitCount count = ruleEvaluationService.recentHitCountsByRuleId()
            .stream()
            .filter(item -> item.ruleId().equals(rule.getRuleId()))
            .findFirst()
            .orElse(null);
        return new RuleCatalogResponse(
            rule.getId(),
            rule.getRuleId(),
            rule.getTitleZh(),
            rule.getTitleEn(),
            rule.getRuleCategory(),
            rule.getSeverityDefault(),
            rule.getSourceSection(),
            rule.getSourceClause(),
            rule.getSourcePage(),
            rule.getPhaseCode(),
            rule.getActiveFlag(),
            rule.getApplicability(),
            rule.getDescriptionZh(),
            rule.getDescriptionEn(),
            rule.getTriggerSummaryZh(),
            rule.getTriggerSummaryEn(),
            rule.getHandlingMethodZh(),
            rule.getHandlingMethodEn(),
            rule.getExceptionAllowed(),
            rule.getPdfDeeplink(),
            rule.getVersionStatus(),
            rule.getCatalogEntryType(),
            rule.getDisplayRuleCode(),
            rule.getSourceRuleIds(),
            rule.getEffectiveFromUtc(),
            rule.getEffectiveToUtc(),
            count == null ? 0 : count.hitCount(),
            count == null ? null : count.latestHitAtUtc(),
            activationLocked(rule)
        );
    }

    private boolean activationLocked(RuleCatalog rule) {
        return "BLOCK".equals(rule.getSeverityDefault()) || "NON_COMPLIANT".equals(rule.getSeverityDefault());
    }

    private static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
