-- FIX NIGHT SHIFT SCHEDULE
-- This script fixes two issues:
-- 1. Shifts starting on Saturday instead of Sunday
-- 2. Missing Steve from rotation / incorrect rotation order

-- Step 1: Clear existing shifts to regenerate correctly
DELETE FROM night_shifts WHERE shift_date >= CURRENT_DATE;

-- Step 2: Update the generation function with correct rotation
CREATE OR REPLACE FUNCTION generate_night_shifts(start_date DATE, num_weeks INTEGER)
RETURNS VOID AS $$
DECLARE
  -- Correct rotation: Marc → Erick → Jim → Steve
  rotation_ids INTEGER[] := ARRAY[4, 6, 3, 5]; -- Marc, Erick, Jim, Steve

  -- Reference point: Week of Feb 15, 2026 (Sunday) = Erick
  reference_sunday DATE := '2026-02-16'::DATE; -- This is Sunday, Feb 16, 2026
  reference_index INTEGER := 1; -- Erick is at index 1 (0-based: 0=Marc, 1=Erick, 2=Jim, 3=Steve)

  current_sunday DATE;
  week_offset INTEGER;
  current_index INTEGER;
  emp_id INTEGER;
  curr_shift_date DATE;
  week_num INTEGER;
  day_num INTEGER;
BEGIN
  -- Loop through each week
  FOR week_num IN 0..(num_weeks - 1) LOOP
    -- Calculate the Sunday for this week (start_date should already be a Sunday)
    current_sunday := start_date + (week_num * 7);

    -- Double-check: Ensure we're on a Sunday (day 0)
    -- If not Sunday, adjust backwards to previous Sunday
    IF EXTRACT(DOW FROM current_sunday) != 0 THEN
      current_sunday := current_sunday - EXTRACT(DOW FROM current_sunday)::INTEGER;
    END IF;

    -- Calculate week offset from reference Sunday
    week_offset := FLOOR((current_sunday - reference_sunday) / 7);

    -- Calculate which employee (0-based array index)
    current_index := MOD(MOD(reference_index + week_offset, 4) + 4, 4);

    -- Get employee ID (array is 1-indexed in PostgreSQL)
    emp_id := rotation_ids[current_index + 1];

    -- Create shifts for Sunday through Thursday (5 days: 0, 1, 2, 3, 4)
    FOR day_num IN 0..4 LOOP
      curr_shift_date := current_sunday + day_num;

      -- Insert the shift
      INSERT INTO night_shifts (employee_id, shift_date, week_start_date, status, original_employee_id)
      VALUES (emp_id, curr_shift_date, current_sunday, 'scheduled', emp_id)
      ON CONFLICT (shift_date) DO UPDATE SET
        employee_id = EXCLUDED.employee_id,
        week_start_date = EXCLUDED.week_start_date;
    END LOOP;

    RAISE NOTICE 'Week starting %: % (employee_id: %)',
      current_sunday,
      (SELECT name FROM employees WHERE id = emp_id),
      emp_id;
  END LOOP;

  RAISE NOTICE 'Generated night shifts for % weeks starting from %', num_weeks, start_date;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Find the next Sunday from today
DO $$
DECLARE
  next_sunday DATE;
  days_until_sunday INTEGER;
BEGIN
  -- Calculate days until next Sunday (0 = Sunday)
  days_until_sunday := (7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER) % 7;

  -- If today is Sunday, days_until_sunday will be 0, which is correct
  -- If today is Monday (1), days_until_sunday will be 6
  -- etc.

  -- If we want to include current week if we're before Friday, use this logic:
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    -- Today is Sunday
    next_sunday := CURRENT_DATE;
  ELSE
    -- Find previous Sunday to start from current week
    next_sunday := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
  END IF;

  RAISE NOTICE 'Generating shifts starting from Sunday: %', next_sunday;

  -- Generate shifts for 26 weeks (6 months) starting from next Sunday
  PERFORM generate_night_shifts(next_sunday, 26);
END $$;

-- Step 4: Verify the shifts
SELECT
  TO_CHAR(ns.shift_date, 'Dy Mon DD, YYYY') as shift_date,
  e.name as employee,
  TO_CHAR(ns.week_start_date, 'Mon DD') as week_start,
  CASE EXTRACT(DOW FROM ns.shift_date)
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_of_week
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
ORDER BY ns.shift_date
LIMIT 25;

-- Step 5: Show distribution by employee
SELECT
  e.name as employee,
  COUNT(*) as total_shifts,
  MIN(ns.shift_date) as first_shift,
  MAX(ns.shift_date) as last_shift
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
GROUP BY e.name
ORDER BY e.name;
