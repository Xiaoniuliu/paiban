package com.pilotroster.crew;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrewExternalWorkRepository extends JpaRepository<CrewExternalWork, Long> {

    List<CrewExternalWork> findAllByOrderByStartUtcDesc();

    List<CrewExternalWork> findAllByCrewMemberIdOrderByStartUtcDesc(Long crewMemberId);

    Optional<CrewExternalWork> findByIdAndCrewMemberId(Long id, Long crewMemberId);
}
