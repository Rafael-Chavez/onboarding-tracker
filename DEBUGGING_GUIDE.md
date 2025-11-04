# Debugging Guide - Google Sheets Import & Stats Issues

## What Was Fixed

### 1. **Google Sheets Import Issues**
Fixed date parsing to handle multiple formats from Google Sheets:
- MM/DD/YYYY format (common in US Google Sheets)
- YYYY-MM-DD format
- Date objects
- String dates

### 2. **Attendance Value Normalization**
The import now:
- Converts attendance to lowercase
- Trims whitespace
- Defaults to 'pending' if empty

### 3. **Enhanced Debug Logging**
Added comprehensive logging to see:
- What data is being imported
- How dates are being parsed
- October 2025 entries specifically
- Data quality issues

## How to Debug Your Issue

### Step 1: Open Browser Console
1. Open your app in the browser
2. Press `F12` or right-click → Inspect
3. Go to the "Console" tab

### Step 2: Check Your Current Data

Run this in the console:
```javascript
// Check localStorage
debugLocalStorage()

// Check October 2025 data specifically
const onboardings = JSON.parse(localStorage.getItem('onboardings'))
debugOnboardingStats(onboardings, '2025-10')
```

### Step 3: Import from Google Sheets (with debug logging)

1. Click "Import from Sheet" button
2. Watch the console output

You'll see:
```
📊 Raw data from Google Sheets: X rows
📅 October 2025 entry found: { date, employee, client, attendance }
✅ Successfully imported X onboardings
📅 October 2025: X total, X completed
```

### Step 4: Analyze the Debug Output

The debug will show you:

**Data Issues:**
- ⏭️ Skipped rows (missing required fields)
- Missing attendance values
- Invalid dates
- Incorrect month values

**October 2025 Specific:**
- All October entries with dates, employees, clients
- Attendance status for each
- Count of completed vs total

### Example Debug Session

```javascript
// In browser console:

// 1. Check what's in localStorage
debugLocalStorage()
// Output: "✅ Found 50 onboardings in localStorage"
//         "📅 October 2025: 10 entries"

// 2. Get detailed stats
const data = JSON.parse(localStorage.getItem('onboardings'))
const stats = debugOnboardingStats(data, '2025-10')

// Output shows:
// 📊 Debug Stats for 2025-10
// Total onboardings in month: 10
//
// 📋 By Attendance Status:
//   completed: 7
//   pending: 2
//   cancelled: 1
//
// 👥 By Employee:
//   Rafael: 3 total (2 completed, 1 pending)
//   Jim: 4 total (3 completed, 1 cancelled)
```

## Common Issues & Solutions

### Issue 1: Import shows success but no data appears

**Possible Causes:**
1. Duplicate detection (data already exists)
2. Missing required fields in Google Sheet
3. Date format not being parsed

**Solution:**
```javascript
// Check console for these messages:
// "⏭️ Skipping row X: Missing required fields"
// "No new data to import - all onboardings already exist locally"

// If all rows are being skipped:
// 1. Check your Google Sheet has: Date, Employee, Client Name, Account Number
// 2. Make sure column A (Date) is not empty
```

### Issue 2: October 2025 stats not showing

**Possible Causes:**
1. Date parsing issue (dates stored in wrong format)
2. Attendance field has wrong values
3. Month field is incorrect

**Solution:**
```javascript
// Check your data structure:
const october = JSON.parse(localStorage.getItem('onboardings'))
  .filter(ob => ob.date && ob.date.startsWith('2025-10'))

console.log('October entries:', october)

// Check each entry:
october.forEach(ob => {
  console.log({
    date: ob.date,
    month: ob.month,  // Should be '2025-10'
    attendance: ob.attendance,  // Should be lowercase
    employee: ob.employeeName
  })
})
```

### Issue 3: Attendance values don't match

**Problem:** Google Sheets has "Completed" but app expects "completed"

**Solution:** The import now automatically:
- Converts to lowercase: "Completed" → "completed"
- Trims spaces: " completed " → "completed"
- Sets default: "" → "pending"

