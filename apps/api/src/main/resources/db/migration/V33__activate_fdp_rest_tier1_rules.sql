UPDATE rule_catalog
SET active_flag = TRUE,
    version_status = 'ACTIVE'
WHERE rule_id IN ('RG-FDP-006', 'RG-REST-004')
  AND catalog_entry_type = 'EVALUATION_RULE';

UPDATE rule_catalog
SET active_flag = FALSE,
    version_status = 'CATALOG_ONLY'
WHERE rule_id IN ('RG-FDP-008', 'RG-REST-008')
  AND catalog_entry_type = 'EVALUATION_RULE';
