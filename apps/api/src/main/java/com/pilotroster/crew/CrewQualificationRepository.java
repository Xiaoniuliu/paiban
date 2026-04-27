package com.pilotroster.crew;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrewQualificationRepository extends JpaRepository<CrewQualification, Long> {

    List<CrewQualification> findAllByOrderByCrewMemberIdAscQualificationTypeAsc();

    List<CrewQualification> findAllByCrewMemberIdOrderByQualificationTypeAsc(Long crewMemberId);
}
