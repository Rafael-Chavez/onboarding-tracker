# Database Integration Guide

## Overview

The Onboarding Tracker now supports **PostgreSQL database** as the primary data storage solution, replacing localStorage. This provides:

- ✅ **Persistent data** across devices and browsers
- ✅ **Multi-user support** - share data across team
- ✅ **Better performance** with large datasets
- ✅ **Data integrity** and relationships
- ✅ **Backup and recovery** capabilities

## Quick Start

### 1. Install PostgreSQL

Follow the [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) guide for detailed instructions.

### 2. Set Up Database

```bash
# Create database
createdb -U postgres onboarding_tracker

# Run schema
psql -U postgres -d onboarding_tracker -f server/db/schema.sql
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update:

```env
# Frontend
VITE_API_URL=http://localhost:3001/api

# Backend
DB_HOST=localhost
DB_PORT=5432
DB_NAME=onboarding_tracker
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
```

### 4. Start Services

```bash
# Terminal 1 - Backend
npm run server:dev

# Terminal 2 - Frontend
npm run dev
```

## Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Port 5173)   │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  Express API    │
│   (Port 3001)   │
└────────┬────────┘
         │
         │ SQL
         │
┌────────▼────────┐
│   PostgreSQL    │
│   (Port 5432)   │
└─────────────────┘
```

## API Endpoints

### Base URL
`http://localhost:3001/api`

### Employees
```javascript
// Get all employees
GET /employees
Response: [{ id, name, color }]

// Get employee by ID
GET /employees/:id

// Create employee
POST /employees
Body: { name, color }

// Update employee
PUT /employees/:id
Body: { name?, color? }

// Delete employee
DELETE /employees/:id
```

### Onboardings
```javascript
// Get all onboardings
GET /onboardings
Query params: employee_id, month, attendance, start_date, end_date
Response: [{ id, employeeId, employeeName, clientName, ... }]

// Get onboarding by ID
GET /onboardings/:id

// Create onboarding
POST /onboardings
Body: {
  employeeId,
  clientName,
  accountNumber,
  sessionNumber,
  attendance,
  date
}

// Update onboarding
PUT /onboardings/:id
Body: { attendance?, ... }

// Delete onboarding
DELETE /onboardings/:id

// Bulk import
POST /onboardings/bulk
Body: { onboardings: [{ employeeId, clientName, ... }] }
```

## Frontend Integration

The frontend automatically uses the PostgreSQL API. The app will:

1. Check if backend is available on startup
2. Use PostgreSQL if available, fallback to localStorage if not
3. Show connection status in the UI

### Using the API Service

```javascript
import ApiService from './services/api.js';

// Get all onboardings
const onboardings = await ApiService.getOnboardings();

// Create onboarding
const newOnboarding = await ApiService.createOnboarding({
  employeeId: 1,
  clientName: "Acme Corp",
  accountNumber: "ACC-001",
  sessionNumber: 1,
  attendance: "pending",
  date: "2025-01-15"
});

// Update attendance
await ApiService.updateOnboarding(id, {
  attendance: "completed"
});

// Delete onboarding
await ApiService.deleteOnboarding(id);
```

## Data Migration

### Automatic Migration

The app includes a built-in migration tool to move data from localStorage to PostgreSQL:

```javascript
import MigrationService from './services/migration.js';

// Check backend status
const status = await MigrationService.getDataSourceStatus();
console.log(status);
// { backendAvailable: true, hasLocalData: true, recommended: 'database' }

// Migrate data
const result = await MigrationService.migrateOnboardingsToDatabase();
console.log(result);
// { success: true, message: "Migrated 50 onboardings", migrated: 50 }
```

### Manual Migration

1. Export from localStorage:
```javascript
// In browser console
const data = localStorage.getItem('onboardings');
console.log(JSON.parse(data));
```

2. Import to PostgreSQL:
```bash
curl -X POST http://localhost:3001/api/onboardings/bulk \
  -H "Content-Type: application/json" \
  -d '{"onboardings": [...]}'
```

## Database Schema

### employees
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(100) NOT NULL UNIQUE
color           VARCHAR(100) NOT NULL
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### onboardings
```sql
id              SERIAL PRIMARY KEY
employee_id     INTEGER NOT NULL REFERENCES employees(id)
client_name     VARCHAR(255) NOT NULL
account_number  VARCHAR(100) NOT NULL
session_number  INTEGER NOT NULL DEFAULT 1
attendance      VARCHAR(50) DEFAULT 'pending'
date            DATE NOT NULL
month           VARCHAR(7) NOT NULL
created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Indexes
- `idx_onboardings_employee_id` - Fast employee lookups
- `idx_onboardings_date` - Fast date range queries
- `idx_onboardings_month` - Fast monthly statistics
- `idx_onboardings_attendance` - Fast status filtering
- `idx_onboardings_client_name` - Fast client searches

## Google Sheets Integration

The Google Sheets integration remains available as an **optional export feature**:

- Export data from PostgreSQL to Google Sheets for reporting
- Import data from Google Sheets for backup/recovery
- Sync specific records or date ranges

## Deployment

### Production Checklist

- [ ] Set up production PostgreSQL database
- [ ] Update environment variables for production
- [ ] Enable SSL for database connection
- [ ] Set up database backups
- [ ] Configure CORS for production domain
- [ ] Set NODE_ENV=production

### Recommended Hosting

**Backend + Database:**
- Railway.app (PostgreSQL included)
- Heroku (with Heroku Postgres addon)
- Render.com (with PostgreSQL)
- DigitalOcean App Platform

**Frontend:**
- Vercel
- Netlify
- Cloudflare Pages

## Backup & Recovery

### Backup Database
```bash
# Full backup
pg_dump -U postgres onboarding_tracker > backup.sql

# Data only
pg_dump -U postgres --data-only onboarding_tracker > data_backup.sql
```

### Restore Database
```bash
psql -U postgres onboarding_tracker < backup.sql
```

### Automated Backups
Set up cron job (Linux/Mac):
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U postgres onboarding_tracker > /backups/onboarding_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Backend won't start
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list postgresql@15  # Mac
# Check Services app on Windows

# Test database connection
psql -U postgres -d onboarding_tracker
```

### CORS errors
Add your frontend URL to CORS config in `server/index.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-production-url.com']
}));
```

### Connection timeout
Increase timeout in `server/config/database.js`:
```javascript
connectionTimeoutMillis: 5000, // 5 seconds
```

### View logs
```bash
# Backend logs
npm run server:dev

# PostgreSQL logs (Linux)
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

## Performance Tips

1. **Indexes**: Already optimized for common queries
2. **Connection Pooling**: Configured with max 20 connections
3. **Query Optimization**: Use filters to limit result sets
4. **Pagination**: Add pagination for large datasets

Example with filters:
```javascript
// Get only this month's completed sessions
const onboardings = await ApiService.getOnboardings({
  month: '2025-01',
  attendance: 'completed'
});
```

## Security Best Practices

1. **Never commit `.env`** to version control
2. **Use strong database passwords**
3. **Enable SSL** for database connections in production
4. **Restrict database** access by IP (firewall rules)
5. **Regular updates** for dependencies
6. **Input validation** on all API endpoints (already implemented)

## Support

For issues or questions:
1. Check [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)
2. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Review PostgreSQL logs
4. Test API endpoints with curl or Postman

## Next Steps

- [x] PostgreSQL integration
- [ ] Add user authentication
- [ ] Add role-based permissions
- [ ] Add export to Excel
- [ ] Add analytics dashboard
- [ ] Add email notifications
