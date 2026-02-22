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
