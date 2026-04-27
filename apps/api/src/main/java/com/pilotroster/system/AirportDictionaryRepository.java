package com.pilotroster.system;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AirportDictionaryRepository extends JpaRepository<AirportDictionary, Long> {

    List<AirportDictionary> findAllByOrderByIataCodeAsc();
}
