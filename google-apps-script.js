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
    } else if (action === 'test') {
      return appendOnboarding(sheet, data.onboarding);
    } else if (action === 'read') {
      return readAllOnboardings(sheet);
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
      sheet.appendRow(['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance', 'Synced At']);
    }
    
    // Add the onboarding data
    const row = [
      onboarding.date,
      onboarding.employeeName,
      onboarding.clientName,
      onboarding.accountNumber,
      onboarding.sessionNumber,
      onboarding.attendance || 'pending',
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
    const headers = ['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Attendance', 'Synced At'];
    sheet.appendRow(headers);
    
    // Add all onboarding data
    const rows = onboardings.map(onboarding => [
      onboarding.date,
      onboarding.employeeName,
      onboarding.clientName,
      onboarding.accountNumber,
      onboarding.sessionNumber,
      onboarding.attendance || 'pending',
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
    const range = sheet.getRange(2, 1, lastRow - 1, 7); // 7 columns: Date, Employee, Client Name, Account Number, Session #, Attendance, Synced At
    const values = range.getValues();
    
    const onboardings = values.map((row, index) => {
      const [date, employeeName, clientName, accountNumber, sessionNumber, attendance, syncedAt] = row;
      
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