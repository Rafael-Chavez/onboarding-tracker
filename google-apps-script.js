const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo';
const SHEET_NAME = 'Onboarding-Tracker';

function doPost(e) {
  try {
    // Log the incoming request for debugging
    console.log('doPost called with:', JSON.stringify({
      postData: e.postData,
      parameter: e.parameter
    }));
    
    // Parse the request - handle both JSON and form data
    let data, action;
    
    if (e.postData && e.postData.contents) {
      // JSON request
      console.log('Processing JSON request');
      data = JSON.parse(e.postData.contents);
      action = data.action;
    } else if (e.parameter) {
      // Form data request
      console.log('Processing form data request');
      action = e.parameter.action;
      data = JSON.parse(e.parameter.data || '{}');
    } else {
      throw new Error('No valid request data found');
    }
    
    console.log('Parsed action:', action);
    console.log('Parsed data:', JSON.stringify(data));
    
    // Get the spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    // Write debug info to cell H1 to verify script is running
    sheet.getRange('H1').setValue(`Last execution: ${new Date().toISOString()} - Action: ${action}`);
    
    if (action === 'append') {
      return appendOnboarding(sheet, data.onboarding);
    } else if (action === 'syncAll') {
      return syncAllOnboardings(sheet, data.onboardings);
    } else if (action === 'update') {
      return updateOnboarding(sheet, data.onboarding);
    } else if (action === 'test') {
      return appendOnboarding(sheet, data.onboarding);
    } else if (action === 'read') {
      return readAllOnboardings(sheet);
    } else if (action === 'debug') {
      return debugSheet(sheet, data);
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
    // Check if we need to update headers
    if (sheet.getLastRow() === 0) {
      // New sheet - add headers
      sheet.appendRow(['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance']);
    } else {
      // Check if we need to add attendance column to existing sheet
      const lastCol = sheet.getLastColumn();
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

      console.log('Current headers:', headers);
      console.log('Header count:', headers.length);

      // Check if attendance column is missing
      const hasAttendance = headers.some(header =>
        header && header.toString().toLowerCase().includes('attendance')
      );

      if (!hasAttendance && headers.length >= 5) {
        console.log('Adding attendance column');
        // Insert attendance column before the last column (Synced At)
        const insertPos = headers.length; // Insert at the end, then move Synced At

        if (headers[headers.length - 1] && headers[headers.length - 1].toString().includes('Synced')) {
          // Insert before Synced At column
          sheet.insertColumnBefore(lastCol);
          sheet.getRange(1, lastCol).setValue('Attendance');

          // Fill existing rows with 'pending'
          if (sheet.getLastRow() > 1) {
            const fillRange = sheet.getRange(2, lastCol, sheet.getLastRow() - 1, 1);
            fillRange.setValue('pending');
          }
        } else {
          // Just append attendance column
          sheet.getRange(1, lastCol + 1).setValue('Attendance');

          // Fill existing rows with 'pending'
          if (sheet.getLastRow() > 1) {
            const fillRange = sheet.getRange(2, lastCol + 1, sheet.getLastRow() - 1, 1);
            fillRange.setValue('pending');
          }
        }
      }
    }

    // Calculate session number by finding all existing entries for this account and determining chronological position
    let sessionNumber = onboarding.sessionNumber || 1;

    if (sheet.getLastRow() > 1) {
      // Get all existing data
      const lastRow = sheet.getLastRow();
      const dataRange = sheet.getRange(2, 1, lastRow - 1, 6);
      const allData = dataRange.getValues();

      // Filter by account number and add the new entry
      const accountNumber = (onboarding.accountNumber || '').toString().trim();
      const newDate = onboarding.date || '';

      const accountEntries = allData
        .filter(row => (row[3] || '').toString().trim() === accountNumber)
        .map(row => {
          const date = row[0] instanceof Date ? row[0].toISOString().split('T')[0] : row[0].toString();
          return { date: date };
        });

      // Add the new entry
      accountEntries.push({ date: newDate });

      // Sort chronologically
      accountEntries.sort((a, b) => a.date.localeCompare(b.date));

      // Find position of new entry
      sessionNumber = accountEntries.findIndex(entry => entry.date === newDate) + 1;

      console.log(`Calculated session number ${sessionNumber} for account ${accountNumber}`);
    }

    // Add the onboarding data
    const row = [
      onboarding.date,
      onboarding.employeeName,
      onboarding.clientName,
      onboarding.accountNumber,
      sessionNumber,
      onboarding.attendance || 'pending'
    ];

    sheet.appendRow(row);

    // After appending, we need to resort the entire sheet to maintain chronological order
    // Resort even if there's only 1 data row (getLastRow() > 1 means at least headers + 1 data row)
    if (sheet.getLastRow() > 1) {
      const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6);
      dataRange.sort({ column: 1, ascending: true }); // Sort by Date column (A)

      // After sorting, recalculate ALL session numbers to ensure consistency
      const allRows = dataRange.getValues();
      const accountSessionMap = {};

      const updatedRows = allRows.map(row => {
        const accNum = (row[3] || '').toString().trim();

        if (!accountSessionMap[accNum]) {
          accountSessionMap[accNum] = 0;
        }
        accountSessionMap[accNum]++;

        row[4] = accountSessionMap[accNum]; // Update session number
        return row;
      });

      dataRange.setValues(updatedRows);
      console.log('Resorted and recalculated all session numbers');
    }

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
    console.log('Starting syncAll with', onboardings.length, 'onboardings');

    // Clear existing data
    sheet.clear();

    // Add header row with all columns
    const headers = ['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance'];
    sheet.appendRow(headers);

    console.log('Headers added:', headers);

    // Sort onboardings chronologically by date (oldest first)
    const sortedOnboardings = onboardings.slice().sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });

    console.log('Sorted onboardings chronologically');

    // Recalculate session numbers based on account number + chronological order
    const accountSessionMap = {};
    const onboardingsWithCorrectSessions = sortedOnboardings.map((onboarding) => {
      const accountNum = (onboarding.accountNumber || '').toString().trim();

      // Initialize counter for this account if not exists
      if (!accountSessionMap[accountNum]) {
        accountSessionMap[accountNum] = 0;
      }

      // Increment and assign session number
      accountSessionMap[accountNum]++;

      return {
        ...onboarding,
        sessionNumber: accountSessionMap[accountNum]
      };
    });

    console.log('Recalculated session numbers by account');

    // Add all onboarding data
    const rows = onboardingsWithCorrectSessions.map((onboarding, index) => {
      const row = [
        onboarding.date || '',
        onboarding.employeeName || '',
        onboarding.clientName || '',
        onboarding.accountNumber || '',
        onboarding.sessionNumber || 1,
        onboarding.attendance || 'pending'
      ];
      console.log(`Row ${index + 1}:`, row);
      return row;
    });

    if (rows.length > 0) {
      console.log('Adding', rows.length, 'rows to sheet');
      const range = sheet.getRange(2, 1, rows.length, headers.length);
      range.setValues(rows);
      console.log('Data successfully written to range', range.getA1Notation());
    } else {
      console.log('No data to add');
    }

    // Set up data validation for attendance column (column F = index 6)
    console.log('Setting up attendance dropdown validation...');
    const attendanceOptions = ['pending', 'completed', 'cancelled', 'rescheduled', 'no-show'];
    const attendanceRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(attendanceOptions, true)
      .setAllowInvalid(false)
      .setHelpText('Select: pending, completed, cancelled, rescheduled, or no-show')
      .build();

    // Apply to attendance column (F) for 1000 rows
    const attendanceRange = sheet.getRange('F2:F1000');
    attendanceRange.setDataValidation(attendanceRule);
    console.log('Attendance dropdown validation applied');

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

