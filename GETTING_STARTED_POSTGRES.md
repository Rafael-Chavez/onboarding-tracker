# Getting Started with PostgreSQL

Welcome! Your Onboarding Tracker now has full PostgreSQL database integration. Here's everything you need to know.

## What's New?

Your app now uses **PostgreSQL** instead of browser localStorage. This means:

✅ **Data persists** even if you clear browser cache
✅ **Access from any device** - data is stored on the server
✅ **Multi-user ready** - multiple people can use the same data
✅ **Better performance** with thousands of records
✅ **Real backup** and recovery options

## Quick Setup (3 Steps)

### Step 1: Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Run installer, remember the password

**Mac:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Run Setup Script

```bash
chmod +x setup-database.sh
./setup-database.sh
```

The script will:
- Create the database
- Set up tables
- Configure environment variables

**Or manually:**
```bash
# Create database
createdb -U postgres onboarding_tracker

# Run schema
psql -U postgres -d onboarding_tracker -f server/db/schema.sql

# Copy and edit .env
cp .env.example .env
# Edit .env with your PostgreSQL password
```

### Step 3: Start Both Services

**Terminal 1 - Backend Server:**
```bash
npm run server:dev
```

Wait for:
```
✅ Connected to PostgreSQL database
Server running on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Open http://localhost:5173 🎉

## File Structure

```
onboarding-tracker/
├── server/
│   ├── index.js              # Main server file
│   ├── config/
│   │   └── database.js       # PostgreSQL connection
│   ├── routes/
│   │   ├── employees.js      # Employee endpoints
│   │   └── onboardings.js    # Onboarding endpoints
│   └── db/
│       └── schema.sql        # Database schema
├── src/
│   ├── services/
│   │   ├── api.js            # API service (NEW!)
│   │   ├── migration.js      # localStorage → PostgreSQL
│   │   └── googleSheets.js   # Google Sheets (optional)
│   └── App.jsx
└── .env                      # Configuration
```

## How It Works

### Before (localStorage)
```
Browser → localStorage → Data lost on cache clear
```

### Now (PostgreSQL)
```
Browser → React App → Express API → PostgreSQL
         (5173)      (3001)         (5432)
```

## Migrating Existing Data

If you have data in localStorage:

### Option 1: Use Migration Service (Recommended)
```javascript
// In browser console
import MigrationService from './services/migration.js';
const result = await MigrationService.migrateOnboardingsToDatabase();
console.log(result);
```

### Option 2: Manual Export/Import
```javascript
// 1. Export from localStorage (in console)
const data = localStorage.getItem('onboardings');
console.log(data);

// 2. Import to database (use the bulk endpoint)
// See DATABASE_README.md for details
```

## Testing Your Setup

### 1. Check Backend Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-15T..."
}
```

### 2. Get Employees
```bash
curl http://localhost:3001/api/employees
```

Expected response:
```json
[
  {"id":1,"name":"Rafael","color":"from-cyan-500 to-blue-500"},
  {"id":2,"name":"Danreb","color":"from-purple-500 to-pink-500"},
  ...
]
```

### 3. Create Test Onboarding
```bash
curl -X POST http://localhost:3001/api/onboardings \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 1,
    "clientName": "Test Client",
    "accountNumber": "TEST-001",
    "sessionNumber": 1,
    "attendance": "pending",
    "date": "2025-01-15"
  }'
```

## Environment Variables

Your `.env` file should have:

```env
# Frontend
VITE_API_URL=http://localhost:3001/api

# Backend
DB_HOST=localhost
DB_PORT=5432
DB_NAME=onboarding_tracker
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3001
NODE_ENV=development
```

## Common Issues

### ❌ "Connection refused" on port 3001
**Solution:** Start the backend server first
```bash
npm run server:dev
```

### ❌ "database does not exist"
**Solution:** Create the database
```bash
createdb -U postgres onboarding_tracker
```

### ❌ "password authentication failed"
**Solution:** Update password in `.env` file

### ❌ PostgreSQL not running
**Solution:** Start PostgreSQL service
```bash
# Mac
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Windows: Use Services app
```

## Features Still Available

✅ **Google Sheets Export** - Export data to Google Sheets for reporting
✅ **Calendar View** - Visual calendar with session counts
✅ **Employee Stats** - Monthly and all-time statistics
✅ **Session History** - Click employee names to see their sessions
✅ **Attendance Tracking** - Pending, Completed, Cancelled, etc.

## What Changed?

### Before:
- Data stored in browser localStorage
- Lost when clearing cache
- Not shareable across devices

### Now:
- Data stored in PostgreSQL database
- Persists permanently
- Accessible from any device
- Multi-user capable
- Better performance

### Still Works:
- All existing features
- Google Sheets integration (optional)
- Same beautiful UI

## Next Steps

1. ✅ Complete setup (above)
2. 📊 Migrate existing data (if any)
3. 🚀 Start using the app
4. 📖 Read [DATABASE_README.md](./DATABASE_README.md) for advanced features
5. 🔧 Customize as needed

## Need Help?

1. **Setup Issues:** See [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)
2. **API Reference:** See [DATABASE_README.md](./DATABASE_README.md)
3. **Troubleshooting:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Backup Your Data

Important! Set up regular backups:

```bash
# Manual backup
pg_dump -U postgres onboarding_tracker > backup.sql

# Restore from backup
psql -U postgres onboarding_tracker < backup.sql
```

For automated backups, see DATABASE_README.md.

---

**That's it!** You now have a professional database-backed application. Enjoy! 🎉
