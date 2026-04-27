INSERT IGNORE INTO airport_dictionary (
  iata_code,
  name_zh,
  name_en,
  timezone_name,
  utc_offset_minutes,
  country_code,
  status
) VALUES
  ('BKK', '曼谷素万那普机场', 'Bangkok Suvarnabhumi Airport', 'Asia/Bangkok', 420, 'TH', 'ACTIVE'),
  ('KIX', '关西国际机场', 'Kansai International Airport', 'Asia/Tokyo', 540, 'JP', 'ACTIVE'),
  ('TPE', '台湾桃园国际机场', 'Taiwan Taoyuan International Airport', 'Asia/Taipei', 480, 'TW', 'ACTIVE');

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
JOIN airport_dictionary dep ON dep.iata_code = tpi.departure_airport
JOIN airport_dictionary arr ON arr.iata_code = tpi.arrival_airport
WHERE tpi.departure_airport IS NOT NULL
  AND tpi.arrival_airport IS NOT NULL
GROUP BY tpi.departure_airport, tpi.arrival_airport, dep.utc_offset_minutes, arr.utc_offset_minutes;
