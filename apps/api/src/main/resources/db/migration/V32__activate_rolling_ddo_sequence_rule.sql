UPDATE rule_catalog
SET active_flag = TRUE,
    version_status = 'ACTIVE'
WHERE rule_id = 'RG-DDO-003'
  AND catalog_entry_type = 'EVALUATION_RULE';
