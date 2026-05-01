package com.pilotroster.workbench;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import com.pilotroster.workbench.ValidationPublishDtos.ValidationIssueListResponse;
import com.pilotroster.workbench.ValidationPublishDtos.PublishRosterRequest;
import com.pilotroster.workbench.ValidationPublishDtos.ValidationPublishSummaryResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rostering-workbench/validation-publish")
public class ValidationPublishController {

    private final ValidationPublishService validationPublishService;

    public ValidationPublishController(ValidationPublishService validationPublishService) {
        this.validationPublishService = validationPublishService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<ValidationPublishSummaryResponse> summary() {
        return ApiResponse.ok(validationPublishService.summary());
    }

    @GetMapping("/issues")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<ValidationIssueListResponse> issues() {
        return ApiResponse.ok(validationPublishService.issues());
    }

    @PostMapping("/validate")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<ValidationPublishSummaryResponse> validateDraft() {
        return ApiResponse.ok(validationPublishService.validateDraft());
    }

    @PostMapping("/publish")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<ValidationPublishSummaryResponse> publish(
        @RequestBody(required = false) PublishRosterRequest request,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(validationPublishService.publish(request, user));
    }
}
