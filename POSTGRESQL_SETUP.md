# PostgreSQL Setup Guide

This guide will help you set up PostgreSQL for the Onboarding Tracker application.

## Prerequisites

- PostgreSQL installed on your system
- Node.js and npm installed

## Step 1: Install PostgreSQL

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Default port is `5432`

### Mac (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## Step 2: Create the Database

### Option A: Using psql command line
```bash
# Connect to PostgreSQL
psql -U postgres

# In the psql prompt, run:
CREATE DATABASE onboarding_tracker;
\q
```

### Option B: Using pgAdmin
1. Open pgAdmin
2. Right-click on "Databases"
3. Select "Create" → "Database"
4. Name it: `onboarding_tracker`
5. Click "Save"

## Step 3: Initialize Database Schema

Run the schema SQL file to create tables:

```bash
# From your project root directory
psql -U postgres -d onboarding_tracker -f server/db/schema.sql
```

Or manually run the SQL in pgAdmin:
1. Open pgAdmin
2. Connect to your database
3. Open Query Tool
4. Copy and paste contents of `server/db/schema.sql`
5. Execute the script

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your PostgreSQL credentials:
   ```env
   # Backend API URL
   VITE_API_URL=http://localhost:3001/api

   # PostgreSQL Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=onboarding_tracker
   DB_USER=postgres
   DB_PASSWORD=your_actual_password_here

   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```

## Step 5: Start the Application

### Terminal 1 - Start Backend Server
```bash
npm run server:dev
```

You should see:
```
╔════════════════════════════════════════════════╗
║   Onboarding Tracker API Server               ║
║   Server running on http://localhost:3001      ║
╚════════════════════════════════════════════════╝
✅ Connected to PostgreSQL database
```

### Terminal 2 - Start Frontend
```bash
npm run dev
```

## Step 6: Migrate Existing Data (Optional)

If you have data in localStorage, you can migrate it:

1. Open your browser console
2. Export localStorage data:
   ```javascript
   const data = localStorage.getItem('onboardings');
   console.log(data);
   ```
3. Use the bulk import API endpoint to import data

## Database Schema

### Tables Created:

**employees**
- `id` - Serial primary key
- `name` - Varchar(100), unique
- `color` - Varchar(100) for avatar gradient
- `created_at`, `updated_at` - Timestamps

**onboardings**
- `id` - Serial primary key
- `employee_id` - Foreign key to employees
- `client_name` - Varchar(255)
- `account_number` - Varchar(100)
- `session_number` - Integer
- `attendance` - Enum (pending, completed, cancelled, rescheduled, no-show)
- `date` - Date
- `month` - Varchar(7) format YYYY-MM
- `created_at`, `updated_at` - Timestamps

## API Endpoints

Base URL: `http://localhost:3001/api`

### Employees
- `GET /employees` - Get all employees
- `GET /employees/:id` - Get single employee
- `POST /employees` - Create employee
- `PUT /employees/:id` - Update employee
- `DELETE /employees/:id` - Delete employee

### Onboardings
- `GET /onboardings` - Get all onboardings (with optional filters)
  - Query params: `employee_id`, `month`, `attendance`, `start_date`, `end_date`
- `GET /onboardings/:id` - Get single onboarding
- `POST /onboardings` - Create onboarding
- `PUT /onboardings/:id` - Update onboarding
- `DELETE /onboardings/:id` - Delete onboarding
- `POST /onboardings/bulk` - Bulk import onboardings

### Health Check
- `GET /health` - Check API and database status

## Troubleshooting

### Connection Refused
- Make sure PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or check Services (Windows)
- Verify the port is correct (default: 5432)
- Check firewall settings

### Authentication Failed
- Verify your password in `.env`
- Check PostgreSQL `pg_hba.conf` for authentication settings

### Database Does Not Exist
- Run: `createdb -U postgres onboarding_tracker`

### Port Already in Use
- Change the PORT in `.env` to a different number (e.g., 3002)
- Update `VITE_API_URL` in `.env` accordingly

## Testing the Setup

1. Check backend health:
   ```bash
   curl http://localhost:3001/health
   ```

2. Test employees endpoint:
   ```bash
   curl http://localhost:3001/api/employees
   ```

3. Expected response:
   ```json
   [
     {"id":1,"name":"Rafael","color":"from-cyan-500 to-blue-500"},
     ...
   ]
   ```

## Next Steps

- The frontend will automatically connect to the backend API
- All data will now be stored in PostgreSQL instead of localStorage
- Google Sheets integration remains available as an export feature
- Data is now persistent and can be accessed from multiple devices

## Benefits of PostgreSQL

✅ Data persistence across browsers and devices
✅ Better performance with large datasets
✅ Multi-user support
✅ Data integrity and relationships
✅ Backup and recovery options
✅ Advanced querying capabilities
