package com.pilotroster.archive;

import com.pilotroster.archive.ArchiveDtos.ArchiveCaseDetailResponse;
import com.pilotroster.archive.ArchiveDtos.ArchiveCaseResponse;
import com.pilotroster.archive.ArchiveDtos.ArchiveSyncResponse;
import com.pilotroster.archive.ArchiveDtos.SaveCrewArchiveFormRequest;
import com.pilotroster.archive.ArchiveDtos.SaveCrewArchiveFormResponse;
import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/archive")
public class ArchiveController {

    private final ArchiveService archiveService;

    public ArchiveController(ArchiveService archiveService) {
        this.archiveService = archiveService;
    }

    @GetMapping("/cases")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<List<ArchiveCaseResponse>> cases(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(archiveService.archiveCases(user));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<ArchiveSyncResponse> sync() {
        return ApiResponse.ok(archiveService.syncArchiveState());
    }

    @GetMapping("/cases/{archiveCaseId}")
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<ArchiveCaseDetailResponse> detail(
        @PathVariable Long archiveCaseId,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(archiveService.archiveCaseDetail(archiveCaseId, user));
    }

    @PutMapping("/forms/{formId}")
    @PreAuthorize("hasRole('DISPATCHER')")
    public ApiResponse<SaveCrewArchiveFormResponse> saveForm(
        @PathVariable Long formId,
        @RequestBody SaveCrewArchiveFormRequest request,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(archiveService.saveCrewArchiveForm(formId, request, user));
    }
}
