const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo';
const SHEET_NAME = 'Onboarding-Tracker';

function doPost(e) {
  try {
    console.log('Simple attendance script - request received');
    
    const action = e.parameter.action;
    const data = JSON.parse(e.parameter.data || '{}');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (action === 'append' || action === 'test') {
      return addRow(sheet, data.onboarding);
    } else if (action === 'syncAll') {
      return syncAllRows(sheet, data.onboardings);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addRow(sheet, onboarding) {
  try {
    console.log('=== ADD ROW (SIMPLE) ===');
    console.log('Attendance value:', onboarding.attendance);
    
    // Simple row addition - just add the data
    const row = [
      onboarding.date || '',
      onboarding.employeeName || '',
      onboarding.clientName || '',
      onboarding.accountNumber || '',
      onboarding.sessionNumber || 1,
      new Date().toISOString(),
      onboarding.attendance || 'pending'
    ];
    
    console.log('Adding row:', row);
    console.log('Column G will be:', row[6]);
    
    sheet.appendRow(row);
    
    // Immediately check what's in G column
    const lastRow = sheet.getLastRow();
    const actualValue = sheet.getRange(lastRow, 7).getValue();
    console.log('Actual value in G' + lastRow + ':', actualValue);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Row added' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in addRow:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllRows(sheet, onboardings) {
  try {
    console.log('=== SYNC ALL (SIMPLE) ===');
    console.log('Syncing', onboardings.length, 'records');
    
    // Clear only data rows (2 and below), never row 1
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      console.log('Clearing rows 2 to', lastRow);
      sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
    }
    
    // Add all data
    if (onboardings && onboardings.length > 0) {
      const rows = onboardings.map(onboarding => [
        onboarding.date || '',
        onboarding.employeeName || '',
        onboarding.clientName || '',
        onboarding.accountNumber || '',
        onboarding.sessionNumber || 1,
        new Date().toISOString(),
        onboarding.attendance || 'pending'  // THIS IS THE KEY - COLUMN G
      ]);
      
      console.log('Sample row to add:', rows[0]);
      console.log('Column G in sample:', rows[0][6]);
      
      // Add all rows at once
      sheet.getRange(2, 1, rows.length, 7).setValues(rows);
      
      // Verify what's actually there
      const check = sheet.getRange(2, 7, Math.min(3, rows.length), 1).getValues();
      console.log('Verification - Column G values:', check.flat());
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Synced ${onboardings.length} records` 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in syncAllRows:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Simple attendance script working' }))
    .setMimeType(ContentService.MimeType.JSON);
}