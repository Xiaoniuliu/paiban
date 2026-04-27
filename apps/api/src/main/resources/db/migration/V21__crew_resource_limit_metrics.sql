ALTER TABLE crew_member
  ADD COLUMN rolling_duty_hours_7d DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER rolling_duty_hours_28d,
  ADD COLUMN rolling_duty_hours_14d DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER rolling_duty_hours_7d,
  ADD COLUMN rolling_flight_hours_12m DECIMAL(7,2) NOT NULL DEFAULT 0 AFTER rolling_duty_hours_14d,
  ADD COLUMN latest_actual_fdp_hours DECIMAL(5,2) NULL AFTER rolling_flight_hours_12m,
  ADD COLUMN latest_actual_fdp_source VARCHAR(64) NOT NULL DEFAULT 'ACTUAL_ONLY' AFTER latest_actual_fdp_hours;

UPDATE crew_member
SET rolling_duty_hours_7d = CASE crew_code
    WHEN 'CPT001' THEN 34.50
    WHEN 'FO001' THEN 32.00
    WHEN 'CPT002' THEN 30.25
    WHEN 'CPT003' THEN 28.75
    WHEN 'FO002' THEN 27.50
    WHEN 'FO003' THEN 25.25
    WHEN 'FO004' THEN 23.75
    ELSE ROUND(rolling_duty_hours_28d / 4, 2)
  END,
  rolling_duty_hours_14d = CASE crew_code
    WHEN 'CPT001' THEN 68.00
    WHEN 'FO001' THEN 63.50
    WHEN 'CPT002' THEN 60.75
    WHEN 'CPT003' THEN 55.25
    WHEN 'FO002' THEN 52.00
    WHEN 'FO003' THEN 48.50
    WHEN 'FO004' THEN 45.75
    ELSE ROUND(rolling_duty_hours_28d / 2, 2)
  END,
  rolling_flight_hours_12m = CASE crew_code
    WHEN 'CPT001' THEN 742.50
    WHEN 'FO001' THEN 721.25
    WHEN 'CPT002' THEN 688.00
    WHEN 'CPT003' THEN 654.50
    WHEN 'FO002' THEN 602.75
    WHEN 'FO003' THEN 580.00
    WHEN 'FO004' THEN 552.25
    ELSE ROUND(rolling_flight_hours_28d * 10, 2)
  END,
  latest_actual_fdp_hours = NULL,
  latest_actual_fdp_source = 'ACTUAL_ONLY';
