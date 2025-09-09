// Google Apps Script Web App integration
const WEB_APP_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL

export class GoogleSheetsService {
  // Use fetch with proper error handling
  static async submitData(action, data) {
    try {
      const formData = new FormData()
      formData.append('action', action)
      formData.append('data', JSON.stringify(data))

      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // Required for Google Apps Script
      })

      // With no-cors mode, we can't read the response directly
      // So we assume success if no error was thrown
      return { 
        success: true, 
        message: 'Data submitted successfully to Google Sheets' 
      }
    } catch (error) {
      console.error('Error submitting data:', error)
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
      // For test, we'll try a simple GET request with no-cors mode
      const response = await fetch(WEB_APP_URL, {
        method: 'GET',
        mode: 'no-cors'
      })

      // With no-cors mode, we can't read the response, so we assume success
      return { 
        success: true, 
        message: 'Connection test sent (CORS-safe mode). Check your Google Sheet to verify data is being saved.' 
      }
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error)
      return { success: false, error: error.message }
    }
  }
}