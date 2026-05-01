package com.pilotroster.publish;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.crew.CrewMember;
import com.pilotroster.crew.CrewMemberRepository;
import com.pilotroster.publish.PublishResultDtos.PublishExportResponse;
import com.pilotroster.publish.PublishResultDtos.PublishResultsResponse;
import com.pilotroster.publish.PublishResultDtos.PublishedCrewResultRow;
import com.pilotroster.publish.PublishResultDtos.PublishedCrewTaskRow;
import com.pilotroster.publish.PublishResultDtos.PublishedFlightAssignment;
import com.pilotroster.publish.PublishResultDtos.PublishedFlightResultRow;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import com.pilotroster.timeline.TimelineBlock;
import com.pilotroster.timeline.TimelineBlockRepository;
import com.pilotroster.workbench.ValidationPublishDtos.PublishRosterRequest;
import com.pilotroster.workbench.ValidationPublishDtos.ValidationPublishSummaryResponse;
import com.pilotroster.workbench.ValidationPublishService;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
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
public class PublishResultService {

    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String VIEW_FLIGHT = "FLIGHT";
    private static final String VIEW_CREW = "CREW";

    private final ValidationPublishService validationPublishService;
    private final TaskPlanItemRepository taskPlanItemRepository;
    private final TimelineBlockRepository timelineBlockRepository;
    private final CrewMemberRepository crewMemberRepository;

    public PublishResultService(
        ValidationPublishService validationPublishService,
        TaskPlanItemRepository taskPlanItemRepository,
        TimelineBlockRepository timelineBlockRepository,
        CrewMemberRepository crewMemberRepository
    ) {
        this.validationPublishService = validationPublishService;
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.timelineBlockRepository = timelineBlockRepository;
        this.crewMemberRepository = crewMemberRepository;
    }

    @Transactional
    public PublishResultsResponse summary() {
        return buildResponse(validationPublishService.summary());
    }

    @Transactional
    public PublishResultsResponse validateDraft() {
        return buildResponse(validationPublishService.validateDraft());
    }

    @Transactional
    public PublishResultsResponse publish(PublishRosterRequest request, AuthenticatedUser user) {
        return buildResponse(validationPublishService.publish(request, user));
    }

    @Transactional(readOnly = true)
    public PublishExportResponse export(String view) {
        String normalizedView = normalizeView(view);
        return VIEW_CREW.equals(normalizedView)
            ? new PublishExportResponse(normalizedView, "publish-results-crew.csv", crewCsv(crewResults()))
            : new PublishExportResponse(normalizedView, "publish-results-flight.csv", flightCsv(flightResults()));
    }

    private PublishResultsResponse buildResponse(ValidationPublishSummaryResponse summary) {
        return new PublishResultsResponse(summary, flightResults(), crewResults());
    }

    private List<PublishedFlightResultRow> flightResults() {
        PublishedTruth truth = publishedTruth();
        return truth.tasksById().values().stream()
            .sorted(Comparator.comparing(TaskPlanItem::getScheduledStartUtc).thenComparing(TaskPlanItem::getTaskCode))
            .map(task -> new PublishedFlightResultRow(
                task.getId(),
                task.getTaskCode(),
                route(task),
                task.getScheduledStartUtc(),
                task.getScheduledEndUtc(),
                task.getAircraftType(),
                task.getAircraftNo(),
                task.getStatus(),
                truth.blocksByTaskId().getOrDefault(task.getId(), List.of()).stream()
                    .sorted(Comparator.comparing(PublishResultService::displayOrderOrMax))
                    .map(block -> toFlightAssignment(block, truth.crewById().get(block.getCrewMemberId())))
                    .toList()
            ))
            .toList();
    }

    private List<PublishedCrewResultRow> crewResults() {
        PublishedTruth truth = publishedTruth();
        return truth.blocksByCrewId().entrySet().stream()
            .map(entry -> {
                CrewMember crew = truth.crewById().get(entry.getKey());
                List<PublishedCrewTaskRow> tasks = entry.getValue().stream()
                    .sorted(Comparator
                        .comparing(TimelineBlock::getStartUtc)
                        .thenComparing(TimelineBlock::getDisplayOrder, Comparator.nullsLast(Integer::compareTo)))
                    .map(block -> {
                        TaskPlanItem task = truth.tasksById().get(block.getTaskPlanItemId());
                        return new PublishedCrewTaskRow(
                            task.getId(),
                            task.getTaskCode(),
                            route(task),
                            task.getScheduledStartUtc(),
                            task.getScheduledEndUtc(),
                            task.getStatus(),
                            block.getAssignmentRole(),
                            block.getDisplayOrder()
                        );
                    })
                    .toList();
                return new PublishedCrewResultRow(
                    entry.getKey(),
                    crew == null ? "" : crew.getCrewCode(),
                    crew == null ? "" : crew.getNameZh(),
                    crew == null ? "" : crew.getNameEn(),
                    tasks.size(),
                    tasks
                );
            })
            .sorted(Comparator.comparing(PublishedCrewResultRow::crewCode))
            .toList();
    }

