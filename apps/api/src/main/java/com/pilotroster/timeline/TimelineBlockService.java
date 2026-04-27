package com.pilotroster.timeline;

import com.pilotroster.crew.CrewMember;
import com.pilotroster.crew.CrewMemberRepository;
import com.pilotroster.timeline.TimelineBlockDtos.CreateCrewStatusBlockRequest;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TimelineBlockService {

    private static final Set<String> CREW_STATUS_BLOCK_TYPES = Set.of(
        "POSITIONING",
        "STANDBY",
        "DUTY",
        "TRAINING",
        "REST",
        "DDO",
        "RECOVERY"
    );

    private static final Map<String, String> BLOCK_TYPE_ALIASES = Map.of(
        "GROUND_DUTY", "DUTY",
        "COURSE_DUTY", "DUTY",
        "VALUE_DUTY", "DUTY",
        "SIMULATOR", "TRAINING",
        "SIM", "TRAINING",
        "REST_PERIOD", "REST",
        "RECOVERY_PERIOD", "RECOVERY",
        "POSITIONING_DUTY", "POSITIONING"
    );

    private final TimelineBlockRepository timelineBlockRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final JdbcTemplate jdbcTemplate;

    public TimelineBlockService(
        TimelineBlockRepository timelineBlockRepository,
        CrewMemberRepository crewMemberRepository,
        JdbcTemplate jdbcTemplate
    ) {
        this.timelineBlockRepository = timelineBlockRepository;
        this.crewMemberRepository = crewMemberRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<TimelineBlock> list() {
        return timelineBlockRepository.findAllByOrderByStartUtcAsc();
    }

    @Transactional
    public TimelineBlock createCrewStatusBlock(CreateCrewStatusBlockRequest request) {
        CrewStatusBlockInput input = validateCrewStatusBlockInput(request);

        TimelineBlock block = new TimelineBlock();
        block.setRosterVersionId(draftRosterVersionId());
        block.setCrewMemberId(input.crew().getId());
        block.setTaskPlanItemId(null);
        block.setBlockType(input.blockType());
        block.setStartUtc(request.startUtc());
        block.setEndUtc(request.endUtc());
        block.setDisplayLabel(displayLabel(request.displayLabel(), input.blockType(), input.crew()));
        block.setStatus("PLANNED");
        block.setAssignmentRole("EXTRA");
        block.setDisplayOrder(50);
        return timelineBlockRepository.save(block);
    }

    @Transactional
    public TimelineBlock updateCrewStatusBlock(Long blockId, CreateCrewStatusBlockRequest request) {
        TimelineBlock block = manualCrewStatusBlock(blockId);
        CrewStatusBlockInput input = validateCrewStatusBlockInput(request);
        block.setCrewMemberId(input.crew().getId());
        block.setBlockType(input.blockType());
        block.setStartUtc(request.startUtc());
        block.setEndUtc(request.endUtc());
        block.setDisplayLabel(displayLabel(request.displayLabel(), input.blockType(), input.crew()));
        block.setStatus("PLANNED");
        return timelineBlockRepository.save(block);
    }

    @Transactional
    public void deleteCrewStatusBlock(Long blockId) {
        timelineBlockRepository.delete(manualCrewStatusBlock(blockId));
    }

    private TimelineBlock manualCrewStatusBlock(Long blockId) {
        TimelineBlock block = timelineBlockRepository.findById(blockId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Crew status block not found"));
        String blockType = normalizeBlockType(block.getBlockType());
        if (block.getTaskPlanItemId() != null
            || block.getCrewMemberId() == null
            || !CREW_STATUS_BLOCK_TYPES.contains(blockType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only manual crew status blocks can be changed");
        }
        return block;
    }

    private CrewStatusBlockInput validateCrewStatusBlockInput(CreateCrewStatusBlockRequest request) {
        if (!request.startUtc().isBefore(request.endUtc())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status block end must be after start");
        }
        String blockType = normalizeBlockType(request.blockType());
        if (!CREW_STATUS_BLOCK_TYPES.contains(blockType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported crew status block type");
        }
        CrewMember crew = crewMemberRepository.findById(request.crewMemberId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Crew member not found"));
        return new CrewStatusBlockInput(blockType, crew);
    }

    private String normalizeBlockType(String blockType) {
        String normalized = blockType == null ? "" : blockType.trim().toUpperCase();
        return BLOCK_TYPE_ALIASES.getOrDefault(normalized, normalized);
    }

    private String displayLabel(String requestedLabel, String blockType, CrewMember crew) {
        if (requestedLabel != null && !requestedLabel.isBlank()) {
            return requestedLabel.trim();
        }
        return blockType + " " + crew.getCrewCode();
    }

    private Long draftRosterVersionId() {
        List<Long> ids = jdbcTemplate.queryForList(
            "SELECT id FROM roster_version WHERE status = 'DRAFT' ORDER BY id DESC LIMIT 1",
            Long.class
        );
        if (ids.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Draft roster version not found");
        }
        return ids.get(0);
    }

    private record CrewStatusBlockInput(String blockType, CrewMember crew) {
    }
}
