import { useState } from 'react'
import { GoogleSheetsService } from './services/googleSheets'

function App() {
  const [employees] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 2, name: 'Danreb', color: 'from-purple-500 to-pink-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' }
  ])
  
  const [onboardings, setOnboardings] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [clientName, setClientName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [syncStatus, setSyncStatus] = useState({ isLoading: false, message: '', type: '' }) // type: 'success', 'error', ''
  const [autoSync, setAutoSync] = useState(true) // Auto-sync toggle

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
        date: new Date().toISOString().split('T')[0],
        month: new Date().toISOString().slice(0, 7)
      }
      
      // Update local state
      const updatedOnboardings = [...onboardings, newOnboarding]
      setOnboardings(updatedOnboardings)
      setClientName('')
      setAccountNumber('')
      
      // Auto-sync to Google Sheets if enabled
      if (autoSync) {
        setSyncStatus({ isLoading: true, message: 'Auto-syncing to Google Sheets...', type: '' })
        
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

  const getEmployeeColor = (employeeId) => {
    return employees.find(e => e.id === employeeId)?.color || 'from-gray-500 to-gray-600'
  }

  const getTotalStats = () => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const thisMonth = onboardings.filter(ob => ob.month === currentMonth).length
    const total = onboardings.length
    return { thisMonth, total }
  }

  const syncToGoogleSheets = async () => {
    setSyncStatus({ isLoading: true, message: 'Syncing to Google Sheets...', type: '' })
    
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

  const stats = getTotalStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Employee Onboarding Tracker
              </h1>
              <div className="flex items-center gap-6 text-sm text-blue-200">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  {stats.thisMonth} this month
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {stats.total} total
                </span>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Add New Onboarding Form */}
              <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 flex-1">
                <h3 className="text-white font-medium mb-3">Quick Add</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
                  >
                    <option value="" className="text-gray-800">Select Employee</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id} className="text-gray-800">
                        {employee.name}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client name..."
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
                  />
                  
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addOnboarding()}
                    placeholder="Account number..."
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent backdrop-blur-sm"
                  />
                  
                  <button
                    onClick={addOnboarding}
                    disabled={!selectedEmployee || !clientName.trim() || !accountNumber.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Google Sheets Sync */}
              <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Google Sheets
                </h3>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={syncToGoogleSheets}
                    disabled={syncStatus.isLoading || onboardings.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
                  >
                    {syncStatus.isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Syncing...
                      </div>
                    ) : (
                      `Sync ${onboardings.length} Records`
                    )}
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
                  
                  <button
                    onClick={testSheetsConnection}
                    disabled={syncStatus.isLoading}
                    className="px-4 py-1.5 text-sm bg-white/10 text-white/80 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Test Connection
                  </button>
                </div>
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

      {/* Main Content - Calendar Left, Tasks Right */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side - Calendar */}
          <div className="lg:col-span-2">
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
              <div className="grid grid-cols-7 gap-3 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-blue-200 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                  <div key={`empty-${i}`} className="h-16"></div>
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
                        relative h-16 rounded-xl cursor-pointer transition-all duration-200 p-2
                        ${isToday ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25' : ''}
                        ${isSelected && !isToday ? 'bg-white/20 ring-2 ring-white/50' : ''}
                        ${!isToday && !isSelected ? 'bg-white/5 hover:bg-white/10' : ''}
                        border border-white/10
                      `}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-white' : 'text-white/90'}`}>
                        {day}
                      </div>
                      
                      {dayOnboardings.length > 0 && (
                        <div className="absolute bottom-1 right-1">
                          <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse">
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

          {/* Right Side - Task List for Selected Date */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl h-full">
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
                          
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r ${getEmployeeColor(onboarding.employeeId)} text-white text-xs font-medium shadow-lg`}>
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            {onboarding.employeeName}
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
        </div>
        
        {/* Bottom Stats Section */}
        <div className="mt-8">
          <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Team Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {employees.map(employee => {
                const currentMonth = new Date().toISOString().slice(0, 7)
                const monthlyCount = onboardings.filter(ob => 
                  ob.employeeId === employee.id && ob.month === currentMonth
                ).length
                const totalCount = onboardings.filter(ob => ob.employeeId === employee.id).length
                
                return (
                  <div key={employee.id} className="group backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-200 hover:scale-105">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${employee.color} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-lg">
                        {employee.name.charAt(0)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-white text-center mb-2">{employee.name}</h4>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">{monthlyCount}</div>
                      <div className="text-xs text-blue-200">this month</div>
                      <div className="text-sm text-white/60 mt-1">{totalCount} total</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
