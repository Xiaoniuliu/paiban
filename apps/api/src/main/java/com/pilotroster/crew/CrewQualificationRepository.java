package com.pilotroster.crew;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrewQualificationRepository extends JpaRepository<CrewQualification, Long> {

    List<CrewQualification> findAllByOrderByCrewMemberIdAscQualificationTypeAsc();

    List<CrewQualification> findAllByCrewMemberIdOrderByQualificationTypeAsc(Long crewMemberId);

    Optional<CrewQualification> findByIdAndCrewMemberId(Long id, Long crewMemberId);
}
