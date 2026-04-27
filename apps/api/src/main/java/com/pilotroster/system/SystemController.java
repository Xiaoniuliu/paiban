package com.pilotroster.system;

import com.pilotroster.common.ApiResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SystemController {

    @GetMapping("/api/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.ok(Map.of(
            "service", "pilot-roster-api",
            "status", "UP",
            "timeUtc", Instant.now().toString()
        ));
    }
}
