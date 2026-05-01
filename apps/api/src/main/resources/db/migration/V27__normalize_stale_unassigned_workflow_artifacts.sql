DELETE vh
FROM violation_hit vh
JOIN timeline_block tb ON tb.id = vh.timeline_block_id
JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
WHERE tpi.status = 'UNASSIGNED'
  AND tb.status = 'ASSIGNED_DRAFT';

DELETE tb
FROM timeline_block tb
JOIN task_plan_item tpi ON tpi.id = tb.task_plan_item_id
WHERE tpi.status = 'UNASSIGNED'
  AND tb.status = 'ASSIGNED_DRAFT';

DELETE caf
FROM crew_archive_form caf
JOIN task_plan_item tpi ON tpi.id = caf.flight_id
WHERE tpi.status <> 'PUBLISHED';

DELETE fac
FROM flight_archive_case fac
JOIN task_plan_item tpi ON tpi.id = fac.flight_id
WHERE tpi.status <> 'PUBLISHED';
