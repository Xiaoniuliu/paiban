package com.pilotroster.system;

import com.pilotroster.common.ApiResponse;
import com.pilotroster.flightops.AircraftRegistryRepository;
import com.pilotroster.flightops.FlightRouteRepository;
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
@RequestMapping("/api/airports")
public class AirportDictionaryController {

    private final AirportDictionaryRepository airportDictionaryRepository;
    private final FlightRouteRepository flightRouteRepository;
    private final AircraftRegistryRepository aircraftRegistryRepository;
    private final TaskPlanItemRepository taskPlanItemRepository;

    public AirportDictionaryController(
        AirportDictionaryRepository airportDictionaryRepository,
        FlightRouteRepository flightRouteRepository,
        AircraftRegistryRepository aircraftRegistryRepository,
        TaskPlanItemRepository taskPlanItemRepository
    ) {
        this.airportDictionaryRepository = airportDictionaryRepository;
        this.flightRouteRepository = flightRouteRepository;
        this.aircraftRegistryRepository = aircraftRegistryRepository;
        this.taskPlanItemRepository = taskPlanItemRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<AirportDictionary>> list() {
        return ApiResponse.ok(airportDictionaryRepository.findAllByOrderByIataCodeAsc());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AirportDictionary> create(@RequestBody AirportDictionary airport) {
        normalize(airport);
        try {
            return ApiResponse.ok(airportDictionaryRepository.saveAndFlush(airport));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Airport code already exists or violates master-data constraints", ex);
        }
    }

    @PutMapping("/{airportId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AirportDictionary> update(@PathVariable Long airportId, @RequestBody AirportDictionary input) {
        AirportDictionary airport = airportDictionaryRepository.findById(airportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Airport not found"));
        String iataCode = airport.getIataCode();
        if (flightRouteRepository.existsByDepartureAirportOrArrivalAirport(iataCode, iataCode)
            || aircraftRegistryRepository.existsByBaseAirport(iataCode)
            || taskPlanItemRepository.existsByDepartureAirportOrArrivalAirport(iataCode, iataCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Airports referenced by routes, aircraft, or flight plans cannot be edited");
        }
        airport.setIataCode(input.getIataCode());
        airport.setNameZh(input.getNameZh());
        airport.setNameEn(input.getNameEn());
        airport.setTimezoneName(input.getTimezoneName());
        airport.setUtcOffsetMinutes(input.getUtcOffsetMinutes());
        airport.setCountryCode(input.getCountryCode());
        normalize(airport);
        try {
            return ApiResponse.ok(airportDictionaryRepository.saveAndFlush(airport));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Airport update violates uniqueness or master-data constraints", ex);
        }
    }

    @DeleteMapping("/{airportId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AirportDictionary> delete(@PathVariable Long airportId) {
        AirportDictionary airport = airportDictionaryRepository.findById(airportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Airport not found"));
        String iataCode = airport.getIataCode();
        if (flightRouteRepository.existsByDepartureAirportOrArrivalAirport(iataCode, iataCode)
            || aircraftRegistryRepository.existsByBaseAirport(iataCode)
            || taskPlanItemRepository.existsByDepartureAirportOrArrivalAirport(iataCode, iataCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Airports referenced by routes, aircraft, or flight plans cannot be deleted");
        }
        try {
            airportDictionaryRepository.delete(airport);
            airportDictionaryRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Airport still referenced by downstream data cannot be deleted", ex);
        }
        return ApiResponse.ok(airport);
    }

    private void normalize(AirportDictionary airport) {
        airport.setCountryCode(defaultString(airport.getCountryCode(), ""));
        airport.setStatus("ACTIVE");
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
