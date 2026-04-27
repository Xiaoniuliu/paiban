package com.pilotroster.auth;

import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password
    ) {
    }

    public record LoginResponse(
        String token,
        UserProfile user
    ) {
    }

    public record UserProfile(
        Long id,
        String username,
        String displayName,
        UserRole role,
        Long crewId
    ) {
        public static UserProfile from(AuthenticatedUser user) {
            return new UserProfile(user.id(), user.getUsername(), user.displayName(), user.role(), user.crewId());
        }
    }
}
