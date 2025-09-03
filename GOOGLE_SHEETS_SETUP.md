# Google Sheets Integration Setup Guide

## Easy Setup with Google Apps Script (Recommended)

The Google Sheets API requires complex OAuth authentication for writing data. Instead, we'll use Google Apps Script as a simple backend.

## Step 1: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Give it a name like "Onboarding Tracker Data"
4. Keep this sheet open - you'll need it in Step 3

## Step 2: Set Up Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click **"New Project"**
3. Replace the default `Code.gs` content with the code from `google-apps-script.js` file
4. In the script, update the `SPREADSHEET_ID` variable:
   ```javascript
   // Update this line with your Google Sheets ID
   const SPREADSHEET_ID = 'your_sheet_id_here';
   ```
   To get your Sheet ID, copy it from your Google Sheets URL:
   ```
   https://docs.google.com/spreadsheets/d/1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo/edit
   ```
   The ID is: `1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo`

## Step 3: Deploy the Web App

1. In Google Apps Script, click **"Deploy"** > **"New Deployment"**
2. Click the gear icon next to "Type" and select **"Web app"**
3. Set the following:
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
4. Click **"Deploy"**
5. **Copy the Web App URL** (it looks like `https://script.google.com/macros/s/ABC123.../exec`)
6. Click "Done"

## Step 4: Update Environment Variables

Edit the `.env` file in your project root:

```env
VITE_GOOGLE_APPS_SCRIPT_URL=your_web_app_url_here
```

Replace `your_web_app_url_here` with the URL you copied in Step 3.

## Step 5: Test the Integration

1. Restart your development server: `npm run dev`
2. Click "Test Connection" in the app
3. If successful, try syncing some data

## Data Structure

The app will create the following columns in your Google Sheet:

| Column A | Column B | Column C    | Column D       | Column E    | Column F    |
|----------|----------|-------------|----------------|-------------|-------------|
| Date     | Employee | Client Name | Account Number | Session #   | Synced At   |

## Troubleshooting

### "Web App URL not configured" error
- Make sure you've set `VITE_GOOGLE_APPS_SCRIPT_URL` in your `.env` file
- Restart the development server after updating `.env`

### "Authorization required" error
- Make sure you deployed the Apps Script with "Execute as: Me" and "Who has access: Anyone"
- Try re-deploying the web app

### "Spreadsheet not found" error
- Double-check the `SPREADSHEET_ID` in your Apps Script code
- Make sure you can access the Google Sheet normally

### Connection timeout
- Google Apps Script can be slow on first run (cold start)
- Try the connection test again after a few seconds

## Advantages of Apps Script Approach

✅ **No Complex Authentication**: No OAuth setup required
✅ **Direct Sheet Access**: Apps Script runs with your Google account permissions
✅ **Reliable**: Google's own infrastructure
✅ **Free**: No API quotas or costs
✅ **Simple Setup**: Just copy, paste, and deploy

## Security Notes

- The web app runs under your Google account permissions
- Only you can modify the Apps Script code
- The web app URL is public but doesn't expose sensitive data
- All data stays within your Google account ecosystem