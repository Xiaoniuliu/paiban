package com.pilotroster.archive;

import com.pilotroster.archive.ArchiveDtos.ArchiveCaseDetailResponse;
import com.pilotroster.archive.ArchiveDtos.ArchiveCaseResponse;
import com.pilotroster.archive.ArchiveDtos.ArchiveSyncResponse;
import com.pilotroster.archive.ArchiveDtos.CrewArchiveFormResponse;
import com.pilotroster.archive.ArchiveDtos.CrewArchiveSummary;
import com.pilotroster.archive.ArchiveDtos.PilotArchiveSummaryResponse;
import com.pilotroster.archive.ArchiveDtos.GanttTimelineBlockResponse;
import com.pilotroster.archive.ArchiveDtos.SaveCrewArchiveFormRequest;
import com.pilotroster.archive.ArchiveDtos.SaveCrewArchiveFormResponse;
import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.auth.UserRole;
import com.pilotroster.crew.CrewMember;
import com.pilotroster.crew.CrewMemberRepository;
import com.pilotroster.framework.AuditLogService;
import com.pilotroster.framework.DomainEventService;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ArchiveService {

    private static final String TASK_TYPE_FLIGHT = "FLIGHT";
    private static final String STATUS_ASSIGNED = "ASSIGNED";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final long ARCHIVE_DEADLINE_HOURS = 24;

    private final FlightArchiveCaseRepository archiveCaseRepository;
    private final CrewArchiveFormRepository crewArchiveFormRepository;
    private final TimelineBlockRepository timelineBlockRepository;
    private final TaskPlanItemRepository taskPlanItemRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final AuditLogService auditLogService;
    private final DomainEventService domainEventService;

    public ArchiveService(
        FlightArchiveCaseRepository archiveCaseRepository,
        CrewArchiveFormRepository crewArchiveFormRepository,
        TimelineBlockRepository timelineBlockRepository,
        TaskPlanItemRepository taskPlanItemRepository,
        CrewMemberRepository crewMemberRepository,
        AuditLogService auditLogService,
        DomainEventService domainEventService
    ) {
        this.archiveCaseRepository = archiveCaseRepository;
        this.crewArchiveFormRepository = crewArchiveFormRepository;
        this.timelineBlockRepository = timelineBlockRepository;
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.crewMemberRepository = crewMemberRepository;
        this.auditLogService = auditLogService;
        this.domainEventService = domainEventService;
    }

    @Transactional
    public ArchiveSyncResponse syncArchiveState() {
        Map<Long, TaskPlanItem> taskById = taskPlanItemRepository.findAll()
            .stream()
            .collect(Collectors.toMap(TaskPlanItem::getId, Function.identity()));
        Map<Long, List<TimelineBlock>> blocksByTaskId = timelineBlocksByTaskId();
        Instant now = Instant.now();
        syncEligibleArchiveCases(taskById, blocksByTaskId, now);
        archiveCaseRepository.findAll().forEach(this::refreshArchiveCase);
        return new ArchiveSyncResponse((int) archiveCaseRepository.count());
    }

    @Transactional(readOnly = true)
    public List<ArchiveCaseResponse> archiveCases(AuthenticatedUser user) {
        Map<Long, TaskPlanItem> taskById = taskPlanItemRepository.findAll()
            .stream()
            .collect(Collectors.toMap(TaskPlanItem::getId, Function.identity()));
        Map<Long, List<TimelineBlock>> blocksByTaskId = timelineBlocksByTaskId();
        Instant now = Instant.now();
        return archiveCaseRepository.findAll()
            .stream()
            .filter(archiveCase -> isArchiveCaseVisible(archiveCase, taskById.get(archiveCase.getFlightId()), blocksByTaskId, now))
            .sorted(Comparator.comparing((FlightArchiveCase archiveCase) -> {
                TaskPlanItem task = taskById.get(archiveCase.getFlightId());
                return task == null ? Instant.EPOCH : task.getScheduledStartUtc();
            }).thenComparing(FlightArchiveCase::getId))
            .map(archiveCase -> {
                TaskPlanItem task = taskById.get(archiveCase.getFlightId());
                if (task == null) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Flight not found");
                }
                return toArchiveCaseResponse(
                    archiveCase,
                    task,
                    canEditArchive(user, archiveCase),
                    readOnlyReason(user, archiveCase)
                );
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<GanttTimelineBlockResponse> ganttTimeline(
        AuthenticatedUser user,
        Instant windowStartUtc,
        Instant windowEndUtc,
        String viewMode
    ) {
        validateTimelineWindow(windowStartUtc, windowEndUtc, viewMode);
        Map<Long, CrewMember> crewById = crewMemberRepository.findAll()
            .stream()
            .collect(Collectors.toMap(CrewMember::getId, Function.identity()));
        Map<Long, TaskPlanItem> taskById = taskPlanItemRepository.findAll()
            .stream()
            .collect(Collectors.toMap(TaskPlanItem::getId, Function.identity()));
        Map<Long, List<TimelineBlock>> blocksByTaskId = timelineBlocksByTaskId();
        Instant now = Instant.now();
        Map<Long, FlightArchiveCase> caseByFlightId = archiveCaseRepository.findAll()
            .stream()
            .filter(archiveCase -> isArchiveCaseVisible(archiveCase, taskById.get(archiveCase.getFlightId()), blocksByTaskId, now))
            .collect(Collectors.toMap(FlightArchiveCase::getFlightId, Function.identity()));

        List<TimelineBlock> timelineBlocks = timelineBlockRepository
            .findAllByEndUtcAfterAndStartUtcBeforeOrderByStartUtcAsc(windowStartUtc, windowEndUtc)
            .stream()
            .filter(block -> "CREW".equals(viewMode) || "FLIGHT".equals(block.getBlockType()))
            .toList();
        Set<Long> taskIdsWithBlocks = new HashSet<>();
        List<GanttTimelineBlockResponse> responses = new ArrayList<>();

        for (TimelineBlock block : timelineBlocks) {
            if (block.getTaskPlanItemId() != null) {
                taskIdsWithBlocks.add(block.getTaskPlanItemId());
            }
            CrewMember crew = crewById.get(block.getCrewMemberId());
            TaskPlanItem task = taskById.get(block.getTaskPlanItemId());
            FlightArchiveCase archiveCase = caseByFlightId.get(block.getTaskPlanItemId());
            CrewArchiveSummary summary = archiveCase == null
                ? new CrewArchiveSummary(0, 0, 0, 0)
                : summarize(refreshArchiveCase(archiveCase));
            responses.add(toTimelineBlock(user, block, crew, task, archiveCase, summary));
        }

        taskPlanItemRepository.findAllByScheduledEndUtcAfterAndScheduledStartUtcBeforeOrderByScheduledStartUtcAsc(windowStartUtc, windowEndUtc)
            .stream()
            .filter(task -> "UNASSIGNED".equals(task.getStatus()))
            .filter(task -> !taskIdsWithBlocks.contains(task.getId()))
            .map(this::toUnassignedTimelineBlock)
            .forEach(responses::add);

        return responses.stream()
            .sorted(Comparator.comparing(GanttTimelineBlockResponse::startUtc)
                .thenComparing(GanttTimelineBlockResponse::displayLabel))
            .toList();
    }

    private void validateTimelineWindow(Instant windowStartUtc, Instant windowEndUtc, String viewMode) {
        if (windowStartUtc == null || windowEndUtc == null || !windowStartUtc.isBefore(windowEndUtc)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid timeline window is required");
        }
        if (!"FLIGHT".equals(viewMode) && !"CREW".equals(viewMode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported timeline view mode");
        }
    }

    private void syncEligibleArchiveCases(
        Map<Long, TaskPlanItem> taskById,
        Map<Long, List<TimelineBlock>> blocksByTaskId,
        Instant now
    ) {
        Map<Long, FlightArchiveCase> caseByFlightId = archiveCaseRepository.findAll()
            .stream()
            .collect(Collectors.toMap(FlightArchiveCase::getFlightId, Function.identity()));
        for (TaskPlanItem task : taskById.values()) {
            List<TimelineBlock> blocks = blocksByTaskId.getOrDefault(task.getId(), List.of());
            if (!isArchiveEligible(task, blocks, now)) {
                continue;
            }
            Instant deadline = effectiveEndUtc(task).plusSeconds(ARCHIVE_DEADLINE_HOURS * 60 * 60);
            FlightArchiveCase archiveCase = caseByFlightId.get(task.getId());
            if (archiveCase == null) {
                Long rosterVersionId = blocks.stream()
                    .map(TimelineBlock::getRosterVersionId)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Roster version missing"));
                archiveCase = archiveCaseRepository.save(new FlightArchiveCase(task.getId(), rosterVersionId, deadline));
                caseByFlightId.put(task.getId(), archiveCase);
            } else if (!deadline.equals(archiveCase.getArchiveDeadlineAtUtc())) {
                archiveCase.setArchiveDeadlineAtUtc(deadline);
                archiveCase.incrementRevision();
                archiveCaseRepository.save(archiveCase);
            }
            refreshArchiveCase(archiveCase);
        }
    }

    private Map<Long, List<TimelineBlock>> timelineBlocksByTaskId() {
        return timelineBlockRepository.findAll()
            .stream()
            .filter(block -> block.getTaskPlanItemId() != null)
            .collect(Collectors.groupingBy(TimelineBlock::getTaskPlanItemId));
    }

    private boolean isArchiveCaseVisible(
        FlightArchiveCase archiveCase,
        TaskPlanItem task,
        Map<Long, List<TimelineBlock>> blocksByTaskId,
        Instant now
    ) {
        if (ArchiveStatus.ARCHIVED.equals(archiveCase.getArchiveStatus())) {
            return true;
        }
        return isArchiveEligible(task, blocksByTaskId.getOrDefault(archiveCase.getFlightId(), List.of()), now);
    }

    private boolean isArchiveEligible(TaskPlanItem task, List<TimelineBlock> blocks, Instant now) {
        return task != null
            && TASK_TYPE_FLIGHT.equals(task.getTaskType())
            && (STATUS_ASSIGNED.equals(task.getStatus()) || STATUS_PUBLISHED.equals(task.getStatus()))
            && !effectiveEndUtc(task).isAfter(now)
            && blocks.stream().anyMatch(block -> block.getCrewMemberId() != null);
    }

    private Instant effectiveEndUtc(TaskPlanItem task) {
        return task.getScheduledEndUtc();
    }

    @Transactional(readOnly = true)
    public ArchiveCaseDetailResponse archiveCaseDetail(Long archiveCaseId, AuthenticatedUser user) {
        FlightArchiveCase archiveCase = archiveCaseRepository.findById(archiveCaseId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Archive case not found"));
        List<CrewArchiveForm> forms = crewArchiveFormRepository.findAllByArchiveCaseIdOrderByIdAsc(archiveCase.getId());
        return toArchiveCaseDetail(archiveCase, forms, user);
    }

    @Transactional
    public SaveCrewArchiveFormResponse saveCrewArchiveForm(
        Long formId,
        SaveCrewArchiveFormRequest request,
        AuthenticatedUser user
    ) {
        CrewArchiveForm form = crewArchiveFormRepository.findById(formId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Archive form not found"));
        if (!form.getRevision().equals(request.expectedRevision())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Archive form revision conflict");
        }
        FlightArchiveCase archiveCase = archiveCaseRepository.findById(form.getArchiveCaseId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Archive case not found"));
        if (!canEditArchive(user, archiveCase)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Archive form is read-only");
        }
        validateActuals(request);

        Instant now = Instant.now();
        boolean noFlyingHourFlag = Boolean.TRUE.equals(request.noFlyingHourFlag());
        form.applyActuals(
            request.actualDutyStartUtc(),
            request.actualDutyEndUtc(),
            request.actualFdpStartUtc(),
            request.actualFdpEndUtc(),
            request.flyingHourMinutes(),
            noFlyingHourFlag,
            user.id(),
            now
        );
        crewArchiveFormRepository.save(form);

        List<CrewArchiveForm> forms = refreshArchiveCase(archiveCase);
        Long auditLogId = auditLogService.recordAndReturnId(
            user.id(),
            "ARCHIVE_FORM_SAVED",
            "CrewArchiveForm",
            form.getId().toString(),
            "SUCCESS"
        );
        domainEventService.record("ArchiveUpdated", "FlightArchiveCase", archiveCase.getId().toString(), "{}");
        if (ArchiveStatus.ARCHIVED.equals(archiveCase.getArchiveStatus())) {
            domainEventService.record("ArchiveCompleted", "FlightArchiveCase", archiveCase.getId().toString(), "{}");
        }

        TaskPlanItem task = taskPlanItemRepository.findById(archiveCase.getFlightId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Flight not found"));
        Map<Long, CrewMember> crewById = crewMemberRepository.findAll()
            .stream()
            .collect(Collectors.toMap(CrewMember::getId, Function.identity()));
        CrewArchiveForm savedForm = forms.stream()
            .filter(candidate -> candidate.getId().equals(form.getId()))
            .findFirst()
            .orElse(form);

        return new SaveCrewArchiveFormResponse(
            toCrewArchiveFormResponse(savedForm, crewById.get(savedForm.getCrewId()), canEditArchive(user, archiveCase)),
            toArchiveCaseResponse(archiveCase, task, canEditArchive(user, archiveCase), readOnlyReason(user, archiveCase)),
            task.getScheduledStartUtc(),
            task.getScheduledEndUtc(),
            List.of(savedForm.getCrewId()),
            List.of(archiveCase.getFlightId()),
            "OK",
            auditLogId
        );
    }

    @Transactional(readOnly = true)
    public List<PilotArchiveSummaryResponse> pilotArchiveSummary(AuthenticatedUser user) {
        Long crewId = user.crewId();
        if (crewId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Pilot account is not linked to a crew member");
        }
        Map<Long, FlightArchiveCase> casesById = archiveCaseRepository.findAll()
            .stream()
            .collect(Collectors.toMap(FlightArchiveCase::getId, Function.identity()));
        Map<Long, TaskPlanItem> taskById = taskPlanItemRepository.findAll()
            .stream()
            .collect(Collectors.toMap(TaskPlanItem::getId, Function.identity()));
        return crewArchiveFormRepository.findAllByCrewIdOrderByIdAsc(crewId)
            .stream()
            .map(form -> {
                FlightArchiveCase archiveCase = casesById.get(form.getArchiveCaseId());
                TaskPlanItem task = taskById.get(form.getFlightId());
                return new PilotArchiveSummaryResponse(
                    archiveCase.getId(),
                    form.getFlightId(),
                    task.getTaskCode(),
                    route(task),
                    task.getScheduledStartUtc(),
                    task.getScheduledEndUtc(),
                    archiveCase.getArchiveStatus(),
                    form.getFormStatus(),
                    form.getActualDutyStartUtc(),
                    form.getActualDutyEndUtc(),
                    form.getActualFdpStartUtc(),
                    form.getActualFdpEndUtc(),
                    form.getFlyingHourMinutes(),
                    Boolean.TRUE.equals(form.getNoFlyingHourFlag())
                );
            })
            .toList();
    }

    private void validateActuals(SaveCrewArchiveFormRequest request) {
        if (
            request.actualDutyStartUtc() == null ||
            request.actualDutyEndUtc() == null ||
            request.actualFdpStartUtc() == null ||
            request.actualFdpEndUtc() == null
        ) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual duty and FDP times are required");
        }
        if (!request.actualDutyStartUtc().isBefore(request.actualDutyEndUtc())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual duty start must be before end");
        }
        if (!request.actualFdpStartUtc().isBefore(request.actualFdpEndUtc())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual FDP start must be before end");
        }
        if (!Boolean.TRUE.equals(request.noFlyingHourFlag()) && (request.flyingHourMinutes() == null || request.flyingHourMinutes() <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Flying hour minutes are required");
        }
    }

    private List<CrewArchiveForm> refreshArchiveCase(FlightArchiveCase archiveCase) {
        List<CrewArchiveForm> forms = syncArchiveForms(archiveCase);
        long completedCount = forms.stream()
            .filter(form -> CrewArchiveFormStatus.isComplete(form.getFormStatus()))
            .count();
        String nextStatus;
        Instant archivedAtUtc = archiveCase.getArchivedAtUtc();
        if (completedCount == forms.size() && !forms.isEmpty()) {
            nextStatus = ArchiveStatus.ARCHIVED;
            archivedAtUtc = archivedAtUtc == null ? Instant.now() : archivedAtUtc;
        } else if (Instant.now().isAfter(archiveCase.getArchiveDeadlineAtUtc())) {
            nextStatus = ArchiveStatus.OVERDUE;
            archivedAtUtc = null;
        } else if (completedCount > 0) {
            nextStatus = ArchiveStatus.PARTIALLY_ARCHIVED;
            archivedAtUtc = null;
        } else {
            nextStatus = ArchiveStatus.UNARCHIVED;
            archivedAtUtc = null;
        }

        if (
            !nextStatus.equals(archiveCase.getArchiveStatus()) ||
            archiveCase.getCompletedCount() == null ||
            archiveCase.getCompletedCount() != (int) completedCount ||
            archiveCase.getTotalCount() == null ||
            archiveCase.getTotalCount() != forms.size() ||
            !Objects.equals(archivedAtUtc, archiveCase.getArchivedAtUtc())
        ) {
            archiveCase.setArchiveStatus(nextStatus);
            archiveCase.setArchivedAtUtc(archivedAtUtc);
            archiveCase.setCompletedCount((int) completedCount);
            archiveCase.setTotalCount(forms.size());
            archiveCase.incrementRevision();
            archiveCaseRepository.save(archiveCase);
        }
        return forms;
    }

    private List<CrewArchiveForm> syncArchiveForms(FlightArchiveCase archiveCase) {
        List<CrewArchiveForm> forms = crewArchiveFormRepository.findAllByArchiveCaseIdOrderByIdAsc(archiveCase.getId());
        Set<Long> existingCrewIds = forms.stream()
            .map(CrewArchiveForm::getCrewId)
            .collect(Collectors.toSet());
        Set<Long> seenCrewIds = new HashSet<>(existingCrewIds);
        List<TimelineBlock> blocks = timelineBlockRepository
            .findAllByTaskPlanItemIdAndRosterVersionIdOrderByIdAsc(archiveCase.getFlightId(), archiveCase.getRosterVersionId());
        for (TimelineBlock block : blocks) {
            Long crewId = block.getCrewMemberId();
            if (crewId == null || !seenCrewIds.add(crewId)) {
                continue;
            }
            forms.add(crewArchiveFormRepository.save(new CrewArchiveForm(archiveCase.getId(), archiveCase.getFlightId(), crewId)));
        }
        return forms.stream()
            .sorted(Comparator.comparing(CrewArchiveForm::getId))
            .toList();
    }

    private CrewArchiveSummary summarize(List<CrewArchiveForm> forms) {
        int noFlyingHourConfirmed = (int) forms.stream()
            .filter(form -> CrewArchiveFormStatus.NO_FLYING_HOUR_CONFIRMED.equals(form.getFormStatus()))
            .count();
        int completed = (int) forms.stream()
            .filter(form -> CrewArchiveFormStatus.COMPLETED.equals(form.getFormStatus()))
            .count();
        int done = completed + noFlyingHourConfirmed;
        return new CrewArchiveSummary(forms.size(), forms.size() - done, completed, noFlyingHourConfirmed);
    }

    private ArchiveCaseDetailResponse toArchiveCaseDetail(
        FlightArchiveCase archiveCase,
        List<CrewArchiveForm> forms,
        AuthenticatedUser user
    ) {
        TaskPlanItem task = taskPlanItemRepository.findById(archiveCase.getFlightId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Flight not found"));
        Map<Long, CrewMember> crewById = crewMemberRepository.findAll()
            .stream()
            .collect(Collectors.toMap(CrewMember::getId, Function.identity()));
        boolean canEdit = canEditArchive(user, archiveCase);
        return new ArchiveCaseDetailResponse(
            toArchiveCaseResponse(archiveCase, task, canEdit, readOnlyReason(user, archiveCase)),
            forms.stream()
                .sorted(Comparator.comparing(CrewArchiveForm::getId))
                .map(form -> toCrewArchiveFormResponse(form, crewById.get(form.getCrewId()), canEdit))
                .toList()
        );
    }

    private GanttTimelineBlockResponse toTimelineBlock(
        AuthenticatedUser user,
        TimelineBlock block,
        CrewMember crew,
        TaskPlanItem task,
        FlightArchiveCase archiveCase,
        CrewArchiveSummary summary
    ) {
        boolean canEdit = archiveCase != null && canEditArchive(user, archiveCase);
        return new GanttTimelineBlockResponse(
            block.getId(),
            block.getTaskPlanItemId(),
            block.getBlockType(),
            block.getCrewMemberId(),
            crew == null ? null : crew.getCrewCode(),
            crewName(crew),
            block.getDisplayLabel(),
            task == null ? null : route(task),
            block.getStartUtc(),
            block.getEndUtc(),
            task == null ? null : task.getStatus(),
            block.getStatus(),
            block.getAssignmentRole(),
            block.getDisplayOrder(),
            archiveCase == null ? null : archiveCase.getId(),
            archiveCase == null ? null : archiveCase.getArchiveStatus(),
            archiveCase == null ? null : archiveCase.getArchiveDeadlineAtUtc(),
            summary,
            canEdit,
            archiveCase == null ? "NO_ARCHIVE_CASE" : readOnlyReason(user, archiveCase)
        );
    }

    private GanttTimelineBlockResponse toUnassignedTimelineBlock(TaskPlanItem task) {
        return new GanttTimelineBlockResponse(
            -task.getId(),
            task.getId(),
            task.getTaskType(),
            null,
            null,
            null,
            task.getTaskCode() + " " + route(task),
            route(task),
            task.getScheduledStartUtc(),
            task.getScheduledEndUtc(),
            task.getStatus(),
            "UNASSIGNED",
            null,
            null,
            null,
            null,
            null,
            new CrewArchiveSummary(0, 0, 0, 0),
            false,
            null
        );
    }

    private ArchiveCaseResponse toArchiveCaseResponse(
        FlightArchiveCase archiveCase,
        TaskPlanItem task,
        boolean canEdit,
        String readOnlyReason
    ) {
        return new ArchiveCaseResponse(
            archiveCase.getId(),
            archiveCase.getFlightId(),
            task.getTaskCode(),
            route(task),
            task.getScheduledStartUtc(),
            task.getScheduledEndUtc(),
            archiveCase.getArchiveStatus(),
            archiveCase.getArchiveDeadlineAtUtc(),
            archiveCase.getArchivedAtUtc(),
            archiveCase.getCompletedCount(),
            archiveCase.getTotalCount(),
            archiveCase.getRevision(),
            canEdit,
            readOnlyReason
        );
    }

    private CrewArchiveFormResponse toCrewArchiveFormResponse(CrewArchiveForm form, CrewMember crew, boolean canEdit) {
        return new CrewArchiveFormResponse(
            form.getId(),
            form.getArchiveCaseId(),
            form.getFlightId(),
            form.getCrewId(),
            crew == null ? null : crew.getCrewCode(),
            crewName(crew),
            form.getActualDutyStartUtc(),
            form.getActualDutyEndUtc(),
            form.getActualFdpStartUtc(),
            form.getActualFdpEndUtc(),
            form.getFlyingHourMinutes(),
            Boolean.TRUE.equals(form.getNoFlyingHourFlag()),
            form.getFormStatus(),
            form.getEnteredAtUtc(),
            form.getConfirmedAtUtc(),
            form.getRevision(),
            canEdit
        );
    }

    private boolean canEditArchive(AuthenticatedUser user, FlightArchiveCase archiveCase) {
        return user.role() == UserRole.DISPATCHER && !ArchiveStatus.ARCHIVED.equals(archiveCase.getArchiveStatus());
    }

    private String readOnlyReason(AuthenticatedUser user, FlightArchiveCase archiveCase) {
        if (canEditArchive(user, archiveCase)) {
            return null;
        }
        if (ArchiveStatus.ARCHIVED.equals(archiveCase.getArchiveStatus())) {
            return "ARCHIVED";
        }
        return "ROLE_READ_ONLY";
    }

    private String route(TaskPlanItem task) {
        if (task.getDepartureAirport() == null || task.getArrivalAirport() == null) {
            return "";
        }
        return task.getDepartureAirport() + "-" + task.getArrivalAirport();
    }

    private String crewName(CrewMember crew) {
        return crew == null ? null : crew.getNameEn();
    }
}
