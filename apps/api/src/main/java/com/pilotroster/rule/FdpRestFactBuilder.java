package com.pilotroster.rule;

import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class FdpRestFactBuilder {

    /**
     * Placeholder boundary for the next batch: FDP/rest derived facts are not wired yet.
     *
     * <p>Returning an empty map is intentional and must not be read as FDP/rest rule support.
     */
    public Map<Long, RuleDerivedFacts.FdpRestFact> build(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        return Map.of();
    }
}
