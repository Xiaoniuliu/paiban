ALTER TABLE timeline_block
  ADD COLUMN assignment_role VARCHAR(32) NOT NULL DEFAULT 'EXTRA' AFTER status,
  ADD COLUMN display_order INT NOT NULL DEFAULT 99 AFTER assignment_role;

UPDATE timeline_block tb
LEFT JOIN crew_member cm ON cm.id = tb.crew_member_id
SET
  tb.assignment_role = CASE
    WHEN cm.role_code = 'CAPTAIN' THEN 'PIC'
    WHEN cm.role_code = 'FIRST_OFFICER' THEN 'FO'
    ELSE 'EXTRA'
  END,
  tb.display_order = CASE
    WHEN cm.role_code = 'CAPTAIN' THEN 0
    WHEN cm.role_code = 'FIRST_OFFICER' THEN 1
    ELSE 99
  END;
