ALTER TABLE violation_hit
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'OPEN' AFTER severity,
  ADD COLUMN target_type VARCHAR(40) NOT NULL DEFAULT 'TIMELINE_BLOCK' AFTER status,
  ADD COLUMN target_id BIGINT NULL AFTER target_type,
  ADD COLUMN crew_id BIGINT NULL AFTER target_id,
  ADD COLUMN task_id BIGINT NULL AFTER crew_id,
  ADD COLUMN evidence_window_start_utc DATETIME NULL AFTER task_id,
  ADD COLUMN evidence_window_end_utc DATETIME NULL AFTER evidence_window_start_utc,
  ADD COLUMN message VARCHAR(512) NOT NULL DEFAULT '' AFTER evidence_window_end_utc,
  ADD COLUMN recommended_action VARCHAR(64) NOT NULL DEFAULT 'REVIEW' AFTER message,
  ADD CONSTRAINT fk_hit_crew FOREIGN KEY (crew_id) REFERENCES crew_member(id),
  ADD CONSTRAINT fk_hit_task FOREIGN KEY (task_id) REFERENCES task_plan_item(id);

ALTER TABLE run_day_adjustment
  ADD COLUMN from_crew_id BIGINT NULL AFTER proposed_end_utc,
  ADD COLUMN to_crew_id BIGINT NULL AFTER from_crew_id,
  ADD COLUMN assignment_role VARCHAR(32) NULL AFTER to_crew_id,
  ADD COLUMN effective_start_utc DATETIME NULL AFTER assignment_role,
  ADD COLUMN effective_end_utc DATETIME NULL AFTER effective_start_utc,
  ADD CONSTRAINT fk_run_day_from_crew FOREIGN KEY (from_crew_id) REFERENCES crew_member(id),
  ADD CONSTRAINT fk_run_day_to_crew FOREIGN KEY (to_crew_id) REFERENCES crew_member(id);

INSERT IGNORE INTO rule_catalog (
  rule_id, title_zh, title_en, rule_category, severity_default,
  source_section, source_clause, source_page, phase_code, active_flag
) VALUES
  ('CREW_ASSIGNMENT_REQUIRED', '航班必须完成 PIC / FO 分配', 'PIC / FO assignment required', 'PUBLISH_GATE', 'BLOCK', 'Workbench', 'Assignment prerequisite', 1, 'PHASE_2', TRUE),
  ('TASK_STATUS_BLOCKED', '任务存在阻断状态', 'Task status is blocked', 'PUBLISH_GATE', 'BLOCK', 'Workbench', 'Task status', 1, 'PHASE_2', TRUE),
  ('CREW_PAIR_REQUIRED', '缺少必需机组角色', 'Required crew pair is missing', 'PUBLISH_GATE', 'BLOCK', 'Workbench', 'PIC and FO required', 1, 'PHASE_2', TRUE),
  ('CREW_TIME_OVERLAP', '同一机组时间重叠', 'Crew member has overlapping timeline blocks', 'TIME_CONFLICT', 'BLOCK', 'FOM 7', 'Duty conflict', 1, 'PHASE_2', TRUE),
  ('CREW_STATUS_CONFLICT', '航班与机组状态冲突', 'Flight conflicts with crew status block', 'TIME_CONFLICT', 'BLOCK', 'FOM 7', 'Status conflict', 1, 'PHASE_2', TRUE),
  ('MANAGER_REVIEW_REQUIRED', '发布前需要复核', 'Manager review required before publishing', 'PUBLISH_GATE', 'WARNING', 'Workbench', 'Manager review', 1, 'PHASE_2', TRUE);
