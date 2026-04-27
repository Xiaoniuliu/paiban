INSERT IGNORE INTO sys_user (username, display_name, role_code) VALUES
  ('controller01', 'Crew Controller', 'CREW_CONTROLLER'),
  ('manager01', 'Flight Operations Manager', 'OPS_MANAGER');

INSERT IGNORE INTO airport_dictionary (iata_code, name_zh, name_en, timezone_name, utc_offset_minutes) VALUES
  ('MFM', '澳门国际机场', 'Macau International Airport', 'Asia/Macau', 480),
  ('SIN', '新加坡樟宜机场', 'Singapore Changi Airport', 'Asia/Singapore', 480),
  ('DXB', '迪拜国际机场', 'Dubai International Airport', 'Asia/Dubai', 240);

INSERT IGNORE INTO crew_member (
  crew_code, name_zh, name_en, role_code, home_base, aircraft_qualification,
  acclimatization_status, rolling_flight_hours_28d, rolling_duty_hours_28d
) VALUES
  ('CPT001', '张伟', 'Wei Zhang', 'CAPTAIN', 'MFM', 'A330', 'ACCLIMATIZED', 72.50, 126.00),
  ('FO001', '李娜', 'Na Li', 'FIRST_OFFICER', 'MFM', 'A330', 'ACCLIMATIZED', 68.25, 118.50);

INSERT IGNORE INTO task_plan_import_batch (batch_no, source_name, status) VALUES
  ('BATCH-2026-05-W1', 'Sample Phase 1 import', 'IMPORTED');

INSERT IGNORE INTO task_plan_item (
  batch_id, task_code, task_type, departure_airport, arrival_airport,
  scheduled_start_utc, scheduled_end_utc, sector_count, status
)
SELECT id, 'NX9001', 'FLIGHT', 'MFM', 'SIN', '2026-05-01 01:00:00', '2026-05-01 05:15:00', 1, 'UNASSIGNED'
FROM task_plan_import_batch WHERE batch_no = 'BATCH-2026-05-W1';

INSERT IGNORE INTO rule_catalog (
  rule_id, title_zh, title_en, rule_category, severity_default,
  source_section, source_clause, source_page
) VALUES
  ('FDP_STD_A', '适应状态机组标准 FDP 上限', 'Standard FDP limit for acclimatized crew', '硬校验', 'NON_COMPLIANT', '7.1', 'Table A', 10),
  ('CREW_REQUIRED_BASE_DATA', '飞行员基础数据必填', 'Crew base data is required', '硬校验', 'BLOCK', '7.1.5', 'Prerequisite data', 9);