### Issue 4: Stats show different numbers than expected

**Debug Steps:**
```javascript
// 1. Count by attendance status
const onboardings = JSON.parse(localStorage.getItem('onboardings'))
const october = onboardings.filter(ob => ob.month === '2025-10')

console.log('Total October:', october.length)
console.log('Completed:', october.filter(ob => ob.attendance === 'completed').length)
console.log('Pending:', october.filter(ob => ob.attendance === 'pending').length)

// 2. Check for data quality issues
october.forEach((ob, i) => {
  if (!ob.attendance || ob.attendance === 'undefined') {
    console.log(`Entry ${i} missing attendance:`, ob)
  }
  if (ob.month !== '2025-10') {
    console.log(`Entry ${i} wrong month:`, ob)
  }
})
```

## What the Enhanced Import Does

### Before Import:
```javascript
// Google Sheet has:
// Date: "10/15/2025"
// Employee: "Rafael"
// Attendance: "Completed  " (with spaces)
```

### After Import (Fixed):
```javascript
{
  date: "2025-10-15",           // ✅ Parsed correctly
  month: "2025-10",             // ✅ Extracted from date
  employeeName: "Rafael",
  attendance: "completed",       // ✅ Lowercase + trimmed
  clientName: "...",
  accountNumber: "..."
}
```

## Testing Your Import

### Step 1: Clear and Re-import

```javascript
// Backup first!
const backup = localStorage.getItem('onboardings')
console.log('Backup saved')

// Clear current data
localStorage.removeItem('onboardings')

// Now click "Import from Sheet"
// Watch the console for debug output
```

### Step 2: Verify Import Results

```javascript
const data = JSON.parse(localStorage.getItem('onboardings'))

// Check total
console.log('Total imported:', data.length)

// Check October
const oct = data.filter(ob => ob.month === '2025-10')
console.log('October 2025:', oct.length)

// Check completed in October
const octCompleted = oct.filter(ob => ob.attendance === 'completed')
console.log('October completed:', octCompleted.length)

// Show first few October entries
console.table(oct.slice(0, 5))
```

## Google Sheets Format Requirements

Your Google Sheet should have these columns:

| A (Date) | B (Employee) | C (Client Name) | D (Account #) | E (Session #) | F (Synced At) | G (Attendance) |
|----------|--------------|-----------------|---------------|---------------|---------------|----------------|
| 10/15/2025 | Rafael | Acme Corp | ACC-001 | 1 | ... | Completed |
| 10/16/2025 | Jim | Tech Co | ACC-002 | 1 | ... | Pending |

**Important:**
- **Date (Column A):** Can be MM/DD/YYYY or YYYY-MM-DD
- **Employee (Column B):** Must match exactly: Rafael, Danreb, Jim, Marc, Steve, or Erick
- **Attendance (Column G):** Can be: completed, pending, cancelled, rescheduled, no-show (case insensitive)

## Need More Help?

### Enable Verbose Logging

The import now logs everything. Watch for:
- 📊 Raw data count
- ⏭️ Skipped rows
- 📅 October 2025 entries
- ✅ Success summary

### Export Current Data for Analysis

```javascript
// Export to see what you have
const data = JSON.parse(localStorage.getItem('onboardings'))
console.log(JSON.stringify(data, null, 2))

// Or save to file
const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'onboardings-export.json'
a.click()
```

## Summary

**Fixed Issues:**
✅ Better date parsing (MM/DD/YYYY support)
✅ Attendance normalization (lowercase, trimmed)
✅ Comprehensive debug logging
✅ October 2025 specific tracking

**Debug Tools Added:**
✅ `debugLocalStorage()` - Check localStorage
✅ `debugOnboardingStats(data, month)` - Analyze stats
✅ Console logging during import

**Next Steps:**
1. Open browser console
2. Run `debugLocalStorage()`
3. Import from Google Sheets
4. Watch debug output
5. Run `debugOnboardingStats()` to verify

The import should now work correctly and you'll be able to see exactly what's happening!
