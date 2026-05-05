UPDATE rule_catalog
SET active_flag = TRUE,
    version_status = 'ACTIVE'
WHERE rule_id IN ('RG-FDP-008', 'RG-REST-008')
  AND catalog_entry_type = 'EVALUATION_RULE';
