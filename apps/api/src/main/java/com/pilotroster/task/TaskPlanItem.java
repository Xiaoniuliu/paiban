package com.pilotroster.task;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "task_plan_item")
public class TaskPlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @Column(name = "task_code", nullable = false, length = 64)
    private String taskCode;

    @Column(name = "task_type", nullable = false, length = 32)
    private String taskType;

    @Column(name = "title_zh", nullable = false, length = 200)
    private String titleZh;

    @Column(name = "title_en", nullable = false, length = 200)
    private String titleEn;

    @Column(name = "departure_airport", length = 3, columnDefinition = "CHAR(3)")
    private String departureAirport;

    @Column(name = "arrival_airport", length = 3, columnDefinition = "CHAR(3)")
    private String arrivalAirport;

    @Column(name = "scheduled_start_utc", nullable = false)
    private Instant scheduledStartUtc;

    @Column(name = "scheduled_end_utc", nullable = false)
    private Instant scheduledEndUtc;

    @Column(name = "sector_count", nullable = false)
    private Integer sectorCount;

    @Column(name = "aircraft_type", length = 50)
    private String aircraftType;

    @Column(name = "aircraft_no", length = 64)
    private String aircraftNo;

    @Column(name = "required_crew_pattern", length = 100)
    private String requiredCrewPattern;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "source_status", nullable = false, length = 30)
    private String sourceStatus;

    public Long getId() {
        return id;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public String getTaskCode() {
        return taskCode;
    }

    public void setTaskCode(String taskCode) {
        this.taskCode = taskCode;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public String getTitleZh() {
        return titleZh;
    }

    public void setTitleZh(String titleZh) {
        this.titleZh = titleZh;
    }

    public String getTitleEn() {
        return titleEn;
    }

    public void setTitleEn(String titleEn) {
        this.titleEn = titleEn;
    }

    public String getDepartureAirport() {
        return departureAirport;
    }

    public void setDepartureAirport(String departureAirport) {
        this.departureAirport = departureAirport;
    }

    public String getArrivalAirport() {
        return arrivalAirport;
    }

    public void setArrivalAirport(String arrivalAirport) {
        this.arrivalAirport = arrivalAirport;
    }

    public Instant getScheduledStartUtc() {
        return scheduledStartUtc;
    }

    public Instant getScheduledEndUtc() {
        return scheduledEndUtc;
    }

    public void setScheduledStartUtc(Instant scheduledStartUtc) {
        this.scheduledStartUtc = scheduledStartUtc;
    }

    public void setScheduledEndUtc(Instant scheduledEndUtc) {
        this.scheduledEndUtc = scheduledEndUtc;
    }

    public Integer getSectorCount() {
        return sectorCount;
    }

    public void setSectorCount(Integer sectorCount) {
        this.sectorCount = sectorCount;
    }

    public String getAircraftType() {
        return aircraftType;
    }

    public void setAircraftType(String aircraftType) {
        this.aircraftType = aircraftType;
    }

    public String getAircraftNo() {
        return aircraftNo;
    }

    public void setAircraftNo(String aircraftNo) {
        this.aircraftNo = aircraftNo;
    }

    public String getRequiredCrewPattern() {
        return requiredCrewPattern;
    }

    public void setRequiredCrewPattern(String requiredCrewPattern) {
        this.requiredCrewPattern = requiredCrewPattern;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSourceStatus() {
        return sourceStatus;
    }

    public void setSourceStatus(String sourceStatus) {
        this.sourceStatus = sourceStatus;
    }
}
