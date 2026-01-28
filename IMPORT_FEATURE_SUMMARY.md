# Import Sessions Feature for Team Members

## ✨ What's New

Team members can now import all their sessions from Google Sheets with one click! Perfect for when they clear their cache or use a new device.

## 🎯 Feature Overview

### Import Sessions Button
- Located at the top-right of the "My Recent Sessions" section
- Beautiful blue gradient button with download icon
- Always visible (even when no local sessions exist)
- Shows spinning animation during import

### Visual Design
```
┌─────────────────────────────────────────────────────────┐
│ My Recent Sessions  [⬇ Import Sessions] [🔄 Sync]      │
└─────────────────────────────────────────────────────────┘
```

**Button States:**
- **Idle**: "Import Sessions" with static download icon
- **Importing**: "Importing..." with spinning download icon
- **Disabled**: Grayed out while import is in progress

**Status Messages:**
- ✅ **Success**: "Successfully imported X new sessions from Google Sheets!"
- ⚠️ **Warning**: "No sessions found for you in Google Sheets."
- ⚠️ **Already Updated**: "All your sessions are already up to date!"
- ❌ **Error**: "Failed to import sessions. Please try again."

## 💡 How It Works

### Import Process

1. **User clicks "Import Sessions"**
2. **Fetches data** from Google Sheets using Sheets API
3. **Filters sessions** to only include theirs (by employee ID)
4. **Checks for duplicates** (same date + client + account)
5. **Adds new sessions** to localStorage
6. **Updates stats** and recent sessions list
7. **Shows result** message (auto-dismisses after 7 seconds)

### Smart Duplicate Detection

```javascript
// Creates unique key for each session
const key = `${date}-${clientName}-${accountNumber}`

// Only imports if this key doesn't exist locally
if (!existingKeys.has(key)) {
  // Import this session
}
```

### Employee Filtering

```javascript
// Only import sessions belonging to this team member
const mySessions = allSessions.filter(
  ob => ob.employeeId === employeeId
);
```

## 🎨 UI Features

### Two Buttons Side-by-Side
- **Import Sessions** (Blue) - Pull from Sheets
- **Sync to Sheets** (Green) - Push to Sheets

### Visual Feedback
- **Loading spinner** during import
- **Color-coded messages**:
  - Green: Success
  - Yellow: Warning
  - Red: Error
  - Blue: Info
- **Auto-dismiss** after 7 seconds

### Button Styling
- Blue gradient (`from-blue-500 to-cyan-600`)
- Download icon (arrow pointing down)
- Hover effect (darker blue)
- Focus ring for accessibility
- Disabled state during operation
- Smooth transitions

## 📊 Use Cases

### Primary Use Case: Cache Cleared / New Device

**Scenario:**
Steve clears his browser cache or logs in from a new computer.

**Problem:**
All his localStorage data is gone - no sessions visible!

**Solution:**
1. Steve logs in
2. Sees empty "Recent Sessions"
3. Clicks "Import Sessions"
4. All his sessions from Google Sheets load instantly
5. Stats update to show correct numbers

### Other Use Cases

1. **Data Recovery**
   - "My sessions disappeared!"
   - Import restores everything

2. **First Time Setup**
   - New team member already has sessions in Sheets
   - Import loads their history

3. **Sync Between Devices**
   - Log sessions on work computer
   - Import to personal laptop
   - Same data everywhere

4. **After Accidental Deletion**
   - Accidentally cleared localStorage
   - Import recovers from Sheets

## 🔒 Safety Features

### Duplicate Prevention
- **Smart key matching** (date + client + account)
- **No duplicate imports** even if clicked multiple times
- **Preserves existing data**

### Data Integrity
- **Only imports user's sessions** (filtered by employee ID)
- **Validates required fields** (date, client, account)
- **Handles missing data** gracefully

### Error Handling
- **API errors** caught and displayed
- **Network failures** show friendly message
- **Invalid data** skipped with console warning

## 📱 Responsive Design

- Buttons wrap on mobile (stack vertically)
- Touch-friendly tap targets
- Reads well on all screen sizes
- Flex layout with gap spacing

## 🚀 Technical Details

### API Integration
```javascript
// Uses existing Google Sheets API method
const result = await GoogleSheetsService.importFromGoogleSheetsAPI();

// Filters to team member's sessions
const mySessions = result.onboardings.filter(
  ob => ob.employeeId === employeeId
);
```

### Data Merging
```javascript
// Load existing
const existing = loadFromStorage('onboardings', []);

// Add new (non-duplicates)
const updated = [...existing, ...newSessions];

// Save back
localStorage.setItem('onboardings', JSON.stringify(updated));
```

### State Management
```javascript
const [importStatus, setImportStatus] = useState({
  isLoading: false,
  message: '',
  type: '' // 'success' | 'error' | 'warning' | 'info'
});
```

## 🎯 Benefits

### For Team Members:
✅ **Never lose data** - Always backed up in Sheets
✅ **Works anywhere** - Access on any device
✅ **Self-service** - No admin intervention needed
✅ **Peace of mind** - Data is recoverable

### For Admin:
✅ **Less support** - Team can recover their own data
✅ **Data reliability** - Google Sheets is source of truth
✅ **Flexibility** - Team can work from multiple devices

## 📝 Status Messages

### Success Cases
```javascript
"Successfully imported 15 new sessions from Google Sheets!"
"All your sessions are already up to date!"
```

### Warning Cases
```javascript
"No sessions found for you in Google Sheets."
```

### Error Cases
```javascript
"Failed to import sessions. Please try again."
"Google Sheets API permission denied. Quick fix: [instructions]"
```

## 🔄 Integration with Existing Features

### Works With:
- ✅ **Stats Dashboard** - Updates after import
- ✅ **Recent Sessions** - Refreshes automatically
- ✅ **Sync to Sheets** - Can sync after import
- ✅ **Notes Field** - Imports notes if present
- ✅ **Session Numbers** - Preserves session numbering

### Google Sheets
- Reads from same spreadsheet as admin
- Uses Google Sheets API (requires API key in .env)
- Respects sheet format (columns A-G)
- Handles attendance status

## 📋 Requirements

### Environment Variables
```env
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
```

### Google Sheet Setup
- Sheet must be shared (at least "Viewer" permission)
- Or Google Sheets API enabled in Cloud Console
- Same spreadsheet ID as admin uses

---

This feature ensures team members never lose their session history, even if they clear their browser cache or switch devices. Import from Google Sheets with one click! 🚀
