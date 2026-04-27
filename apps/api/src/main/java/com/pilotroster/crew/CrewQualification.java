package com.pilotroster.crew;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "crew_qualification")
public class CrewQualification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "crew_member_id", nullable = false)
    private Long crewMemberId;

    @Column(name = "qualification_type", nullable = false, length = 50)
    private String qualificationType;

    @Column(name = "qualification_code", nullable = false, length = 64)
    private String qualificationCode;

    @Column(name = "effective_from_utc")
    private Instant effectiveFromUtc;

    @Column(name = "effective_to_utc")
    private Instant effectiveToUtc;

    @Column(nullable = false, length = 20)
    private String status;

    public Long getId() { return id; }
    public Long getCrewMemberId() { return crewMemberId; }
    public void setCrewMemberId(Long crewMemberId) { this.crewMemberId = crewMemberId; }
    public String getQualificationType() { return qualificationType; }
    public void setQualificationType(String qualificationType) { this.qualificationType = qualificationType; }
    public String getQualificationCode() { return qualificationCode; }
    public void setQualificationCode(String qualificationCode) { this.qualificationCode = qualificationCode; }
    public Instant getEffectiveFromUtc() { return effectiveFromUtc; }
    public void setEffectiveFromUtc(Instant effectiveFromUtc) { this.effectiveFromUtc = effectiveFromUtc; }
    public Instant getEffectiveToUtc() { return effectiveToUtc; }
    public void setEffectiveToUtc(Instant effectiveToUtc) { this.effectiveToUtc = effectiveToUtc; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
