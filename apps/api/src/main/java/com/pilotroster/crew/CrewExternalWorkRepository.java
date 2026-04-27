package com.pilotroster.crew;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrewExternalWorkRepository extends JpaRepository<CrewExternalWork, Long> {

    List<CrewExternalWork> findAllByOrderByStartUtcDesc();

    List<CrewExternalWork> findAllByCrewMemberIdOrderByStartUtcDesc(Long crewMemberId);
}
