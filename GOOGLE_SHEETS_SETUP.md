# Google Sheets Integration Setup Guide

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"

## Step 2: Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. (Optional) Restrict the API key to only the Google Sheets API for security

## Step 3: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Give it a name like "Onboarding Tracker Data"
4. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

## Step 4: Configure Sheet Permissions

1. Share your Google Sheet with "Anyone with the link can edit" OR
2. Make it public (less secure but simpler for testing)

## Step 5: Update Environment Variables

Edit the `.env` file in your project root:

```env
VITE_GOOGLE_SHEETS_API_KEY=your_actual_api_key_here
VITE_GOOGLE_SHEETS_SPREADSHEET_ID=your_actual_spreadsheet_id_here
VITE_GOOGLE_SHEETS_RANGE=Sheet1!A:F
```

## Step 6: Test the Integration

1. Restart your development server: `npm run dev`
2. Click "Test Connection" in the app
3. If successful, try syncing some data

## Data Structure

The app will create the following columns in your Google Sheet:

| Column A | Column B | Column C    | Column D       | Column E    | Column F    |
|----------|----------|-------------|----------------|-------------|-------------|
| Date     | Employee | Client Name | Account Number | Session #   | Synced At   |

## Troubleshooting

### "API not configured" error
- Make sure you've set the environment variables correctly
- Restart the development server after updating `.env`

### "403 Forbidden" error
- Check that the Google Sheets API is enabled in your Google Cloud project
- Verify your API key is correct and not restricted

### "404 Not Found" error
- Double-check your spreadsheet ID
- Make sure the sheet is shared properly

### CORS errors
- This is normal in development
- The integration will work properly when deployed to Vercel

## Security Notes

- Never commit your actual API keys to version control
- Consider using service account credentials for production
- Restrict your API key to specific APIs and domains when possible