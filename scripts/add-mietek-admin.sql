-- Add Mietek as Admin User
--
-- IMPORTANT: Before running this script:
-- 1. Go to Firebase Console → Authentication → Users
-- 2. Add user with email: mwoloszyn@deconetwork.com
-- 3. Copy the Firebase UID
-- 4. Replace 'FIREBASE_UID_HERE' below with the actual UID

-- Step 1: Add to employees table (optional - only if you want him to have an employee profile)
-- This gives him an employee_id for viewing purposes
INSERT INTO employees (name, email, role, color)
VALUES (
  'Mietek',
  'mwoloszyn@deconetwork.com',
  'admin',
  'from-blue-500 to-cyan-500'
)
ON CONFLICT (email) DO NOTHING;

-- Step 2: Add to users table with admin role
-- Replace 'FIREBASE_UID_HERE' with Mietek's actual Firebase UID
INSERT INTO users (
  firebase_uid,
  email,
  role,
  name,
  employee_id
)
SELECT
  'FIREBASE_UID_HERE',  -- ⚠️ REPLACE THIS WITH ACTUAL FIREBASE UID
  'mwoloszyn@deconetwork.com',
  'admin',
  'Mietek',
  e.id
FROM employees e
WHERE e.email = 'mwoloszyn@deconetwork.com'
ON CONFLICT (firebase_uid)
DO UPDATE SET
  role = 'admin',
  email = 'mwoloszyn@deconetwork.com',
  name = 'Mietek';

-- Verify the user was created
SELECT
  u.id,
  u.email,
  u.role,
  u.name,
  u.employee_id,
  e.name as employee_name
FROM users u
LEFT JOIN employees e ON e.id = u.employee_id
WHERE u.email = 'mwoloszyn@deconetwork.com';
