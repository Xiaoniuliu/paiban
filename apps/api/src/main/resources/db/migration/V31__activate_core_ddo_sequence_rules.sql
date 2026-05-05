UPDATE rule_catalog
SET active_flag = TRUE,
    version_status = 'ACTIVE'
WHERE rule_id IN ('RG-DDO-001', 'RG-DDO-002')
  AND catalog_entry_type = 'EVALUATION_RULE';

UPDATE rule_catalog
SET active_flag = FALSE,
    version_status = 'CATALOG_ONLY'
WHERE rule_id IN ('RG-DDO-003', 'RG-DDO-004')
  AND catalog_entry_type = 'EVALUATION_RULE';
