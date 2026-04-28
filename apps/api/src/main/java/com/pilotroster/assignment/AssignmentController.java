package com.pilotroster.assignment;

import com.pilotroster.assignment.AssignmentDtos.AssignmentTaskDetailResponse;
import com.pilotroster.assignment.AssignmentDtos.ClearAssignmentDraftResponse;
import com.pilotroster.assignment.AssignmentDtos.SaveAssignmentDraftRequest;
import com.pilotroster.assignment.AssignmentDtos.SaveAssignmentDraftResponse;
import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @GetMapping("/tasks/{taskId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<AssignmentTaskDetailResponse> taskDetail(
        @PathVariable Long taskId,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(assignmentService.taskDetail(taskId, user));
    }

    @PutMapping("/tasks/{taskId}/draft")
    @PreAuthorize("hasRole('DISPATCHER')")
    public ApiResponse<SaveAssignmentDraftResponse> saveDraft(
        @PathVariable Long taskId,
        @RequestBody SaveAssignmentDraftRequest request,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(assignmentService.saveDraft(taskId, request, user));
    }

    @DeleteMapping("/tasks/{taskId}/draft")
    @PreAuthorize("hasRole('DISPATCHER')")
    public ApiResponse<ClearAssignmentDraftResponse> clearDraft(
        @PathVariable Long taskId,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(assignmentService.clearDraft(taskId, user));
    }
}
