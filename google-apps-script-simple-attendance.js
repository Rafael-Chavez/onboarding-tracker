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
    
    // Add data only to columns A-F, preserving G column (attendance) for manual input
    const row = [
      onboarding.date || '',
      onboarding.employeeName || '',
      onboarding.clientName || '',
      onboarding.accountNumber || '',
      onboarding.sessionNumber || 1,
      new Date().toISOString()
      // Column G (Attendance) is preserved - not overwritten
    ];
    
    console.log('Adding row (A-F only):', row);
    console.log('Column G will be preserved and not overwritten');
    
    // Add only columns A-F, leaving G column untouched for manual input
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
    range.setValues([row]);
    
    // Check that G column was left untouched
    const lastRow = sheet.getLastRow();
    const actualValue = sheet.getRange(lastRow, 7).getValue();
    console.log('Column G preserved value in row', lastRow + ':', actualValue);
    
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
    
    // Clear only columns A-F, preserve column G (attendance) for manual input
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      console.log('Clearing columns A-F only, preserving G column attendance data');
      // Clear only columns A-F, not touching G
      sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
    }
    
    // Add all data (A-F only)
    if (onboardings && onboardings.length > 0) {
      const rows = onboardings.map(onboarding => [
        onboarding.date || '',
        onboarding.employeeName || '',
        onboarding.clientName || '',
        onboarding.accountNumber || '',
        onboarding.sessionNumber || 1,
        new Date().toISOString()
        // Column G (Attendance) preserved for manual input
      ]);
      
      console.log('Sample row to add (A-F only):', rows[0]);
      console.log('Column G will be preserved for manual input');
      
      // Add all rows at once (columns A-F only)
      sheet.getRange(2, 1, rows.length, 6).setValues(rows);
      
      // Verify column G was preserved
      const check = sheet.getRange(2, 7, Math.min(3, rows.length), 1).getValues();
      console.log('Verification - Column G preserved values:', check.flat());
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