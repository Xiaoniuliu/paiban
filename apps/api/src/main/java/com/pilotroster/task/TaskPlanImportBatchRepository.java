package com.pilotroster.task;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskPlanImportBatchRepository extends JpaRepository<TaskPlanImportBatch, Long> {

    List<TaskPlanImportBatch> findAllByOrderByImportedAtUtcDesc();
}
