-- Script to extend night shifts further into the future
-- This will generate shifts for an additional 26 weeks (6 months)
-- bringing the total to about 9 months of shifts

-- Use the existing function to generate more shifts
SELECT generate_night_shifts(
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
  39  -- Generate 39 weeks total (about 9 months)
);

-- Verify the shifts were created
SELECT
  ns.shift_date,
  e.name as employee_name,
  ns.week_start_date,
  ns.status
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
ORDER BY ns.shift_date
LIMIT 50;

-- Show summary by employee for future shifts
SELECT
  e.name,
  COUNT(*) as total_future_shifts
FROM night_shifts ns
JOIN employees e ON ns.employee_id = e.id
WHERE ns.shift_date >= CURRENT_DATE
GROUP BY e.name
ORDER BY e.name;
