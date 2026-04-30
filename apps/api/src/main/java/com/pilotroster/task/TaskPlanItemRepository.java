package com.pilotroster.task;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskPlanItemRepository extends JpaRepository<TaskPlanItem, Long> {

    List<TaskPlanItem> findAllByOrderByScheduledStartUtcAsc();

    boolean existsByDepartureAirportAndArrivalAirport(String departureAirport, String arrivalAirport);

    boolean existsByDepartureAirportOrArrivalAirport(String departureAirport, String arrivalAirport);

    boolean existsByAircraftNo(String aircraftNo);

    boolean existsByAircraftNoOrAircraftType(String aircraftNo, String aircraftType);

    List<TaskPlanItem> findAllByScheduledEndUtcAfterAndScheduledStartUtcBeforeOrderByScheduledStartUtcAsc(
        Instant windowStartUtc,
        Instant windowEndUtc
    );
}
