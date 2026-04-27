package com.pilotroster.timeline;

import com.pilotroster.common.ApiResponse;
import com.pilotroster.timeline.TimelineBlockDtos.CreateCrewStatusBlockRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/timeline-blocks")
public class TimelineBlockController {

    private final TimelineBlockService timelineBlockService;

    public TimelineBlockController(TimelineBlockService timelineBlockService) {
        this.timelineBlockService = timelineBlockService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<TimelineBlock>> list() {
        return ApiResponse.ok(timelineBlockService.list());
    }

    @PostMapping("/crew-status")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TimelineBlock> createCrewStatusBlock(@Valid @RequestBody CreateCrewStatusBlockRequest request) {
        return ApiResponse.ok(timelineBlockService.createCrewStatusBlock(request));
    }

    @PutMapping("/crew-status/{blockId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<TimelineBlock> updateCrewStatusBlock(
        @PathVariable Long blockId,
        @Valid @RequestBody CreateCrewStatusBlockRequest request
    ) {
        return ApiResponse.ok(timelineBlockService.updateCrewStatusBlock(blockId, request));
    }

    @DeleteMapping("/crew-status/{blockId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<Long> deleteCrewStatusBlock(@PathVariable Long blockId) {
        timelineBlockService.deleteCrewStatusBlock(blockId);
        return ApiResponse.ok(blockId);
    }
}
