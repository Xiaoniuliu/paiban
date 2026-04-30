package com.pilotroster.flightops;

import com.pilotroster.common.ApiResponse;
import com.pilotroster.task.TaskPlanItemRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
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
@RequestMapping("/api/flight-operations/routes")
public class FlightRouteController {

    private final FlightRouteRepository flightRouteRepository;
    private final TaskPlanItemRepository taskPlanItemRepository;

    public FlightRouteController(
        FlightRouteRepository flightRouteRepository,
        TaskPlanItemRepository taskPlanItemRepository
    ) {
        this.flightRouteRepository = flightRouteRepository;
        this.taskPlanItemRepository = taskPlanItemRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<FlightRoute>> routes() {
        return ApiResponse.ok(flightRouteRepository.findAllByOrderByRouteCodeAsc());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<FlightRoute> createRoute(@RequestBody FlightRoute route) {
        normalizeRoute(route);
        return ApiResponse.ok(flightRouteRepository.save(route));
    }

    @PutMapping("/{routeId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<FlightRoute> updateRoute(@PathVariable Long routeId, @RequestBody FlightRoute input) {
        FlightRoute route = flightRouteRepository.findById(routeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
        if (taskPlanItemRepository.existsByDepartureAirportAndArrivalAirport(route.getDepartureAirport(), route.getArrivalAirport())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Routes referenced by flight plans cannot be edited");
        }
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

    @DeleteMapping("/{routeId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<FlightRoute> deleteRoute(@PathVariable Long routeId) {
        FlightRoute route = flightRouteRepository.findById(routeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Route not found"));
        if (taskPlanItemRepository.existsByDepartureAirportAndArrivalAirport(route.getDepartureAirport(), route.getArrivalAirport())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Routes referenced by flight plans cannot be deleted");
        }
        try {
            flightRouteRepository.delete(route);
            flightRouteRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Routes still referenced by downstream data cannot be deleted", ex);
        }
        return ApiResponse.ok(route);
    }

    private void normalizeRoute(FlightRoute route) {
        route.setRouteCode(defaultString(route.getRouteCode(), route.getDepartureAirport() + "-" + route.getArrivalAirport()));
        route.setStandardDurationMinutes(route.getStandardDurationMinutes() == null ? 0 : route.getStandardDurationMinutes());
        route.setTimeDifferenceMinutes(route.getTimeDifferenceMinutes() == null ? 0 : route.getTimeDifferenceMinutes());
        route.setCrossTimezone(route.getCrossTimezone() != null && route.getCrossTimezone());
        route.setStatus(defaultString(route.getStatus(), "ACTIVE"));
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
