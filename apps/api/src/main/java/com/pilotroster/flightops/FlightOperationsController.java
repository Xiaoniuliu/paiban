package com.pilotroster.flightops;

import com.pilotroster.common.ApiResponse;
import com.pilotroster.task.TaskPlanImportBatch;
import com.pilotroster.task.TaskPlanImportBatchRepository;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flight-operations")
public class FlightOperationsController {

    private final TaskPlanItemRepository taskPlanItemRepository;
    private final TaskPlanImportBatchRepository importBatchRepository;
    private final FlightRouteRepository flightRouteRepository;
    private final AircraftRegistryRepository aircraftRegistryRepository;

    public FlightOperationsController(
        TaskPlanItemRepository taskPlanItemRepository,
        TaskPlanImportBatchRepository importBatchRepository,
        FlightRouteRepository flightRouteRepository,
        AircraftRegistryRepository aircraftRegistryRepository
    ) {
        this.taskPlanItemRepository = taskPlanItemRepository;
        this.importBatchRepository = importBatchRepository;
        this.flightRouteRepository = flightRouteRepository;
        this.aircraftRegistryRepository = aircraftRegistryRepository;
    }

    @GetMapping("/tasks")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<TaskPlanItem>> tasks() {
        return ApiResponse.ok(taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc());
    }

    @GetMapping("/import-batches")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<TaskPlanImportBatch>> importBatches() {
        return ApiResponse.ok(importBatchRepository.findAllByOrderByImportedAtUtcDesc());
    }

    @GetMapping("/reference-protection")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<FlightOperationsReferenceProtectionView> referenceProtection() {
        List<TaskPlanItem> tasks = taskPlanItemRepository.findAllByOrderByScheduledStartUtcAsc().stream()
            .filter(task -> !"CANCELLED".equals(task.getStatus()))
            .toList();
        List<FlightRoute> routes = flightRouteRepository.findAllByOrderByRouteCodeAsc();
        List<AircraftRegistry> aircraftRows = aircraftRegistryRepository.findAllByOrderByAircraftNoAsc();

        Set<String> taskRoutePairs = new LinkedHashSet<>();
        Set<String> taskAircraftNos = new LinkedHashSet<>();
        Set<String> taskAircraftTypes = new LinkedHashSet<>();
        Set<String> taskAirportCodes = new LinkedHashSet<>();
        for (TaskPlanItem task : tasks) {
            if (task.getDepartureAirport() != null && task.getArrivalAirport() != null) {
                taskRoutePairs.add(routePair(task.getDepartureAirport(), task.getArrivalAirport()));
            }
            if (task.getAircraftNo() != null && !task.getAircraftNo().isBlank()) {
                taskAircraftNos.add(task.getAircraftNo());
            }
            if (task.getAircraftType() != null && !task.getAircraftType().isBlank()) {
                taskAircraftTypes.add(task.getAircraftType());
            }
            if (task.getDepartureAirport() != null && !task.getDepartureAirport().isBlank()) {
                taskAirportCodes.add(task.getDepartureAirport());
            }
            if (task.getArrivalAirport() != null && !task.getArrivalAirport().isBlank()) {
                taskAirportCodes.add(task.getArrivalAirport());
            }
        }

        Set<String> referencedRouteCodes = new LinkedHashSet<>();
        for (FlightRoute route : routes) {
            if (taskRoutePairs.contains(routePair(route.getDepartureAirport(), route.getArrivalAirport()))) {
                referencedRouteCodes.add(route.getRouteCode());
            }
        }

        Set<String> referencedAircraftNos = new LinkedHashSet<>();
        for (AircraftRegistry aircraft : aircraftRows) {
            if (taskAircraftNos.contains(aircraft.getAircraftNo()) || taskAircraftTypes.contains(aircraft.getAircraftType())) {
                referencedAircraftNos.add(aircraft.getAircraftNo());
            }
        }

        Set<String> referencedAirportCodes = new LinkedHashSet<>();
        for (FlightRoute route : routes) {
            referencedAirportCodes.add(route.getDepartureAirport());
            referencedAirportCodes.add(route.getArrivalAirport());
        }
        for (AircraftRegistry aircraft : aircraftRows) {
            if (aircraft.getBaseAirport() != null && !aircraft.getBaseAirport().isBlank()) {
                referencedAirportCodes.add(aircraft.getBaseAirport());
            }
        }
        referencedAirportCodes.addAll(taskAirportCodes);

        return ApiResponse.ok(new FlightOperationsReferenceProtectionView(
            List.copyOf(referencedRouteCodes),
            List.copyOf(referencedAircraftNos),
            List.copyOf(referencedAirportCodes)
        ));
    }

    public record FlightOperationsReferenceProtectionView(
        List<String> referencedRouteCodes,
        List<String> referencedAircraftNos,
        List<String> referencedAirportCodes
    ) {
    }

    private String routePair(String departureAirport, String arrivalAirport) {
        return departureAirport + "->" + arrivalAirport;
    }
}
