const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo';
const SHEET_NAME = 'Onboarding-Tracker';

function doPost(e) {
  try {
    console.log('=== PRESERVE HEADERS SCRIPT ===');
    console.log('Request:', JSON.stringify(e.parameter));
    
    // Parse the request
    const action = e.parameter.action;
    const data = JSON.parse(e.parameter.data || '{}');
    
    console.log('Action:', action);
    console.log('Data:', JSON.stringify(data));
    
    // Get the spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    // ONLY add headers if sheet is completely empty
    if (sheet.getLastRow() === 0) {
      console.log('Sheet is empty - adding headers');
      sheet.appendRow(['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance', 'Synced At']);
    } else {
      console.log('Sheet has data - preserving existing structure');
      console.log('Current headers:', sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
    }
    
    if (action === 'append' || action === 'test') {
      return addRow(sheet, data.onboarding);
    } else if (action === 'syncAll') {
      return syncAll(sheet, data.onboardings);
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

function addRow(sheet, onboarding) {
  try {
    console.log('Adding row with onboarding:', JSON.stringify(onboarding));
    
    // Get current headers to determine column positions
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('Current headers for row addition:', headers);
    
    // Create row data with explicit values
    const rowData = {
      'Date': onboarding.date || '',
      'Employee': onboarding.employeeName || '',
      'Client Name': onboarding.clientName || '',
      'Account Number': onboarding.accountNumber || '',
      'Session #': onboarding.sessionNumber || 1,
      'Attendance': onboarding.attendance || 'pending',
      'Synced At': new Date().toISOString()
    };
    
    console.log('Row data object:', rowData);
    
    // Map to array based on actual headers
    const row = [];
    for (let i = 0; i < headers.length; i++) {
      const headerName = headers[i].toString().trim();
      const value = rowData[headerName];
      row[i] = value !== undefined ? value : '';
      console.log(`Column ${i} header: "${headerName}" -> value: "${row[i]}" (expected: ${rowData[headerName]})`);
    }
    
    // Extra debugging for attendance specifically
    const attendanceIndex = headers.findIndex(h => h.toString().trim().toLowerCase() === 'attendance');
    console.log('Attendance column index:', attendanceIndex);
    console.log('Attendance value being set:', rowData['Attendance']);
    if (attendanceIndex >= 0) {
      console.log(`Attendance column (${attendanceIndex}) will get: "${row[attendanceIndex]}"`);
    }
    
    console.log('Final row array to append:', row);
    sheet.appendRow(row);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Row added successfully',
        rowData: row
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error adding row:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAll(sheet, onboardings) {
  try {
    console.log('Syncing all data. Count:', onboardings.length);
    
    // Don't clear - preserve headers and add data below
    const lastRow = sheet.getLastRow();
    console.log('Current last row:', lastRow);
    
    if (lastRow === 0) {
      // Empty sheet - add headers first
      sheet.appendRow(['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance', 'Synced At']);
    } else {
      // Clear data rows but keep headers
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
      }
    }
    
    // Add all data
    if (onboardings && onboardings.length > 0) {
      // Get headers to map data correctly
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      console.log('Headers for sync:', headers);
      
      const rows = onboardings.map(onboarding => {
        const rowData = {
          'Date': onboarding.date || '',
          'Employee': onboarding.employeeName || '',
          'Client Name': onboarding.clientName || '',
          'Account Number': onboarding.accountNumber || '',
          'Session #': onboarding.sessionNumber || 1,
          'Attendance': onboarding.attendance || 'pending',
          'Synced At': new Date().toISOString()
        };
        
        // Map to array based on actual headers
        const row = [];
        for (let i = 0; i < headers.length; i++) {
          const headerName = headers[i].toString().trim();
          const value = rowData[headerName];
          row[i] = value !== undefined ? value : '';
        }
        return row;
      });
      
      console.log('Adding', rows.length, 'rows');
      console.log('Sample row:', rows[0]);
      console.log('Sample onboarding:', onboardings[0]);
      
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Successfully synced ${onboardings.length} onboardings`,
        syncedCount: onboardings.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error syncing all:', error);
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
        message: 'Header-preserving script is working!',
        sheetName: sheet.getName(),
        lastRow: sheet.getLastRow(),
        lastColumn: sheet.getLastColumn(),
        headers: sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : []
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}