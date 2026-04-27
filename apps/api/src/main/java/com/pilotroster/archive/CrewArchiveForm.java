package com.pilotroster.archive;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "crew_archive_form")
public class CrewArchiveForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "archive_case_id", nullable = false)
    private Long archiveCaseId;

    @Column(name = "flight_id", nullable = false)
    private Long flightId;

    @Column(name = "crew_id", nullable = false)
    private Long crewId;

    @Column(name = "actual_duty_start_utc")
    private Instant actualDutyStartUtc;

    @Column(name = "actual_duty_end_utc")
    private Instant actualDutyEndUtc;

    @Column(name = "actual_fdp_start_utc")
    private Instant actualFdpStartUtc;

    @Column(name = "actual_fdp_end_utc")
    private Instant actualFdpEndUtc;

    @Column(name = "flying_hour_minutes")
    private Integer flyingHourMinutes;

    @Column(name = "no_flying_hour_flag", nullable = false)
    private Boolean noFlyingHourFlag;

    @Column(name = "form_status", nullable = false)
    private String formStatus;

    @Column(name = "entered_by")
    private Long enteredBy;

    @Column(name = "entered_at_utc")
    private Instant enteredAtUtc;

    @Column(name = "confirmed_at_utc")
    private Instant confirmedAtUtc;

    @Column(nullable = false)
    private Integer revision;

    protected CrewArchiveForm() {
    }

    public CrewArchiveForm(Long archiveCaseId, Long flightId, Long crewId) {
        this.archiveCaseId = archiveCaseId;
        this.flightId = flightId;
        this.crewId = crewId;
        this.noFlyingHourFlag = false;
        this.formStatus = CrewArchiveFormStatus.NOT_STARTED;
        this.revision = 0;
    }

    public Long getId() {
        return id;
    }

    public Long getArchiveCaseId() {
        return archiveCaseId;
    }

    public Long getFlightId() {
        return flightId;
    }

    public Long getCrewId() {
        return crewId;
    }

    public Instant getActualDutyStartUtc() {
        return actualDutyStartUtc;
    }

    public Instant getActualDutyEndUtc() {
        return actualDutyEndUtc;
    }

    public Instant getActualFdpStartUtc() {
        return actualFdpStartUtc;
    }

    public Instant getActualFdpEndUtc() {
        return actualFdpEndUtc;
    }

    public Integer getFlyingHourMinutes() {
        return flyingHourMinutes;
    }

    public Boolean getNoFlyingHourFlag() {
        return noFlyingHourFlag;
    }

    public String getFormStatus() {
        return formStatus;
    }

    public Long getEnteredBy() {
        return enteredBy;
    }

    public Instant getEnteredAtUtc() {
        return enteredAtUtc;
    }

    public Instant getConfirmedAtUtc() {
        return confirmedAtUtc;
    }

    public Integer getRevision() {
        return revision;
    }

    public void applyActuals(
        Instant actualDutyStartUtc,
        Instant actualDutyEndUtc,
        Instant actualFdpStartUtc,
        Instant actualFdpEndUtc,
        Integer flyingHourMinutes,
        boolean noFlyingHourFlag,
        Long enteredBy,
        Instant now
    ) {
        this.actualDutyStartUtc = actualDutyStartUtc;
        this.actualDutyEndUtc = actualDutyEndUtc;
        this.actualFdpStartUtc = actualFdpStartUtc;
        this.actualFdpEndUtc = actualFdpEndUtc;
        this.flyingHourMinutes = noFlyingHourFlag ? null : flyingHourMinutes;
        this.noFlyingHourFlag = noFlyingHourFlag;
        this.formStatus = noFlyingHourFlag
            ? CrewArchiveFormStatus.NO_FLYING_HOUR_CONFIRMED
            : CrewArchiveFormStatus.COMPLETED;
        this.enteredBy = enteredBy;
        this.enteredAtUtc = now;
        this.confirmedAtUtc = now;
        this.revision = this.revision == null ? 1 : this.revision + 1;
    }
}
