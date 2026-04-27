UPDATE sys_user
SET role_code = 'DISPATCHER'
WHERE role_code IN ('CREW_CONTROLLER', 'SCHEDULER');
