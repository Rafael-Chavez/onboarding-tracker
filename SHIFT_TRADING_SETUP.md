# Night Shift Trading Feature - Setup Guide

This guide will help you set up the new night shift handshake trading system.

## Overview

The night shift trading feature allows team members to:
- View their night shift schedule in a visual calendar
- Request to trade shifts with other team members (handshake system)
- Accept or reject incoming trade requests
- Automatically swap back to original schedule after both shifts are completed

## Setup Steps

### 1. Database Setup

Run the following SQL scripts in your Supabase SQL Editor:

#### Step 1: Create Tables and Functions

```bash
# Run the updated schema
# Open Supabase SQL Editor: https://app.supabase.com
# Copy and paste the contents of supabase-schema.sql
```

The schema includes:
- `night_shifts` table - stores actual shift assignments
- `shift_trades` table - manages trade requests and their status
- Automated triggers for swap-back functionality
- Real-time subscriptions support

#### Step 2: Populate Initial Shifts

```bash
# Run the population script
# In Supabase SQL Editor, copy and paste: scripts/populate-night-shifts.sql
```

This will:
- Generate shifts for the next 13 weeks (approximately 3 months)
- Follow the existing rotation: Marc → Erick → Danreb → Jim → Steve
- Match the reference point: Week of 2026-02-15 (Sunday) = Erick

### 2. Backend API Setup

The backend routes are already created and integrated:

- `/api/shifts` - Manage night shifts
  - GET `/` - Get all shifts (with filters)
  - GET `/:id` - Get specific shift
  - GET `/calendar/range` - Get shifts for calendar view
  - PATCH `/:id/status` - Update shift status
  - POST `/` - Create new shift (admin)
  - DELETE `/:id` - Delete shift (admin)

- `/api/trades` - Manage trade requests
  - GET `/` - Get all trades (with filters)
  - GET `/pending/:employee_id` - Get pending trades for employee
  - GET `/:id` - Get specific trade
  - POST `/` - Create new trade request
  - POST `/:id/accept` - Accept trade
  - POST `/:id/reject` - Reject trade
  - POST `/:id/cancel` - Cancel trade (initiator only)

**No additional backend setup required** - routes are already registered in `server/index.js`

### 3. Frontend Setup

The React components are already created and integrated into TeamDashboard:

- `ShiftCalendar.jsx` - Visual calendar showing night shift dates
- `ShiftTradeModal.jsx` - Modal for requesting trades
- `PendingTrades.jsx` - Component showing incoming/outgoing trade requests

**The calendar library is already installed:**
```bash
# Already run: npm install react-calendar
```

### 4. Start the Application

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
npm run server
```

## How to Use

### For Team Members

1. **View Shift Calendar**
   - Click "View Shift Calendar" button on the dashboard
   - See your shifts highlighted with a ring
   - See all team members' shifts color-coded
   - Traded shifts are marked with a ↔ symbol

2. **Request a Trade**
   - Click on one of your scheduled shifts in the calendar
   - The trade modal will open
   - Select the shift you want from another team member
   - Add an optional message
   - Click "Send Trade Request"

3. **Respond to Trade Requests**
   - View incoming requests in the "Pending Trades" section
   - See what shift you'd give up and what you'd receive
   - Click "Accept" or "Reject"
   - Accepted trades immediately swap the shifts

4. **Monitor Active Trades**
   - See all accepted trades in the "Active Trades" section
   - After both shifts are completed, they automatically swap back to original schedule

### Trade Request Flow

```
Initiator                    Respondent
    |                             |
    |------ Send Request -------->|
    |                             |
    |                        Review & Decide
    |                             |
    |<----- Accept/Reject --------|
    |                             |
[If Accepted]                     |
    |                             |
Shifts are swapped immediately    |
    |                             |
Both complete their traded shifts |
    |                             |
