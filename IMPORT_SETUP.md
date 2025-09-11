# Google Sheets Import Setup

This document explains how to set up the import functionality so others can view the calendar data from your Google Sheet.

## Current Features

✅ **Export to Google Sheets** - Working  
✅ **Import from Google Sheets** - Now implemented!

## Quick Start

1. **Environment Variables**: Copy `.env.example` to `.env` and configure:
   - `VITE_GOOGLE_APPS_SCRIPT_URL` - For syncing data TO Google Sheets
   - `VITE_GOOGLE_SHEETS_API_KEY` - For importing data FROM Google Sheets

2. **Google Sheets API Key Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable the Google Sheets API
   - Create an API Key credential
   - Add the API key to your `.env` file

3. **Share Your Google Sheet**:
   - Make your Google Sheet public or shareable with view access
   - Others can now use the import function to load your calendar data

## How Import Works

The import functionality:
- Reads data from columns A-G of your Google Sheet
- Merges with local data (avoids duplicates)
- Maps employee names to the app's employee list
- Preserves attendance status from the sheet
- Shows success/error messages during import

## Sharing Your Calendar

For others to view your onboarding calendar:

1. **Option 1 - Direct Sheet Access**: Share your Google Sheet link
2. **Option 2 - App Import**: Others can use this app with the import feature
3. **Option 3 - Deploy the App**: Deploy this app to a hosting platform

## Button Functions

- **Sync to Google Sheets**: Exports current app data to your sheet
- **Import from Sheet**: Imports data from your Google Sheet to the app
- **Test Connection**: Verifies your Google Apps Script is working
- **Auto-sync**: Automatically syncs new entries as you add them

## Troubleshooting

- **Import fails**: Check your Google Sheets API key in `.env`
- **Sync fails**: Check your Google Apps Script Web App URL
- **No data imported**: Verify your sheet has data in the expected columns

## Sheet Structure Expected

The import expects this column structure:
- A: Date
- B: Employee Name  
- C: Client Name
- D: Account Number
- E: Session Number
- F: Synced At (timestamp)
- G: Attendance (pending/completed/cancelled/rescheduled/no-show)