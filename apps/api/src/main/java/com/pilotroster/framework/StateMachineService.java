package com.pilotroster.framework;

import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class StateMachineService {

    private static final Map<RosterState, Set<RosterState>> ALLOWED = Map.of(
        RosterState.DRAFT, Set.of(RosterState.VALIDATING),
        RosterState.VALIDATING, Set.of(RosterState.DRAFT, RosterState.READY_FOR_RELEASE),
        RosterState.READY_FOR_RELEASE, Set.of(RosterState.RELEASED),
        RosterState.RELEASED, Set.of(RosterState.ARCHIVED),
        RosterState.ARCHIVED, Set.of()
    );

    public boolean canTransition(RosterState from, RosterState to) {
        return ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }

    public void requireTransition(RosterState from, RosterState to) {
        if (!canTransition(from, to)) {
            throw new IllegalStateException("Illegal roster state transition: " + from + " -> " + to);
        }
    }
}