Shifts automatically swap back    |
```

## Database Schema Details

### night_shifts Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| employee_id | INTEGER | Current assignee (FK to employees) |
| shift_date | DATE | The shift date (unique) |
| week_start_date | DATE | Sunday of the week |
| status | VARCHAR | scheduled, completed, traded, cancelled |
| original_employee_id | INTEGER | Original assignee (for swap-back) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### shift_trades Table

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| initiator_employee_id | INTEGER | Person requesting trade |
| respondent_employee_id | INTEGER | Person receiving request |
| initiator_shift_id | INTEGER | Initiator's shift to trade |
| respondent_shift_id | INTEGER | Respondent's shift to trade |
| status | VARCHAR | pending, accepted, rejected, cancelled, completed, swapped_back |
| initiator_completed | BOOLEAN | Has initiator completed traded shift |
| respondent_completed | BOOLEAN | Has respondent completed traded shift |
| auto_swap_back | BOOLEAN | Auto swap after both complete (default: true) |
| trade_message | TEXT | Optional message from initiator |
| response_message | TEXT | Optional response from respondent |
| created_at | TIMESTAMP | Request creation time |
| updated_at | TIMESTAMP | Last update time |
| completed_at | TIMESTAMP | When both shifts completed |
| swapped_back_at | TIMESTAMP | When shifts swapped back |

## Features

### ✅ Handshake System
- Both parties must agree to the trade
- Either party can reject or cancel
- Clear visual feedback on trade status

### ✅ Visual Calendar
- See all shifts at a glance
- Color-coded by team member
- Your shifts highlighted
- Traded shifts marked with icon

### ✅ Real-time Notifications
- Instant updates when trade requests arrive
- Live status updates for all trades
- Using Supabase real-time subscriptions

### ✅ Automatic Swap-back
- After both parties complete their traded shifts
- Automatically returns to original schedule
- Database trigger handles the swap

### ✅ Validation & Safety
- Can't trade with yourself
- Can't trade the same shift twice
- Can't accept trades for already-traded shifts
- Clear confirmation dialogs

## Troubleshooting

### Issue: Calendar not showing shifts

**Solution:**
1. Check that you ran the `populate-night-shifts.sql` script
2. Verify shifts exist in database:
   ```sql
   SELECT * FROM night_shifts ORDER BY shift_date LIMIT 10;
   ```

### Issue: Trade requests not appearing

**Solution:**
1. Check browser console for errors
2. Verify Supabase connection
3. Check real-time subscription is active

### Issue: Shifts not swapping

**Solution:**
1. Verify the trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name = 'auto_swap_back_trigger';
   ```
2. Check trade status is 'accepted'
3. Ensure both shifts marked as 'completed'

## API Examples

### Get my shifts
```javascript
import { supabase } from '../config/supabase';

const { data } = await supabase
  .from('night_shifts')
  .select('*, employee:employees(id, name, color)')
  .eq('employee_id', myEmployeeId)
  .gte('shift_date', new Date().toISOString().split('T')[0])
  .order('shift_date', { ascending: true });
```

### Create trade request
```javascript
import { supabase } from '../config/supabase';

const { data } = await supabase
  .from('shift_trades')
  .insert({
    initiator_employee_id: myId,
    respondent_employee_id: theirId,
    initiator_shift_id: myShiftId,
    respondent_shift_id: theirShiftId,
    trade_message: 'Can we trade? I have a family event.',
    auto_swap_back: true
  });
```

### Accept trade
```javascript
import { supabase } from '../config/supabase';

const { data } = await supabase
  .from('shift_trades')
  .update({ status: 'accepted' })
  .eq('id', tradeId);
```

## Future Enhancements

Potential improvements:
- [ ] Email notifications for trade requests
- [ ] Mobile push notifications
- [ ] Trade history view
- [ ] Shift swap without auto swap-back option
- [ ] Admin override for trades
- [ ] Bulk shift assignments
- [ ] Export shift calendar to Google Calendar
- [ ] Shift preference system
- [ ] Trade expiration (auto-reject after X days)

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify database schema is up to date
3. Ensure Supabase connection is working
4. Check that the backend server is running

For database issues, use the Supabase SQL Editor to inspect tables and verify data.
