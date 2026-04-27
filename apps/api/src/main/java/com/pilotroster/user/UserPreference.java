package com.pilotroster.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_preference")
public class UserPreference {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "language_code", nullable = false)
    private String languageCode;

    @Column(name = "display_timezone_mode", nullable = false)
    private String displayTimezoneMode;

    @Column(name = "date_format", nullable = false)
    private String dateFormat;

    @Column(name = "time_format", nullable = false)
    private String timeFormat;

    protected UserPreference() {
    }

    public UserPreference(Long userId) {
        this.userId = userId;
        this.languageCode = "zh-CN";
        this.displayTimezoneMode = "UTC+8";
        this.dateFormat = "YYYY-MM-DD";
        this.timeFormat = "HH:mm";
    }

    public Long getUserId() {
        return userId;
    }

    public String getLanguageCode() {
        return languageCode;
    }

    public String getDisplayTimezoneMode() {
        return displayTimezoneMode;
    }

    public String getDateFormat() {
        return dateFormat;
    }

    public String getTimeFormat() {
        return timeFormat;
    }

    public void update(String languageCode, String displayTimezoneMode) {
        this.languageCode = languageCode;
        this.displayTimezoneMode = displayTimezoneMode;
    }
}
