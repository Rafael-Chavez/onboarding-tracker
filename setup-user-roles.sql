-- Setup User Roles and Employee Assignments
-- Run this AFTER users have logged in for the first time

-- First, let's see what users exist
SELECT 'Current Users:' as info;
SELECT email, role, employee_id FROM users;

-- Set admin role for Rafael Chavez
UPDATE users
SET role = 'admin'
WHERE email = 'rchavez@deconetwork.com';

-- Assign team members to their employee records
-- These will only work if the users have logged in at least once

UPDATE users
SET employee_id = 3, role = 'team'
WHERE email = 'jim@deconetwork.com';

UPDATE users
SET employee_id = 4, role = 'team'
WHERE email = 'marc@deconetwork.com';

UPDATE users
SET employee_id = 2, role = 'team'
WHERE email = 'danreb@deconetwork.com';

UPDATE users
SET employee_id = 5, role = 'team'
WHERE email = 'steve@deconetwork.com';

UPDATE users
SET employee_id = 6, role = 'team'
WHERE email = 'erick@deconetwork.com';

-- Verify the assignments
SELECT 'Updated Users:' as info;
SELECT u.email, u.role, u.employee_id, e.name as employee_name
FROM users u
LEFT JOIN employees e ON u.employee_id = e.id
ORDER BY u.role DESC, e.name;
