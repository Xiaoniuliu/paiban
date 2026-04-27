ALTER TABLE sys_user
  ADD COLUMN crew_id BIGINT NULL AFTER enabled,
  ADD CONSTRAINT fk_sys_user_crew FOREIGN KEY (crew_id) REFERENCES crew_member(id);

UPDATE sys_user u
JOIN crew_member c ON c.crew_code = 'FO001'
SET u.crew_id = c.id
WHERE u.username = 'pilot01';

INSERT IGNORE INTO sys_user (username, display_name, role_code, enabled)
VALUES ('pilot_unbound', 'Unbound Flight Crew', 'PILOT', TRUE);

CREATE TABLE flight_archive_case (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  flight_id BIGINT NOT NULL,
  roster_version_id BIGINT NOT NULL,
  archive_status VARCHAR(40) NOT NULL,
  archive_deadline_at_utc DATETIME NOT NULL,
  archived_at_utc DATETIME NULL,
  completed_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  revision INT NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_archive_case_flight UNIQUE (flight_id),
  CONSTRAINT fk_archive_case_flight FOREIGN KEY (flight_id) REFERENCES task_plan_item(id),
  CONSTRAINT fk_archive_case_roster FOREIGN KEY (roster_version_id) REFERENCES roster_version(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crew_archive_form (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  archive_case_id BIGINT NOT NULL,
  flight_id BIGINT NOT NULL,
  crew_id BIGINT NOT NULL,
  actual_duty_start_utc DATETIME NULL,
  actual_duty_end_utc DATETIME NULL,
  actual_fdp_start_utc DATETIME NULL,
  actual_fdp_end_utc DATETIME NULL,
  flying_hour_minutes INT NULL,
  no_flying_hour_flag BOOLEAN NOT NULL DEFAULT FALSE,
  form_status VARCHAR(40) NOT NULL DEFAULT 'NotStarted',
  entered_by BIGINT NULL,
  entered_at_utc DATETIME NULL,
  confirmed_at_utc DATETIME NULL,
  revision INT NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_archive_form_case_crew UNIQUE (archive_case_id, crew_id),
  CONSTRAINT fk_archive_form_case FOREIGN KEY (archive_case_id) REFERENCES flight_archive_case(id),
  CONSTRAINT fk_archive_form_flight FOREIGN KEY (flight_id) REFERENCES task_plan_item(id),
  CONSTRAINT fk_archive_form_crew FOREIGN KEY (crew_id) REFERENCES crew_member(id),
  CONSTRAINT fk_archive_form_entered_by FOREIGN KEY (entered_by) REFERENCES sys_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO flight_archive_case (
  flight_id,
  roster_version_id,
  archive_status,
  archive_deadline_at_utc,
  completed_count,
  total_count
)
SELECT
  tpi.id,
  rv.id,
  'Unarchived',
  DATE_ADD(tpi.scheduled_end_utc, INTERVAL 24 HOUR),
  0,
  COUNT(DISTINCT tb.crew_member_id)
FROM task_plan_item tpi
JOIN roster_version rv ON rv.version_no = 'RV-2026-05-W1-DRAFT'
JOIN timeline_block tb ON tb.task_plan_item_id = tpi.id AND tb.roster_version_id = rv.id
WHERE tpi.task_code = 'NX9001'
  AND NOT EXISTS (
    SELECT 1 FROM flight_archive_case existing WHERE existing.flight_id = tpi.id
  )
GROUP BY tpi.id, rv.id, tpi.scheduled_end_utc;

INSERT INTO crew_archive_form (
  archive_case_id,
  flight_id,
  crew_id,
  form_status
)
SELECT
  fac.id,
  fac.flight_id,
  tb.crew_member_id,
  'NotStarted'
FROM flight_archive_case fac
JOIN timeline_block tb ON tb.task_plan_item_id = fac.flight_id
WHERE NOT EXISTS (
  SELECT 1
  FROM crew_archive_form existing
  WHERE existing.archive_case_id = fac.id
    AND existing.crew_id = tb.crew_member_id
);
