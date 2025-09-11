# Troubleshooting Google Sheets Import

## 403 Error - "Access Denied"

If you're getting a 403 error when trying to import from Google Sheets, here are the steps to fix it:

### Quick Fixes

1. **Make Your Sheet Public**:
   - Open your Google Sheet
   - Click "Share" → "Change to anyone with the link"
   - Set permissions to "Viewer"
   - Try importing again

2. **Check Your API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - APIs & Services → Credentials
   - Make sure your API key exists and is valid

3. **Enable Google Sheets API**:
   - In Google Cloud Console
   - APIs & Services → Library
   - Search for "Google Sheets API"
   - Click "Enable"

### Alternative Solutions

#### Option 1: Use Manual Copy-Paste
1. Open your Google Sheet
2. Select all data (Ctrl+A)
3. Copy (Ctrl+C)
4. In the app, you can manually recreate entries

#### Option 2: Export/Import CSV
1. File → Download → CSV from your Google Sheet
2. You can create a CSV import feature later

#### Option 3: Share Sheet Directly
Instead of importing to the app:
1. Share your Google Sheet with view permissions
2. Others can view the calendar directly in Google Sheets
3. Use Google Sheets' built-in sharing features

### API Key Setup (Detailed)

If the API method isn't working:

1. **Create a Google Cloud Project**:
   ```
   1. Go to console.cloud.google.com
   2. Create new project or select existing
   3. Note the project name
   ```

2. **Enable Google Sheets API**:
   ```
   1. APIs & Services → Library
   2. Search "Google Sheets API"
   3. Click Enable
   ```

3. **Create API Key**:
   ```
   1. APIs & Services → Credentials
   2. Create Credentials → API Key
   3. Copy the key to your .env file
   ```

4. **Configure API Key (Optional)**:
   ```
   1. Edit API key
   2. Restrict to Google Sheets API
   3. Add HTTP referrers if needed
   ```

### Current Workaround

For now, the app will try multiple methods:
1. Google Sheets API (if configured)
2. Fallback to Google Apps Script method
3. Manual troubleshooting guidance

The export functionality (syncing TO Google Sheets) should work regardless of these import issues.