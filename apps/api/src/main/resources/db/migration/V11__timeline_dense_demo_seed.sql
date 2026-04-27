INSERT IGNORE INTO crew_member (
  crew_code,
  name_zh,
  name_en,
  role_code,
  home_base,
  aircraft_qualification,
  acclimatization_status,
  rolling_flight_hours_28d,
  rolling_duty_hours_28d
) VALUES
  ('CPT002', 'Mei Chen', 'Mei Chen', 'CAPTAIN', 'MFM', 'A330', 'ACCLIMATIZED', 64.00, 112.00),
  ('CPT003', 'Grace Ho', 'Grace Ho', 'CAPTAIN', 'MFM', 'A330', 'ACCLIMATIZED', 58.50, 104.25),
  ('FO002', 'Han Wu', 'Han Wu', 'FIRST_OFFICER', 'MFM', 'A330', 'ACCLIMATIZED', 52.75, 96.00),
  ('FO003', 'Leo Wong', 'Leo Wong', 'FIRST_OFFICER', 'MFM', 'A330', 'ACCLIMATIZED', 49.00, 90.50),
  ('FO004', 'Rita Chan', 'Rita Chan', 'FIRST_OFFICER', 'MFM', 'A330', 'ACCLIMATIZED', 44.25, 86.75);

INSERT INTO task_plan_item (
  batch_id,
  task_code,
  task_type,
  departure_airport,
  arrival_airport,
  scheduled_start_utc,
  scheduled_end_utc,
  sector_count,
  status
)
SELECT
  batch.id,
  seed.task_code,
  'FLIGHT',
  seed.departure_airport,
  seed.arrival_airport,
  seed.scheduled_start_utc,
  seed.scheduled_end_utc,
  1,
  'ASSIGNED'
FROM task_plan_import_batch batch
JOIN (
  SELECT 'NX8801' AS task_code, 'MFM' AS departure_airport, 'TPE' AS arrival_airport, '2026-04-25 15:00:00' AS scheduled_start_utc, '2026-04-25 20:30:00' AS scheduled_end_utc
  UNION ALL SELECT 'NX8802', 'MFM', 'BKK', '2026-04-26 01:30:00', '2026-04-26 05:50:00'
  UNION ALL SELECT 'NX8803', 'BKK', 'MFM', '2026-04-26 07:00:00', '2026-04-26 11:30:00'
  UNION ALL SELECT 'NX8804', 'MFM', 'SIN', '2026-04-27 02:00:00', '2026-04-27 06:40:00'
  UNION ALL SELECT 'NX8805', 'SIN', 'MFM', '2026-04-28 10:15:00', '2026-04-28 15:10:00'
  UNION ALL SELECT 'NX8806', 'MFM', 'KIX', '2026-04-29 23:00:00', '2026-04-30 04:30:00'
  UNION ALL SELECT 'NX8807', 'KIX', 'MFM', '2026-04-30 08:20:00', '2026-04-30 13:45:00'
  UNION ALL SELECT 'NX8808', 'MFM', 'TPE', '2026-05-01 12:30:00', '2026-05-01 17:20:00'
) seed
WHERE batch.batch_no = 'BATCH-2026-05-W1'
  AND NOT EXISTS (
    SELECT 1
    FROM task_plan_item existing
    WHERE existing.task_code = seed.task_code
  );

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
JOIN (
  SELECT 'NX8801' AS task_code, 'CPT002' AS crew_code
  UNION ALL SELECT 'NX8801', 'FO002'
  UNION ALL SELECT 'NX8802', 'CPT001'
  UNION ALL SELECT 'NX8802', 'FO003'
  UNION ALL SELECT 'NX8803', 'CPT003'
  UNION ALL SELECT 'NX8803', 'FO004'
  UNION ALL SELECT 'NX8804', 'CPT002'
  UNION ALL SELECT 'NX8804', 'FO001'
  UNION ALL SELECT 'NX8805', 'CPT001'
  UNION ALL SELECT 'NX8805', 'FO002'
  UNION ALL SELECT 'NX8806', 'CPT003'
  UNION ALL SELECT 'NX8806', 'FO003'
  UNION ALL SELECT 'NX8807', 'CPT002'
  UNION ALL SELECT 'NX8807', 'FO004'
  UNION ALL SELECT 'NX8808', 'CPT003'
  UNION ALL SELECT 'NX8808', 'FO002'
) assignment
JOIN crew_member cm ON cm.crew_code = assignment.crew_code
JOIN task_plan_item tpi ON tpi.task_code = assignment.task_code
WHERE rv.version_no = 'RV-2026-05-W1-DRAFT'
  AND NOT EXISTS (
    SELECT 1
    FROM timeline_block existing
    WHERE existing.roster_version_id = rv.id
      AND existing.crew_member_id = cm.id
      AND existing.task_plan_item_id = tpi.id
  );
