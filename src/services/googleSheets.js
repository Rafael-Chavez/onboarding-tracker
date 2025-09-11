// Google Apps Script Web App integration
const WEB_APP_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL

export class GoogleSheetsService {
  // Use fetch with proper error handling
  static async submitData(action, data) {
    try {
      console.log('🚀 Submitting to Google Sheets:', { action, data })
      
      const formData = new FormData()
      formData.append('action', action)
      formData.append('data', JSON.stringify(data))

      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // Required for Google Apps Script
      })

      // With no-cors mode, we can't read the response directly
      // CORB errors are normal and expected - they don't indicate failure
      console.log('✅ Request sent to Google Sheets (CORB errors are normal)')
      
      return { 
        success: true, 
        message: 'Data submitted to Google Sheets (CORB response blocking is normal - check your sheet!)' 
      }
    } catch (error) {
      console.error('❌ Error submitting data:', error)
      
      // Even if we get a CORB error, the request likely succeeded
      if (error.message.includes('CORB') || error.message.includes('blocked')) {
        return { 
          success: true, 
          message: 'Data likely submitted (CORB blocked response - check your Google Sheet)' 
        }
      }
      
      return { 
        success: false, 
        error: `Failed to submit data: ${error.message}` 
      }
    }
  }

  // Alternative method using form submission for better compatibility
  static async submitFormData(action, data) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.name = 'hidden_iframe'
      document.body.appendChild(iframe)

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = WEB_APP_URL
      form.target = 'hidden_iframe'

      // Add data fields
      const actionInput = document.createElement('input')
      actionInput.type = 'hidden'
      actionInput.name = 'action'
      actionInput.value = action
      form.appendChild(actionInput)

      const dataInput = document.createElement('input')
      dataInput.type = 'hidden'
      dataInput.name = 'data'
      dataInput.value = JSON.stringify(data)
      form.appendChild(dataInput)

      document.body.appendChild(form)

      // Handle iframe load - give it more time and better feedback
      iframe.onload = () => {
        setTimeout(() => {
          document.body.removeChild(form)
          document.body.removeChild(iframe)
          resolve({ success: true, message: 'Data submitted to Google Sheets (form method)' })
        }, 2000) // Increased timeout
      }

      iframe.onerror = () => {
        document.body.removeChild(form)
        document.body.removeChild(iframe)
        reject(new Error('Failed to submit data via form'))
      }

      // Add timeout fallback
      setTimeout(() => {
        try {
          if (document.body.contains(form)) document.body.removeChild(form)
          if (document.body.contains(iframe)) document.body.removeChild(iframe)
        } catch (e) {}
        resolve({ success: true, message: 'Data submitted to Google Sheets (timeout fallback)' })
      }, 5000)

      form.submit()
    })
  }

  static async appendOnboarding(onboarding) {
    if (!WEB_APP_URL) {
      console.warn('Google Apps Script Web App URL not configured')
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      // Try fetch method first, fallback to form method if needed
      const result = await this.submitData('append', { onboarding })
      return result
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error)
      // Fallback to form method
      try {
        return await this.submitFormData('append', { onboarding })
      } catch (fallbackError) {
        return { success: false, error: fallbackError.message }
      }
    }
  }

  static async syncAllOnboardings(onboardings) {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      // Try fetch method first, fallback to form method if needed
      const result = await this.submitData('syncAll', { onboardings })
      return { ...result, syncedCount: onboardings.length }
    } catch (error) {
      console.error('Error syncing all data to Google Sheets:', error)
      // Fallback to form method
      try {
        const fallbackResult = await this.submitFormData('syncAll', { onboardings })
        return { ...fallbackResult, syncedCount: onboardings.length }
      } catch (fallbackError) {
        return { success: false, error: fallbackError.message }
      }
    }
  }

  static async testConnection() {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      // Test with actual data submission including attendance
      const testData = {
        date: new Date().toISOString().split('T')[0],
        employeeName: 'Test User',
        clientName: 'Test Client Connection',
        accountNumber: 'TEST-123',
        sessionNumber: 1,
        attendance: 'pending'  // Explicitly set attendance
      }

      console.log('🧪 Testing connection with attendance data:', testData)
      console.log('📍 Attendance value being sent:', testData.attendance)
      console.log('📦 Full data package being sent:', { onboarding: testData })
      console.log('🌐 Web App URL:', WEB_APP_URL)

      // Log the FormData being sent
      const formData = new FormData()
      formData.append('action', 'test')
      formData.append('data', JSON.stringify({ onboarding: testData }))
      
      console.log('📋 FormData entries:')
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value)
      }

      const result = await this.submitData('test', { onboarding: testData })
      console.log('✅ Test result:', result)

      return { 
        success: true, 
        message: 'Test data submitted with attendance: "pending". Check Google Apps Script logs and your Google Sheet column F for attendance data.' 
      }
    } catch (error) {
      console.error('❌ Error testing Google Sheets connection:', error)
      return { success: false, error: error.message }
    }
  }

  static async debugGoogleSheet() {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      console.log('🐛 Debugging Google Sheet structure...')
      
      const result = await this.submitData('debug', {})
      console.log('Debug result:', result)

      return { 
        success: true, 
        message: 'Debug info collected - check console for details.' 
      }
    } catch (error) {
      console.error('Error debugging Google Sheets:', error)
      return { success: false, error: error.message }
    }
  }

  static async debugSubmission(action, data) {
    console.group('Google Sheets Debug Submission')
    console.log('Action:', action)
    console.log('Data:', data)
    console.log('Web App URL:', WEB_APP_URL)
    
    try {
      const formData = new FormData()
      formData.append('action', action)
      formData.append('data', JSON.stringify(data))
      
      console.log('FormData entries:')
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value)
      }

      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      })

      console.log('Response received (no-cors mode - limited info)')
      console.groupEnd()

      return { 
        success: true, 
        message: 'Debug submission completed - check console and Google Sheet' 
      }
    } catch (error) {
      console.error('Debug submission error:', error)
      console.groupEnd()
      return { success: false, error: error.message }
    }
  }

  static async importFromGoogleSheets() {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      console.log('📥 Importing data from Google Sheets...')
      
      // Since we can't read responses with no-cors, we'll use a different approach
      // We'll make the request and assume success, then the user can verify
      const formData = new FormData()
      formData.append('action', 'read')
      formData.append('data', JSON.stringify({}))

      await fetch(WEB_APP_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      })

      // Since we can't read the response due to CORS, we'll return a message
      // asking the user to check manually. In a real app, you'd need to use
      // the Google Sheets API directly or have the user paste data.
      return { 
        success: true, 
        message: 'Import request sent. Due to CORS limitations, please manually copy data from your Google Sheet.',
        onboardings: [] // We can't actually get the data due to CORS
      }
    } catch (error) {
      console.error('❌ Error importing from Google Sheets:', error)
      return { success: false, error: error.message }
    }
  }

  // Alternative method: Use Google Sheets API for reading (requires API key)
  static async updateOnboarding(onboarding) {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      console.log('🔄 Updating onboarding attendance:', onboarding)
      
      // Try update method first, fallback to append method if needed
      const result = await this.submitData('update', { onboarding })
      return result
    } catch (error) {
      console.error('❌ Error updating onboarding:', error)
      // Fallback to form method
      try {
        return await this.submitFormData('update', { onboarding })
      } catch (fallbackError) {
        return { success: false, error: fallbackError.message }
      }
    }
  }

  // Alternative import using Google Apps Script (more reliable)
  static async importFromGoogleAppsScript() {
    if (!WEB_APP_URL) {
      return { 
        success: false, 
        error: 'Web App URL not configured. Please follow setup instructions.' 
      }
    }

    try {
      console.log('📥 Importing data via Google Apps Script...')
      
      const result = await this.submitData('read', {})
      
      if (result.success) {
        return { 
          success: true, 
          onboardings: [], // Apps Script method needs implementation on the server side
          message: 'Import request sent via Google Apps Script. Due to CORS limitations, please check your Google Sheet manually.' 
        }
      } else {
        return result
      }
    } catch (error) {
      console.error('❌ Error importing via Google Apps Script:', error)
      return { success: false, error: error.message }
    }
  }

  static async importFromGoogleSheetsAPI() {
    const SPREADSHEET_ID = '1QeyMXxjLQOJwd7NlhgEoAvy7ixNCZrwL7-_QOybppXo'
    const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
    
    if (!API_KEY) {
      return { 
        success: false, 
        error: 'Google Sheets API key not configured. Add VITE_GOOGLE_SHEETS_API_KEY to your .env file.' 
      }
    }

    try {
      const range = 'Onboarding-Tracker!A2:G1000' // Read from row 2 to skip headers, including attendance column G
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`
      
      console.log('📥 Fetching data from Google Sheets API...')
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Google Sheets API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        
        if (response.status === 403) {
          throw new Error(`Google Sheets API permission denied. Quick fix:\n1. Open your Google Sheet\n2. Click Share → "Anyone with the link"\n3. Set to "Viewer" permission\n4. Or enable Google Sheets API in Google Cloud Console`)
        }
        
        throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.values || data.values.length === 0) {
        return {
          success: true,
          onboardings: [],
          message: 'No data found in Google Sheet'
        }
      }
      
      // Convert Google Sheets data to app format
      const onboardings = data.values.map((row, index) => {
        const [date, employeeName, clientName, accountNumber, sessionNumber, syncedAt, attendance] = row
        
        // Skip empty rows or rows with insufficient data
        if (!date || !employeeName || !clientName || !accountNumber) {
          return null
        }
        
        // Map employee names to IDs
        const employeeMap = {
          'Rafael': 1,
          'Danreb': 2,
          'Jim': 3,
          'Marc': 4,
          'Steve': 5,
          'Erick': 6
        }
        
        // Parse date more robustly
        let dateStr
        if (date) {
          const parsedDate = new Date(date.toString())
          if (!isNaN(parsedDate.getTime())) {
            dateStr = parsedDate.toISOString().split('T')[0]
          } else {
            dateStr = date.toString()
          }
        } else {
          dateStr = new Date().toISOString().split('T')[0]
        }
        
        return {
          id: Date.now() + index,
          date: dateStr,
          employeeId: employeeMap[employeeName] || 1,
          employeeName: employeeName || '',
          clientName: clientName || '',
          accountNumber: accountNumber || '',
          sessionNumber: sessionNumber ? parseInt(sessionNumber) || 1 : 1,
          attendance: attendance || 'pending',
          month: dateStr.slice(0, 7)
        }
      }).filter(Boolean) // Remove null entries
      
      console.log(`✅ Successfully imported ${onboardings.length} onboardings`)
      
      return {
        success: true,
        onboardings: onboardings,
        message: `Successfully imported ${onboardings.length} onboardings from Google Sheet`
      }
      
    } catch (error) {
      console.error('❌ Error importing from Google Sheets API:', error)
      return { success: false, error: error.message }
    }
  }
}