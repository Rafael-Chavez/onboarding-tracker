-- Create database (run this manually first if needed)
-- CREATE DATABASE onboarding_tracker;

-- Connect to the database
-- \c onboarding_tracker;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS onboardings CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Create employees table
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create onboardings table
CREATE TABLE onboardings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  session_number INTEGER NOT NULL DEFAULT 1,
  attendance VARCHAR(50) DEFAULT 'pending',
  date DATE NOT NULL,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_attendance CHECK (attendance IN ('pending', 'completed', 'cancelled', 'rescheduled', 'no-show'))
);

-- Create indexes for better query performance
CREATE INDEX idx_onboardings_employee_id ON onboardings(employee_id);
CREATE INDEX idx_onboardings_date ON onboardings(date);
CREATE INDEX idx_onboardings_month ON onboardings(month);
CREATE INDEX idx_onboardings_attendance ON onboardings(attendance);
CREATE INDEX idx_onboardings_client_name ON onboardings(client_name);

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
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboardings_updated_at BEFORE UPDATE ON onboardings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
