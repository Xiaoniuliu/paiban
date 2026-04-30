UPDATE task_plan_item
SET status = 'ASSIGNED_DRAFT'
WHERE status = 'ASSIGNED';
