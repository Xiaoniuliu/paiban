package com.pilotroster.task;

import com.pilotroster.common.ApiResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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

    private final TaskPlanImportBatchRepository batchRepository;
    private final TaskPlanItemRepository itemRepository;

    public TaskPlanController(
        TaskPlanImportBatchRepository batchRepository,
        TaskPlanItemRepository itemRepository
    ) {
        this.batchRepository = batchRepository;
        this.itemRepository = itemRepository;
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
        return ApiResponse.ok(itemRepository.findAllByOrderByScheduledStartUtcAsc());
    }

    @PostMapping("/items")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TaskPlanItem> createItem(@RequestBody TaskPlanItem input) {
        normalizeItem(input);
        return ApiResponse.ok(itemRepository.save(input));
    }

    @PutMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TaskPlanItem> updateItem(@PathVariable Long itemId, @RequestBody TaskPlanItem input) {
        TaskPlanItem existing = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task plan item not found"));
        if ("PUBLISHED".equals(existing.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Published flights must be changed through run-day adjustments");
        }
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
        existing.setStatus(defaultString(input.getStatus(), existing.getStatus()));
        existing.setSourceStatus(defaultString(input.getSourceStatus(), existing.getSourceStatus()));
        normalizeItem(existing);
        return ApiResponse.ok(itemRepository.save(existing));
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TaskPlanItem> cancelItem(@PathVariable Long itemId) {
        TaskPlanItem existing = itemRepository.findById(itemId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task plan item not found"));
        if ("PUBLISHED".equals(existing.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Published flights must be changed through run-day adjustments");
        }
        existing.setStatus("CANCELLED");
        return ApiResponse.ok(itemRepository.save(existing));
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
        item.setStatus(defaultString(item.getStatus(), "UNASSIGNED"));
        item.setSourceStatus(defaultString(item.getSourceStatus(), "ACCEPTED"));
        item.setRequiredCrewPattern(defaultString(item.getRequiredCrewPattern(), "PIC+FO"));
        if (item.getScheduledStartUtc() == null || item.getScheduledEndUtc() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scheduled start and end are required");
        }
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
