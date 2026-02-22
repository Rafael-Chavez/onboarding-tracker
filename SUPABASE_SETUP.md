## Supabase Setup Guide

This guide will walk you through setting up Supabase as your database backend for the Onboarding Tracker.

### Why Supabase?

✅ **Real-time sync** across all devices
✅ **Persistent storage** - no more lost data from cache clears
✅ **Powerful queries** - filter, search, and analyze easily
✅ **No-show tracking** - track which clients need follow-up
✅ **Built-in authentication** - secure and scalable
✅ **Free tier** - generous limits for small teams

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" and sign up (free)
3. Click "New Project"
4. Fill in:
   - **Name**: Onboarding Tracker
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait 1-2 minutes for setup to complete

---

## Step 2: Run the Database Schema

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Open the file `supabase-schema.sql` from your project
4. Copy ALL the contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned"

This creates:
- ✅ `employees` table
- ✅ `onboardings` table with all fields
- ✅ Indexes for fast queries
- ✅ No-show tracking fields
- ✅ Triggers for auto-updates
- ✅ Default employee data

---

## Step 3: Get Your API Credentials

1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"**
3. Find these two values:

**Project URL:**
```
https://abcdefghijk.supabase.co
```

**anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Copy both values

---

## Step 4: Add to Your .env File

1. Open your `.env` file (create one if it doesn't exist)
2. Add these lines:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_long_anon_key_here
```

Replace with your actual values from Step 3.

---

## Step 5: Verify the Setup

1. In Supabase, click **"Table Editor"** in the left sidebar
2. You should see two tables:
   - `employees` (with 6 employees)
   - `onboardings` (empty for now)

3. Click on `employees` to verify the data:
   - Rafael
   - Danreb
   - Jim
   - Marc
   - Steve
   - Erick

---

## Step 6: Migrate Existing Data (Optional)

If you have existing data in localStorage or Google Sheets:

### From localStorage:

Open browser console (F12) and run:
```javascript
// This will be added to the app UI
// Or contact admin to run migration
```

### From Google Sheets:

The import function will still work and can save directly to Supabase.

---

## Database Schema Overview

### Onboardings Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique identifier |
| `employee_id` | Integer | Links to employee |
| `employee_name` | String | Employee name (for display) |
| `client_name` | String | Client name |
| `account_number` | String | Account number |
| `session_number` | Integer | Session number for this client |
| `date` | Date | Session date |
| `month` | String | YYYY-MM format |
| `attendance` | String | pending, completed, cancelled, rescheduled, no-show |
| `notes` | Text | Optional session notes |
| `no_show_reached_out` | Boolean | Has client been contacted after no-show? |
| `no_show_reached_out_date` | Timestamp | When they were contacted |
| `no_show_notes` | Text | Notes about follow-up |
| `created_at` | Timestamp | When record was created |
| `updated_at` | Timestamp | Last update time |

### Attendance Status Values

- **pending**: Session logged, not yet completed
- **completed**: Session successfully completed
- **cancelled**: Session was cancelled
- **rescheduled**: Session moved to different date
- **no-show**: Client didn't attend

### No-Show Tracking

When a session is marked as "no-show":
1. Initially `no_show_reached_out` = FALSE
2. Admin can mark as reached out
3. `no_show_reached_out_date` is set automatically
4. Optional `no_show_notes` for follow-up details

**Special View:**
`no_show_follow_ups` - Shows all no-shows that haven't been reached out to yet.

---

## Features Enabled

### Real-Time Updates
Changes in Supabase automatically sync to all connected clients.

### Query Performance
Indexes on:
- employee_id
- date
- month
- attendance
- client_name
- no_show_reached_out (for no-shows only)

### Row Level Security (RLS)
Currently set to allow all operations. You can restrict this later based on Firebase authentication.

### Automatic Timestamps
`created_at` and `updated_at` are managed automatically.

### Monthly Stats Function
Get stats by month:
```sql
SELECT * FROM get_monthly_stats('2026-02');
```

Returns:
- employee_name
- total_sessions
- completed_sessions
- pending_sessions
- no_show_sessions

---

## Testing Your Setup

### Test 1: Verify Connection

In your browser console:
```javascript
import { supabase } from './src/config/supabase';
const { data, error } = await supabase.from('employees').select('*');
console.log(data); // Should show 6 employees
```

### Test 2: Create a Session

Try logging a session through the app. It should:
1. Save to Supabase
2. Appear in Supabase Table Editor
3. Sync to all connected devices

### Test 3: View No-Show Follow-Ups

In Supabase SQL Editor:
```sql
SELECT * FROM no_show_follow_ups;
```

Should return empty initially.

---

## Next Steps

1. ✅ Update your app code to use Supabase instead of localStorage
2. ✅ Add UI for no-show follow-up tracking
3. ✅ Migrate existing data from localStorage/Google Sheets
4. ✅ Enable real-time sync in the app
5. ✅ Add filtering and search capabilities

---

## Troubleshooting

### "relation employees does not exist"
- You didn't run the schema SQL
- Run the entire `supabase-schema.sql` file in SQL Editor

### "Invalid API key"
- Check your `.env` file has correct values
- Make sure you copied the **anon public** key, not service_role
- Restart your dev server after updating `.env`

### "Row Level Security policy violation"
- The schema includes open policies for testing
- Later you can restrict based on Firebase auth

### Data not showing up
- Check Supabase Table Editor to verify data exists
- Open browser console for error messages
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

---

## Supabase Dashboard Features

### Table Editor
Visual interface to view and edit data directly.

### SQL Editor
Run custom queries, create views, analyze data.

### API Docs
Auto-generated API documentation for your database.

### Database
View connections, backups, and performance.

### Authentication (Future)
Can integrate with Firebase auth or use Supabase auth.

---

## Cost

**Free Tier Includes:**
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users

Perfect for small teams! Upgrade if you outgrow it.

---

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use anon key for client** - Not service_role key
3. **Enable RLS later** - Restrict based on user authentication
4. **Backup regularly** - Supabase has automatic backups
5. **Monitor usage** - Check Supabase dashboard

---

Your Supabase database is now ready! All sessions will be stored securely and sync in real-time across all devices. 🚀
