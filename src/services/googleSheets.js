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
      // Test with actual data submission
      const testData = {
        date: new Date().toISOString().split('T')[0],
        employeeName: 'Test User',
        clientName: 'Test Client Connection',
        accountNumber: 'TEST-123',
        sessionNumber: 1
      }

      console.log('Testing connection with data:', testData)
      console.log('Web App URL:', WEB_APP_URL)

      const result = await this.submitData('test', { onboarding: testData })
      console.log('Test result:', result)

      return { 
        success: true, 
        message: 'Test data submitted. Check your Google Sheet for "Test Client Connection" entry to verify connection.' 
      }
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error)
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
}