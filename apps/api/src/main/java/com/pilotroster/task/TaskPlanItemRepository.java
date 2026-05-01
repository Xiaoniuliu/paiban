package com.pilotroster.task;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskPlanItemRepository extends JpaRepository<TaskPlanItem, Long> {

    List<TaskPlanItem> findAllByOrderByScheduledStartUtcAsc();

    boolean existsByDepartureAirportAndArrivalAirport(String departureAirport, String arrivalAirport);

    boolean existsByDepartureAirportOrArrivalAirport(String departureAirport, String arrivalAirport);

    boolean existsByAircraftNo(String aircraftNo);

    boolean existsByAircraftNoOrAircraftType(String aircraftNo, String aircraftType);

    @Query("""
        SELECT COUNT(task) > 0
        FROM TaskPlanItem task
        WHERE task.status <> 'CANCELLED'
          AND task.departureAirport = :departureAirport
          AND task.arrivalAirport = :arrivalAirport
        """)
    boolean existsActiveByRoutePair(
        @Param("departureAirport") String departureAirport,
        @Param("arrivalAirport") String arrivalAirport
    );

    @Query("""
        SELECT COUNT(task) > 0
        FROM TaskPlanItem task
        WHERE task.status <> 'CANCELLED'
          AND (task.departureAirport = :airportCode OR task.arrivalAirport = :airportCode)
        """)
    boolean existsActiveByAirportCode(@Param("airportCode") String airportCode);

    @Query("""
        SELECT COUNT(task) > 0
        FROM TaskPlanItem task
        WHERE task.status <> 'CANCELLED'
          AND (task.aircraftNo = :aircraftNo OR task.aircraftType = :aircraftType)
        """)
    boolean existsActiveByAircraftNoOrType(
        @Param("aircraftNo") String aircraftNo,
        @Param("aircraftType") String aircraftType
    );

    List<TaskPlanItem> findAllByScheduledEndUtcAfterAndScheduledStartUtcBeforeOrderByScheduledStartUtcAsc(
        Instant windowStartUtc,
        Instant windowEndUtc
    );
}
