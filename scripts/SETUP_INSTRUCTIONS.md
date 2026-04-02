# Database Setup Instructions for Night Shifts Feature

## Issue
The night shifts calendar is not showing data because the database tables exist but are not properly configured in Supabase's API layer.

## Solution

### Step 1: Reload the Schema in Supabase

1. **Go to your Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Schema Refresh Command**
   ```sql
   -- This will reload the PostgREST schema cache
   NOTIFY pgrst, 'reload schema';
   ```

4. **Verify the night_shifts table structure**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'night_shifts'
   ORDER BY ordinal_position;
   ```

### Step 2: Check if Shifts Data Exists

```sql
-- Check if we have any shifts
SELECT COUNT(*) FROM night_shifts;

-- Check current and future shifts
SELECT
  ns.shift_date,
  e.name as employee_name,
  ns.week_start_date,
  ns.status
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
ORDER BY ns.shift_date
LIMIT 20;
```

### Step 3: Populate Shifts (if needed)

If the above query returns 0 shifts, you need to populate the data:

```sql
-- Create the function to generate shifts
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

-- Generate shifts for the next 26 weeks (6 months)
SELECT generate_night_shifts(
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
  26
);
```

### Step 4: Verify the Data

```sql
-- Show summary of shifts
SELECT
  e.name,
  COUNT(*) as total_future_shifts
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
GROUP BY e.name
ORDER BY e.name;
```

Expected output: Each employee (Marc, Erick, Danreb, Jim, Steve) should have roughly the same number of shifts.

### Step 5: Test in the Application

After completing the above steps:
1. Refresh your application
2. Navigate to "Team Members" view
3. Check if team members show upcoming night shifts
4. Navigate to "Night Shift Calendar" view
5. Verify the calendar displays shifts with color-coded dates

## Rotation Schedule

The night shift rotation follows this pattern:
- **Marc** (🔶) → **Erick** (🌸) → **Danreb** (💜) → **Jim** (💚) → **Steve** (💙)
- Each person works Sunday through Thursday (5 days)
- Then it rotates to the next person

## Troubleshooting

### If shifts still don't appear:

1. **Check RLS Policies**:
   ```sql
   -- Verify policies exist
   SELECT * FROM pg_policies WHERE tablename = 'night_shifts';
   ```

2. **Manually refresh the PostgREST cache**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   NOTIFY pgrst, 'reload config';
   ```

3. **Check for any errors in shift data**:
   ```sql
   -- Look for shifts without valid employees
   SELECT * FROM night_shifts
   WHERE employee_id NOT IN (SELECT id FROM employees);
   ```

4. **Restart the Supabase services**:
   - Go to Settings → API
   - Note the "Restart" button if available, or wait a few minutes for auto-refresh

## Contact

If you continue to experience issues, check:
- Supabase project logs in the Dashboard
- Browser console for any JavaScript errors
- Network tab to see if API calls are failing
