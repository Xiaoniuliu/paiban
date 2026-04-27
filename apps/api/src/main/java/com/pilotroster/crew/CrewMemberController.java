package com.pilotroster.crew;

import com.pilotroster.common.ApiResponse;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/crew-members")
public class CrewMemberController {

    private final CrewMemberRepository crewMemberRepository;
    private final CrewQualificationRepository crewQualificationRepository;
    private final CrewExternalWorkRepository crewExternalWorkRepository;

    public CrewMemberController(
        CrewMemberRepository crewMemberRepository,
        CrewQualificationRepository crewQualificationRepository,
        CrewExternalWorkRepository crewExternalWorkRepository
    ) {
        this.crewMemberRepository = crewMemberRepository;
        this.crewQualificationRepository = crewQualificationRepository;
        this.crewExternalWorkRepository = crewExternalWorkRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<CrewMember>> list() {
        return ApiResponse.ok(crewMemberRepository.findAll());
    }

    @GetMapping("/{crewId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<CrewMember> detail(@PathVariable Long crewId) {
        return ApiResponse.ok(crew(crewId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewMember> create(@RequestBody CrewMember input) {
        normalizeCrew(input);
        return ApiResponse.ok(crewMemberRepository.save(input));
    }

    @PutMapping("/{crewId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewMember> update(@PathVariable Long crewId, @RequestBody CrewMember input) {
        CrewMember crew = crew(crewId);
        crew.setCrewCode(input.getCrewCode());
        crew.setEmployeeNo(input.getEmployeeNo());
        crew.setNameZh(input.getNameZh());
        crew.setNameEn(input.getNameEn());
        crew.setRoleCode(input.getRoleCode());
        crew.setRankCode(input.getRankCode());
        crew.setHomeBase(input.getHomeBase());
        crew.setAircraftQualification(input.getAircraftQualification());
        crew.setAcclimatizationStatus(input.getAcclimatizationStatus());
        crew.setBodyClockTimezone(input.getBodyClockTimezone());
        crew.setNormalCommuteMinutes(input.getNormalCommuteMinutes());
        crew.setExternalEmploymentFlag(input.getExternalEmploymentFlag());
        crew.setAvailabilityStatus(input.getAvailabilityStatus());
        crew.setStatus(input.getStatus());
        normalizeCrew(crew);
        return ApiResponse.ok(crewMemberRepository.save(crew));
    }

    @DeleteMapping("/{crewId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewMember> disable(@PathVariable Long crewId) {
        CrewMember crew = crew(crewId);
        crew.setStatus("INACTIVE");
        crew.setAvailabilityStatus("UNAVAILABLE");
        return ApiResponse.ok(crewMemberRepository.save(crew));
    }

    @GetMapping("/qualifications")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<CrewQualification>> allQualifications() {
        return ApiResponse.ok(crewQualificationRepository.findAllByOrderByCrewMemberIdAscQualificationTypeAsc());
    }

    @GetMapping("/{crewId}/qualifications")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<List<CrewQualification>> qualifications(@PathVariable Long crewId) {
        return ApiResponse.ok(crewQualificationRepository.findAllByCrewMemberIdOrderByQualificationTypeAsc(crewId));
    }

    @PostMapping("/{crewId}/qualifications")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewQualification> createQualification(@PathVariable Long crewId, @RequestBody CrewQualification input) {
        crew(crewId);
        input.setCrewMemberId(crewId);
        input.setStatus(defaultString(input.getStatus(), "ACTIVE"));
        return ApiResponse.ok(crewQualificationRepository.save(input));
    }

    @PutMapping("/{crewId}/qualifications/{qualificationId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewQualification> updateQualification(
        @PathVariable Long crewId,
        @PathVariable Long qualificationId,
        @RequestBody CrewQualification input
    ) {
        crew(crewId);
        CrewQualification qualification = crewQualificationRepository.findById(qualificationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Qualification not found"));
        qualification.setCrewMemberId(crewId);
        qualification.setQualificationType(input.getQualificationType());
        qualification.setQualificationCode(input.getQualificationCode());
        qualification.setEffectiveFromUtc(input.getEffectiveFromUtc());
        qualification.setEffectiveToUtc(input.getEffectiveToUtc());
        qualification.setStatus(defaultString(input.getStatus(), "ACTIVE"));
        return ApiResponse.ok(crewQualificationRepository.save(qualification));
    }

    @DeleteMapping("/{crewId}/qualifications/{qualificationId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewQualification> disableQualification(@PathVariable Long crewId, @PathVariable Long qualificationId) {
        crew(crewId);
        CrewQualification qualification = crewQualificationRepository.findById(qualificationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Qualification not found"));
        qualification.setStatus("INACTIVE");
        return ApiResponse.ok(crewQualificationRepository.save(qualification));
    }

    @GetMapping("/external-work")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<CrewExternalWork>> allExternalWork() {
        return ApiResponse.ok(crewExternalWorkRepository.findAllByOrderByStartUtcDesc());
    }

    @GetMapping("/{crewId}/external-work")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<List<CrewExternalWork>> externalWork(@PathVariable Long crewId) {
        return ApiResponse.ok(crewExternalWorkRepository.findAllByCrewMemberIdOrderByStartUtcDesc(crewId));
    }

    @PostMapping("/{crewId}/external-work")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewExternalWork> createExternalWork(@PathVariable Long crewId, @RequestBody CrewExternalWork input) {
        crew(crewId);
        input.setCrewMemberId(crewId);
        input.setStatus(defaultString(input.getStatus(), "ACTIVE"));
        return ApiResponse.ok(crewExternalWorkRepository.save(input));
    }

    @PutMapping("/{crewId}/external-work/{workId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewExternalWork> updateExternalWork(
        @PathVariable Long crewId,
        @PathVariable Long workId,
        @RequestBody CrewExternalWork input
    ) {
        crew(crewId);
        CrewExternalWork work = crewExternalWorkRepository.findById(workId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "External work not found"));
        work.setCrewMemberId(crewId);
        work.setExternalType(input.getExternalType());
        work.setStartUtc(input.getStartUtc());
        work.setEndUtc(input.getEndUtc());
        work.setDescription(defaultString(input.getDescription(), ""));
        work.setStatus(defaultString(input.getStatus(), "ACTIVE"));
        return ApiResponse.ok(crewExternalWorkRepository.save(work));
    }

    @DeleteMapping("/{crewId}/external-work/{workId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewExternalWork> disableExternalWork(@PathVariable Long crewId, @PathVariable Long workId) {
        crew(crewId);
        CrewExternalWork work = crewExternalWorkRepository.findById(workId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "External work not found"));
        work.setStatus("INACTIVE");
        return ApiResponse.ok(crewExternalWorkRepository.save(work));
    }

    @GetMapping("/{crewId}/duty-calendar")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<List<CrewExternalWork>> dutyCalendar(@PathVariable Long crewId) {
        return ApiResponse.ok(crewExternalWorkRepository.findAllByCrewMemberIdOrderByStartUtcDesc(crewId));
    }

    private CrewMember crew(Long crewId) {
        return crewMemberRepository.findById(crewId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Crew member not found"));
    }

    private void normalizeCrew(CrewMember crew) {
        crew.setEmployeeNo(defaultString(crew.getEmployeeNo(), crew.getCrewCode()));
        crew.setRankCode(defaultString(crew.getRankCode(), crew.getRoleCode()));
        crew.setHomeBase(defaultString(crew.getHomeBase(), "MFM"));
        crew.setAircraftQualification(defaultString(crew.getAircraftQualification(), "A330"));
        crew.setAcclimatizationStatus(defaultString(crew.getAcclimatizationStatus(), "ACCLIMATIZED"));
        crew.setBodyClockTimezone(defaultString(crew.getBodyClockTimezone(), "Asia/Macau"));
        crew.setNormalCommuteMinutes(crew.getNormalCommuteMinutes() == null ? 0 : crew.getNormalCommuteMinutes());
        crew.setExternalEmploymentFlag(crew.getExternalEmploymentFlag() != null && crew.getExternalEmploymentFlag());
        crew.setAvailabilityStatus(defaultString(crew.getAvailabilityStatus(), "AVAILABLE"));
        crew.setStatus(defaultString(crew.getStatus(), "ACTIVE"));
        crew.setRollingFlightHours28d(crew.getRollingFlightHours28d() == null ? BigDecimal.ZERO : crew.getRollingFlightHours28d());
        crew.setRollingDutyHours28d(crew.getRollingDutyHours28d() == null ? BigDecimal.ZERO : crew.getRollingDutyHours28d());
        crew.setRollingDutyHours7d(crew.getRollingDutyHours7d() == null ? BigDecimal.ZERO : crew.getRollingDutyHours7d());
        crew.setRollingDutyHours14d(crew.getRollingDutyHours14d() == null ? BigDecimal.ZERO : crew.getRollingDutyHours14d());
        crew.setRollingFlightHours12m(crew.getRollingFlightHours12m() == null ? BigDecimal.ZERO : crew.getRollingFlightHours12m());
        crew.setLatestActualFdpSource(defaultString(crew.getLatestActualFdpSource(), "ACTUAL_ONLY"));
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
