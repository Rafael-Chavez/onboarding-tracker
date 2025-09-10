const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo';
const SHEET_NAME = 'Onboarding-Tracker';

function doPost(e) {
  try {
    console.log('Manual headers script - request received');
    
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
    console.log('=== ADD ROW ===');
    console.log('Received onboarding data:', JSON.stringify(onboarding));
    console.log('Attendance value received:', onboarding.attendance);
    
    // Just add data assuming your headers are in order:
    // Date | Employee | Client Name | Account Number | Session # | Synced At | Attendance
    const row = [
      onboarding.date || '',                    // Column A
      onboarding.employeeName || '',            // Column B  
      onboarding.clientName || '',              // Column C
      onboarding.accountNumber || '',           // Column D
      onboarding.sessionNumber || 1,           // Column E
      new Date().toISOString(),                 // Column F - SYNCED AT
      onboarding.attendance || 'pending'       // Column G - ATTENDANCE
    ];
    
    console.log('Row array to add:', row);
    console.log('Column G (Attendance) will be:', row[6]);
    
    sheet.appendRow(row);
    console.log('Row added successfully');
    
    // Set up dropdown validation for attendance column
    setupAttendanceDropdown(sheet);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Row added' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncAllRows(sheet, onboardings) {
  try {
    console.log('=== SYNC ALL ROWS ===');
    console.log('Current sheet last row:', sheet.getLastRow());
    console.log('Current sheet last column:', sheet.getLastColumn());
    
    // Check what headers exist in row 1 before doing anything
    if (sheet.getLastRow() > 0) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      console.log('Current headers in row 1:', headers);
    }
    
    // Set up dropdown validation for attendance column (Column G)
    setupAttendanceDropdown(sheet);
    
    // NEVER TOUCH ROW 1 - Only clear data rows (row 2 and below)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      console.log('Clearing data rows 2 to', lastRow);
      // Only clear the data content, not the entire rows
      // This preserves any formatting or formulas in the header row
      const dataRows = lastRow - 1;
      console.log('Clearing', dataRows, 'data rows, preserving row 1 completely');
      sheet.getRange(2, 1, dataRows, sheet.getLastColumn()).clearContent();
      console.log('Data rows content cleared, headers and formatting preserved');
    } else {
      console.log('No data rows to clear');
    }
    
    // Add all data starting from row 2
    if (onboardings && onboardings.length > 0) {
      console.log('=== ADDING DATA ===');
      console.log('Sample onboarding object:', JSON.stringify(onboardings[0]));
      console.log('Attendance value in first onboarding:', onboardings[0]?.attendance);
      
      const rows = onboardings.map(onboarding => {
        const row = [
          onboarding.date || '',                    // Column A
          onboarding.employeeName || '',            // Column B  
          onboarding.clientName || '',              // Column C
          onboarding.accountNumber || '',           // Column D
          onboarding.sessionNumber || 1,           // Column E
          new Date().toISOString(),                 // Column F - SYNCED AT
          onboarding.attendance || 'pending'       // Column G - ATTENDANCE
        ];
        console.log('Row being created:', row);
        console.log('Attendance in this row (index 6):', row[6]);
        return row;
      });
      
      console.log('Adding', rows.length, 'data rows starting at row 2');
      console.log('Sample complete row:', rows[0]);
      console.log('Column G (attendance) in sample row:', rows[0][6]);
      
      // Set data starting from row 2, only columns A-G to match our data
      sheet.getRange(2, 1, rows.length, 7).setValues(rows);
      console.log('Data rows added successfully');
      
      // Verify what was actually written
      if (rows.length > 0) {
        const writtenData = sheet.getRange(2, 1, 1, 7).getValues()[0];
        console.log('First row actually written to sheet:', writtenData);
        console.log('Attendance column (G) actually contains:', writtenData[6]);
      }
    } else {
      console.log('No onboardings to add');
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: `Synced ${onboardings.length} records`,
        syncedCount: onboardings.length
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in syncAllRows:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function setupAttendanceDropdown(sheet) {
  try {
    console.log('=== SETTING UP ATTENDANCE DROPDOWN ===');
    
    // Define the attendance options
    const attendanceOptions = ['pending', 'completed', 'cancelled', 'rescheduled', 'no-show'];
    
    // Create data validation rule
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(attendanceOptions, true) // true = show dropdown
      .setAllowInvalid(false) // Don't allow other values
      .setHelpText('Select attendance status: pending, completed, cancelled, rescheduled, or no-show')
      .build();
    
    // Apply validation to the entire column G (attendance column)
    // Start from row 2 (skip header) and apply to 1000 rows
    const attendanceRange = sheet.getRange('G2:G1000');
    attendanceRange.setDataValidation(rule);
    
    console.log('✅ Attendance dropdown validation applied to column G');
    console.log('📋 Dropdown options:', attendanceOptions);
    
  } catch (error) {
    console.error('❌ Error setting up attendance dropdown:', error);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Manual headers script working' }))
    .setMimeType(ContentService.MimeType.JSON);
}