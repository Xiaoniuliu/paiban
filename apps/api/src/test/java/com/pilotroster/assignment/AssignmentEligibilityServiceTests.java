package com.pilotroster.assignment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pilotroster.crew.CrewMember;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AssignmentEligibilityServiceTests {

    @Test
    void exposesOnlyMapBasedCurrentAvailabilityEntryPoint() {
        assertThat(Arrays.stream(AssignmentEligibilityService.class.getDeclaredMethods()))
            .filteredOn(method -> method.getName().equals("currentAvailability"))
            .extracting(Method::getParameterTypes)
            .allMatch(parameterTypes -> parameterTypes.length == 2 && parameterTypes[1] == Map.class);
    }

    @Test
    void reusesPrecomputedActiveStatusBlocksAcrossCrewAvailabilityChecks() {
        TimelineBlockRepository timelineBlockRepository = mock(TimelineBlockRepository.class);
        AssignmentEligibilityService service = new AssignmentEligibilityService(timelineBlockRepository);
        Instant now = Instant.parse("2026-05-01T10:00:00Z");
        Instant blockedUntil = now.plusSeconds(1800);

        when(timelineBlockRepository.findAllByEndUtcAfterAndStartUtcBeforeOrderByStartUtcAsc(now, now))
            .thenReturn(List.of(statusBlock(101L, "REST", blockedUntil)));

        Map<Long, TimelineBlock> activeStatusBlockByCrewId = service.activeStatusBlockByCrewId(now);

        AssignmentEligibilityService.CurrentAvailability blockedAvailability =
            service.currentAvailability(crewMember(101L, "ACTIVE", "AVAILABLE"), activeStatusBlockByCrewId);
        AssignmentEligibilityService.CurrentAvailability availableAvailability =
            service.currentAvailability(crewMember(202L, "ACTIVE", "AVAILABLE"), activeStatusBlockByCrewId);

        assertThat(blockedAvailability.availableForAssignmentNow()).isFalse();
        assertThat(blockedAvailability.unavailableBlockType()).isEqualTo("REST");
        assertThat(blockedAvailability.unavailableUntilUtc()).isEqualTo(blockedUntil);
        assertThat(availableAvailability.availableForAssignmentNow()).isTrue();
        assertThat(availableAvailability.unavailableBlockType()).isNull();
        assertThat(availableAvailability.unavailableUntilUtc()).isNull();
        verify(timelineBlockRepository).findAllByEndUtcAfterAndStartUtcBeforeOrderByStartUtcAsc(now, now);
    }

    private CrewMember crewMember(Long id, String status, String availabilityStatus) {
        CrewMember crewMember = new CrewMember();
        crewMember.setCrewCode("TEST-" + id);
        crewMember.setEmployeeNo("TEST-" + id);
        crewMember.setNameZh("Test " + id);
        crewMember.setNameEn("Test " + id);
        crewMember.setRoleCode("CAPTAIN");
        crewMember.setRankCode("CPT");
        crewMember.setHomeBase("MFM");
        crewMember.setAircraftQualification("A330");
        crewMember.setAcclimatizationStatus("ACCLIMATIZED");
        crewMember.setBodyClockTimezone("Asia/Macau");
        crewMember.setNormalCommuteMinutes(20);
        crewMember.setExternalEmploymentFlag(false);
        crewMember.setStatus(status);
        crewMember.setAvailabilityStatus(availabilityStatus);
        setId(crewMember, id);
        return crewMember;
    }

    private TimelineBlock statusBlock(Long crewId, String blockType, Instant endUtc) {
        TimelineBlock timelineBlock = new TimelineBlock();
        timelineBlock.setCrewMemberId(crewId);
        timelineBlock.setBlockType(blockType);
        timelineBlock.setStartUtc(endUtc.minusSeconds(1800));
        timelineBlock.setEndUtc(endUtc);
        timelineBlock.setDisplayLabel("Status block");
        timelineBlock.setStatus("PLANNED");
        timelineBlock.setAssignmentRole("STATUS");
        timelineBlock.setDisplayOrder(0);
        timelineBlock.setRosterVersionId(1L);
        return timelineBlock;
    }

    private void setId(CrewMember crewMember, Long id) {
        try {
            java.lang.reflect.Field idField = CrewMember.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(crewMember, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Failed to set crew member id for test", ex);
        }
    }
}
