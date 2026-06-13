import { useState, useMemo, useCallback, useTransition, memo } from 'react'
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

function App({
  onboardings = [],
  onboardingsByDate = new Map(),
  onboardingsByMonth = new Map(),
  syncStatus = { isLoading: false, message: '', type: '' },
  autoSync = true,
  setAutoSync = () => {},
  addOnboarding,
  deleteOnboarding,
  approveCompletion,
  rejectCompletion,
  updateOnboardingAttendance,
  importFromGoogleSheets,
  testSheetsConnection
}) {
  const [employees] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
  ])

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [overviewDate, setOverviewDate] = useState(new Date())
  const [isPending, startTransition] = useTransition()

  const handleAddOnboarding = useCallback((formData) => {
    return addOnboarding(formData, employees, selectedDate);
  }, [addOnboarding, employees, selectedDate]);

  // Calendar helper functions
  const getDaysInMonth = useCallback((date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }, [])

  const getFirstDayOfMonth = useCallback((date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }, [])

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
    const monthOnboardings = onboardingsByMonth.get(monthStr) || []

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
  }, [onboardings, employees, onboardingsByMonth])

  const monthlyStats = useMemo(() => {
    return getMonthlyCompletionStats(overviewDate)
  }, [getMonthlyCompletionStats, overviewDate])

  const getEmployeeColor = useCallback((employeeId) => {
    return employees.find(e => e.id === employeeId)?.color || 'from-gray-500 to-gray-600'
  }, [employees])

  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthOnboardings = onboardingsByMonth.get(currentMonth) || []
    const thisMonth = monthOnboardings.length
    const thisMonthCompleted = monthOnboardings.filter(ob =>
      ob.attendance === 'completed'
    ).length
    const total = onboardings.length
    return { thisMonth, thisMonthCompleted, total }
  }, [onboardings.length, onboardingsByMonth])

  // Optimized version using useMemo for caching and Map for O(1) lookups
  const completedStatsCache = useMemo(() => {
    // Build an index: monthStr -> employeeId -> count
    const index = new Map()

    onboardings.forEach(ob => {
      if (ob.attendance === 'completed' && ob.month) {
        if (!index.has(ob.month)) {
          index.set(ob.month, new Map())
        }
        const monthMap = index.get(ob.month)
        monthMap.set(ob.employeeId, (monthMap.get(ob.employeeId) || 0) + 1)
      }
    })

    return index
  }, [onboardings])

  const getAllCompletedStats = useCallback((date = new Date()) => {
    const monthStr = date.toISOString().slice(0, 7)
    const monthMap = completedStatsCache.get(monthStr)

    if (!monthMap) return []

    return employees
      .map(emp => ({
        ...emp,
        completed: monthMap.get(emp.id) || 0
      }))
      .filter(emp => emp.completed > 0)
  }, [completedStatsCache, employees])

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

  // Optimized version with date caching
  const getEmployeeSessions = useCallback((employeeId, viewMode = 'all', monthDate = null) => {
    const monthStr = viewMode === 'monthly' && monthDate ? monthDate.toISOString().slice(0, 7) : null

    const sourceArray = monthStr ? (onboardingsByMonth.get(monthStr) || []) : onboardings;

    // Single pass filter with combined conditions
    const filtered = sourceArray.filter(ob => {
      if (ob.employeeId !== employeeId) return false
      return true
    })

    // Pre-create Date objects once for sorting, reuse for formatting
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })

    return filtered
      .map(ob => {
        const dateObj = new Date(ob.date)
        return {
          ...ob,
          dateObj, // Keep for sorting
          formattedDate: dateFormatter.format(dateObj)
        }
      })
      .sort((a, b) => b.dateObj - a.dateObj) // Sort by date descending
  }, [onboardings, onboardingsByMonth])

  const navigateEmployeeHistoryMonth = useCallback((direction) => {
    setEmployeeHistoryMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }, [])


  const pendingApprovals = useMemo(() => {
    return onboardings.filter(ob => ob.attendance === 'pending_approval')
  }, [onboardings])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
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
          className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-400/50 transition-colors shadow-2xl hover:shadow-green-500/25"
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
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
                >
                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <h2 className="text-2xl font-bold text-white">
                  {formatDateForDisplay(currentDate)}
                </h2>

                <button
                  onClick={() => navigateMonth(1)}
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
                >
                  <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div key={`empty-${i}`} className="h-24 min-h-[6rem]"></div>
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
                        relative h-24 min-h-[6rem] rounded-xl cursor-pointer transition-colors duration-150 p-3
                        ${isToday ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25' : ''}
                        ${isSelected && !isToday ? 'bg-white/20 ring-2 ring-white/50' : ''}
                        ${!isToday && !isSelected ? 'bg-white/5 hover:bg-white/10' : ''}
                        border border-white/10
                      `}
                    >
                      <div className={`text-sm sm:text-base font-medium pointer-events-none ${isToday ? 'text-white' : 'text-white/90'}`}>
                        {day}
                      </div>

                      {dayOnboardings.length > 0 && (
                        <div className="absolute bottom-1 right-1 pointer-events-none">
                          <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse-subtle">
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
            <OnboardingForm
              selectedDate={selectedDate}
              employees={employees}
              addOnboarding={handleAddOnboarding}
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

export default memo(App)