function readAllOnboardings(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      // Only headers or empty sheet
      return ContentService
        .createTextOutput(JSON.stringify({ 
          success: true, 
          onboardings: [],
          message: 'No data found in sheet'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get all data starting from row 2 (skip headers)
    const range = sheet.getRange(2, 1, lastRow - 1, 6); // 6 columns: Date, Employee, Client Name, Account Number, Session #, Attendance
    const values = range.getValues();

    const onboardings = values.map((row, index) => {
      const [date, employeeName, clientName, accountNumber, sessionNumber, attendance] = row;
      
      // Skip empty rows
      if (!date && !employeeName && !clientName) {
        return null;
      }
      
      // Convert date to string format
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date.toString();
      
      return {
        id: Date.now() + index, // Generate unique ID
        date: dateStr,
        employeeName: employeeName ? employeeName.toString() : '',
        clientName: clientName ? clientName.toString() : '',
        accountNumber: accountNumber ? accountNumber.toString() : '',
        sessionNumber: sessionNumber ? parseInt(sessionNumber) || 1 : 1,
        attendance: attendance ? attendance.toString() : 'pending',
        month: dateStr.slice(0, 7), // Extract YYYY-MM
        // Map employee name to ID (you might want to adjust this based on your employee list)
        employeeId: getEmployeeId(employeeName)
      };
    }).filter(onboarding => onboarding !== null); // Remove null entries
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        onboardings: onboardings,
        message: `Successfully read ${onboardings.length} onboardings from sheet`
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        message: 'Failed to read data from sheet'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateOnboarding(sheet, onboarding) {
  try {
    // Find the row to update by matching date, employee, and client
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const dateCol = headers.indexOf('Date');
    const employeeCol = headers.indexOf('Employee');
    const clientCol = headers.indexOf('Client Name');
    const attendanceCol = headers.indexOf('Attendance');
    
    if (attendanceCol === -1) {
      throw new Error('Attendance column not found');
    }
    
    // Find matching row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = row[dateCol] instanceof Date ? 
        row[dateCol].toISOString().split('T')[0] : 
        row[dateCol].toString();
      
      if (rowDate === onboarding.date && 
          row[employeeCol] === onboarding.employeeName && 
          row[clientCol] === onboarding.clientName) {
        
        // Update the attendance in this row
        sheet.getRange(i + 1, attendanceCol + 1).setValue(onboarding.attendance || 'pending');
        
        return ContentService
          .createTextOutput(JSON.stringify({ 
            success: true, 
            message: 'Attendance updated successfully',
            row: i + 1
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // If no matching row found, append as new
    return appendOnboarding(sheet, onboarding);
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function debugSheet(sheet, data) {
  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    let debugInfo = {
      sheetInfo: {
        name: sheet.getName(),
        lastRow: lastRow,
        lastColumn: lastCol
      },
      headers: [],
      sampleData: [],
      receivedData: data
    };
    
    if (lastRow > 0) {
      // Get headers
      debugInfo.headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      // Get first few rows of data
      if (lastRow > 1) {
        const sampleRows = Math.min(3, lastRow - 1);
        debugInfo.sampleData = sheet.getRange(2, 1, sampleRows, lastCol).getValues();
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        debug: debugInfo
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getEmployeeId(employeeName) {
  // Map employee names to IDs based on your app's employee list
  const employees = {
    'Rafael': 1,
    'Danreb': 2,
    'Jim': 3,
    'Marc': 4,
    'Steve': 5,
    'Erick': 6
  };
  
  return employees[employeeName] || 1; // Default to 1 if not found
}