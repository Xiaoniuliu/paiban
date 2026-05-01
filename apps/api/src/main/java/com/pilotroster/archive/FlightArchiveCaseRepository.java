package com.pilotroster.archive;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlightArchiveCaseRepository extends JpaRepository<FlightArchiveCase, Long> {

    Optional<FlightArchiveCase> findByFlightId(Long flightId);

    List<FlightArchiveCase> findAllByFlightIdIn(List<Long> flightIds);

    boolean existsByFlightId(Long flightId);
}
