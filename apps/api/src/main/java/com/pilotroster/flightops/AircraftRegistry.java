package com.pilotroster.flightops;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "aircraft_registry")
public class AircraftRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "aircraft_no", nullable = false, length = 64)
    private String aircraftNo;

    @Column(name = "aircraft_type", nullable = false, length = 50)
    private String aircraftType;

    @Column(nullable = false, length = 50)
    private String fleet;

    @Column(name = "base_airport", nullable = false, length = 3, columnDefinition = "CHAR(3)")
    private String baseAirport;

    @Column(name = "seat_count", nullable = false)
    private Integer seatCount;

    @Column(name = "max_payload")
    private BigDecimal maxPayload;

    @Column(nullable = false, length = 20)
    private String status;

    public Long getId() { return id; }
    public String getAircraftNo() { return aircraftNo; }
    public void setAircraftNo(String aircraftNo) { this.aircraftNo = aircraftNo; }
    public String getAircraftType() { return aircraftType; }
    public void setAircraftType(String aircraftType) { this.aircraftType = aircraftType; }
    public String getFleet() { return fleet; }
    public void setFleet(String fleet) { this.fleet = fleet; }
    public String getBaseAirport() { return baseAirport; }
    public void setBaseAirport(String baseAirport) { this.baseAirport = baseAirport; }
    public Integer getSeatCount() { return seatCount; }
    public void setSeatCount(Integer seatCount) { this.seatCount = seatCount; }
    public BigDecimal getMaxPayload() { return maxPayload; }
    public void setMaxPayload(BigDecimal maxPayload) { this.maxPayload = maxPayload; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
