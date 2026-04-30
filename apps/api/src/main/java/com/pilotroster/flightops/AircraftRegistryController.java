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
@RequestMapping("/api/flight-operations/aircraft")
public class AircraftRegistryController {

    private final AircraftRegistryRepository aircraftRegistryRepository;
    private final TaskPlanItemRepository taskPlanItemRepository;

    public AircraftRegistryController(
        AircraftRegistryRepository aircraftRegistryRepository,
        TaskPlanItemRepository taskPlanItemRepository
    ) {
        this.aircraftRegistryRepository = aircraftRegistryRepository;
        this.taskPlanItemRepository = taskPlanItemRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'OPS_MANAGER', 'ADMIN')")
    public ApiResponse<List<AircraftRegistry>> aircraft() {
        return ApiResponse.ok(aircraftRegistryRepository.findAllByOrderByAircraftNoAsc());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AircraftRegistry> createAircraft(@RequestBody AircraftRegistry aircraft) {
        normalizeAircraft(aircraft);
        try {
            return ApiResponse.ok(aircraftRegistryRepository.saveAndFlush(aircraft));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aircraft number already exists or violates master-data constraints", ex);
        }
    }

    @PutMapping("/{aircraftId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AircraftRegistry> updateAircraft(@PathVariable Long aircraftId, @RequestBody AircraftRegistry input) {
        AircraftRegistry aircraft = aircraftRegistryRepository.findById(aircraftId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aircraft not found"));
        if (taskPlanItemRepository.existsByAircraftNoOrAircraftType(aircraft.getAircraftNo(), aircraft.getAircraftType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aircraft referenced by flight plans cannot be edited");
        }
        aircraft.setAircraftNo(input.getAircraftNo());
        aircraft.setAircraftType(input.getAircraftType());
        aircraft.setFleet(input.getFleet());
        aircraft.setBaseAirport(input.getBaseAirport());
        aircraft.setSeatCount(input.getSeatCount());
        aircraft.setMaxPayload(input.getMaxPayload());
        normalizeAircraft(aircraft);
        try {
            return ApiResponse.ok(aircraftRegistryRepository.saveAndFlush(aircraft));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aircraft update violates uniqueness or master-data constraints", ex);
        }
    }

    @DeleteMapping("/{aircraftId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AircraftRegistry> deleteAircraft(@PathVariable Long aircraftId) {
        AircraftRegistry aircraft = aircraftRegistryRepository.findById(aircraftId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aircraft not found"));
        if (taskPlanItemRepository.existsByAircraftNoOrAircraftType(aircraft.getAircraftNo(), aircraft.getAircraftType())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aircraft referenced by flight plans cannot be deleted");
        }
        try {
            aircraftRegistryRepository.delete(aircraft);
            aircraftRegistryRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Aircraft still referenced by downstream data cannot be deleted", ex);
        }
        return ApiResponse.ok(aircraft);
    }

    private void normalizeAircraft(AircraftRegistry aircraft) {
        aircraft.setFleet(defaultString(aircraft.getFleet(), ""));
        aircraft.setBaseAirport(defaultString(aircraft.getBaseAirport(), "MFM"));
        aircraft.setSeatCount(aircraft.getSeatCount() == null ? 0 : aircraft.getSeatCount());
        aircraft.setStatus("ACTIVE");
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
