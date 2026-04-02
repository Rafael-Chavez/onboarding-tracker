-- QUICK FIX: Run this entire script in Supabase SQL Editor
-- This will refresh the schema cache and populate shifts if needed

-- Step 1: Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 2: Verify the table exists and check current data
DO $$
DECLARE
  shift_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO shift_count FROM night_shifts WHERE shift_date >= CURRENT_DATE;
  RAISE NOTICE 'Current future shifts in database: %', shift_count;
END $$;

-- Step 3: Create the shift generation function (if it doesn't exist)
CREATE OR REPLACE FUNCTION generate_night_shifts(start_date DATE, num_weeks INTEGER)
RETURNS VOID AS $$
DECLARE
  rotation_ids INTEGER[] := ARRAY[4, 6, 3, 5]; -- Marc, Erick, Jim, Steve
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
    current_index := MOD(MOD(reference_index + week_offset, 4) + 4, 4) + 1; -- 1-based index
    employee_id := rotation_ids[current_index];

    -- Create shifts for Sunday through Thursday (5 days)
    FOR day_num IN 0..4 LOOP
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

-- Step 4: Generate shifts for the next 26 weeks (6 months)
SELECT generate_night_shifts(
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
  26
);

-- Step 5: Verify the data was populated
SELECT
  'Total future shifts:' as info,
  COUNT(*)::TEXT as value
FROM night_shifts
WHERE shift_date >= CURRENT_DATE

UNION ALL

SELECT
  'Date range:' as info,
  MIN(shift_date)::TEXT || ' to ' || MAX(shift_date)::TEXT as value
FROM night_shifts
WHERE shift_date >= CURRENT_DATE;

-- Step 6: Show shifts by employee
SELECT
  e.name as employee,
  COUNT(*) as future_shifts
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
GROUP BY e.name
ORDER BY e.name;

-- Step 7: Show the next 15 shifts
SELECT
  ns.shift_date,
  e.name as employee,
  ns.week_start_date,
  ns.status
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
ORDER BY ns.shift_date
LIMIT 15;
