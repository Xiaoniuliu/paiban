UPDATE task_plan_item tpi
SET tpi.status = 'ASSIGNED'
WHERE tpi.status = 'UNASSIGNED'
  AND EXISTS (
    SELECT 1
    FROM timeline_block tb
    WHERE tb.task_plan_item_id = tpi.id
  );

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
  'UNASSIGNED'
FROM task_plan_import_batch batch
JOIN (
  SELECT 'NX8810' AS task_code, 'MFM' AS departure_airport, 'TPE' AS arrival_airport, '2026-04-27 14:00:00' AS scheduled_start_utc, '2026-04-27 18:40:00' AS scheduled_end_utc
  UNION ALL SELECT 'NX8811', 'MFM', 'BKK', '2026-04-28 03:30:00', '2026-04-28 08:10:00'
) seed
WHERE batch.batch_no = 'BATCH-2026-05-W1'
  AND NOT EXISTS (
    SELECT 1
    FROM task_plan_item existing
    WHERE existing.task_code = seed.task_code
  );
