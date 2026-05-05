UPDATE rule_catalog
SET active_flag = TRUE,
    version_status = 'ACTIVE'
WHERE rule_id IN (
  'RG-BASE-008',
  'RG-DDO-001',
  'RG-DDO-002',
  'RG-DDO-003',
  'RG-HOUR-001',
  'RG-HOUR-002',
  'RG-HOUR-003',
  'RG-HOUR-006',
  'RG-HOUR-007',
  'RG-FDP-006',
  'RG-REST-004',
  'RG-FDP-008',
  'RG-REST-008'
)
  AND catalog_entry_type = 'EVALUATION_RULE';

UPDATE rule_catalog
SET active_flag = FALSE,
    version_status = 'CATALOG_ONLY'
WHERE rule_id = 'RG-DDO-004'
  AND catalog_entry_type = 'EVALUATION_RULE';
