-- Supabase Database Schema for Onboarding Tracker
-- Run this in Supabase SQL Editor: https://app.supabase.com

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create onboardings table
CREATE TABLE IF NOT EXISTS onboardings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name VARCHAR(100) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  session_number INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  attendance VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  -- No-show specific fields
  no_show_reached_out BOOLEAN DEFAULT FALSE,
  no_show_reached_out_date TIMESTAMP WITH TIME ZONE,
  no_show_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_attendance CHECK (attendance IN ('pending', 'completed', 'cancelled', 'rescheduled', 'no-show', 'pending_approval'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_onboardings_employee_id ON onboardings(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboardings_date ON onboardings(date);
CREATE INDEX IF NOT EXISTS idx_onboardings_month ON onboardings(month);
CREATE INDEX IF NOT EXISTS idx_onboardings_attendance ON onboardings(attendance);
CREATE INDEX IF NOT EXISTS idx_onboardings_client_name ON onboardings(client_name);
CREATE INDEX IF NOT EXISTS idx_onboardings_no_show_reached_out ON onboardings(no_show_reached_out) WHERE attendance = 'no-show';

-- Insert default employees
INSERT INTO employees (id, name, color) VALUES
  (1, 'Rafael', 'from-cyan-500 to-blue-500'),
  (2, 'Danreb', 'from-purple-500 to-pink-500'),
  (3, 'Jim', 'from-green-500 to-teal-500'),
  (4, 'Marc', 'from-orange-500 to-red-500'),
  (5, 'Steve', 'from-indigo-500 to-purple-500'),
  (6, 'Erick', 'from-rose-500 to-pink-500')
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboardings_updated_at ON onboardings;
CREATE TRIGGER update_onboardings_updated_at
  BEFORE UPDATE ON onboardings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboardings ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table (read-only for everyone)
CREATE POLICY "Allow read access to employees" ON employees
  FOR SELECT USING (true);

-- Create policies for onboardings table
-- Allow anyone to read onboardings (you can restrict this later with user authentication)
CREATE POLICY "Allow read access to onboardings" ON onboardings
  FOR SELECT USING (true);

-- Allow anyone to insert onboardings (team members logging sessions)
CREATE POLICY "Allow insert access to onboardings" ON onboardings
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update onboardings (for status updates)
CREATE POLICY "Allow update access to onboardings" ON onboardings
  FOR UPDATE USING (true);

-- Allow anyone to delete onboardings (you can restrict this later)
CREATE POLICY "Allow delete access to onboardings" ON onboardings
  FOR DELETE USING (true);

-- Create a view for no-show sessions that need follow-up
CREATE OR REPLACE VIEW no_show_follow_ups AS
SELECT
  o.id,
  o.employee_name,
  o.client_name,
  o.account_number,
  o.session_number,
  o.date,
  o.no_show_reached_out,
  o.no_show_reached_out_date,
  o.no_show_notes,
  o.created_at
FROM onboardings o
WHERE o.attendance = 'no-show'
  AND o.no_show_reached_out = FALSE
ORDER BY o.date DESC;

-- Grant access to the view
GRANT SELECT ON no_show_follow_ups TO anon, authenticated;

-- Create a function to get monthly stats
CREATE OR REPLACE FUNCTION get_monthly_stats(target_month VARCHAR)
RETURNS TABLE (
  employee_name VARCHAR,
  total_sessions BIGINT,
  completed_sessions BIGINT,
  pending_sessions BIGINT,
  no_show_sessions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.employee_name::VARCHAR,
    COUNT(*)::BIGINT as total_sessions,
    COUNT(*) FILTER (WHERE o.attendance = 'completed')::BIGINT as completed_sessions,
    COUNT(*) FILTER (WHERE o.attendance = 'pending')::BIGINT as pending_sessions,
    COUNT(*) FILTER (WHERE o.attendance = 'no-show')::BIGINT as no_show_sessions
  FROM onboardings o
  WHERE o.month = target_month
  GROUP BY o.employee_name
  ORDER BY total_sessions DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_monthly_stats TO anon, authenticated;

-- Create night_shifts table
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

-- Create shift_trades table (handshake system)
CREATE TABLE IF NOT EXISTS shift_trades (
  id SERIAL PRIMARY KEY,
  initiator_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  respondent_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  initiator_shift_id INTEGER NOT NULL REFERENCES night_shifts(id) ON DELETE CASCADE,
  respondent_shift_id INTEGER NOT NULL REFERENCES night_shifts(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  initiator_completed BOOLEAN DEFAULT FALSE,
  respondent_completed BOOLEAN DEFAULT FALSE,
  auto_swap_back BOOLEAN DEFAULT TRUE, -- Automatically swap back after both complete
  trade_message TEXT, -- Optional message from initiator
  response_message TEXT, -- Optional message from respondent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE, -- When both shifts are completed
  swapped_back_at TIMESTAMP WITH TIME ZONE, -- When shifts are swapped back
  CONSTRAINT valid_trade_status CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'swapped_back')),
  CONSTRAINT different_employees CHECK (initiator_employee_id != respondent_employee_id),
  CONSTRAINT different_shifts CHECK (initiator_shift_id != respondent_shift_id)
);

-- Create indexes for night_shifts
CREATE INDEX IF NOT EXISTS idx_night_shifts_employee_id ON night_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_night_shifts_date ON night_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_night_shifts_week ON night_shifts(week_start_date);
CREATE INDEX IF NOT EXISTS idx_night_shifts_status ON night_shifts(status);

-- Create indexes for shift_trades
CREATE INDEX IF NOT EXISTS idx_shift_trades_initiator ON shift_trades(initiator_employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_trades_respondent ON shift_trades(respondent_employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_trades_status ON shift_trades(status);
CREATE INDEX IF NOT EXISTS idx_shift_trades_created_at ON shift_trades(created_at DESC);

-- Create triggers for updated_at on new tables
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

-- Enable Row Level Security (RLS) for new tables
ALTER TABLE night_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_trades ENABLE ROW LEVEL SECURITY;

-- Create policies for night_shifts table
CREATE POLICY "Allow read access to night_shifts" ON night_shifts
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to night_shifts" ON night_shifts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to night_shifts" ON night_shifts
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to night_shifts" ON night_shifts
  FOR DELETE USING (true);

-- Create policies for shift_trades table
CREATE POLICY "Allow read access to shift_trades" ON shift_trades
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to shift_trades" ON shift_trades
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to shift_trades" ON shift_trades
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to shift_trades" ON shift_trades
  FOR DELETE USING (true);

-- Create a view for pending trade requests
CREATE OR REPLACE VIEW pending_trade_requests AS
SELECT
  st.id,
  st.initiator_employee_id,
  ie.name as initiator_name,
  st.respondent_employee_id,
  re.name as respondent_name,
  ins.shift_date as initiator_shift_date,
  rns.shift_date as respondent_shift_date,
  st.trade_message,
  st.created_at
FROM shift_trades st
JOIN employees ie ON st.initiator_employee_id = ie.id
JOIN employees re ON st.respondent_employee_id = re.id
JOIN night_shifts ins ON st.initiator_shift_id = ins.id
JOIN night_shifts rns ON st.respondent_shift_id = rns.id
WHERE st.status = 'pending'
ORDER BY st.created_at DESC;

-- Grant access to the view
GRANT SELECT ON pending_trade_requests TO anon, authenticated;

-- Create a function to automatically swap back shifts after both are completed
CREATE OR REPLACE FUNCTION check_and_swap_back_shifts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if both shifts are now completed and auto_swap_back is enabled
  IF NEW.status = 'completed' AND NEW.auto_swap_back = TRUE THEN
    -- Swap the employees back to their original shifts
    UPDATE night_shifts
    SET employee_id = original_employee_id
    WHERE id = NEW.initiator_shift_id OR id = NEW.respondent_shift_id;

    -- Mark the trade as swapped back
    NEW.status = 'swapped_back';
    NEW.swapped_back_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto swap-back
DROP TRIGGER IF EXISTS auto_swap_back_trigger ON shift_trades;
CREATE TRIGGER auto_swap_back_trigger
  BEFORE UPDATE ON shift_trades
  FOR EACH ROW
  WHEN (OLD.initiator_completed = FALSE OR OLD.respondent_completed = FALSE)
  EXECUTE FUNCTION check_and_swap_back_shifts();
