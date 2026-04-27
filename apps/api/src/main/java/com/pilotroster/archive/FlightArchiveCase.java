package com.pilotroster.archive;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "flight_archive_case")
public class FlightArchiveCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flight_id", nullable = false)
    private Long flightId;

    @Column(name = "roster_version_id", nullable = false)
    private Long rosterVersionId;

    @Column(name = "archive_status", nullable = false)
    private String archiveStatus;

    @Column(name = "archive_deadline_at_utc", nullable = false)
    private Instant archiveDeadlineAtUtc;

    @Column(name = "archived_at_utc")
    private Instant archivedAtUtc;

    @Column(name = "completed_count", nullable = false)
    private Integer completedCount;

    @Column(name = "total_count", nullable = false)
    private Integer totalCount;

    @Column(nullable = false)
    private Integer revision;

    protected FlightArchiveCase() {
    }

    public FlightArchiveCase(Long flightId, Long rosterVersionId, Instant archiveDeadlineAtUtc) {
        this.flightId = flightId;
        this.rosterVersionId = rosterVersionId;
        this.archiveStatus = ArchiveStatus.UNARCHIVED;
        this.archiveDeadlineAtUtc = archiveDeadlineAtUtc;
        this.archivedAtUtc = null;
        this.completedCount = 0;
        this.totalCount = 0;
        this.revision = 0;
    }

    public Long getId() {
        return id;
    }

    public Long getFlightId() {
        return flightId;
    }

    public Long getRosterVersionId() {
        return rosterVersionId;
    }

    public String getArchiveStatus() {
        return archiveStatus;
    }

    public Instant getArchiveDeadlineAtUtc() {
        return archiveDeadlineAtUtc;
    }

    public Instant getArchivedAtUtc() {
        return archivedAtUtc;
    }

    public Integer getCompletedCount() {
        return completedCount;
    }

    public Integer getTotalCount() {
        return totalCount;
    }

    public Integer getRevision() {
        return revision;
    }

    public void setArchiveStatus(String archiveStatus) {
        this.archiveStatus = archiveStatus;
    }

    public void setArchiveDeadlineAtUtc(Instant archiveDeadlineAtUtc) {
        this.archiveDeadlineAtUtc = archiveDeadlineAtUtc;
    }

    public void setArchivedAtUtc(Instant archivedAtUtc) {
        this.archivedAtUtc = archivedAtUtc;
    }

    public void setCompletedCount(Integer completedCount) {
        this.completedCount = completedCount;
    }

    public void setTotalCount(Integer totalCount) {
        this.totalCount = totalCount;
    }

    public void incrementRevision() {
        this.revision = this.revision == null ? 1 : this.revision + 1;
    }
}
