ALTER TABLE sys_user
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER role_code,
  ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER password_hash;

UPDATE sys_user SET role_code = 'DISPATCHER' WHERE username = 'controller01';
UPDATE sys_user SET role_code = 'OPS_MANAGER' WHERE username = 'manager01';

INSERT IGNORE INTO sys_user (username, display_name, role_code, enabled) VALUES
  ('dispatcher01', 'Dispatcher', 'DISPATCHER', TRUE),
  ('pilot01', 'Flight Crew', 'PILOT', TRUE),
  ('admin', 'Administrator', 'ADMIN', TRUE);
