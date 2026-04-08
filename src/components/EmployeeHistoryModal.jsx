import { memo } from 'react';

const EmployeeHistoryModal = ({
  selectedEmployeeHistory,
  setSelectedEmployeeHistory,
  employees,
  getEmployeeSessions,
  employeeHistoryViewMode,
  setEmployeeHistoryViewMode,
  employeeHistoryMonth,
  navigateEmployeeHistoryMonth,
  formatDateForDisplay
}) => {
  if (!selectedEmployeeHistory) return null;

  const employee = employees.find(e => e.id === selectedEmployeeHistory);
  const sessions = getEmployeeSessions(selectedEmployeeHistory, employeeHistoryViewMode, employeeHistoryMonth);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
              setSelectedEmployeeHistory(null);
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
      </div>
    </div>
  );
};

export default memo(EmployeeHistoryModal);
