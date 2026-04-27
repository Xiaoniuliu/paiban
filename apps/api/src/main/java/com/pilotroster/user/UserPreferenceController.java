package com.pilotroster.user;

import com.pilotroster.auth.AuthenticatedUser;
import com.pilotroster.common.ApiResponse;
import com.pilotroster.user.UserPreferenceDtos.UpdatePreferenceRequest;
import com.pilotroster.user.UserPreferenceDtos.UserPreferenceResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/preferences")
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    public UserPreferenceController(UserPreferenceService userPreferenceService) {
        this.userPreferenceService = userPreferenceService;
    }

    @GetMapping
    public ApiResponse<UserPreferenceResponse> get(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(UserPreferenceResponse.from(userPreferenceService.getOrCreate(user.id())));
    }

    @PutMapping
    public ApiResponse<UserPreferenceResponse> update(
        @AuthenticationPrincipal AuthenticatedUser user,
        @Valid @RequestBody UpdatePreferenceRequest request
    ) {
        return ApiResponse.ok(UserPreferenceResponse.from(
            userPreferenceService.update(user.id(), request.language(), request.displayTimezone())
        ));
    }
}
