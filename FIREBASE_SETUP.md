# Firebase Authentication Setup Guide

This guide will walk you through setting up Firebase authentication for the Onboarding Tracker application.

## Overview

The application now includes:
- Firebase Authentication for secure login
- Role-based access control (Admin and Team roles)
- Separate dashboards for admin and team members
- Team members can log their own onboarding sessions
- All submissions automatically appear in the admin's master calendar

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select an existing project
3. Enter a project name (e.g., "Onboarding Tracker")
4. Follow the setup wizard (you can disable Google Analytics if not needed)
5. Click "Create project"

## Step 2: Enable Email/Password Authentication

1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started" if this is your first time
3. Go to the "Sign-in method" tab
4. Click on "Email/Password"
5. Enable the first toggle (Email/Password)
6. Click "Save"

## Step 3: Get Frontend Configuration

1. In Firebase Console, click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon (`</>`) to add a web app
5. Register the app with a nickname (e.g., "Onboarding Tracker Web")
6. Copy the `firebaseConfig` values

You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

7. Add these to your `.env` file:
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:...
```

## Step 4: Get Backend Service Account

1. In Firebase Console > Project Settings
2. Go to the "Service accounts" tab
3. Click "Generate new private key"
4. Click "Generate key" to download the JSON file
5. Save this file in your project root as `firebase-service-account.json`
6. **IMPORTANT**: Add this file to `.gitignore` to keep it secret
7. Add to your `.env` file:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

## Step 5: Update Database Schema

Run the updated database schema to add the users table:

```bash
psql -U postgres -d onboarding_tracker -f server/db/schema.sql
```

This creates:
- `users` table with Firebase UID, email, role, and employee assignment
- Proper indexes for fast queries
- Foreign key relationship to employees table

## Step 6: Create User Accounts

### Method 1: Using Firebase Console (Recommended for initial setup)

1. Go to Firebase Console > Authentication > Users
2. Click "Add user"
3. Enter email and password for each team member:
   - jim@yourcompany.com (for Jim)
   - marc@yourcompany.com (for Marc)
   - danreb@yourcompany.com (for Danreb)
   - steve@yourcompany.com (for Steve)
   - erick@yourcompany.com (for Erick)
   - admin@yourcompany.com (for you, the admin)
4. Set strong passwords and share them securely with each person

### Method 2: Using the Application

1. Start your application
2. When a user logs in for the first time, they'll be automatically added to the database with 'team' role
3. You'll need to manually update the database to assign admin role and employee IDs

## Step 7: Assign Roles and Employees

After users first log in, you need to assign their roles and link them to employees:

```sql
-- Connect to database
psql -U postgres -d onboarding_tracker

-- Set admin role for your account
UPDATE users
SET role = 'admin'
WHERE email = 'admin@yourcompany.com';

-- Link team members to their employee records
UPDATE users SET employee_id = 3 WHERE email = 'jim@yourcompany.com';
UPDATE users SET employee_id = 4 WHERE email = 'marc@yourcompany.com';
UPDATE users SET employee_id = 2 WHERE email = 'danreb@yourcompany.com';
UPDATE users SET employee_id = 5 WHERE email = 'steve@yourcompany.com';
UPDATE users SET employee_id = 6 WHERE email = 'erick@yourcompany.com';

-- Verify the assignments
SELECT u.email, u.role, e.name as employee_name
FROM users u
LEFT JOIN employees e ON u.employee_id = e.id;
```

## Step 8: Test the Application

1. Start the backend server:
```bash
npm run server
```

2. Start the frontend:
```bash
npm run dev
```

3. Test logging in as a team member:
   - Go to http://localhost:5173
   - Log in with a team member's email and password
   - You should see the Team Dashboard with a form to log onboarding sessions

4. Test logging in as admin:
   - Log out
   - Log in with the admin account
   - You should see the full calendar dashboard

## User Roles Explained

### Team Members (role: 'team')
- Can log new onboarding sessions (client name + account number)
- See their own recent submissions
- Cannot access the master calendar
- Cannot see other team members' data

### Admin (role: 'admin')
- Full access to the master calendar view
- Can see all onboarding sessions from all team members
- Sessions logged by team members automatically appear in the calendar
- Can manage Google Sheets sync

## How It Works

1. **Team Member Logs In**:
   - Sees a simple form with Client Name, Account Number, and Date fields
   - Submits an onboarding session
   - Session is saved to database with their employee ID

2. **Admin Views Calendar**:
   - Sees the existing master dashboard
   - All sessions from all employees appear in the calendar
   - Team member submissions are automatically included

3. **Authentication Flow**:
   - Firebase handles authentication and issues JWT tokens
   - Backend verifies tokens using Firebase Admin SDK
   - Database stores user roles and employee assignments
   - Frontend routes users to appropriate dashboard based on role

## Security Notes

1. **Never commit these files**:
   - `.env` (contains API keys)
   - `firebase-service-account.json` (contains private keys)

2. **Add to .gitignore**:
```
.env
firebase-service-account.json
```

3. **Password Management**:
   - Use strong passwords for all accounts
   - Consider using Firebase password reset functionality
   - Share passwords securely (not via email)

## Troubleshooting

### "Firebase Admin SDK not initialized"
- Make sure `FIREBASE_SERVICE_ACCOUNT_PATH` is set in `.env`
- Verify the path points to the correct JSON file
- Check that the JSON file has valid credentials

### "No token provided" or "Invalid token"
- Clear browser cache and local storage
- Log out and log back in
- Check that frontend Firebase config is correct

### "User not found" after login
- The user exists in Firebase but not in the database
- Log in once to auto-create the user
- Then assign role and employee_id in database

### Team member sees admin dashboard (or vice versa)
- Check the user's role in the database
- Make sure employee_id is set for team members
- Clear browser cache and refresh

## Next Steps

1. Set up the Firebase project
2. Add the configuration to `.env`
3. Update the database schema
4. Create user accounts in Firebase
5. Assign roles and employee IDs in the database
6. Test with different user accounts
7. Share login credentials with your team

Your team members can now log their onboarding sessions, and all their submissions will automatically appear in your master calendar view!
