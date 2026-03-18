-- Script to populate initial night shifts based on the rotation logic
-- Night shift rotation: Marc (4) → Erick (6) → Danreb (2) → Jim (3) → Steve (5)
-- Reference: Week of 2026-02-15 (Sun) = Erick (employee_id 6, index 1)
-- Schedule: Sunday - Friday (6 days per week)

-- This script generates shifts for the next 90 days (approximately 3 months)

-- First, let's create a function to generate the shifts
CREATE OR REPLACE FUNCTION generate_night_shifts(start_date DATE, num_weeks INTEGER)
RETURNS VOID AS $$
DECLARE
  rotation_ids INTEGER[] := ARRAY[4, 6, 2, 3, 5]; -- Marc, Erick, Danreb, Jim, Steve
  reference_sunday DATE := '2026-02-15'::DATE;
  reference_index INTEGER := 1; -- Erick is at index 1 (0-based)
  current_sunday DATE;
  week_offset INTEGER;
  current_index INTEGER;
  employee_id INTEGER;
  shift_date DATE;
  week_num INTEGER;
  day_num INTEGER;
BEGIN
  -- Loop through each week
  FOR week_num IN 0..(num_weeks - 1) LOOP
    -- Calculate the Sunday for this week
    current_sunday := start_date + (week_num * 7);

    -- Ensure we start on a Sunday
    current_sunday := current_sunday - EXTRACT(DOW FROM current_sunday)::INTEGER;

    -- Calculate week offset from reference
    week_offset := FLOOR((current_sunday - reference_sunday) / 7);

    -- Calculate which employee should be on duty this week
    current_index := MOD(MOD(reference_index + week_offset, 5) + 5, 5) + 1; -- 1-based index
    employee_id := rotation_ids[current_index];

    -- Create shifts for Sunday through Friday (6 days)
    FOR day_num IN 0..5 LOOP
      shift_date := current_sunday + day_num;

      -- Insert the shift (ignore if already exists)
      INSERT INTO night_shifts (employee_id, shift_date, week_start_date, status, original_employee_id)
      VALUES (employee_id, shift_date, current_sunday, 'scheduled', employee_id)
      ON CONFLICT (shift_date) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Generated night shifts for % weeks starting from %', num_weeks, start_date;
END;
$$ LANGUAGE plpgsql;

-- Generate shifts for the next 13 weeks (approximately 3 months)
-- Start from the current week's Sunday
SELECT generate_night_shifts(
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
  13
);

-- Verify the shifts were created
SELECT
  ns.shift_date,
  e.name as employee_name,
  ns.week_start_date,
  ns.status
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
ORDER BY ns.shift_date
LIMIT 50;

-- Show summary by employee
SELECT
  e.name,
  COUNT(*) as total_shifts
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
GROUP BY e.name
ORDER BY e.name;
