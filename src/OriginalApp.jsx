import { useState, useEffect, useMemo, useCallback } from 'react'
import { GoogleSheetsService } from './services/googleSheets'
import { SupabaseService } from './services/supabase'
import { debugOnboardingStats, debugLocalStorage } from './services/debugStats'
import NightShiftBanner from './components/NightShiftBanner'
import PendingApprovalsAlert from './components/PendingApprovalsAlert'
import MonthlyStatsOverview from './components/MonthlyStatsOverview'

// Make debug functions globally available
if (typeof window !== 'undefined') {
  window.debugOnboardingStats = debugOnboardingStats
  window.debugLocalStorage = debugLocalStorage
}

function App() {
  const [employees] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
  ])
  
  // Load data from localStorage
  const loadFromStorage = useCallback((key, defaultValue) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error)
      return defaultValue
    }
  }, [])

  // Save data to localStorage
  const saveToStorage = useCallback((key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error)
    }
  }, [])

  const [onboardings, setOnboardings] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [clientName, setClientName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  // Removed attendance state - will be managed manually in Google Sheets
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [overviewDate, setOverviewDate] = useState(new Date())
  const [syncStatus, setSyncStatus] = useState({ isLoading: false, message: '', type: '' })
  const [autoSync, setAutoSync] = useState(() => loadFromStorage('autoSync', true))

  // Load onboardings from Supabase on mount
  useEffect(() => {
    const fetchOnboardings = async () => {
      const result = await SupabaseService.getAllOnboardings()
      if (result.success) {
        setOnboardings(result.onboardings)
      } else {
        console.error('Error loading onboardings:', result.error)
      }
    }

    fetchOnboardings()

    // Subscribe to real-time changes
    const subscription = SupabaseService.subscribeToOnboardings((payload) => {
      console.log('Real-time update detected:', payload)
      fetchOnboardings()
    })

    return () => {
      SupabaseService.unsubscribe(subscription)
    }
  }, [])

  // Save autoSync setting to localStorage whenever it changes
  useEffect(() => {
    saveToStorage('autoSync', autoSync)
  }, [autoSync, saveToStorage])

  const addOnboarding = useCallback(async () => {
    if (selectedEmployee && clientName.trim() && accountNumber.trim()) {
      // Find existing onboardings for this client to determine session number
      const clientOnboardings = onboardings.filter(ob =>
        ob.clientName.toLowerCase() === clientName.trim().toLowerCase()
      )
      const sessionNumber = clientOnboardings.length + 1

      const newOnboarding = {
        employeeId: parseInt(selectedEmployee),
        employeeName: employees.find(e => e.id === parseInt(selectedEmployee))?.name,
        clientName: clientName.trim(),
        accountNumber: accountNumber.trim(),
        sessionNumber,
        attendance: 'pending',
        date: selectedDate.toISOString().split('T')[0],
        month: selectedDate.toISOString().slice(0, 7)
      }

      // Save to Supabase
      const result = await SupabaseService.createOnboarding(newOnboarding)

      if (result.success) {
        // Clear form
        setClientName('')
        setAccountNumber('')

        // Auto-sync to Google Sheets if enabled
        if (autoSync) {
          setSyncStatus({ isLoading: true, message: 'Auto-syncing to Google Sheets...', type: '' })

          try {
            await GoogleSheetsService.appendOnboarding({
              ...newOnboarding,
              id: result.onboarding.id
            })

            setSyncStatus({
              isLoading: false,
              message: 'Successfully synced to Google Sheets!',
              type: 'success'
            })
            setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 2000)
          } catch (error) {
            setSyncStatus({
              isLoading: false,
              message: `Auto-sync to Sheets failed: ${error.message}`,
              type: 'error'
            })
            setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 4000)
          }
        }

        // Real-time subscription will update the UI automatically
      } else {
        setSyncStatus({
          isLoading: false,
          message: `Failed to add session: ${result.error}`,
          type: 'error'
        })
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 4000)
      }
    }
  }, [selectedEmployee, clientName, accountNumber, onboardings, employees, selectedDate, autoSync])

  const deleteOnboarding = useCallback(async (id) => {
    const result = await SupabaseService.deleteOnboarding(id)
    if (!result.success) {
      console.error('Error deleting onboarding:', result.error)
      setSyncStatus({
        isLoading: false,
        message: `Failed to delete: ${result.error}`,
        type: 'error'
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000)
    }
    // Real-time subscription will update the UI automatically
  }, [])

  const approveCompletion = useCallback(async (id) => {
    setSyncStatus({ isLoading: true, message: 'Approving completion...', type: '' })

    const result = await SupabaseService.approveCompletion(id)

    if (result.success) {
      setSyncStatus({
        isLoading: false,
        message: '✓ Session marked as completed!',
        type: 'success'
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 2000)

      // Auto-sync to Google Sheets if enabled
      if (autoSync) {
        try {
          await GoogleSheetsService.updateOnboarding(result.onboarding)
        } catch (error) {
          console.error('Error syncing to Google Sheets:', error)
        }
      }
    } else {
      setSyncStatus({
        isLoading: false,
        message: `✗ Error approving: ${result.error}`,
        type: 'error'
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000)
    }
  }, [autoSync])

  const rejectCompletion = useCallback(async (id) => {
    setSyncStatus({ isLoading: true, message: 'Rejecting completion...', type: '' })

    const result = await SupabaseService.rejectCompletion(id)

    if (result.success) {
      setSyncStatus({
        isLoading: false,
        message: '✓ Session marked as pending',
        type: 'success'
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 2000)

      // Auto-sync to Google Sheets if enabled
      if (autoSync) {
        try {
          await GoogleSheetsService.updateOnboarding(result.onboarding)
        } catch (error) {
          console.error('Error syncing to Google Sheets:', error)
        }
      }
    } else {
      setSyncStatus({
        isLoading: false,
        message: `✗ Error rejecting: ${result.error}`,
        type: 'error'
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000)
    }
  }, [autoSync])

  const updateOnboardingAttendance = useCallback(async (id, newAttendance) => {
    // Update in Supabase
    const result = await SupabaseService.updateOnboardingStatus(id, newAttendance)

    if (result.success) {
      // Auto-sync to Google Sheets if enabled
      if (autoSync) {
        try {
          console.log('🔄 Syncing attendance update to Google Sheets:', result.onboarding)
          await GoogleSheetsService.updateOnboarding({
            id: result.onboarding.id,
            employeeId: result.onboarding.employeeId,
            employeeName: result.onboarding.employeeName,
            clientName: result.onboarding.clientName,
            accountNumber: result.onboarding.accountNumber,
            sessionNumber: result.onboarding.sessionNumber,
            date: result.onboarding.date,
            month: result.onboarding.month,
            attendance: result.onboarding.attendance
          })
        } catch (error) {
          console.error('Error syncing attendance update to Sheets:', error)
        }
      }
      // Real-time subscription will update the UI automatically
    } else {
      console.error('Error updating attendance:', result.error)
    }
  }, [autoSync])

  // Calendar helper functions
  const getDaysInMonth = useCallback((date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }, [])

  const getFirstDayOfMonth = useCallback((date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }, [])

  const getOnboardingsForDate = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return onboardings.filter(ob => ob.date === dateStr)
  }, [onboardings])

  const selectedDateOnboardings = useMemo(() => {
    return getOnboardingsForDate(selectedDate)
  }, [getOnboardingsForDate, selectedDate])

  const formatDateForDisplay = useCallback((date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }, [])

  const formatSelectedDate = useCallback((date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }, [])

  const navigateMonth = useCallback((direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }, [])

  const navigateOverviewMonth = useCallback((direction) => {
    setOverviewDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }, [])

  const getMonthlyCompletionStats = useCallback((date) => {
    const monthStr = date.toISOString().slice(0, 7)
    const monthOnboardings = onboardings.filter(ob => ob.month === monthStr)

    const totalSessions = monthOnboardings.length
    const completed = monthOnboardings.filter(ob => ob.attendance === 'completed').length
    const pending = monthOnboardings.filter(ob => ob.attendance === 'pending').length
    const cancelled = monthOnboardings.filter(ob => ob.attendance === 'cancelled').length
    const rescheduled = monthOnboardings.filter(ob => ob.attendance === 'rescheduled').length
    const noShow = monthOnboardings.filter(ob => ob.attendance === 'no-show').length

    // Group by employee
    const byEmployee = employees.map(emp => {
      const empOnboardings = monthOnboardings.filter(ob => ob.employeeId === emp.id)
      const empCompleted = empOnboardings.filter(ob => ob.attendance === 'completed').length
      return {
        ...emp,
        total: empOnboardings.length,
        completed: empCompleted
      }
    }).filter(emp => emp.total > 0)

    return {
      totalSessions,
      completed,
      pending,
      cancelled,
      rescheduled,
      noShow,
      byEmployee,
      completionRate: totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 0
    }
  }, [onboardings, employees])

  const monthlyStats = useMemo(() => {
    return getMonthlyCompletionStats(overviewDate)
  }, [getMonthlyCompletionStats, overviewDate])

  const getEmployeeColor = useCallback((employeeId) => {
    return employees.find(e => e.id === employeeId)?.color || 'from-gray-500 to-gray-600'
  }, [employees])

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const thisMonth = onboardings.filter(ob => ob.month === currentMonth).length
    const thisMonthCompleted = onboardings.filter(ob =>
      ob.month === currentMonth && ob.attendance === 'completed'
    ).length
    const total = onboardings.length
    return { thisMonth, thisMonthCompleted, total }
  }, [onboardings])

  const getAllCompletedStats = useCallback((date = new Date()) => {
    const monthStr = date.toISOString().slice(0, 7)
    return employees.map(emp => {
      const completedCount = onboardings.filter(ob =>
        ob.employeeId === emp.id && ob.attendance === 'completed' && ob.month === monthStr
      ).length
      return {
        ...emp,
        completed: completedCount
      }
    }).filter(emp => emp.completed > 0) // Only show employees with completions
  }, [onboardings, employees])

  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const [completedStatsDate, setCompletedStatsDate] = useState(new Date())
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState(null)
  const [employeeHistoryViewMode, setEmployeeHistoryViewMode] = useState('all') // 'all' or 'monthly'
  const [employeeHistoryMonth, setEmployeeHistoryMonth] = useState(new Date())

  const navigateCompletedStatsMonth = useCallback((direction) => {
    setCompletedStatsDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }, [])

  const getEmployeeSessions = useCallback((employeeId, viewMode = 'all', monthDate = null) => {
    let filtered = onboardings.filter(ob => ob.employeeId === employeeId)

    // Apply monthly filter if in monthly mode
    if (viewMode === 'monthly' && monthDate) {
      const monthStr = monthDate.toISOString().slice(0, 7)
      filtered = filtered.filter(ob => ob.month === monthStr)
    }

    return filtered
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date descending (newest first)
      .map(ob => ({
        ...ob,
        formattedDate: new Date(ob.date).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }))
  }, [onboardings])

  const navigateEmployeeHistoryMonth = useCallback((direction) => {
    setEmployeeHistoryMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }, [])

  const syncToGoogleSheets = useCallback(async () => {
    setSyncStatus({ isLoading: true, message: 'Syncing to Google Sheets (attendance preserved)...', type: '' })
    
    try {
      const result = await GoogleSheetsService.syncAllOnboardings(onboardings)
      
      if (result.success) {
        setSyncStatus({ 
          isLoading: false, 
          message: `Successfully synced ${result.syncedCount} onboardings to Google Sheets!`, 
          type: 'success' 
        })
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000)
      } else {
        setSyncStatus({ 
          isLoading: false, 
          message: `Sync failed: ${result.error}`, 
          type: 'error' 
        })
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000)
      }
    } catch (error) {
      setSyncStatus({ 
        isLoading: false, 
        message: `Sync failed: ${error.message}`, 
        type: 'error' 
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000)
    }
  }, [onboardings])

  const testSheetsConnection = useCallback(async () => {
    setSyncStatus({ isLoading: true, message: 'Testing Google Sheets connection...', type: '' })
    
    try {
      const result = await GoogleSheetsService.testConnection()
      
      if (result.success) {
        setSyncStatus({ 
          isLoading: false, 
          message: 'Google Sheets connection successful!', 
          type: 'success' 
        })
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000)
      } else {
        setSyncStatus({ 
          isLoading: false, 
          message: `Connection failed: ${result.error}`, 
          type: 'error' 
        })
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000)
      }
    } catch (error) {
      setSyncStatus({ 
        isLoading: false, 
        message: `Connection test failed: ${error.message}`, 
        type: 'error' 
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000)
    }
  }, [])

  const importFromGoogleSheets = useCallback(async () => {
    setSyncStatus({ isLoading: true, message: 'Importing data from Google Sheets...', type: '' })

    try {
      // Try API method first, fallback to Apps Script method
      let result = await GoogleSheetsService.importFromGoogleSheetsAPI()

      // If API method fails with 403, try alternative approach
      if (!result.success && result.error.includes('403')) {
        console.log('🔄 API method failed, trying alternative approach...')
        setSyncStatus({ isLoading: true, message: 'API access denied, trying alternative method...', type: '' })
        result = await GoogleSheetsService.importFromGoogleAppsScript()
      }

      if (result.success) {
        // If we got data, merge it with existing data in Supabase
        if (result.onboardings && result.onboardings.length > 0) {
          // Create a map of existing onboardings to avoid duplicates
          const existingMap = new Map()
          onboardings.forEach(ob => {
            const key = `${ob.date}-${ob.clientName}-${ob.accountNumber}`
            existingMap.set(key, ob)
          })

          // Add imported onboardings that don't already exist
          const newOnboardings = []
          result.onboardings.forEach(importedOb => {
            const key = `${importedOb.date}-${importedOb.clientName}-${importedOb.accountNumber}`
            if (!existingMap.has(key)) {
              newOnboardings.push(importedOb)
            }
          })

          if (newOnboardings.length > 0) {
            // Import to Supabase
            let successCount = 0
            let errorCount = 0

            for (const onboarding of newOnboardings) {
              const importResult = await SupabaseService.createOnboarding(onboarding)
              if (importResult.success) {
                successCount++
              } else {
                errorCount++
                console.error('Failed to import:', onboarding, importResult.error)
              }
            }

            setSyncStatus({
              isLoading: false,
              message: `Successfully imported ${successCount} new onboarding${successCount !== 1 ? 's' : ''} from Google Sheets!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
              type: 'success'
            })
            // Real-time subscription will update the UI automatically
          } else {
            setSyncStatus({
              isLoading: false,
              message: 'No new data to import - all onboardings already exist.',
              type: 'success'
            })
          }
        } else {
          setSyncStatus({
            isLoading: false,
            message: result.message || 'No data found in Google Sheet',
            type: 'success'
          })
        }

        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000)
      } else {
        setSyncStatus({
          isLoading: false,
          message: `Import failed: ${result.error}`,
          type: 'error'
        })
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000)
      }
    } catch (error) {
      setSyncStatus({
        isLoading: false,
        message: `Import failed: ${error.message}`,
        type: 'error'
      })
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000)
    }
  }, [onboardings])

  const pendingApprovals = useMemo(() => {
    return onboardings.filter(ob => ob.attendance === 'pending_approval')
  }, [onboardings])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      {/* Header */}
      <div className="w-full mb-6">
        <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Employee Onboarding Tracker
              </h1>
              <div className="flex items-center gap-6 text-sm text-blue-200">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  {stats.thisMonthCompleted}/{stats.thisMonth} sessions completed
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {stats.total} total
                </span>
              </div>
            </div>

            {/* Sync Status Message */}
            {syncStatus.message && (
              <div className={`backdrop-blur-sm rounded-lg border p-3 transition-all duration-300 ${
                syncStatus.type === 'success'
                  ? 'bg-green-500/20 border-green-400/30 text-green-100'
                  : syncStatus.type === 'error'
                  ? 'bg-red-500/20 border-red-400/30 text-red-100'
                  : 'bg-blue-500/20 border-blue-400/30 text-blue-100'
              }`}>
                <div className="flex items-center gap-2">
                  {syncStatus.type === 'success' && (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {syncStatus.type === 'error' && (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">{syncStatus.message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Night Shift Tracker */}
      <NightShiftBanner />

      {/* Pending Completion Approvals Alert */}
      <PendingApprovalsAlert
        pendingApprovals={pendingApprovals}
        onApprove={approveCompletion}
        onReject={rejectCompletion}
      />

      {/* Show All Completed Stats Button */}
      <div className="w-full mb-6">
        <button
          onClick={() => setShowAllCompleted(!showAllCompleted)}
          className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all duration-200 hover:scale-[1.02] shadow-2xl hover:shadow-green-500/25"
        >
          {showAllCompleted ? 'Hide' : 'Show'} Completed Stats
        </button>
      </div>

      {/* Employee Session History Modal */}
      {selectedEmployeeHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {(() => {
              const employee = employees.find(e => e.id === selectedEmployeeHistory)
              const sessions = getEmployeeSessions(selectedEmployeeHistory, employeeHistoryViewMode, employeeHistoryMonth)

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${employee?.color} flex items-center justify-center shadow-lg`}>
                        <span className="text-white font-bold text-2xl">
                          {employee?.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{employee?.name}'s Sessions</h2>
                        <p className="text-blue-200 text-sm">{sessions.length} {employeeHistoryViewMode === 'monthly' ? 'sessions this month' : 'total sessions'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEmployeeHistory(null)
                        setEmployeeHistoryViewMode('all')
                        setEmployeeHistoryMonth(new Date())
                      }}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* View Mode Selector and Month Navigation */}
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="text-white text-sm font-medium mb-2 block">View Mode</label>
                        <select
                          value={employeeHistoryViewMode}
                          onChange={(e) => setEmployeeHistoryViewMode(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
                        >
                          <option value="all" className="text-gray-800">All Time</option>
                          <option value="monthly" className="text-gray-800">Monthly View</option>
                        </select>
                      </div>
                    </div>

                    {/* Month Navigation - Only show in monthly mode */}
                    {employeeHistoryViewMode === 'monthly' && (
                      <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => navigateEmployeeHistoryMonth(-1)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          <h3 className="text-xl font-bold text-white">
                            {formatDateForDisplay(employeeHistoryMonth)}
                          </h3>

                          <button
                            onClick={() => navigateEmployeeHistoryMonth(1)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {sessions.length > 0 ? (
                      sessions.map((session, index) => (
                        <div
                          key={session.id}
                          className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-white/60 text-sm font-medium">#{sessions.length - index}</span>
                                <div className="font-bold text-white text-lg">{session.clientName}</div>
                                <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
                                  Session #{session.sessionNumber}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                                <div className="text-blue-200">
                                  <span className="text-white/60">Account:</span> {session.accountNumber}
                                </div>
                                <div className="text-blue-200">
                                  <span className="text-white/60">Date:</span> {session.formattedDate}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                                  session.attendance === 'pending' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' :
                                  session.attendance === 'completed' ? 'bg-green-500/20 text-green-300 border-green-400/30' :
                                  session.attendance === 'cancelled' ? 'bg-red-500/20 text-red-300 border-red-400/30' :
                                  session.attendance === 'rescheduled' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' :
                                  session.attendance === 'no-show' ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' :
                                  'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                }`}>
                                  {session.attendance === 'pending' ? 'Pending' :
                                   session.attendance === 'completed' ? 'Completed' :
                                   session.attendance === 'cancelled' ? 'Cancelled' :
                                   session.attendance === 'rescheduled' ? 'Rescheduled' :
                                   session.attendance === 'no-show' ? 'No Show' :
                                   'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-white/60">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p>No sessions found for this employee</p>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* All Completed Stats Display */}
      {showAllCompleted && (
        <div className="w-full mb-6 backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
          {/* Month Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateCompletedStatsMonth(-1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-white">
              {formatDateForDisplay(completedStatsDate)} - Completed Stats
            </h3>

            <button
              onClick={() => navigateCompletedStatsMonth(1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {getAllCompletedStats(completedStatsDate).map(emp => (
              <div
                key={emp.id}
                onClick={() => setSelectedEmployeeHistory(emp.id)}
                className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-6 text-center hover:bg-white/10 transition-all duration-200 hover:scale-105 cursor-pointer"
              >
                <div className="mb-3">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${emp.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-2xl">
                      {emp.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="text-lg font-semibold text-white mb-2">{emp.name}</div>
                <div className="text-4xl font-bold text-green-300">{emp.completed}</div>
                <div className="text-xs text-white/60 mt-1">Completed</div>
              </div>
            ))}
            {getAllCompletedStats(completedStatsDate).length === 0 && (
              <div className="col-span-full text-center py-8 text-white/60">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p>No completed onboardings for {formatDateForDisplay(completedStatsDate)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Overview Left, Calendar Center, Add Form Right */}
      <div className="w-full">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Left Side - Monthly Overview & Scheduled Onboardings */}
          <div className="xl:col-span-3">
            <MonthlyStatsOverview
              overviewDate={overviewDate}
              onNavigate={navigateOverviewMonth}
              stats={monthlyStats}
              formatDateForDisplay={formatDateForDisplay}
              onEmployeeClick={setSelectedEmployeeHistory}
            />

            {/* Scheduled Onboardings for Selected Date */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  {formatSelectedDate(selectedDate)}
                </h3>
                <div className="text-blue-200 text-sm">
                  {selectedDateOnboardings.length} onboardings scheduled
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedDateOnboardings.length > 0 ? (
                  selectedDateOnboardings.map(onboarding => (
                    <div
                      key={onboarding.id}
                      className="group backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="font-medium text-white">{onboarding.clientName}</div>
                            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
                              #{onboarding.sessionNumber}
                            </span>
                          </div>

                          <div className="text-sm text-blue-200 mb-2">
                            Account: {onboarding.accountNumber}
                          </div>

                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r ${getEmployeeColor(onboarding.employeeId)} text-white text-xs font-medium shadow-lg`}>
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                              {onboarding.employeeName}
                            </div>

                            {onboarding.attendance === 'pending_approval' ? (
                              // Admin approve/reject UI for pending completion requests
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg">
                                  Awaiting Approval
                                </span>
                                <button
                                  onClick={() => rejectCompletion(onboarding.id)}
                                  className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg hover:bg-red-500/35 transition-all"
                                >
                                  ✗
                                </button>
                                <button
                                  onClick={() => approveCompletion(onboarding.id)}
                                  className="px-2 py-1 text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/40 rounded-lg hover:bg-green-500/35 transition-all"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <select
                                value={onboarding.attendance || 'pending'}
                                onChange={(e) => updateOnboardingAttendance(onboarding.id, e.target.value)}
                                className={`px-2 py-1 rounded-lg text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 ${
                                  onboarding.attendance === 'pending' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' :
                                  onboarding.attendance === 'completed' ? 'bg-green-500/20 text-green-300 border-green-400/30' :
                                  onboarding.attendance === 'cancelled' ? 'bg-red-500/20 text-red-300 border-red-400/30' :
                                  onboarding.attendance === 'rescheduled' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' :
                                  onboarding.attendance === 'no-show' ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' :
                                  'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                }`}
                              >
                                <option value="pending" className="text-gray-800">Pending</option>
                                <option value="completed" className="text-gray-800">Completed</option>
                                <option value="no-show" className="text-gray-800">No Show</option>
                                <option value="rescheduled" className="text-gray-800">Rescheduled</option>
                                <option value="cancelled" className="text-gray-800">Cancelled</option>
                              </select>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteOnboarding(onboarding.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v6m0 0v6m6-6v6m6-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <p>No onboardings scheduled</p>
                    <p className="text-sm mt-1">Select a date to view onboardings</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center - Calendar */}
          <div className="xl:col-span-6">
            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-3 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <h2 className="text-2xl font-bold text-white">
                  {formatDateForDisplay(currentDate)}
                </h2>
                
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-3 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-blue-200 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                  <div key={`empty-${i}`} className="h-20 sm:h-24"></div>
                ))}
                {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                  const day = i + 1
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  const dayOnboardings = getOnboardingsForDate(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isSelected = date.toDateString() === selectedDate.toDateString()

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        relative h-20 sm:h-24 rounded-xl cursor-pointer transition-all duration-200 p-2 sm:p-3
                        ${isToday ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25' : ''}
                        ${isSelected && !isToday ? 'bg-white/20 ring-2 ring-white/50' : ''}
                        ${!isToday && !isSelected ? 'bg-white/5 hover:bg-white/10' : ''}
                        border border-white/10
                      `}
                    >
                      <div className={`text-sm sm:text-base font-medium ${isToday ? 'text-white' : 'text-white/90'}`}>
                        {day}
                      </div>

                      {dayOnboardings.length > 0 && (
                        <div className="absolute bottom-1 right-1">
                          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse">
                            {dayOnboardings.length}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Side - Add Onboarding Form & Google Sheets Sync */}
          <div className="xl:col-span-3 space-y-6">
            {/* Add New Onboarding Form */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">
                Add Onboarding
              </h3>
              <p className="text-blue-200 text-sm mb-6">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Employee</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
                  >
                    <option value="" className="text-gray-800">Select Employee</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id} className="text-gray-800">
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client name..."
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addOnboarding()}
                    placeholder="Enter account number..."
                    className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
                  />
                </div>

                <button
                  onClick={addOnboarding}
                  disabled={!selectedEmployee || !clientName.trim() || !accountNumber.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                >
                  Add Onboarding
                </button>
              </div>
            </div>

            {/* Google Sheets Sync */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Google Sheets
              </h3>
              <p className="text-blue-200 text-sm mb-6">Sync data with Google Sheets</p>

              <div className="space-y-3">
                <button
                  disabled={true}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-green-400/50 opacity-50 cursor-not-allowed transition-all duration-200 shadow-lg pointer-events-none"
                >
                  Sync {onboardings.length} Records
                </button>

                <div className="flex items-center gap-2 px-2">
                  <input
                    type="checkbox"
                    id="autoSync"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 text-green-500 bg-white/10 border-white/30 rounded focus:ring-green-400/50 focus:ring-2"
                  />
                  <label htmlFor="autoSync" className="text-sm text-white/80 cursor-pointer">
                    Auto-sync new entries
                  </label>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <button
                    onClick={importFromGoogleSheets}
                    disabled={syncStatus.isLoading}
                    className="w-full px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                  >
                    📥 Import from Sheet
                  </button>
                  <button
                    onClick={testSheetsConnection}
                    disabled={syncStatus.isLoading}
                    className="w-full px-4 py-2 text-sm bg-white/10 text-white/80 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Test Connection
                  </button>

                  <details className="pt-2">
                    <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">Debug Tools</summary>
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={async () => {
                          console.log('Current onboardings data (first 3):', onboardings.slice(0, 3));
                          console.log('Sample onboarding structure:', onboardings[0]);
                          const result = await GoogleSheetsService.debugGoogleSheet();
                          console.log('Debug result:', result);
                        }}
                        disabled={syncStatus.isLoading}
                        className="w-full px-4 py-1.5 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Debug Sheet
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const result = await GoogleSheetsService.submitData('forceHeaders', {});
                            console.log('Force headers result:', result);
                          } catch (error) {
                            console.error('Force headers error:', error);
                          }
                        }}
                        disabled={syncStatus.isLoading}
                        className="w-full px-4 py-1.5 text-xs bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Force Headers
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
