package com.pilotroster.system;

import com.pilotroster.common.ApiResponse;
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
@RequestMapping("/api/airports")
public class AirportDictionaryController {

    private final AirportDictionaryRepository airportDictionaryRepository;

    public AirportDictionaryController(AirportDictionaryRepository airportDictionaryRepository) {
        this.airportDictionaryRepository = airportDictionaryRepository;
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
        return ApiResponse.ok(airportDictionaryRepository.save(airport));
    }

    @PutMapping("/{airportId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AirportDictionary> update(@PathVariable Long airportId, @RequestBody AirportDictionary input) {
        AirportDictionary airport = airportDictionaryRepository.findById(airportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Airport not found"));
        airport.setIataCode(input.getIataCode());
        airport.setNameZh(input.getNameZh());
        airport.setNameEn(input.getNameEn());
        airport.setTimezoneName(input.getTimezoneName());
        airport.setUtcOffsetMinutes(input.getUtcOffsetMinutes());
        airport.setCountryCode(input.getCountryCode());
        airport.setStatus(input.getStatus());
        normalize(airport);
        return ApiResponse.ok(airportDictionaryRepository.save(airport));
    }

    @DeleteMapping("/{airportId}")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ApiResponse<AirportDictionary> disable(@PathVariable Long airportId) {
        AirportDictionary airport = airportDictionaryRepository.findById(airportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Airport not found"));
        airport.setStatus("INACTIVE");
        return ApiResponse.ok(airportDictionaryRepository.save(airport));
    }

    private void normalize(AirportDictionary airport) {
        airport.setCountryCode(defaultString(airport.getCountryCode(), ""));
        airport.setStatus(defaultString(airport.getStatus(), "ACTIVE"));
    }

    private String defaultString(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
