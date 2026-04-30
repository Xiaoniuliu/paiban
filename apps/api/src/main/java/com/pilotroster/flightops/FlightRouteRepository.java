package com.pilotroster.flightops;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlightRouteRepository extends JpaRepository<FlightRoute, Long> {

    List<FlightRoute> findAllByOrderByRouteCodeAsc();

    boolean existsByDepartureAirportOrArrivalAirport(String departureAirport, String arrivalAirport);
}
