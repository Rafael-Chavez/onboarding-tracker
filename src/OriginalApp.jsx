import { useState, useEffect, useMemo, useCallback, useTransition, memo } from 'react'
import { GoogleSheetsService } from './services/googleSheets'
import { SupabaseService } from './services/supabase'
import { debugOnboardingStats, debugLocalStorage } from './services/debugStats'
import NightShiftBanner from './components/NightShiftBanner'
import PendingApprovalsAlert from './components/PendingApprovalsAlert'
import MonthlyStatsOverview from './components/MonthlyStatsOverview'
import DashboardHeader from './components/DashboardHeader'
import ScheduledOnboardingsList from './components/ScheduledOnboardingsList'
import OnboardingForm from './components/OnboardingForm'
import GoogleSheetsSync from './components/GoogleSheetsSync'
import EmployeeHistoryModal from './components/EmployeeHistoryModal'
import AllCompletedStats from './components/AllCompletedStats'

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
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [overviewDate, setOverviewDate] = useState(new Date())
  const [syncStatus, setSyncStatus] = useState({ isLoading: false, message: '', type: '' })
  const [isPending, startTransition] = useTransition()
  const [autoSync, setAutoSync] = useState(() => loadFromStorage('autoSync', true))

  const fetchOnboardings = useCallback(async () => {
    const result = await SupabaseService.getAllOnboardings()
    if (result.success) {
      setOnboardings(result.onboardings)
    } else {
      console.error('Error loading onboardings:', result.error)
    }
  }, []);

  // Load onboardings from Supabase on mount
  useEffect(() => {
    fetchOnboardings()

    // Subscribe to real-time changes
    const subscription = SupabaseService.subscribeToOnboardings((payload) => {
      console.log('Real-time update detected:', payload)
      fetchOnboardings()
    })

    return () => {
      SupabaseService.unsubscribe(subscription)
    }
  }, [fetchOnboardings])

  // Save autoSync setting to localStorage whenever it changes
  useEffect(() => {
    saveToStorage('autoSync', autoSync)
  }, [autoSync, saveToStorage])

  const addOnboarding = useCallback(async ({ employeeId, clientName, accountNumber }) => {
    if (employeeId && clientName.trim() && accountNumber.trim()) {
      // Find existing onboardings for this client to determine session number
      const clientOnboardings = onboardings.filter(ob =>
        ob.clientName.toLowerCase() === clientName.trim().toLowerCase()
      )
      const sessionNumber = clientOnboardings.length + 1

      const newOnboarding = {
        employeeId: parseInt(employeeId),
        employeeName: employees.find(e => e.id === parseInt(employeeId))?.name,
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
        return true
      } else {
        setSyncStatus({
          isLoading: false,
          message: `Failed to add session: ${result.error}`,
          type: 'error'
        })
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 4000)
        return false
      }
    }
    return false
  }, [onboardings, employees, selectedDate, autoSync])

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

  const onboardingsByDate = useMemo(() => {
    const map = new Map()
    onboardings.forEach(ob => {
      const dateStr = ob.date // Assuming ob.date is already 'YYYY-MM-DD'
      if (!map.has(dateStr)) {
        map.set(dateStr, [])
      }
      map.get(dateStr).push(ob)
    })
    return map
  }, [onboardings])

  const getOnboardingsForDate = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return onboardingsByDate.get(dateStr) || []
  }, [onboardingsByDate])

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
    startTransition(() => {
      setCurrentDate(prev => {
        const newDate = new Date(prev)
        newDate.setMonth(prev.getMonth() + direction)
        return newDate
      })
    })
  }, [])

  const navigateOverviewMonth = useCallback((direction) => {
    startTransition(() => {
      setOverviewDate(prev => {
        const newDate = new Date(prev)
        newDate.setMonth(prev.getMonth() + direction)
        return newDate
      })
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
      <DashboardHeader stats={stats} syncStatus={syncStatus} />

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
      <div className={isPending ? 'opacity-70 pointer-events-none transition-opacity' : 'transition-opacity'}>
      <EmployeeHistoryModal
        selectedEmployeeHistory={selectedEmployeeHistory}
        setSelectedEmployeeHistory={setSelectedEmployeeHistory}
        employees={employees}
        getEmployeeSessions={getEmployeeSessions}
        employeeHistoryViewMode={employeeHistoryViewMode}
        setEmployeeHistoryViewMode={setEmployeeHistoryViewMode}
        employeeHistoryMonth={employeeHistoryMonth}
        navigateEmployeeHistoryMonth={navigateEmployeeHistoryMonth}
        formatDateForDisplay={formatDateForDisplay}
      />

      {/* All Completed Stats Display */}
      {showAllCompleted && (
        <AllCompletedStats
          completedStatsDate={completedStatsDate}
          navigateCompletedStatsMonth={navigateCompletedStatsMonth}
          formatDateForDisplay={formatDateForDisplay}
          getAllCompletedStats={getAllCompletedStats}
          setSelectedEmployeeHistory={setSelectedEmployeeHistory}
        />
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
            <ScheduledOnboardingsList
              selectedDate={selectedDate}
              formatSelectedDate={formatSelectedDate}
              selectedDateOnboardings={selectedDateOnboardings}
              getEmployeeColor={getEmployeeColor}
              rejectCompletion={rejectCompletion}
              approveCompletion={approveCompletion}
              updateOnboardingAttendance={updateOnboardingAttendance}
              deleteOnboarding={deleteOnboarding}
            />
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
              <CalendarGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getOnboardingsForDate={getOnboardingsForDate}
                getFirstDayOfMonth={getFirstDayOfMonth}
                getDaysInMonth={getDaysInMonth}
              />
            </div>
          </div>

          {/* Right Side - Add Onboarding Form & Google Sheets Sync */}
          <div className="xl:col-span-3 space-y-6">
            <OnboardingForm
              selectedDate={selectedDate}
              employees={employees}
              addOnboarding={addOnboarding}
            />

            <GoogleSheetsSync
              onboardingsLength={onboardings.length}
              autoSync={autoSync}
              setAutoSync={setAutoSync}
              importFromGoogleSheets={importFromGoogleSheets}
              syncStatus={syncStatus}
              testSheetsConnection={testSheetsConnection}
              GoogleSheetsService={GoogleSheetsService}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

const CalendarGrid = memo(({
  currentDate,
  selectedDate,
  setSelectedDate,
  getOnboardingsForDate,
  getFirstDayOfMonth,
  getDaysInMonth
}) => {
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const todayStr = new Date().toDateString();
  const selectedDateStr = selectedDate.toDateString();

  return (
    <>
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-blue-200 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} className="h-20 sm:h-24"></div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
          const dayOnboardings = getOnboardingsForDate(date)
          const isToday = date.toDateString() === todayStr
          const isSelected = date.toDateString() === selectedDateStr

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
    </>
  );
});

export default App
