package com.pilotroster.archive;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrewArchiveFormRepository extends JpaRepository<CrewArchiveForm, Long> {

    List<CrewArchiveForm> findAllByArchiveCaseIdOrderByIdAsc(Long archiveCaseId);

    List<CrewArchiveForm> findAllByCrewIdOrderByIdAsc(Long crewId);
}
