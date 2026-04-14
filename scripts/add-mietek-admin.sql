-- Add Mietek as Admin User
--
-- IMPORTANT: Before running this script:
-- 1. Go to Firebase Console → Authentication → Users
-- 2. Add user with email: mwoloszyn@deconetwork.com
-- 3. Copy the Firebase UID
-- 4. Replace 'FIREBASE_UID_HERE' below with the actual UID

-- Add Mietek to users table with admin role (no employee_id needed)
-- Since he's only viewing, not doing onboarding sessions, he doesn't need an employee profile
INSERT INTO users (
  firebase_uid,
  email,
  role,
  name,
  employee_id
)
VALUES (
  'FIREBASE_UID_HERE',  -- ⚠️ REPLACE THIS WITH ACTUAL FIREBASE UID
  'mwoloszyn@deconetwork.com',
  'admin',
  'Mietek',
  NULL  -- No employee_id since he's not doing onboarding sessions
)
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
