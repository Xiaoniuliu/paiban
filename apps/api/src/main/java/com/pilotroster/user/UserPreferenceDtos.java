package com.pilotroster.user;

import jakarta.validation.constraints.Pattern;

public final class UserPreferenceDtos {

    private UserPreferenceDtos() {
    }

    public record UserPreferenceResponse(
        String language,
        String displayTimezone,
        String dateFormat,
        String timeFormat
    ) {
        public static UserPreferenceResponse from(UserPreference preference) {
            return new UserPreferenceResponse(
                preference.getLanguageCode(),
                preference.getDisplayTimezoneMode(),
                preference.getDateFormat(),
                preference.getTimeFormat()
            );
        }
    }

    public record UpdatePreferenceRequest(
        @Pattern(regexp = "zh-CN|en-US") String language,
        @Pattern(regexp = "UTC|UTC\\+8") String displayTimezone
    ) {
    }
}
