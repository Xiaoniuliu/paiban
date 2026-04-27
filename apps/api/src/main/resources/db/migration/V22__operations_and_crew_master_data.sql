ALTER TABLE airport_dictionary
  ADD COLUMN country_code VARCHAR(10) NOT NULL DEFAULT '' AFTER utc_offset_minutes,
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' AFTER country_code,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status,
  ADD COLUMN updated_at TIMESTAMP NULL AFTER created_at;

ALTER TABLE crew_member
  ADD COLUMN employee_no VARCHAR(50) NOT NULL DEFAULT '' AFTER crew_code,
  ADD COLUMN rank_code VARCHAR(50) NOT NULL DEFAULT '' AFTER role_code,
  ADD COLUMN body_clock_timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Macau' AFTER acclimatization_status,
  ADD COLUMN normal_commute_minutes INT NOT NULL DEFAULT 0 AFTER body_clock_timezone,
  ADD COLUMN external_employment_flag BOOLEAN NOT NULL DEFAULT FALSE AFTER normal_commute_minutes,
  ADD COLUMN availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' AFTER external_employment_flag,
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' AFTER availability_status,
  ADD COLUMN updated_at TIMESTAMP NULL AFTER created_at;

UPDATE crew_member
SET employee_no = crew_code,
    rank_code = CASE role_code
      WHEN 'CAPTAIN' THEN 'CAPT'
      WHEN 'FIRST_OFFICER' THEN 'FO'
      ELSE role_code
    END
WHERE employee_no = '';

ALTER TABLE task_plan_item
  ADD COLUMN title_zh VARCHAR(200) NOT NULL DEFAULT '' AFTER task_type,
  ADD COLUMN title_en VARCHAR(200) NOT NULL DEFAULT '' AFTER title_zh,
  ADD COLUMN aircraft_type VARCHAR(50) NULL AFTER sector_count,
  ADD COLUMN aircraft_no VARCHAR(64) NULL AFTER aircraft_type,
  ADD COLUMN required_crew_pattern VARCHAR(100) NULL AFTER aircraft_no,
  ADD COLUMN source_status VARCHAR(30) NOT NULL DEFAULT 'ACCEPTED' AFTER status,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER source_status,
  ADD COLUMN updated_at TIMESTAMP NULL AFTER created_at;

UPDATE task_plan_item
SET title_zh = task_code,
    title_en = task_code,
    aircraft_type = 'A330',
    required_crew_pattern = 'PIC+FO'
WHERE title_zh = '';

CREATE TABLE IF NOT EXISTS flight_route (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  route_code VARCHAR(32) NOT NULL UNIQUE,
  departure_airport CHAR(3) NOT NULL,
  arrival_airport CHAR(3) NOT NULL,
  standard_duration_minutes INT NOT NULL DEFAULT 0,
  time_difference_minutes INT NOT NULL DEFAULT 0,
  cross_timezone BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_route_departure_airport FOREIGN KEY (departure_airport) REFERENCES airport_dictionary(iata_code),
  CONSTRAINT fk_route_arrival_airport FOREIGN KEY (arrival_airport) REFERENCES airport_dictionary(iata_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO flight_route (
  route_code,
  departure_airport,
  arrival_airport,
  standard_duration_minutes,
  time_difference_minutes,
  cross_timezone
)
SELECT
  CONCAT(tpi.departure_airport, '-', tpi.arrival_airport),
  tpi.departure_airport,
  tpi.arrival_airport,
  ROUND(AVG(TIMESTAMPDIFF(MINUTE, tpi.scheduled_start_utc, tpi.scheduled_end_utc))),
  COALESCE(arr.utc_offset_minutes, 0) - COALESCE(dep.utc_offset_minutes, 0),
  ABS(COALESCE(arr.utc_offset_minutes, 0) - COALESCE(dep.utc_offset_minutes, 0)) >= 360
FROM task_plan_item tpi
LEFT JOIN airport_dictionary dep ON dep.iata_code = tpi.departure_airport
LEFT JOIN airport_dictionary arr ON arr.iata_code = tpi.arrival_airport
WHERE tpi.departure_airport IS NOT NULL
  AND tpi.arrival_airport IS NOT NULL
GROUP BY tpi.departure_airport, tpi.arrival_airport, dep.utc_offset_minutes, arr.utc_offset_minutes;

CREATE TABLE IF NOT EXISTS aircraft_registry (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  aircraft_no VARCHAR(64) NOT NULL UNIQUE,
  aircraft_type VARCHAR(50) NOT NULL,
  fleet VARCHAR(50) NOT NULL DEFAULT '',
  base_airport CHAR(3) NOT NULL,
  seat_count INT NOT NULL DEFAULT 0,
  max_payload DECIMAL(10,2) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_aircraft_base_airport FOREIGN KEY (base_airport) REFERENCES airport_dictionary(iata_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO aircraft_registry (aircraft_no, aircraft_type, fleet, base_airport, seat_count, max_payload)
VALUES ('B-MFM01', 'A330', 'A330F', 'MFM', 0, 60.00);

CREATE TABLE IF NOT EXISTS crew_qualification (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  crew_member_id BIGINT NOT NULL,
  qualification_type VARCHAR(50) NOT NULL,
  qualification_code VARCHAR(64) NOT NULL,
  effective_from_utc DATETIME NULL,
  effective_to_utc DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_qualification_crew FOREIGN KEY (crew_member_id) REFERENCES crew_member(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO crew_qualification (crew_member_id, qualification_type, qualification_code, status)
SELECT cm.id, 'AIRCRAFT', cm.aircraft_qualification, 'ACTIVE'
FROM crew_member cm
WHERE NOT EXISTS (
  SELECT 1 FROM crew_qualification cq
  WHERE cq.crew_member_id = cm.id
    AND cq.qualification_type = 'AIRCRAFT'
    AND cq.qualification_code = cm.aircraft_qualification
);

CREATE TABLE IF NOT EXISTS crew_external_work (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  crew_member_id BIGINT NOT NULL,
  external_type VARCHAR(50) NOT NULL,
  start_utc DATETIME NOT NULL,
  end_utc DATETIME NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_external_work_crew FOREIGN KEY (crew_member_id) REFERENCES crew_member(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
