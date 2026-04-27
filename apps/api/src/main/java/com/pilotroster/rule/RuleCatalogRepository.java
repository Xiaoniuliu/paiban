package com.pilotroster.rule;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RuleCatalogRepository extends JpaRepository<RuleCatalog, Long> {
    Optional<RuleCatalog> findByRuleId(String ruleId);
}
