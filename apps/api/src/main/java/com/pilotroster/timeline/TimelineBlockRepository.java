package com.pilotroster.timeline;

import java.util.List;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimelineBlockRepository extends JpaRepository<TimelineBlock, Long> {

    List<TimelineBlock> findAllByOrderByStartUtcAsc();

    List<TimelineBlock> findAllByEndUtcAfterAndStartUtcBeforeOrderByStartUtcAsc(Instant windowStartUtc, Instant windowEndUtc);

    List<TimelineBlock> findAllByRosterVersionIdOrderByStartUtcAsc(Long rosterVersionId);

    List<TimelineBlock> findAllByTaskPlanItemIdOrderByIdAsc(Long taskPlanItemId);

    List<TimelineBlock> findAllByTaskPlanItemIdAndRosterVersionIdOrderByIdAsc(Long taskPlanItemId, Long rosterVersionId);
}