    private PublishedTruth publishedTruth() {
        Map<Long, TaskPlanItem> tasksById = taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc().stream()
            .filter(task -> STATUS_PUBLISHED.equals(task.getStatus()))
            .collect(Collectors.toMap(TaskPlanItem::getId, Function.identity()));
        if (tasksById.isEmpty()) {
            return new PublishedTruth(Map.of(), Map.of(), Map.of(), Map.of());
        }

        Set<Long> publishedTaskIds = tasksById.keySet();
        Map<Long, CrewMember> crewById = crewMemberRepository.findAll().stream()
            .collect(Collectors.toMap(CrewMember::getId, Function.identity()));
        List<TimelineBlock> publishedBlocks = timelineBlockRepository.findAll().stream()
            .filter(block -> block.getTaskPlanItemId() != null)
            .filter(block -> publishedTaskIds.contains(block.getTaskPlanItemId()))
            .filter(block -> STATUS_PUBLISHED.equals(block.getStatus()))
            .toList();

        Map<Long, List<TimelineBlock>> blocksByTaskId = publishedBlocks.stream()
            .collect(Collectors.groupingBy(TimelineBlock::getTaskPlanItemId));
        Map<Long, List<TimelineBlock>> blocksByCrewId = publishedBlocks.stream()
            .filter(block -> block.getCrewMemberId() != null)
            .collect(Collectors.groupingBy(TimelineBlock::getCrewMemberId));
        return new PublishedTruth(tasksById, crewById, blocksByTaskId, blocksByCrewId);
    }

    private PublishedFlightAssignment toFlightAssignment(TimelineBlock block, CrewMember crew) {
        return new PublishedFlightAssignment(
            block.getCrewMemberId(),
            crew == null ? "" : crew.getCrewCode(),
            crew == null ? "" : crew.getNameZh(),
            crew == null ? "" : crew.getNameEn(),
            block.getAssignmentRole(),
            block.getDisplayOrder()
        );
    }

    private String flightCsv(List<PublishedFlightResultRow> rows) {
        String header = "Task Code,Route,Scheduled Start UTC,Scheduled End UTC,Aircraft Type,Aircraft No,Task Status,Crew Assignments";
        String body = rows.stream()
            .map(row -> String.join(
                ",",
                csv(row.taskCode()),
                csv(row.route()),
                csv(formatInstant(row.scheduledStartUtc())),
                csv(formatInstant(row.scheduledEndUtc())),
                csv(row.aircraftType()),
                csv(row.aircraftNo()),
                csv(row.taskStatus()),
                csv(row.crewAssignments().stream()
                    .map(assignment -> assignment.assignmentRole() + ":" + assignment.crewCode())
                    .collect(Collectors.joining(" | ")))
            ))
            .collect(Collectors.joining("\n"));
        return body.isBlank() ? header + "\n" : header + "\n" + body + "\n";
    }

    private String crewCsv(List<PublishedCrewResultRow> rows) {
        String header = "Crew Code,Name ZH,Name EN,Published Task Count,Task Codes";
        String body = rows.stream()
            .map(row -> String.join(
                ",",
                csv(row.crewCode()),
                csv(row.nameZh()),
                csv(row.nameEn()),
                csv(Integer.toString(row.publishedTaskCount())),
                csv(row.tasks().stream().map(PublishedCrewTaskRow::taskCode).collect(Collectors.joining(" | ")))
            ))
            .collect(Collectors.joining("\n"));
        return body.isBlank() ? header + "\n" : header + "\n" + body + "\n";
    }

    private String route(TaskPlanItem task) {
        if (task.getDepartureAirport() == null || task.getArrivalAirport() == null) {
            return "";
        }
        return task.getDepartureAirport() + "-" + task.getArrivalAirport();
    }

    private String formatInstant(Instant instant) {
        return instant == null ? "" : DateTimeFormatter.ISO_INSTANT.format(instant);
    }

    private String csv(String value) {
        String text = Objects.toString(value, "");
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    private String normalizeView(String view) {
        String normalized = view == null ? "" : view.trim().toUpperCase();
        if (!VIEW_FLIGHT.equals(normalized) && !VIEW_CREW.equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported publish export view");
        }
        return normalized;
    }

    private static Integer displayOrderOrMax(TimelineBlock block) {
        return block.getDisplayOrder() == null ? Integer.MAX_VALUE : block.getDisplayOrder();
    }

    private record PublishedTruth(
        Map<Long, TaskPlanItem> tasksById,
        Map<Long, CrewMember> crewById,
        Map<Long, List<TimelineBlock>> blocksByTaskId,
        Map<Long, List<TimelineBlock>> blocksByCrewId
    ) {
    }
}
