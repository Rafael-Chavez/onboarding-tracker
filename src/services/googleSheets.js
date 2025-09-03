// Google Sheets API integration
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID
const RANGE = import.meta.env.VITE_GOOGLE_SHEETS_RANGE || 'Sheet1!A:F'

const SHEETS_API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values`

export class GoogleSheetsService {
  static async appendOnboarding(onboarding) {
    if (!API_KEY || !SPREADSHEET_ID) {
      console.warn('Google Sheets API not configured')
      return { success: false, error: 'API not configured' }
    }

    try {
      const values = [[
        onboarding.date,
        onboarding.employeeName,
        onboarding.clientName,
        onboarding.accountNumber,
        onboarding.sessionNumber,
        new Date().toISOString() // Timestamp when added
      ]]

      const response = await fetch(
        `${SHEETS_API_URL}/${RANGE}:append?valueInputOption=RAW&key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please check your API key and make sure the Google Sheet is publicly accessible.'
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden. Make sure the Google Sheets API is enabled and the sheet is shared publicly.'
        } else if (response.status === 404) {
          errorMessage = 'Spreadsheet not found. Please check your spreadsheet ID.'
        }
        
        console.error('Google Sheets API Error:', errorText)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return { success: true, result }
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error)
      return { success: false, error: error.message }
    }
  }

  static async syncAllOnboardings(onboardings) {
    if (!API_KEY || !SPREADSHEET_ID) {
      return { success: false, error: 'API not configured' }
    }

    try {
      // Add header row
      const headerValues = [
        ['Date', 'Employee', 'Client Name', 'Account Number', 'Session #', 'Synced At']
      ]

      // Add all onboardings
      const dataValues = onboardings.map(onboarding => [
        onboarding.date,
        onboarding.employeeName,
        onboarding.clientName,
        onboarding.accountNumber,
        onboarding.sessionNumber,
        new Date().toISOString()
      ])

      const allValues = [...headerValues, ...dataValues]

      const response = await fetch(
        `${SHEETS_API_URL}/${RANGE}?valueInputOption=RAW&key=${API_KEY}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: allValues
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please check your API key and make sure the Google Sheet is publicly accessible.'
        } else if (response.status === 403) {
          errorMessage = 'Access forbidden. Make sure the Google Sheets API is enabled and the sheet is shared publicly.'
        } else if (response.status === 404) {
          errorMessage = 'Spreadsheet not found. Please check your spreadsheet ID.'
        }
        
        console.error('Google Sheets API Error:', errorText)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return { success: true, result, syncedCount: onboardings.length }
    } catch (error) {
      console.error('Error syncing all data to Google Sheets:', error)
      return { success: false, error: error.message }
    }
  }

  static async testConnection() {
    if (!API_KEY || !SPREADSHEET_ID) {
      return { success: false, error: 'API credentials not configured' }
    }

    try {
      const response = await fetch(
        `${SHEETS_API_URL}?key=${API_KEY}`,
        {
          method: 'GET',
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error)
      return { success: false, error: error.message }
    }
  }
}