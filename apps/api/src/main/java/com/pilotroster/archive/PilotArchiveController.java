package com.pilotroster.archive;

import com.pilotroster.archive.ArchiveDtos.PilotArchiveSummaryResponse;
import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pilot/me")
public class PilotArchiveController {

    private final ArchiveService archiveService;

    public PilotArchiveController(ArchiveService archiveService) {
        this.archiveService = archiveService;
    }

    @GetMapping("/archive-summary")
    @PreAuthorize("hasRole('PILOT')")
    public ApiResponse<List<PilotArchiveSummaryResponse>> archiveSummary(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(archiveService.pilotArchiveSummary(user));
    }
}
