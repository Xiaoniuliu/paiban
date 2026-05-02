DELETE vh
FROM violation_hit vh
JOIN rule_catalog rc ON rc.id = vh.rule_catalog_id
WHERE rc.rule_id IN ('CREW_ASSIGNMENT_REQUIRED', 'CREW_PAIR_REQUIRED');

DELETE FROM rule_catalog
WHERE rule_id IN ('CREW_ASSIGNMENT_REQUIRED', 'CREW_PAIR_REQUIRED');
