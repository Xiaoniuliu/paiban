package com.pilotroster.flightops;

import com.pilotroster.common.ApiResponse;
import com.pilotroster.task.TaskPlanImportBatch;
import com.pilotroster.task.TaskPlanImportBatchRepository;
import com.pilotroster.task.TaskPlanItem;
import com.pilotroster.task.TaskPlanItemRepository;
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

    @GetMapping("/routes")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<FlightRoute>> routes() {
        return ApiResponse.ok(flightRouteRepository.findAllByOrderByRouteCodeAsc());
    }

    @PostMapping("/routes")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<FlightRoute> createRoute(@RequestBody FlightRoute route) {
        normalizeRoute(route);
        return ApiResponse.ok(flightRouteRepository.save(route));
    }

    @PutMapping("/routes/{routeId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<FlightRoute> updateRoute(@PathVariable Long routeId, @RequestBody FlightRoute input) {
        FlightRoute route = flightRouteRepository.findById(routeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
        route.setRouteCode(input.getRouteCode());
        route.setDepartureAirport(input.getDepartureAirport());
        route.setArrivalAirport(input.getArrivalAirport());
        route.setStandardDurationMinutes(input.getStandardDurationMinutes());
        route.setTimeDifferenceMinutes(input.getTimeDifferenceMinutes());
        route.setCrossTimezone(input.getCrossTimezone());
        route.setStatus(input.getStatus());
        normalizeRoute(route);
        return ApiResponse.ok(flightRouteRepository.save(route));
    }

    @DeleteMapping("/routes/{routeId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<FlightRoute> disableRoute(@PathVariable Long routeId) {
        FlightRoute route = flightRouteRepository.findById(routeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
        route.setStatus("INACTIVE");
        return ApiResponse.ok(flightRouteRepository.save(route));
    }

    @GetMapping("/aircraft")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<AircraftRegistry>> aircraft() {
        return ApiResponse.ok(aircraftRegistryRepository.findAllByOrderByAircraftNoAsc());
    }

    @PostMapping("/aircraft")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AircraftRegistry> createAircraft(@RequestBody AircraftRegistry aircraft) {
        normalizeAircraft(aircraft);
        return ApiResponse.ok(aircraftRegistryRepository.save(aircraft));
    }

    @PutMapping("/aircraft/{aircraftId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AircraftRegistry> updateAircraft(@PathVariable Long aircraftId, @RequestBody AircraftRegistry input) {
        AircraftRegistry aircraft = aircraftRegistryRepository.findById(aircraftId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aircraft not found"));
        aircraft.setAircraftNo(input.getAircraftNo());
        aircraft.setAircraftType(input.getAircraftType());
        aircraft.setFleet(input.getFleet());
        aircraft.setBaseAirport(input.getBaseAirport());
        aircraft.setSeatCount(input.getSeatCount());
        aircraft.setMaxPayload(input.getMaxPayload());
        aircraft.setStatus(input.getStatus());
        normalizeAircraft(aircraft);
        return ApiResponse.ok(aircraftRegistryRepository.save(aircraft));
    }

    @DeleteMapping("/aircraft/{aircraftId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AircraftRegistry> disableAircraft(@PathVariable Long aircraftId) {
        AircraftRegistry aircraft = aircraftRegistryRepository.findById(aircraftId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aircraft not found"));
        aircraft.setStatus("INACTIVE");
        return ApiResponse.ok(aircraftRegistryRepository.save(aircraft));
    }

    private void normalizeRoute(FlightRoute route) {
        route.setRouteCode(defaultString(route.getRouteCode(), route.getDepartureAirport() + "-" + route.getArrivalAirport()));
        route.setStandardDurationMinutes(route.getStandardDurationMinutes() == null ? 0 : route.getStandardDurationMinutes());
        route.setTimeDifferenceMinutes(route.getTimeDifferenceMinutes() == null ? 0 : route.getTimeDifferenceMinutes());
        route.setCrossTimezone(route.getCrossTimezone() != null && route.getCrossTimezone());
        route.setStatus(defaultString(route.getStatus(), "ACTIVE"));
    }

    private void normalizeAircraft(AircraftRegistry aircraft) {
        aircraft.setFleet(defaultString(aircraft.getFleet(), ""));
        aircraft.setBaseAirport(defaultString(aircraft.getBaseAirport(), "MFM"));
        aircraft.setSeatCount(aircraft.getSeatCount() == null ? 0 : aircraft.getSeatCount());
        aircraft.setStatus(defaultString(aircraft.getStatus(), "ACTIVE"));
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
