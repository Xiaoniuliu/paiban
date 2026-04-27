package com.pilotroster.archive;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlightArchiveCaseRepository extends JpaRepository<FlightArchiveCase, Long> {

    Optional<FlightArchiveCase> findByFlightId(Long flightId);

    boolean existsByFlightId(Long flightId);
}
