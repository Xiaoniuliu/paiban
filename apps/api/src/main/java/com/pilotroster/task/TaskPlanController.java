package com.pilotroster.task;

import com.pilotroster.common.ApiResponse;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/task-plan")
public class TaskPlanController {

    private static final String STATUS_UNASSIGNED = "UNASSIGNED";
    private static final String STATUS_ASSIGNED = "ASSIGNED";
    private static final String STATUS_ASSIGNED_DRAFT = "ASSIGNED_DRAFT";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_CANCELLED = "CANCELLED";

    private final TaskPlanImportBatchRepository batchRepository;
    private final TaskPlanItemRepository itemRepository;
    private final TaskAssignmentReadinessService taskAssignmentReadinessService;
    private final TimelineBlockRepository timelineBlockRepository;
    private final JdbcTemplate jdbcTemplate;

    public TaskPlanController(
        TaskPlanImportBatchRepository batchRepository,
        TaskPlanItemRepository itemRepository,
        TaskAssignmentReadinessService taskAssignmentReadinessService,
        TimelineBlockRepository timelineBlockRepository,
        JdbcTemplate jdbcTemplate
    ) {
        this.batchRepository = batchRepository;
        this.itemRepository = itemRepository;
        this.taskAssignmentReadinessService = taskAssignmentReadinessService;
        this.timelineBlockRepository = timelineBlockRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/batches")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<TaskPlanImportBatch>> batches() {
        return ApiResponse.ok(batchRepository.findAllByOrderByImportedAtUtcDesc());
    }

    @PostMapping("/batches")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TaskPlanImportBatch> createBatch(@RequestBody TaskPlanImportBatch input) {
        input.setStatus(defaultString(input.getStatus(), "IMPORTED"));
        input.setImportedAtUtc(input.getImportedAtUtc() == null ? Instant.now() : input.getImportedAtUtc());
        return ApiResponse.ok(batchRepository.save(input));
    }

