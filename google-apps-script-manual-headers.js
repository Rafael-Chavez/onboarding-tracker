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
    
    // Add data only to columns A-F, preserving G column (attendance) for manual input
    // Date | Employee | Client Name | Account Number | Session # | Synced At
    const row = [
      onboarding.date || '',                    // Column A
      onboarding.employeeName || '',            // Column B  
      onboarding.clientName || '',              // Column C
      onboarding.accountNumber || '',           // Column D
      onboarding.sessionNumber || 1,           // Column E
      new Date().toISOString()                  // Column F - SYNCED AT
      // Column G (Attendance) is preserved - not overwritten
    ];
    
    console.log('Row array to add (A-F only):', row);
    console.log('Column G (Attendance) will be preserved and not overwritten');
    
    // Append only columns A-F, leaving G column untouched for manual input
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
    range.setValues([row]);
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
    
    // PRESERVE G COLUMN - Only clear columns A-F, keep G column (attendance) for manual input
    const lastRow = sheet.getLastRow();
    let existingAttendanceData = [];
    
    if (lastRow > 1) {
      console.log('Preserving G column attendance data and clearing A-F columns only');
      
      // First, save existing attendance data from column G
      if (lastRow > 1) {
        const attendanceRange = sheet.getRange(2, 7, lastRow - 1, 1);
        existingAttendanceData = attendanceRange.getValues().flat();
        console.log('Saved existing attendance data:', existingAttendanceData.slice(0, 5));
      }
      
      // Clear only columns A-F for data rows, preserving row 1 and column G
      const dataRows = lastRow - 1;
      console.log('Clearing', dataRows, 'data rows in columns A-F only, preserving G column');
      
      // Clear columns A-F individually, never touching G
      for (let col = 1; col <= 6; col++) {
        const range = sheet.getRange(2, col, dataRows, 1);
        range.clearContent();
        console.log(`Cleared column ${col} (rows 2-${lastRow})`);
      }
      
      console.log('Data rows A-F cleared, row 1 and column G completely preserved');
      
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
      
      const rows = onboardings.map((onboarding, index) => {
        const row = [
          onboarding.date || '',                    // Column A
          onboarding.employeeName || '',            // Column B  
          onboarding.clientName || '',              // Column C
          onboarding.accountNumber || '',           // Column D
          onboarding.sessionNumber || 1,           // Column E
          new Date().toISOString()                  // Column F - SYNCED AT
          // Column G (Attendance) preserved from existing data or left empty for manual input
        ];
        console.log('Row being created (A-F only):', row);
        console.log('Column G will be preserved from existing data or left empty for manual input');
        return row;
      });
      
      console.log('Adding', rows.length, 'data rows starting at row 2 (columns A-F only)');
      console.log('Sample complete row (A-F):', rows[0]);
      console.log('Column G will be preserved/left empty for manual input');
      
      // Set up dropdown validation FIRST, before writing data
      setupAttendanceDropdown(sheet);
      console.log('Dropdown validation applied before data write');
      
      // Set data starting from row 2, only columns A-F to preserve column G
      sheet.getRange(2, 1, rows.length, 6).setValues(rows);
      
      // Restore existing attendance data where it exists
      if (existingAttendanceData.length > 0) {
        console.log('Restoring existing attendance data to column G');
        const maxRows = Math.min(rows.length, existingAttendanceData.length);
        const attendanceToRestore = existingAttendanceData.slice(0, maxRows);
        
        if (attendanceToRestore.length > 0) {
          const restoreRange = sheet.getRange(2, 7, attendanceToRestore.length, 1);
          restoreRange.setValues(attendanceToRestore.map(value => [value]));
          console.log('Restored', attendanceToRestore.length, 'attendance values');
        }
      }
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