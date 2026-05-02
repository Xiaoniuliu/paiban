UPDATE rule_catalog
SET active_flag = TRUE
WHERE severity_default = 'P0'
   OR severity_default LIKE 'P0 %'
   OR severity_default = 'BLOCK';
