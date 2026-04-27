package com.pilotroster.flightops;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AircraftRegistryRepository extends JpaRepository<AircraftRegistry, Long> {

    List<AircraftRegistry> findAllByOrderByAircraftNoAsc();
}