    @PutMapping("/batches/{batchId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TaskPlanImportBatch> updateBatch(@PathVariable Long batchId, @RequestBody TaskPlanImportBatch input) {
        TaskPlanImportBatch batch = batchRepository.findById(batchId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Import batch not found"));
        batch.setBatchNo(input.getBatchNo());
        batch.setSourceName(input.getSourceName());
        batch.setStatus(defaultString(input.getStatus(), batch.getStatus()));
        return ApiResponse.ok(batchRepository.save(batch));
    }

    @GetMapping("/items")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<TaskPlanItem>> items() {
        List<TaskPlanItem> items = itemRepository.findAllByOrderByScheduledStartUtcAsc();
        boolean changed = false;
        for (TaskPlanItem item : items) {
            String normalizedStatus = canonicalTaskStatus(item.getStatus());
            if (!normalizedStatus.equals(item.getStatus())) {
                item.setStatus(normalizedStatus);
                changed = true;
            }
        }
        if (changed) {
            itemRepository.saveAll(items);
        }
        return ApiResponse.ok(items);
    }

    @GetMapping("/assignment-readiness")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<TaskAssignmentReadinessDtos.TaskAssignmentReadinessResponse> assignmentReadiness() {
        return ApiResponse.ok(taskAssignmentReadinessService.readiness());
    }

    @PostMapping("/items")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TaskPlanItem> createItem(@RequestBody TaskPlanItem input) {
        normalizeItem(input);
        input.setStatus(STATUS_UNASSIGNED);
        return ApiResponse.ok(itemRepository.save(input));
    }

    @PutMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TaskPlanItem> updateItem(@PathVariable Long itemId, @RequestBody TaskPlanItem input) {
        TaskPlanItem existing = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task plan item not found"));
        ensureEditableThroughTaskMaintenance(existing);
        existing.setBatchId(input.getBatchId());
        existing.setTaskCode(input.getTaskCode());
        existing.setTaskType(input.getTaskType());
        existing.setTitleZh(defaultString(input.getTitleZh(), input.getTaskCode()));
        existing.setTitleEn(defaultString(input.getTitleEn(), input.getTaskCode()));
        existing.setDepartureAirport(input.getDepartureAirport());
        existing.setArrivalAirport(input.getArrivalAirport());
        existing.setScheduledStartUtc(input.getScheduledStartUtc());
        existing.setScheduledEndUtc(input.getScheduledEndUtc());
        existing.setSectorCount(input.getSectorCount() == null ? 1 : input.getSectorCount());
        existing.setAircraftType(input.getAircraftType());
        existing.setAircraftNo(input.getAircraftNo());
        existing.setRequiredCrewPattern(defaultString(input.getRequiredCrewPattern(), "PIC+FO"));
        normalizeItem(existing);
        existing.setStatus(STATUS_UNASSIGNED);
        return ApiResponse.ok(itemRepository.save(existing));
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    @Transactional
    public ApiResponse<TaskPlanItem> deleteItem(@PathVariable Long itemId) {
        TaskPlanItem existing = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task plan item not found"));
        ensureDeletableThroughTaskMaintenance(existing);
        try {
            cleanupDerivedTaskMaintenanceArtifacts(existing.getId());
            itemRepository.delete(existing);
            itemRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Flights already entered downstream flow cannot be deleted", ex);
        }
        return ApiResponse.ok(existing);
    }

    private void ensureEditableThroughTaskMaintenance(TaskPlanItem task) {
        String status = canonicalTaskStatus(task.getStatus());
        if (STATUS_PUBLISHED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Published flights must be changed through run-day adjustments");
        }
        if (STATUS_ASSIGNED_DRAFT.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Draft-assigned flights must be changed through draft rostering");
        }
        if (!STATUS_UNASSIGNED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only unassigned flights can be changed through task maintenance");
        }
    }

    private void ensureDeletableThroughTaskMaintenance(TaskPlanItem task) {
        String status = canonicalTaskStatus(task.getStatus());
        if (STATUS_PUBLISHED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Published flights already entered downstream flow and cannot be deleted");
        }
        if (STATUS_ASSIGNED_DRAFT.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Draft-assigned flights already entered downstream flow and cannot be deleted");
        }
        if (STATUS_CANCELLED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancelled flights already left task maintenance and cannot be deleted");
        }
        if (!STATUS_UNASSIGNED.equals(status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only unassigned flights can be deleted through task maintenance");
        }
    }

    private void cleanupDerivedTaskMaintenanceArtifacts(Long taskId) {
        jdbcTemplate.update(
            """
            DELETE FROM violation_hit
            WHERE task_id = ?
               OR timeline_block_id IN (
                   SELECT id FROM timeline_block WHERE task_plan_item_id = ?
               )
            """,
            taskId,
            taskId
        );
        timelineBlockRepository.deleteAllByTaskPlanItemId(taskId);
    }

    private void normalizeItem(TaskPlanItem item) {
        if (item.getBatchId() == null) {
            item.setBatchId(batchRepository.findAllByOrderByImportedAtUtcDesc().stream()
                .findFirst()
                .map(TaskPlanImportBatch::getId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import batch is required")));
        }
        item.setTaskType(defaultString(item.getTaskType(), "FLIGHT"));
        item.setTitleZh(defaultString(item.getTitleZh(), item.getTaskCode()));
        item.setTitleEn(defaultString(item.getTitleEn(), item.getTaskCode()));
        item.setSectorCount(item.getSectorCount() == null ? 1 : item.getSectorCount());
        item.setStatus(canonicalTaskStatus(defaultString(item.getStatus(), STATUS_UNASSIGNED)));
        item.setSourceStatus(defaultString(item.getSourceStatus(), "MANUAL"));
        item.setRequiredCrewPattern(defaultString(item.getRequiredCrewPattern(), "PIC+FO"));
        if (item.getScheduledStartUtc() == null || item.getScheduledEndUtc() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scheduled start and end are required");
        }
    }

    private String canonicalTaskStatus(String status) {
        return STATUS_ASSIGNED.equals(status) ? STATUS_ASSIGNED_DRAFT : status;
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
