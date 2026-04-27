package com.pilotroster.archive;

import com.pilotroster.archive.ArchiveDtos.GanttTimelineBlockResponse;
import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gantt-timeline")
public class GanttTimelineController {

    private final ArchiveService archiveService;

    public GanttTimelineController(ArchiveService archiveService) {
        this.archiveService = archiveService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER','OPS_MANAGER','ADMIN')")
    public ApiResponse<List<GanttTimelineBlockResponse>> list(
        @AuthenticationPrincipal AuthenticatedUser user,
        @RequestParam Instant windowStartUtc,
        @RequestParam Instant windowEndUtc,
        @RequestParam(defaultValue = "FLIGHT") String viewMode
    ) {
        return ApiResponse.ok(archiveService.ganttTimeline(user, windowStartUtc, windowEndUtc, viewMode));
    }
}
