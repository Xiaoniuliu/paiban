UPDATE aircraft_registry ar
SET ar.status = 'ACTIVE'
WHERE ar.status = 'INACTIVE'
  AND EXISTS (
    SELECT 1
    FROM task_plan_item t
    WHERE (t.aircraft_no IS NOT NULL AND t.aircraft_no = ar.aircraft_no)
       OR (t.aircraft_type IS NOT NULL AND t.aircraft_type = ar.aircraft_type)
  );

DELETE ar
FROM aircraft_registry ar
WHERE ar.status = 'INACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM task_plan_item t
    WHERE (t.aircraft_no IS NOT NULL AND t.aircraft_no = ar.aircraft_no)
       OR (t.aircraft_type IS NOT NULL AND t.aircraft_type = ar.aircraft_type)
  );

UPDATE flight_route fr
SET fr.status = 'ACTIVE'
WHERE fr.status = 'INACTIVE'
  AND EXISTS (
    SELECT 1
    FROM task_plan_item t
    WHERE t.departure_airport = fr.departure_airport
      AND t.arrival_airport = fr.arrival_airport
  );

DELETE fr
FROM flight_route fr
WHERE fr.status = 'INACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM task_plan_item t
    WHERE t.departure_airport = fr.departure_airport
      AND t.arrival_airport = fr.arrival_airport
  );

UPDATE airport_dictionary ad
SET ad.status = 'ACTIVE'
WHERE ad.status = 'INACTIVE'
  AND (
    EXISTS (
      SELECT 1
      FROM task_plan_item t
      WHERE t.departure_airport = ad.iata_code
         OR t.arrival_airport = ad.iata_code
    )
    OR EXISTS (
      SELECT 1
      FROM flight_route fr
      WHERE fr.departure_airport = ad.iata_code
         OR fr.arrival_airport = ad.iata_code
    )
    OR EXISTS (
      SELECT 1
      FROM aircraft_registry ar
      WHERE ar.base_airport = ad.iata_code
    )
  );

DELETE ad
FROM airport_dictionary ad
WHERE ad.status = 'INACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM task_plan_item t
    WHERE t.departure_airport = ad.iata_code
       OR t.arrival_airport = ad.iata_code
  )
  AND NOT EXISTS (
    SELECT 1
    FROM flight_route fr
    WHERE fr.departure_airport = ad.iata_code
       OR fr.arrival_airport = ad.iata_code
  )
  AND NOT EXISTS (
    SELECT 1
    FROM aircraft_registry ar
    WHERE ar.base_airport = ad.iata_code
  );
