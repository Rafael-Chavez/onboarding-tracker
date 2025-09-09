// Google Apps Script Web App integration
const WEB_APP_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL

export class GoogleSheetsService {
  // Use form submission to bypass CORS
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

      // Handle iframe load
      iframe.onload = () => {
        setTimeout(() => {
          document.body.removeChild(form)
          document.body.removeChild(iframe)
          resolve({ success: true, message: 'Data submitted successfully' })
        }, 1000)
      }

      iframe.onerror = () => {
        document.body.removeChild(form)
        document.body.removeChild(iframe)
        reject(new Error('Failed to submit data'))
      }

      form.submit()
    })
  }

  static async appendOnboarding(onboarding) {
    if (!WEB_APP_URL) {
      console.warn('Google Apps Script Web App URL not configured')
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      const result = await this.submitFormData('append', { onboarding })
      return result
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error)
      return { success: false, error: error.message }
    }
  }

  static async syncAllOnboardings(onboardings) {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      const result = await this.submitFormData('syncAll', { onboardings })
      return { ...result, syncedCount: onboardings.length }
    } catch (error) {
      console.error('Error syncing all data to Google Sheets:', error)
      return { success: false, error: error.message }
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