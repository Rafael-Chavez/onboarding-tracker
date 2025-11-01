import { useState, useEffect } from 'react'
import { GoogleSheetsService } from './services/googleSheets'

function App() {
  const [employees] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 2, name: 'Danreb', color: 'from-purple-500 to-pink-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
  ])
  
  // Load data from localStorage
  const loadFromStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error)
      return defaultValue
    }
  }

  // Save data to localStorage
  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error)
    }
  }

  const [onboardings, setOnboardings] = useState(() => {
    const data = loadFromStorage('onboardings', [])
    // Migrate old data to include attendance field
    return data.map(ob => ({
      ...ob,
      attendance: ob.attendance || 'pending'
    }))
  })
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [clientName, setClientName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  // Removed attendance state - will be managed manually in Google Sheets
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [overviewDate, setOverviewDate] = useState(new Date())
  const [syncStatus, setSyncStatus] = useState({ isLoading: false, message: '', type: '' })
  const [autoSync, setAutoSync] = useState(() => loadFromStorage('autoSync', true))

  // Save onboardings to localStorage whenever it changes
  useEffect(() => {
    saveToStorage('onboardings', onboardings)
  }, [onboardings])

  // Save autoSync setting to localStorage whenever it changes
  useEffect(() => {
    saveToStorage('autoSync', autoSync)
  }, [autoSync])

  const addOnboarding = async () => {
    if (selectedEmployee && clientName.trim() && accountNumber.trim()) {
      // Find existing onboardings for this client to determine session number
      const clientOnboardings = onboardings.filter(ob => 
        ob.clientName.toLowerCase() === clientName.trim().toLowerCase()
      )
      const sessionNumber = clientOnboardings.length + 1
      
      const newOnboarding = {
        id: Date.now(),
        employeeId: parseInt(selectedEmployee),
        employeeName: employees.find(e => e.id === parseInt(selectedEmployee))?.name,
        clientName: clientName.trim(),
        accountNumber: accountNumber.trim(),
        sessionNumber,
        attendance: 'pending', // Default for local storage, but not sent to sheets
        date: selectedDate.toISOString().split('T')[0],
        month: selectedDate.toISOString().slice(0, 7)
      }
      
      // Update local state
      const updatedOnboardings = [...onboardings, newOnboarding]
      setOnboardings(updatedOnboardings)
      setClientName('')
      setAccountNumber('')
      
      // Auto-sync to Google Sheets if enabled
      if (autoSync) {
        setSyncStatus({ isLoading: true, message: 'Auto-syncing to Google Sheets (attendance managed manually)...', type: '' })
        
        try {
          const result = await GoogleSheetsService.appendOnboarding(newOnboarding)
          
          if (result.success) {
            setSyncStatus({ 
              isLoading: false, 
              message: 'Successfully synced to Google Sheets!', 
              type: 'success' 
            })
            setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 2000)
          } else {
            setSyncStatus({ 
              isLoading: false, 
              message: `Auto-sync failed: ${result.error}`, 
              type: 'error' 
            })
            setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 4000)
          }
        } catch (error) {
          setSyncStatus({ 
            isLoading: false, 
            message: `Auto-sync failed: ${error.message}`, 
            type: 'error' 
          })
          setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 4000)
        }
      }
    }
  }

  const deleteOnboarding = (id) => {
    setOnboardings(onboardings.filter(ob => ob.id !== id))
  }

  const updateOnboardingAttendance = async (id, newAttendance) => {
    // Update local state
    const updatedOnboardings = onboardings.map(ob => 
      ob.id === id ? { ...ob, attendance: newAttendance } : ob
    )
    setOnboardings(updatedOnboardings)

    // Auto-sync to Google Sheets if enabled
    if (autoSync) {
      try {
        // Find the updated onboarding
        const updatedOnboarding = updatedOnboardings.find(ob => ob.id === id)
        if (updatedOnboarding) {
          console.log('🔄 Syncing attendance update to Google Sheets:', updatedOnboarding)
          await GoogleSheetsService.updateOnboarding(updatedOnboarding)
        }
      } catch (error) {
        console.error('Error syncing attendance update:', error)
      }
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getOnboardingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return onboardings.filter(ob => ob.date === dateStr)
  }

  const getSelectedDateOnboardings = () => {
    return getOnboardingsForDate(selectedDate)
  }

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const formatSelectedDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const navigateOverviewMonth = (direction) => {
    const newDate = new Date(overviewDate)
    newDate.setMonth(overviewDate.getMonth() + direction)
    setOverviewDate(newDate)
  }

  const getMonthlyCompletionStats = (date) => {
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
  }

  const getEmployeeColor = (employeeId) => {
    return employees.find(e => e.id === employeeId)?.color || 'from-gray-500 to-gray-600'
  }

  const getTotalStats = () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const thisMonth = onboardings.filter(ob => ob.month === currentMonth).length
    const thisMonthCompleted = onboardings.filter(ob =>
      ob.month === currentMonth && ob.attendance === 'completed'
    ).length
    const total = onboardings.length
    return { thisMonth, thisMonthCompleted, total }
  }

  const getAllCompletedStats = (date = new Date()) => {
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
  }

  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const [completedStatsDate, setCompletedStatsDate] = useState(new Date())

  const navigateCompletedStatsMonth = (direction) => {
    const newDate = new Date(completedStatsDate)
    newDate.setMonth(completedStatsDate.getMonth() + direction)
    setCompletedStatsDate(newDate)
  }

  const syncToGoogleSheets = async () => {
    setSyncStatus({ isLoading: true, message: 'Syncing to Google Sheets (attendance preserved)...', type: '' })
    
    // Debug: Log the data being synced
    console.log('🔄 Syncing onboardings to Google Sheets:')
    console.log('📊 Total onboardings:', onboardings.length)
    console.log('📋 Sample onboarding:', onboardings[0])
    console.log('📍 Attendance values in first 3 onboardings:', 
      onboardings.slice(0, 3).map(o => ({ 
        client: o.clientName, 
        attendance: o.attendance 
      }))
    )
    
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
  }

  const testSheetsConnection = async () => {
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
  }

  const importFromGoogleSheets = async () => {
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
        // If we got data, merge it with existing data
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
            const mergedOnboardings = [...onboardings, ...newOnboardings]
            setOnboardings(mergedOnboardings)
            setSyncStatus({ 
              isLoading: false, 
              message: `Successfully imported ${newOnboardings.length} new onboardings from Google Sheets!`, 
              type: 'success' 
            })
          } else {
            setSyncStatus({ 
              isLoading: false, 
              message: 'No new data to import - all onboardings already exist locally.', 
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
  }

  const stats = getTotalStats()

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

      {/* Show All Completed Stats Button */}
      <div className="w-full mb-6">
        <button
          onClick={() => setShowAllCompleted(!showAllCompleted)}
          className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-all duration-200 hover:scale-[1.02] shadow-2xl hover:shadow-green-500/25"
        >
          {showAllCompleted ? 'Hide' : 'Show'} Completed Stats
        </button>
      </div>

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
                className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-6 text-center hover:bg-white/10 transition-all duration-200 hover:scale-105"
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
            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl mb-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateOverviewMonth(-1)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <h3 className="text-lg font-bold text-white text-center">
                  {formatDateForDisplay(overviewDate)}
                </h3>

                <button
                  onClick={() => navigateOverviewMonth(1)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {(() => {
                const stats = getMonthlyCompletionStats(overviewDate)

                return (
                  <div className="space-y-4">
                    {/* Overall Stats */}
                    <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4">
                      <h4 className="text-sm font-semibold text-white/80 mb-3">Overall Progress</h4>

                      {/* Completion Rate Circle */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="relative w-32 h-32">
                          <svg className="transform -rotate-90 w-32 h-32">
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-white/10"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 56}`}
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - stats.completionRate / 100)}`}
                              className="text-green-400 transition-all duration-1000"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-white">{stats.completionRate}%</span>
                            <span className="text-xs text-white/60">Complete</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-green-500/20 rounded-lg p-3 border border-green-400/30">
                          <div className="text-2xl font-bold text-green-300">{stats.completed}</div>
                          <div className="text-xs text-green-200">Completed</div>
                        </div>
                        <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-400/30">
                          <div className="text-2xl font-bold text-blue-300">{stats.pending}</div>
                          <div className="text-xs text-blue-200">Pending</div>
                        </div>
                      </div>

                      {stats.cancelled > 0 && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-red-500/20 rounded-lg p-3 border border-red-400/30">
                            <div className="text-xl font-bold text-red-300">{stats.cancelled}</div>
                            <div className="text-xs text-red-200">Cancelled</div>
                          </div>
                          {stats.noShow > 0 && (
                            <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-400/30">
                              <div className="text-xl font-bold text-orange-300">{stats.noShow}</div>
                              <div className="text-xs text-orange-200">No Show</div>
                            </div>
                          )}
                        </div>
                      )}

                      {stats.rescheduled > 0 && (
                        <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-400/30 mb-3">
                          <div className="text-xl font-bold text-yellow-300">{stats.rescheduled}</div>
                          <div className="text-xs text-yellow-200">Rescheduled</div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/60">Total Sessions</span>
                          <span className="text-xl font-bold text-white">{stats.totalSessions}</span>
                        </div>
                      </div>
                    </div>

                    {/* By Employee */}
                    {stats.byEmployee.length > 0 && (
                      <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4">
                        <h4 className="text-sm font-semibold text-white/80 mb-3">By Employee</h4>
                        <div className="space-y-3">
                          {stats.byEmployee.map(emp => (
                            <div key={emp.id} className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${emp.color} flex items-center justify-center shadow-lg`}>
                                  <span className="text-white font-bold text-xs">
                                    {emp.name.charAt(0)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-white">{emp.name}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-white/60">Completed</span>
                                <span className="font-bold text-green-300">{emp.completed}/{emp.total}</span>
                              </div>
                              {/* Progress bar */}
                              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${emp.color} transition-all duration-500`}
                                  style={{ width: `${emp.total > 0 ? (emp.completed / emp.total) * 100 : 0}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stats.totalSessions === 0 && (
                      <div className="text-center py-8 text-white/60">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <p className="text-sm">No sessions this month</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Scheduled Onboardings for Selected Date */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  {formatSelectedDate(selectedDate)}
                </h3>
                <div className="text-blue-200 text-sm">
                  {getSelectedDateOnboardings().length} onboardings scheduled
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getSelectedDateOnboardings().length > 0 ? (
                  getSelectedDateOnboardings().map(onboarding => (
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

                          <div className="flex items-center gap-2 mb-2">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r ${getEmployeeColor(onboarding.employeeId)} text-white text-xs font-medium shadow-lg`}>
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                              {onboarding.employeeName}
                            </div>

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
                              <option value="cancelled" className="text-gray-800">Cancelled</option>
                              <option value="rescheduled" className="text-gray-800">Rescheduled</option>
                              <option value="no-show" className="text-gray-800">No Show</option>
                            </select>
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
