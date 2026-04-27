package com.pilotroster.workbench;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import com.pilotroster.workbench.RunDayAdjustmentDtos.CreateRunDayAdjustmentRequest;
import com.pilotroster.workbench.RunDayAdjustmentDtos.RunDayAdjustmentResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rostering-workbench/run-day-adjustments")
public class RunDayAdjustmentController {

    private final RunDayAdjustmentService runDayAdjustmentService;

    public RunDayAdjustmentController(RunDayAdjustmentService runDayAdjustmentService) {
        this.runDayAdjustmentService = runDayAdjustmentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<List<RunDayAdjustmentResponse>> list() {
        return ApiResponse.ok(runDayAdjustmentService.list());
    }

    @PostMapping
    @PreAuthorize("hasRole('DISPATCHER')")
    public ApiResponse<RunDayAdjustmentResponse> create(
        @RequestBody CreateRunDayAdjustmentRequest request,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(runDayAdjustmentService.create(request, user));
    }

    @PostMapping("/{adjustmentId}/apply")
    @PreAuthorize("hasRole('DISPATCHER')")
    public ApiResponse<RunDayAdjustmentResponse> apply(
        @PathVariable Long adjustmentId,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(runDayAdjustmentService.apply(adjustmentId, user));
    }
}
