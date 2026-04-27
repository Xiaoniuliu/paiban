package com.pilotroster.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserPreferenceService {

    private final UserPreferenceRepository userPreferenceRepository;

    public UserPreferenceService(UserPreferenceRepository userPreferenceRepository) {
        this.userPreferenceRepository = userPreferenceRepository;
    }

    @Transactional
    public UserPreference getOrCreate(Long userId) {
        return userPreferenceRepository.findById(userId)
            .orElseGet(() -> userPreferenceRepository.save(new UserPreference(userId)));
    }

    @Transactional
    public UserPreference update(Long userId, String language, String displayTimezone) {
        UserPreference preference = getOrCreate(userId);
        preference.update(language, displayTimezone);
        return preference;
    }
}
