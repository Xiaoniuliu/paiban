package com.pilotroster.crew;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.auth.UserRole;
import com.pilotroster.common.ApiResponse;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public CrewMemberController(
        CrewMemberRepository crewMemberRepository,
        CrewQualificationRepository crewQualificationRepository
    ) {
        this.crewMemberRepository = crewMemberRepository;
        this.crewQualificationRepository = crewQualificationRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<CrewMember>> list() {
        return ApiResponse.ok(crewMemberRepository.findAll());
    }

    @GetMapping("/{crewId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<CrewMember> detail(@PathVariable Long crewId, @AuthenticationPrincipal AuthenticatedUser user) {
        assertCrewAccess(user, crewId);
        return ApiResponse.ok(crew(crewId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewMember> create(@RequestBody CrewProfileWriteRequest input) {
        CrewMember crew = new CrewMember();
        applyCrewProfileWrite(crew, input);
        normalizeCrew(crew);
        try {
            return ApiResponse.ok(crewMemberRepository.save(crew));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Crew profile violates uniqueness or master-data constraints", ex);
        }
    }

    @PutMapping("/{crewId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewMember> update(@PathVariable Long crewId, @RequestBody CrewProfileWriteRequest input) {
        CrewMember crew = crew(crewId);
        applyCrewProfileWrite(crew, input);
        normalizeCrew(crew);
        try {
            return ApiResponse.ok(crewMemberRepository.save(crew));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Crew profile update violates uniqueness or master-data constraints", ex);
        }
    }

    @DeleteMapping("/{crewId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewMember> disable(@PathVariable Long crewId) {
        CrewMember crew = crew(crewId);
        crew.setStatus("INACTIVE");
        crew.setAvailabilityStatus("UNAVAILABLE");
        return ApiResponse.ok(crewMemberRepository.save(crew));
    }

    @PostMapping("/{crewId}/reactivate")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewMember> reactivate(@PathVariable Long crewId) {
        CrewMember crew = crew(crewId);
        crew.setStatus("ACTIVE");
        crew.setAvailabilityStatus("AVAILABLE");
        return ApiResponse.ok(crewMemberRepository.save(crew));
    }

    @GetMapping("/qualifications")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<CrewQualification>> allQualifications() {
        return ApiResponse.ok(crewQualificationRepository.findAllByOrderByCrewMemberIdAscQualificationTypeAsc());
    }

    @GetMapping("/{crewId}/qualifications")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<List<CrewQualification>> qualifications(@PathVariable Long crewId, @AuthenticationPrincipal AuthenticatedUser user) {
        assertCrewAccess(user, crewId);
        return ApiResponse.ok(crewQualificationRepository.findAllByCrewMemberIdOrderByQualificationTypeAsc(crewId));
    }

    @PostMapping("/{crewId}/qualifications")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewQualification> createQualification(@PathVariable Long crewId, @RequestBody CrewQualification input) {
        crew(crewId);
        input.setCrewMemberId(crewId);
        input.setStatus(defaultString(input.getStatus(), "ACTIVE"));
        try {
            return ApiResponse.ok(crewQualificationRepository.save(input));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Crew qualification violates uniqueness or master-data constraints", ex);
        }
    }

    @PutMapping("/{crewId}/qualifications/{qualificationId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewQualification> updateQualification(
        @PathVariable Long crewId,
        @PathVariable Long qualificationId,
        @RequestBody CrewQualification input
    ) {
        crew(crewId);
        CrewQualification qualification = crewQualificationRepository.findByIdAndCrewMemberId(qualificationId, crewId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Qualification not found"));
        qualification.setQualificationType(input.getQualificationType());
        qualification.setQualificationCode(input.getQualificationCode());
        qualification.setEffectiveFromUtc(input.getEffectiveFromUtc());
        qualification.setEffectiveToUtc(input.getEffectiveToUtc());
        qualification.setStatus(defaultString(input.getStatus(), "ACTIVE"));
        try {
            return ApiResponse.ok(crewQualificationRepository.save(qualification));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Crew qualification update violates uniqueness or master-data constraints", ex);
        }
    }

    @DeleteMapping("/{crewId}/qualifications/{qualificationId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewQualification> disableQualification(@PathVariable Long crewId, @PathVariable Long qualificationId) {
        crew(crewId);
        CrewQualification qualification = crewQualificationRepository.findByIdAndCrewMemberId(qualificationId, crewId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Qualification not found"));
        qualification.setStatus("INACTIVE");
        return ApiResponse.ok(crewQualificationRepository.save(qualification));
    }

    @GetMapping("/external-work")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<CrewExternalWork>> allExternalWork() {
        throw retiredExternalWorkContract();
    }

    @GetMapping("/{crewId}/external-work")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<List<CrewExternalWork>> externalWork(@PathVariable Long crewId, @AuthenticationPrincipal AuthenticatedUser user) {
        assertCrewAccess(user, crewId);
        throw retiredExternalWorkContract();
    }

    @PostMapping("/{crewId}/external-work")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewExternalWork> createExternalWork(@PathVariable Long crewId, @RequestBody CrewExternalWork input) {
        throw retiredExternalWorkContract();
    }

    @PutMapping("/{crewId}/external-work/{workId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewExternalWork> updateExternalWork(
        @PathVariable Long crewId,
        @PathVariable Long workId,
        @RequestBody CrewExternalWork input
    ) {
        throw retiredExternalWorkContract();
    }

    @DeleteMapping("/{crewId}/external-work/{workId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<CrewExternalWork> disableExternalWork(@PathVariable Long crewId, @PathVariable Long workId) {
        throw retiredExternalWorkContract();
    }

    @GetMapping("/{crewId}/duty-calendar")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN', 'PILOT')")
    public ApiResponse<List<CrewExternalWork>> dutyCalendar(@PathVariable Long crewId, @AuthenticationPrincipal AuthenticatedUser user) {
        assertCrewAccess(user, crewId);
        throw retiredExternalWorkContract();
    }

    private void assertCrewAccess(AuthenticatedUser user, Long crewId) {
        if (user != null && user.role() == UserRole.PILOT && !crewId.equals(user.crewId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Pilot can only access linked crew data");
        }
    }

    private CrewMember crew(Long crewId) {
        return crewMemberRepository.findById(crewId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Crew member not found"));
    }

    private void applyCrewProfileWrite(CrewMember crew, CrewProfileWriteRequest input) {
        crew.setCrewCode(input.crewCode());
        crew.setEmployeeNo(input.employeeNo());
        crew.setNameZh(input.nameZh());
        crew.setNameEn(input.nameEn());
        crew.setRoleCode(input.roleCode());
        crew.setRankCode(input.rankCode());
        crew.setHomeBase(input.homeBase());
        crew.setAircraftQualification(input.aircraftQualification());
        crew.setAcclimatizationStatus(input.acclimatizationStatus());
        crew.setBodyClockTimezone(input.bodyClockTimezone());
        crew.setNormalCommuteMinutes(input.normalCommuteMinutes());
        crew.setExternalEmploymentFlag(input.externalEmploymentFlag());
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

    private ResponseStatusException retiredExternalWorkContract() {
        return new ResponseStatusException(HttpStatus.GONE, "Crew external work contract retired; use crew status timeline instead");
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    record CrewProfileWriteRequest(
        String crewCode,
        String employeeNo,
        String nameZh,
        String nameEn,
        String roleCode,
        String rankCode,
        String homeBase,
        String aircraftQualification,
        String acclimatizationStatus,
        String bodyClockTimezone,
        Integer normalCommuteMinutes,
        Boolean externalEmploymentFlag
    ) {
    }
}
