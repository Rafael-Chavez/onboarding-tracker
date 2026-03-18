# Night Shift Trading - UI/UX Updates

## Summary of Changes

The night shift trading system has been completely redesigned with an intuitive team member icon interface and improved week-based trading.

## Key Changes

### 1. **Work Week Updated: Sunday - Thursday** ✅
- Changed from 6-day week (Sun-Fri) to 5-day week (Sun-Thu)
- Updated database population script
- Updated all UI components to reflect the correct schedule

### 2. **New Team Member Icon Selector** ✅
Created a new component: `TeamShiftSelector.jsx`

**Features:**
- Grid of team member profile icons
- Click on any team member's icon to initiate a trade
- Shows available weeks for each team member
- Displays week count badge on each icon
- Cannot trade with yourself (your icon is greyed out)
- Clear prompt: "Do you want to trade with [Name] for [Date Range]?"

**User Flow:**
1. User clicks "Open Night Shift Manager"
2. Sees grid of all team members with their profile icons
3. Clicks on a team member's icon
4. Gets confirmation prompt with the date range
5. After confirming, selects which of their weeks to trade

### 3. **Improved Trade Modal** ✅
Redesigned `ShiftTradeModal.jsx` to work with week ranges

**Features:**
- Shows who you're trading with at the top
- Displays their week range (e.g., "Mar 16, 2026 – Mar 20, 2026")
- Lets you select which of YOUR weeks to trade
- Shows visual trade summary:
  - "You give: [Your week range]"
  - "You get: [Their week range]"
- Optional message field
- Clear automatic swap-back notice

### 4. **Enhanced Calendar** ✅
Updated `ShiftCalendar.jsx` with better visual indicators

**New Features:**
- **Current Work Week Highlighting**: Your current work week (Sun-Thu) is highlighted with a blue glow
- **Today Indicator**: Green pulsing dot on today's date
- **Legend Updated**: Shows what each color/style means
  - Purple ring = Your shifts
  - Blue glow = Current work week
  - Team colors = Other team members
  - ↔ symbol = Traded shift

**CSS Enhancements:**
```css
.current-week-tile {
  background: rgba(59, 130, 246, 0.25);
  border: 2px solid rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
}

.today-shift::before {
  /* Green pulsing dot */
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: pulse 2s ease-in-out infinite;
}
```

### 5. **Updated Dashboard Layout** ✅
Modified `TeamDashboard.jsx` to integrate new components

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Open Night Shift Manager Button                │
└─────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────┐
│  Team Member Icons           │  Pending Trades  │
│  (Click to initiate trade)   │  - Incoming      │
│                              │  - Outgoing      │
│  Shift Calendar              │  - Active        │
│  (Visual overview)           │                  │
└──────────────────────────────┴──────────────────┘
```

## Complete User Journey

### Requesting a Trade

1. **Open Night Shift Manager**
   - Click button on dashboard

2. **Select Team Member**
   - See grid of team member icons
   - Click on the person you want to trade with
   - Example: Click on "Erick's" icon

3. **Confirm Interest**
   - Prompt appears: "Do you want to trade shifts with Erick?"
   - Shows their week: "Mar 23 – Mar 27"
   - Click OK to proceed

4. **Select Your Week**
   - Modal opens showing Erick at the top
   - See list of your available weeks
   - Select which of YOUR weeks you want to trade
   - Add optional message

5. **Review & Submit**
   - See trade summary:
     - You give: Your selected week
     - You get: Erick's week
   - Click "Send Trade Request"

6. **Wait for Response**
   - Trade appears in "Sent Requests" section
   - Real-time notification when responded to

### Responding to a Trade

1. **See Incoming Request**
   - "Pending Trades" section shows new request
   - With pulsing purple indicator

2. **Review Details**
   - See who wants to trade
   - See what week you'd give up
   - See what week you'd receive
   - Read their message (if any)

3. **Accept or Reject**
   - Click "Accept" or "Reject"
   - Confirmation dialog appears

4. **Shifts Update**
   - If accepted, shifts immediately swap
   - Both calendars update in real-time
   - Trade moves to "Active Trades"

### After Completion

1. **Complete Your Traded Shift**
   - Work the week you received

2. **Automatic Swap-Back**
   - When both parties complete their traded weeks
   - Database trigger automatically swaps back
   - You return to your original schedule

## Technical Details

### Database Updates
- Updated `populate-night-shifts.sql` for 5-day weeks (Sun-Thu)
- No schema changes needed - existing structure supports week-based trading

### Component Props

**TeamShiftSelector:**
```javascript
<TeamShiftSelector
  myEmployeeId={employeeId}
  myEmployeeName={currentEmployee?.name}
  onTradeRequest={(employee, shifts) => {...}}
