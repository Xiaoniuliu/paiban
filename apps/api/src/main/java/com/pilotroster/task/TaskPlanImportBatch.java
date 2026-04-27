package com.pilotroster.task;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "task_plan_import_batch")
public class TaskPlanImportBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_no", nullable = false)
    private String batchNo;

    @Column(name = "source_name", nullable = false)
    private String sourceName;

    @Column(nullable = false)
    private String status;

    @Column(name = "imported_at_utc", nullable = false)
    private Instant importedAtUtc;

    public Long getId() {
        return id;
    }

    public String getBatchNo() {
        return batchNo;
    }

    public void setBatchNo(String batchNo) {
        this.batchNo = batchNo;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getImportedAtUtc() {
        return importedAtUtc;
    }

    public void setImportedAtUtc(Instant importedAtUtc) {
        this.importedAtUtc = importedAtUtc;
    }
}
