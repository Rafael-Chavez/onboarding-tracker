-- Fix May 2026 night shift schedule and extend through August 2026
-- Employee IDs: Jim=3, Steve=5, Marc=4, Erick=6
--
-- May Schedule (as requested):
-- May 3-7 (Week of Apr 27): Jim
-- May 10-14 (Week of May 4): Steve
-- May 17-21 (Week of May 11): Marc
-- May 24-28 (Week of May 18): Erick
--
-- Then cycle through: Jim -> Steve -> Marc -> Erick for June, July, August

BEGIN;

-- Delete existing May through August shifts to regenerate
DELETE FROM night_shifts
WHERE shift_date >= '2026-04-27' AND shift_date <= '2026-09-04';

-- Helper function to insert a week of shifts (Sunday-Thursday, 5 days)
CREATE OR REPLACE FUNCTION insert_week_shifts(
  p_employee_id INTEGER,
  p_week_start DATE
) RETURNS VOID AS $$
DECLARE
  day_offset INTEGER;
BEGIN
  FOR day_offset IN 0..4 LOOP
    INSERT INTO night_shifts (
      employee_id,
      shift_date,
      week_start_date,
      status,
      original_employee_id
    )
    VALUES (
      p_employee_id,
      p_week_start + day_offset,
      p_week_start,
      'scheduled',
      p_employee_id
    )
    ON CONFLICT (shift_date) DO UPDATE
    SET employee_id = EXCLUDED.employee_id,
        original_employee_id = EXCLUDED.original_employee_id,
        status = 'scheduled';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- MAY 2026
-- Week 1: Apr 27 - May 1 (Jim)
SELECT insert_week_shifts(3, '2026-04-27'::DATE);

-- Week 2: May 4 - May 8 (Steve)
SELECT insert_week_shifts(5, '2026-05-04'::DATE);

-- Week 3: May 11 - May 15 (Marc)
SELECT insert_week_shifts(4, '2026-05-11'::DATE);

-- Week 4: May 18 - May 22 (Erick)
SELECT insert_week_shifts(6, '2026-05-18'::DATE);

-- Week 5: May 25 - May 29 (Jim - continuing cycle)
SELECT insert_week_shifts(3, '2026-05-25'::DATE);

-- JUNE 2026
-- Week 1: Jun 1 - Jun 5 (Steve)
SELECT insert_week_shifts(5, '2026-06-01'::DATE);

-- Week 2: Jun 8 - Jun 12 (Marc)
SELECT insert_week_shifts(4, '2026-06-08'::DATE);

-- Week 3: Jun 15 - Jun 19 (Erick)
SELECT insert_week_shifts(6, '2026-06-15'::DATE);

-- Week 4: Jun 22 - Jun 26 (Jim)
SELECT insert_week_shifts(3, '2026-06-22'::DATE);

-- Week 5: Jun 29 - Jul 3 (Steve)
SELECT insert_week_shifts(5, '2026-06-29'::DATE);

-- JULY 2026
-- Week 2: Jul 6 - Jul 10 (Marc)
SELECT insert_week_shifts(4, '2026-07-06'::DATE);

-- Week 3: Jul 13 - Jul 17 (Erick)
SELECT insert_week_shifts(6, '2026-07-13'::DATE);

-- Week 4: Jul 20 - Jul 24 (Jim)
SELECT insert_week_shifts(3, '2026-07-20'::DATE);

-- Week 5: Jul 27 - Jul 31 (Steve)
SELECT insert_week_shifts(5, '2026-07-27'::DATE);

-- AUGUST 2026
-- Week 1: Aug 3 - Aug 7 (Marc)
SELECT insert_week_shifts(4, '2026-08-03'::DATE);

-- Week 2: Aug 10 - Aug 14 (Erick)
SELECT insert_week_shifts(6, '2026-08-10'::DATE);

-- Week 3: Aug 17 - Aug 21 (Jim)
SELECT insert_week_shifts(3, '2026-08-17'::DATE);

-- Week 4: Aug 24 - Aug 28 (Steve)
SELECT insert_week_shifts(5, '2026-08-24'::DATE);

-- Week 5: Aug 31 - Sep 4 (Marc - continuing into September)
SELECT insert_week_shifts(4, '2026-08-31'::DATE);

COMMIT;

-- Verify the schedule
SELECT
  ns.shift_date,
  TO_CHAR(ns.shift_date, 'Dy') as day_of_week,
  e.name as employee_name,
  ns.week_start_date,
  ns.status
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= '2026-04-27' AND ns.shift_date <= '2026-09-04'
ORDER BY ns.shift_date;

-- Show summary by month and employee
SELECT
  TO_CHAR(ns.shift_date, 'YYYY-MM') as month,
  e.name,
  COUNT(*) as shifts
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= '2026-04-27' AND ns.shift_date <= '2026-09-04'
GROUP BY TO_CHAR(ns.shift_date, 'YYYY-MM'), e.name
ORDER BY month, e.name;
