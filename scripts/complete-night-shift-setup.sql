-- COMPLETE NIGHT SHIFT SETUP
-- Run this entire script in Supabase SQL Editor to set up night shifts from scratch

-- Step 1: Create night_shifts table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS night_shifts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  week_start_date DATE NOT NULL, -- Sunday of the week
  status VARCHAR(50) DEFAULT 'scheduled',
  original_employee_id INTEGER REFERENCES employees(id), -- Track original assignee if traded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_shift_status CHECK (status IN ('scheduled', 'completed', 'traded', 'cancelled')),
  CONSTRAINT unique_shift_date UNIQUE (shift_date)
);

-- Step 2: Create shift_trades table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS shift_trades (
  id SERIAL PRIMARY KEY,
  initiator_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  respondent_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  initiator_shift_id INTEGER NOT NULL REFERENCES night_shifts(id) ON DELETE CASCADE,
  respondent_shift_id INTEGER NOT NULL REFERENCES night_shifts(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  initiator_completed BOOLEAN DEFAULT FALSE,
  respondent_completed BOOLEAN DEFAULT FALSE,
  auto_swap_back BOOLEAN DEFAULT TRUE,
  trade_message TEXT,
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  swapped_back_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_trade_status CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'swapped_back')),
  CONSTRAINT different_employees CHECK (initiator_employee_id != respondent_employee_id),
  CONSTRAINT different_shifts CHECK (initiator_shift_id != respondent_shift_id)
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_night_shifts_employee_id ON night_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_night_shifts_date ON night_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_night_shifts_week ON night_shifts(week_start_date);
CREATE INDEX IF NOT EXISTS idx_night_shifts_status ON night_shifts(status);

CREATE INDEX IF NOT EXISTS idx_shift_trades_initiator ON shift_trades(initiator_employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_trades_respondent ON shift_trades(respondent_employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_trades_status ON shift_trades(status);

-- Step 4: Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 5: Create triggers
DROP TRIGGER IF EXISTS update_night_shifts_updated_at ON night_shifts;
CREATE TRIGGER update_night_shifts_updated_at
  BEFORE UPDATE ON night_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shift_trades_updated_at ON shift_trades;
CREATE TRIGGER update_shift_trades_updated_at
  BEFORE UPDATE ON shift_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE night_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_trades ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
DROP POLICY IF EXISTS "Allow read access to night_shifts" ON night_shifts;
CREATE POLICY "Allow read access to night_shifts" ON night_shifts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access to night_shifts" ON night_shifts;
CREATE POLICY "Allow insert access to night_shifts" ON night_shifts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to night_shifts" ON night_shifts;
CREATE POLICY "Allow update access to night_shifts" ON night_shifts
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete access to night_shifts" ON night_shifts;
CREATE POLICY "Allow delete access to night_shifts" ON night_shifts
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read access to shift_trades" ON shift_trades;
CREATE POLICY "Allow read access to shift_trades" ON shift_trades
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access to shift_trades" ON shift_trades;
CREATE POLICY "Allow insert access to shift_trades" ON shift_trades
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to shift_trades" ON shift_trades;
CREATE POLICY "Allow update access to shift_trades" ON shift_trades
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete access to shift_trades" ON shift_trades;
CREATE POLICY "Allow delete access to shift_trades" ON shift_trades
  FOR DELETE USING (true);

-- Step 8: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 9: Create the shift generation function
CREATE OR REPLACE FUNCTION generate_night_shifts(start_date DATE, num_weeks INTEGER)
RETURNS VOID AS $$
DECLARE
  rotation_ids INTEGER[] := ARRAY[4, 6, 3, 5]; -- Marc, Erick, Jim, Steve
  reference_sunday DATE := '2026-02-15'::DATE;
  reference_index INTEGER := 1; -- Erick is at index 1 (0-based)
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
    -- Calculate the Sunday for this week
    current_sunday := start_date + (week_num * 7);

    -- Ensure we start on a Sunday
    current_sunday := current_sunday - EXTRACT(DOW FROM current_sunday)::INTEGER;

    -- Calculate week offset from reference
    week_offset := FLOOR((current_sunday - reference_sunday) / 7);

    -- Calculate which employee should be on duty this week
    current_index := MOD(MOD(reference_index + week_offset, 4) + 4, 4) + 1; -- 1-based index
    emp_id := rotation_ids[current_index];

    -- Create shifts for Sunday through Thursday (5 days)
    FOR day_num IN 0..4 LOOP
      curr_shift_date := current_sunday + day_num;

      -- Insert the shift (ignore if already exists)
      INSERT INTO night_shifts (employee_id, shift_date, week_start_date, status, original_employee_id)
      VALUES (emp_id, curr_shift_date, current_sunday, 'scheduled', emp_id)
      ON CONFLICT (shift_date) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Generated night shifts for % weeks starting from %', num_weeks, start_date;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Generate shifts for the next 26 weeks (6 months)
SELECT generate_night_shifts(
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
  26
);

-- Step 11: Verify the data was populated
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

-- Step 12: Show shifts by employee
SELECT
  e.name as employee,
  COUNT(*) as future_shifts
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
GROUP BY e.name
ORDER BY e.name;

-- Step 13: Show the next 20 shifts
SELECT
  ns.shift_date,
  e.name as employee,
  ns.week_start_date,
  ns.status
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
ORDER BY ns.shift_date
LIMIT 20;
