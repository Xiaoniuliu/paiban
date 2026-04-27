ALTER TABLE crew_member
  DROP FOREIGN KEY fk_crew_home_base;

ALTER TABLE crew_member
  MODIFY home_base VARCHAR(3) NOT NULL;

ALTER TABLE task_plan_item
  MODIFY departure_airport VARCHAR(3) NULL,
  MODIFY arrival_airport VARCHAR(3) NULL;

ALTER TABLE crew_member
  ADD CONSTRAINT fk_crew_home_base FOREIGN KEY (home_base) REFERENCES airport_dictionary(iata_code);
