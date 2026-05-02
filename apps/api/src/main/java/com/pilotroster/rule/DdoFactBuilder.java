package com.pilotroster.rule;

import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class DdoFactBuilder {

    public Map<Long, RuleDerivedFacts.DdoFact> build(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        return Map.of();
    }
}
