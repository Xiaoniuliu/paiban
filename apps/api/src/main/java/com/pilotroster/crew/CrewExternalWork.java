package com.pilotroster.crew;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "crew_external_work")
public class CrewExternalWork {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "crew_member_id", nullable = false)
    private Long crewMemberId;

    @Column(name = "external_type", nullable = false, length = 50)
    private String externalType;

    @Column(name = "start_utc", nullable = false)
    private Instant startUtc;

    @Column(name = "end_utc", nullable = false)
    private Instant endUtc;

    @Column(nullable = false, length = 20)
    private String description;

    @Column(nullable = false)
    private String status;

    public Long getId() { return id; }
    public Long getCrewMemberId() { return crewMemberId; }
    public void setCrewMemberId(Long crewMemberId) { this.crewMemberId = crewMemberId; }
    public String getExternalType() { return externalType; }
    public void setExternalType(String externalType) { this.externalType = externalType; }
    public Instant getStartUtc() { return startUtc; }
    public void setStartUtc(Instant startUtc) { this.startUtc = startUtc; }
    public Instant getEndUtc() { return endUtc; }
    public void setEndUtc(Instant endUtc) { this.endUtc = endUtc; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
