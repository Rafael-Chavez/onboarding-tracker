// Google Apps Script Web App integration
const WEB_APP_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL

export class GoogleSheetsService {
  static async appendOnboarding(onboarding) {
    if (!WEB_APP_URL) {
      console.warn('Google Apps Script Web App URL not configured')
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'append',
          onboarding: onboarding
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error syncing to Google Sheets:', error)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        return { 
          success: false, 
          error: 'Network error - this is common in development due to CORS. Your data is saved locally. When deployed to Vercel, this should work fine.'
        }
      }
      return { success: false, error: error.message }
    }
  }

  static async syncAllOnboardings(onboardings) {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'syncAll',
          onboardings: onboardings
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { ...result, syncedCount: onboardings.length }
    } catch (error) {
      console.error('Error syncing all data to Google Sheets:', error)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        return { 
          success: false, 
          error: 'Network error - this is common in development due to CORS. Your data is saved locally. When deployed to Vercel, this should work fine.'
        }
      }
      return { success: false, error: error.message }
    }
  }

  static async testConnection() {
    if (!WEB_APP_URL) {
      return { success: false, error: 'Web App URL not configured. Please follow setup instructions.' }
    }

    try {
      const response = await fetch(WEB_APP_URL, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Apps Script not found. Make sure you deployed it correctly and the URL is right.' }
        } else if (response.status >= 400) {
          const text = await response.text()
          if (text.includes('doGet')) {
            return { success: false, error: 'Apps Script missing doGet function. Make sure you copied the complete code from google-apps-script.js.' }
          }
          return { success: false, error: `Apps Script error (${response.status}). Check your deployment settings.` }
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        return { 
          success: false, 
          error: 'Network error. This might be a CORS issue in development. Try the sync anyway - it might work despite this error.'
        }
      }
      return { success: false, error: error.message }
    }
  }
}