CREATE TABLE IF NOT EXISTS run_day_adjustment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_plan_item_id BIGINT NOT NULL,
  adjustment_type VARCHAR(40) NOT NULL,
  proposed_start_utc DATETIME NULL,
  proposed_end_utc DATETIME NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT NULL,
  created_at_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_run_day_adjustment_task FOREIGN KEY (task_plan_item_id) REFERENCES task_plan_item(id),
  CONSTRAINT fk_run_day_adjustment_created_by FOREIGN KEY (created_by) REFERENCES sys_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
