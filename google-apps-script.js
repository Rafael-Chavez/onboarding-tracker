/**
 * Google Apps Script for Onboarding Tracker
 * 
 * Instructions:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Replace the default code with this code
 * 4. Update SPREADSHEET_ID below with your Google Sheets ID
 * 5. Deploy as a web app with "Execute as: Me" and "Access: Anyone"
 * 6. Copy the web app URL to your .env file
 */

// Update this with your Google Sheets ID
const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo';
const SHEET_NAME = 'Onboarding-Tracker';

function doPost(e) {
  try {
    // Parse the request - handle both JSON and form data
    let data, action;
    
    if (e.postData.contents) {
      // JSON request
      data = JSON.parse(e.postData.contents);
      action = data.action;
    } else {
      // Form data request
      action = e.parameter.action;
      data = JSON.parse(e.parameter.data || '{}');
    }
    
    // Get the spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (action === 'append') {
      return appendOnboarding(sheet, data.onboarding);
    } else if (action === 'syncAll') {
      return syncAllOnboardings(sheet, data.onboardings);
    } else if (action === 'test') {
      return testConnection(sheet);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Handle GET requests (for testing)
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Get all sheet names for debugging
    const allSheets = ss.getSheets().map(sheet => sheet.getName());
    
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: false, 
          error: `Sheet "${SHEET_NAME}" not found. Available sheets: ${allSheets.join(', ')}`,
          availableSheets: allSheets
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Google Apps Script is working!',
        sheetName: sheet.getName(),
        lastRow: sheet.getLastRow(),
        availableSheets: allSheets,
        spreadsheetId: SPREADSHEET_ID,
        targetSheet: SHEET_NAME
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appendOnboarding(sheet, onboarding) {
  try {
    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Synced At']);
    }
    
    // Add the onboarding data
    const row = [
      onboarding.date,
      onboarding.employeeName,
      onboarding.clientName,
      onboarding.accountNumber,
      onboarding.sessionNumber,
      new Date().toISOString()
    ];
    
    sheet.appendRow(row);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Onboarding added successfully',
        row: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllOnboardings(sheet, onboardings) {
  try {
    // Clear existing data
    sheet.clear();
    
    // Add header row
    const headers = ['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Synced At'];
    sheet.appendRow(headers);
    
    // Add all onboarding data
    const rows = onboardings.map(onboarding => [
      onboarding.date,
      onboarding.employeeName,
      onboarding.clientName,
      onboarding.accountNumber,
      onboarding.sessionNumber,
      new Date().toISOString()
    ]);
    
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${onboardings.length} onboardings`,
        syncedCount: onboardings.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function testConnection(sheet) {
  try {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Connection successful!',
        sheetName: sheet.getName(),
        rowCount: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}