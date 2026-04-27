package com.pilotroster.timeline;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public final class TimelineBlockDtos {

    private TimelineBlockDtos() {
    }

    public record CreateCrewStatusBlockRequest(
        @NotNull Long crewMemberId,
        @NotBlank String blockType,
        @NotNull Instant startUtc,
        @NotNull Instant endUtc,
        String displayLabel
    ) {
    }
}
