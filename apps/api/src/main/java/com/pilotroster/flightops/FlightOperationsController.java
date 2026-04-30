package com.pilotroster.flightops;

import com.pilotroster.common.ApiResponse;
import com.pilotroster.task.TaskPlanImportBatch;
import com.pilotroster.task.TaskPlanImportBatchRepository;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flight-operations")
public class FlightOperationsController {

    private final TaskPlanItemRepository taskPlanItemRepository;
    private final TaskPlanImportBatchRepository importBatchRepository;

    public FlightOperationsController(
        TaskPlanItemRepository taskPlanItemRepository,
        TaskPlanImportBatchRepository importBatchRepository
    ) {
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.importBatchRepository = importBatchRepository;
    }

    @GetMapping("/tasks")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<TaskPlanItem>> tasks() {
        return ApiResponse.ok(taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc());
    }

    @GetMapping("/import-batches")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<TaskPlanImportBatch>> importBatches() {
        return ApiResponse.ok(importBatchRepository.findAllByOrderByImportedAtUtcDesc());
    }
}
