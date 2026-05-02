package com.pilotroster.rule;

import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class FdpRestFactBuilder {

    public Map<Long, RuleDerivedFacts.FdpRestFact> build(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        return Map.of();
    }
}
