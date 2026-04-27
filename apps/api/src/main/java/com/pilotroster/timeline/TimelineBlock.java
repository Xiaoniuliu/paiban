package com.pilotroster.timeline;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "timeline_block")
public class TimelineBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "roster_version_id", nullable = false)
    private Long rosterVersionId;

    @Column(name = "crew_member_id")
    private Long crewMemberId;

    @Column(name = "task_plan_item_id")
    private Long taskPlanItemId;

    @Column(name = "block_type", nullable = false)
    private String blockType;

    @Column(name = "start_utc", nullable = false)
    private Instant startUtc;

    @Column(name = "end_utc", nullable = false)
    private Instant endUtc;

    @Column(name = "display_label", nullable = false)
    private String displayLabel;

    @Column(nullable = false)
    private String status;

    @Column(name = "assignment_role", nullable = false)
    private String assignmentRole;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    public Long getId() {
        return id;
    }

    public Long getRosterVersionId() {
        return rosterVersionId;
    }

    public Long getCrewMemberId() {
        return crewMemberId;
    }

    public Long getTaskPlanItemId() {
        return taskPlanItemId;
    }

    public String getBlockType() {
        return blockType;
    }

    public Instant getStartUtc() {
        return startUtc;
    }

    public Instant getEndUtc() {
        return endUtc;
    }

    public String getDisplayLabel() {
        return displayLabel;
    }

    public String getStatus() {
        return status;
    }

    public String getAssignmentRole() {
        return assignmentRole;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setRosterVersionId(Long rosterVersionId) {
        this.rosterVersionId = rosterVersionId;
    }

    public void setCrewMemberId(Long crewMemberId) {
        this.crewMemberId = crewMemberId;
    }

    public void setTaskPlanItemId(Long taskPlanItemId) {
        this.taskPlanItemId = taskPlanItemId;
    }

    public void setBlockType(String blockType) {
        this.blockType = blockType;
    }

    public void setStartUtc(Instant startUtc) {
        this.startUtc = startUtc;
    }

    public void setEndUtc(Instant endUtc) {
        this.endUtc = endUtc;
    }

    public void setDisplayLabel(String displayLabel) {
        this.displayLabel = displayLabel;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setAssignmentRole(String assignmentRole) {
        this.assignmentRole = assignmentRole;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }
}
