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
    
    // ABSOLUTELY NEVER TOUCH ROW 1 - Only clear data rows (row 2 and below)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      console.log('Clearing data rows 2 to', lastRow);
      // Clear only specific columns A-G for data rows, never touching row 1
      const dataRows = lastRow - 1;
      console.log('Clearing', dataRows, 'data rows in columns A-G only, row 1 completely untouched');
      
      // Clear each column individually to be absolutely sure we don't touch row 1
      for (let col = 1; col <= 7; col++) {
        const range = sheet.getRange(2, col, dataRows, 1);
        range.clearContent();
        console.log(`Cleared column ${col} (rows 2-${lastRow})`);
      }
      
      console.log('Data rows content cleared, row 1 completely preserved');
      
      // Verify that G1 header is still intact
      const g1Value = sheet.getRange('G1').getValue();
      console.log('G1 header after clearing:', g1Value);
      if (!g1Value || g1Value.toString().trim() === '') {
        console.log('WARNING: G1 header was lost! Restoring it...');
        sheet.getRange('G1').setValue('Attendance');
      }
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
      
      // Set up dropdown validation FIRST, before writing data
      setupAttendanceDropdown(sheet);
      console.log('Dropdown validation applied before data write');
      
      // Set data starting from row 2, only columns A-G to match our data
      sheet.getRange(2, 1, rows.length, 7).setValues(rows);
      console.log('Data rows added successfully');
      
      // Verify what was actually written - check multiple rows
      if (rows.length > 0) {
        const writtenData = sheet.getRange(2, 1, Math.min(rows.length, 3), 7).getValues();
        console.log('First few rows actually written to sheet:', writtenData);
        console.log('Attendance column (G) values:');
        for (let i = 0; i < writtenData.length; i++) {
          console.log(`Row ${i + 2}: Column G = "${writtenData[i][6]}"`);
        }
        
        // Double check by reading just the attendance column
        const attendanceColumn = sheet.getRange(2, 7, Math.min(rows.length, 3), 1).getValues();
        console.log('Direct read of column G (attendance only):', attendanceColumn.flat());
      }
    } else {
      console.log('No onboardings to add');
    }
    
    // Dropdown validation was already set up before data write
    
    // Final verification - check that G1 header and G2+ data are intact
    const finalG1 = sheet.getRange('G1').getValue();
    console.log('=== FINAL VERIFICATION ===');
    console.log('Final G1 header value:', finalG1);
    
    if (onboardings && onboardings.length > 0) {
      const finalAttendanceData = sheet.getRange(2, 7, Math.min(onboardings.length, 5), 1).getValues();
      console.log('Final attendance data in G2-G6:', finalAttendanceData.flat());
      
      // Check if any attendance data is missing
      const emptyCount = finalAttendanceData.flat().filter(val => !val || val.toString().trim() === '').length;
      if (emptyCount > 0) {
        console.log(`WARNING: ${emptyCount} attendance cells are empty after sync!`);
      } else {
        console.log('✅ All attendance data successfully populated');
      }
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
    console.log('📋 Dropdown options:', attendanceOptions);
    
    // Create data validation rule
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(attendanceOptions, true) // true = show dropdown
      .setAllowInvalid(false) // Don't allow other values
      .setHelpText('Select attendance status: pending, completed, cancelled, rescheduled, or no-show')
      .build();
    
    console.log('🔧 Data validation rule created');
    
    // Apply validation to the entire column G (attendance column)
    // Start from row 2 (skip header) and apply to 1000 rows
    const attendanceRange = sheet.getRange('G2:G1000');
    console.log('🎯 Applying validation to range: G2:G1000');
    
    attendanceRange.setDataValidation(rule);
    console.log('✅ Attendance dropdown validation applied to column G');
    
    // Test if validation is working by checking a specific cell
    const testCell = sheet.getRange('G2');
    const validation = testCell.getDataValidation();
    if (validation) {
      console.log('✅ Validation confirmed on G2');
    } else {
      console.log('❌ No validation found on G2');
    }
    
  } catch (error) {
    console.error('❌ Error setting up attendance dropdown:', error);
    console.error('Error details:', error.toString());
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Manual headers script working' }))
    .setMimeType(ContentService.MimeType.JSON);
}