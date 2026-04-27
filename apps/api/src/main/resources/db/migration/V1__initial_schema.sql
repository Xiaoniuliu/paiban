CREATE DATABASE IF NOT EXISTS pilot_roster CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  role_code VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS airport_dictionary (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  iata_code CHAR(3) NOT NULL UNIQUE,
  name_zh VARCHAR(128) NOT NULL,
  name_en VARCHAR(128) NOT NULL,
  timezone_name VARCHAR(64) NOT NULL,
  utc_offset_minutes INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS crew_member (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  crew_code VARCHAR(64) NOT NULL UNIQUE,
  name_zh VARCHAR(128) NOT NULL,
  name_en VARCHAR(128) NOT NULL,
  role_code VARCHAR(64) NOT NULL,
  home_base CHAR(3) NOT NULL,
  aircraft_qualification VARCHAR(64) NOT NULL,
  acclimatization_status VARCHAR(32) NOT NULL DEFAULT 'ACCLIMATIZED',
  rolling_flight_hours_28d DECIMAL(6,2) NOT NULL DEFAULT 0,
  rolling_duty_hours_28d DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crew_home_base FOREIGN KEY (home_base) REFERENCES airport_dictionary(iata_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS task_plan_import_batch (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  batch_no VARCHAR(64) NOT NULL UNIQUE,
  source_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'IMPORTED',
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS task_plan_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT NOT NULL,
  task_code VARCHAR(64) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  departure_airport CHAR(3) NULL,
  arrival_airport CHAR(3) NULL,
  scheduled_start_utc DATETIME NOT NULL,
  scheduled_end_utc DATETIME NOT NULL,
  sector_count INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'UNASSIGNED',
  CONSTRAINT fk_task_batch FOREIGN KEY (batch_id) REFERENCES task_plan_import_batch(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS roster_version (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  version_no VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_roster_created_by FOREIGN KEY (created_by) REFERENCES sys_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS timeline_block (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  roster_version_id BIGINT NOT NULL,
  crew_member_id BIGINT NULL,
  task_plan_item_id BIGINT NULL,
  block_type VARCHAR(64) NOT NULL,
  start_utc DATETIME NOT NULL,
  end_utc DATETIME NOT NULL,
  display_label VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
  CONSTRAINT fk_block_version FOREIGN KEY (roster_version_id) REFERENCES roster_version(id),
  CONSTRAINT fk_block_crew FOREIGN KEY (crew_member_id) REFERENCES crew_member(id),
  CONSTRAINT fk_block_task FOREIGN KEY (task_plan_item_id) REFERENCES task_plan_item(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS rule_catalog (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_id VARCHAR(64) NOT NULL UNIQUE,
  title_zh VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  rule_category VARCHAR(64) NOT NULL,
  severity_default VARCHAR(32) NOT NULL,
  source_section VARCHAR(64) NOT NULL,
  source_clause VARCHAR(128) NOT NULL,
  source_page INT NOT NULL,
  phase_code VARCHAR(32) NOT NULL DEFAULT 'PHASE_1',
  active_flag BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS violation_hit (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  roster_version_id BIGINT NOT NULL,
  timeline_block_id BIGINT NULL,
  rule_catalog_id BIGINT NOT NULL,
  severity VARCHAR(32) NOT NULL,
  evidence_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hit_version FOREIGN KEY (roster_version_id) REFERENCES roster_version(id),
  CONSTRAINT fk_hit_block FOREIGN KEY (timeline_block_id) REFERENCES timeline_block(id),
  CONSTRAINT fk_hit_rule FOREIGN KEY (rule_catalog_id) REFERENCES rule_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
