INSERT IGNORE INTO roster_version (version_no, status, created_by)
SELECT 'RV-2026-05-W1-DRAFT', 'DRAFT', id
FROM sys_user
WHERE username = 'dispatcher01';

INSERT INTO timeline_block (
  roster_version_id,
  crew_member_id,
  task_plan_item_id,
  block_type,
  start_utc,
  end_utc,
  display_label,
  status
)
SELECT
  rv.id,
  cm.id,
  tpi.id,
  'FLIGHT',
  tpi.scheduled_start_utc,
  tpi.scheduled_end_utc,
  CONCAT(tpi.task_code, ' ', tpi.departure_airport, '-', tpi.arrival_airport),
  'PLANNED'
FROM roster_version rv
JOIN crew_member cm ON cm.crew_code IN ('CPT001', 'FO001')
JOIN task_plan_item tpi ON tpi.task_code = 'NX9001'
WHERE rv.version_no = 'RV-2026-05-W1-DRAFT'
  AND NOT EXISTS (
    SELECT 1
    FROM timeline_block existing
    WHERE existing.roster_version_id = rv.id
      AND existing.crew_member_id = cm.id
      AND existing.task_plan_item_id = tpi.id
  );
