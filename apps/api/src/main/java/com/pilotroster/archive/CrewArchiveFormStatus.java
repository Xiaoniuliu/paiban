package com.pilotroster.archive;

public final class CrewArchiveFormStatus {

    public static final String NOT_STARTED = "NotStarted";
    public static final String COMPLETED = "Completed";
    public static final String NO_FLYING_HOUR_CONFIRMED = "NoFlyingHourConfirmed";

    private CrewArchiveFormStatus() {
    }

    public static boolean isComplete(String status) {
        return COMPLETED.equals(status) || NO_FLYING_HOUR_CONFIRMED.equals(status);
    }
}
