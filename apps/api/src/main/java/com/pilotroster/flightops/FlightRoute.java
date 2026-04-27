package com.pilotroster.flightops;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "flight_route")
public class FlightRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "route_code", nullable = false, length = 32)
    private String routeCode;

    @Column(name = "departure_airport", nullable = false, length = 3, columnDefinition = "CHAR(3)")
    private String departureAirport;

    @Column(name = "arrival_airport", nullable = false, length = 3, columnDefinition = "CHAR(3)")
    private String arrivalAirport;

    @Column(name = "standard_duration_minutes", nullable = false)
    private Integer standardDurationMinutes;

    @Column(name = "time_difference_minutes", nullable = false)
    private Integer timeDifferenceMinutes;

    @Column(name = "cross_timezone", nullable = false, columnDefinition = "TINYINT(1)")
    private Boolean crossTimezone;

    @Column(nullable = false, length = 20)
    private String status;

    public Long getId() { return id; }
    public String getRouteCode() { return routeCode; }
    public void setRouteCode(String routeCode) { this.routeCode = routeCode; }
    public String getDepartureAirport() { return departureAirport; }
    public void setDepartureAirport(String departureAirport) { this.departureAirport = departureAirport; }
    public String getArrivalAirport() { return arrivalAirport; }
    public void setArrivalAirport(String arrivalAirport) { this.arrivalAirport = arrivalAirport; }
    public Integer getStandardDurationMinutes() { return standardDurationMinutes; }
    public void setStandardDurationMinutes(Integer standardDurationMinutes) { this.standardDurationMinutes = standardDurationMinutes; }
    public Integer getTimeDifferenceMinutes() { return timeDifferenceMinutes; }
    public void setTimeDifferenceMinutes(Integer timeDifferenceMinutes) { this.timeDifferenceMinutes = timeDifferenceMinutes; }
    public Boolean getCrossTimezone() { return crossTimezone; }
    public void setCrossTimezone(Boolean crossTimezone) { this.crossTimezone = crossTimezone; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
