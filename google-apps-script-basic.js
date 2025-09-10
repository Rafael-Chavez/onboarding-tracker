const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo';
const SHEET_NAME = 'Onboarding-Tracker';

function doPost(e) {
  try {
    console.log('Script started');
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    // Create headers manually every time
    sheet.getRange('A1').setValue('Date');
    sheet.getRange('B1').setValue('Employee');
    sheet.getRange('C1').setValue('Client Name');
    sheet.getRange('D1').setValue('Account Number');
    sheet.getRange('E1').setValue('Session #');
    sheet.getRange('F1').setValue('Attendance');
    sheet.getRange('G1').setValue('Synced At');
    
    // Add a test row
    const testRow = [
      '2025-09-10',
      'Test User',
      'Test Client',
      'TEST-123',
      1,
      'pending',
      new Date().toISOString()
    ];
    
    sheet.appendRow(testRow);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Basic test completed' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Basic script is working' }))
    .setMimeType(ContentService.MimeType.JSON);
}