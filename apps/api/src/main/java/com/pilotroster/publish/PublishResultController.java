package com.pilotroster.publish;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import com.pilotroster.publish.PublishResultDtos.PublishExportResponse;
import com.pilotroster.publish.PublishResultDtos.PublishResultsResponse;
import com.pilotroster.workbench.ValidationPublishDtos.PublishRosterRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/publish/results")
public class PublishResultController {

    private final PublishResultService publishResultService;

    public PublishResultController(PublishResultService publishResultService) {
        this.publishResultService = publishResultService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<PublishResultsResponse> summary() {
        return ApiResponse.ok(publishResultService.summary());
    }

    @PostMapping("/validate")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<PublishResultsResponse> validateDraft() {
        return ApiResponse.ok(publishResultService.validateDraft());
    }

    @PostMapping("/publish")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<PublishResultsResponse> publish(
        @RequestBody(required = false) PublishRosterRequest request,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(publishResultService.publish(request, user));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<PublishExportResponse> export(@RequestParam String view) {
        return ApiResponse.ok(publishResultService.export(view));
    }
}
