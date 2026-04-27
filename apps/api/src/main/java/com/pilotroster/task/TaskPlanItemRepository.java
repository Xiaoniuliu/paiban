package com.pilotroster.task;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskPlanItemRepository extends JpaRepository<TaskPlanItem, Long> {

    List<TaskPlanItem> findAllByOrderByScheduledStartUtcAsc();

    List<TaskPlanItem> findAllByScheduledEndUtcAfterAndScheduledStartUtcBeforeOrderByScheduledStartUtcAsc(
        Instant windowStartUtc,
        Instant windowEndUtc
    );
}
