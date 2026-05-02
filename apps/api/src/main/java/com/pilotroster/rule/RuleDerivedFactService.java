package com.pilotroster.rule;

import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class RuleDerivedFactService {

    private final CrewHourFactBuilder crewHourFactBuilder;
    private final DdoFactBuilder ddoFactBuilder;
    private final FdpRestFactBuilder fdpRestFactBuilder;

    public RuleDerivedFactService(
        CrewHourFactBuilder crewHourFactBuilder,
        DdoFactBuilder ddoFactBuilder,
        FdpRestFactBuilder fdpRestFactBuilder
    ) {
        this.crewHourFactBuilder = crewHourFactBuilder;
        this.ddoFactBuilder = ddoFactBuilder;
        this.fdpRestFactBuilder = fdpRestFactBuilder;
    }

    public RuleDerivedFacts buildLatestRosterFacts(Long rosterVersionId) {
        Objects.requireNonNull(rosterVersionId, "rosterVersionId");
        return new RuleDerivedFacts(
            rosterVersionId,
            crewHourFactBuilder.buildProjection(rosterVersionId),
            ddoFactBuilder.build(rosterVersionId),
            fdpRestFactBuilder.build(rosterVersionId)
        );
    }

    public Map<Long, RuleDerivedFacts.CrewHourFact> buildCrewHourCompatibilityFacts() {
        return crewHourFactBuilder.buildLatestProjectionOrSnapshot();
    }
}
