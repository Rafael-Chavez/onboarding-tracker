const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo';
const SHEET_NAME = 'Onboarding-Tracker';

function doPost(e) {
  try {
    console.log('=== SIMPLE SCRIPT START ===');
    console.log('Request received:', JSON.stringify(e.parameter));
    
    // Parse the request
    const action = e.parameter.action;
    const data = JSON.parse(e.parameter.data || '{}');
    
    console.log('Action:', action);
    console.log('Data:', JSON.stringify(data));
    
    // Get the spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    // Always ensure we have the correct headers
    ensureCorrectHeaders(sheet);
    
    if (action === 'append' || action === 'test') {
      return addOnboardingRow(sheet, data.onboarding);
    } else if (action === 'syncAll') {
      return syncAllData(sheet, data.onboardings);
    } else if (action === 'forceHeaders') {
      return forceCreateHeaders(sheet);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Script error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureCorrectHeaders(sheet) {
  const expectedHeaders = ['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance', 'Synced At'];
  
  console.log('=== HEADER CHECK START ===');
  console.log('Sheet last row:', sheet.getLastRow());
  console.log('Sheet last column:', sheet.getLastColumn());
  
  // FORCE clear and recreate headers every time for testing
  console.log('FORCING header recreation...');
  
  // Clear first row completely
  if (sheet.getLastRow() > 0) {
    sheet.getRange(1, 1, 1, sheet.getLastColumn() || 10).clear();
  }
  
  // Set the headers explicitly
  sheet.getRange(1, 1, 1, 7).setValues([expectedHeaders]);
  console.log('Headers set explicitly');
  
  // Verify headers were set
  const verifyHeaders = sheet.getRange(1, 1, 1, 7).getValues()[0];
  console.log('Verification - Headers now are:', verifyHeaders);
  
  // Make headers bold and freeze
  sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  console.log('=== HEADER CHECK END ===');
}

function addOnboardingRow(sheet, onboarding) {
  try {
    console.log('Adding onboarding row:', JSON.stringify(onboarding));
    
    const row = [
      onboarding.date || '',
      onboarding.employeeName || '',
      onboarding.clientName || '',
      onboarding.accountNumber || '',
      onboarding.sessionNumber || 1,
      onboarding.attendance || 'pending',
      new Date().toISOString()
    ];
    
    console.log('Row to add:', row);
    sheet.appendRow(row);
    
    // Verify the row was added
    const lastRow = sheet.getLastRow();
    const addedRow = sheet.getRange(lastRow, 1, 1, 7).getValues()[0];
    console.log('Row added at position', lastRow, ':', addedRow);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Row added successfully',
        rowNumber: lastRow,
        rowData: addedRow
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error adding row:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllData(sheet, onboardings) {
  try {
    console.log('Syncing all data. Onboardings count:', onboardings.length);
    
    // Clear and start fresh
    sheet.clear();
    
    // Add headers
    const headers = ['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance', 'Synced At'];
    sheet.appendRow(headers);
    console.log('Headers added');
    
    // Add all data
    if (onboardings && onboardings.length > 0) {
      const rows = onboardings.map(onboarding => [
        onboarding.date || '',
        onboarding.employeeName || '',
        onboarding.clientName || '',
        onboarding.accountNumber || '',
        onboarding.sessionNumber || 1,
        onboarding.attendance || 'pending',
        new Date().toISOString()
      ]);
      
      console.log('Adding rows:', rows.length);
      console.log('Sample row:', rows[0]);
      
      // Add all rows at once
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 7).setValues(rows);
      }
      
      console.log('All data synced successfully');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${onboardings.length} onboardings`,
        syncedCount: onboardings.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error syncing all data:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function forceCreateHeaders(sheet) {
  try {
    console.log('=== FORCE CREATE HEADERS ===');
    
    // Clear everything
    sheet.clear();
    
    // Manually create each header cell
    sheet.getRange('A1').setValue('Date');
    sheet.getRange('B1').setValue('Employee');
    sheet.getRange('C1').setValue('Client Name');
    sheet.getRange('D1').setValue('Account Number');
    sheet.getRange('E1').setValue('Session #');
    sheet.getRange('F1').setValue('Attendance');
    sheet.getRange('G1').setValue('Synced At');
    
    // Format headers
    sheet.getRange('A1:G1').setFontWeight('bold');
    sheet.getRange('A1:G1').setBackground('#f0f0f0');
    sheet.setFrozenRows(1);
    
    console.log('Headers created manually');
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Headers forced successfully',
        headers: ['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance', 'Synced At']
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error forcing headers:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Simple Google Apps Script is working!',
        sheetName: sheet.getName(),
        lastRow: sheet.getLastRow(),
        lastColumn: sheet.getLastColumn()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}