/>
```

**ShiftTradeModal:**
```javascript
<ShiftTradeModal
  isOpen={showTradeModal}
  onClose={() => {...}}
  myEmployeeId={employeeId}
  myEmployeeName={currentEmployee?.name}
  targetEmployee={targetEmployee}
  targetShifts={targetShifts}
/>
```

**ShiftCalendar:**
```javascript
<ShiftCalendar
  employeeId={employeeId}
  onShiftSelect={(shift, date) => {...}}
/>
```

## Files Modified

1. `src/components/TeamShiftSelector.jsx` - **NEW**
2. `src/components/ShiftTradeModal.jsx` - **UPDATED**
3. `src/components/ShiftCalendar.jsx` - **UPDATED**
4. `src/components/TeamDashboard.jsx` - **UPDATED**
5. `scripts/populate-night-shifts.sql` - **UPDATED** (6 days → 5 days)

## Visual Design

### Team Member Icons
- Large circular avatars with gradient backgrounds
- Initial letter displayed
- Hover effect with scale animation
- Badge showing number of available weeks
- Greyed out if no shifts available or if it's you

### Trade Modal
- Purple/pink gradient header
- Target employee shown prominently at top
- Week selection with checkmark indicator
- Trade summary with color coding:
  - Red: What you're giving up
  - Green: What you're receiving
- Blue info box with swap-back notice

### Calendar Enhancements
- Current week: Blue glow effect
- Today: Green pulsing dot
- Your shifts: Purple border with ring
- Team shifts: Colored avatars
- Completed: Faded opacity
- Traded: Yellow swap icon

## Testing Checklist

- [ ] Run database migration (supabase-schema.sql)
- [ ] Run population script (populate-night-shifts.sql)
- [ ] Verify 5 days per week (Sun-Thu)
- [ ] Click team member icons to initiate trades
- [ ] Confirm prompt shows correct date range
- [ ] Select your week in modal
- [ ] Send trade request
- [ ] View pending trades
- [ ] Accept/reject incoming trades
- [ ] Verify real-time updates
- [ ] Check calendar highlighting
- [ ] Verify current week glow
- [ ] Verify today indicator

## Next Steps

To use this feature:

1. **Apply database updates:**
   ```sql
   -- In Supabase SQL Editor
   -- Run supabase-schema.sql
   -- Run populate-night-shifts.sql
   ```

2. **Start the app:**
   ```bash
   npm run dev
   ```

3. **Test the flow:**
   - Login as a team member
   - Click "Open Night Shift Manager"
   - Click on another team member's icon
   - Complete a trade request

## Benefits

✅ **Intuitive**: Click on faces instead of navigating complex UIs
✅ **Visual**: See all available weeks at a glance
✅ **Clear**: Week ranges shown everywhere
✅ **Fast**: Fewer clicks to initiate a trade
✅ **Safe**: Confirmation prompts prevent mistakes
✅ **Real-time**: Instant notifications via Supabase
✅ **Automatic**: Swap-back happens automatically

The interface is now much more user-friendly and follows common social/collaboration app patterns where you interact with people's profiles directly!
