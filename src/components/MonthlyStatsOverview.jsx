import { memo } from 'react';

const MonthlyStatsOverview = ({
  overviewDate,
  onNavigate,
  stats,
  formatDateForDisplay,
  onEmployeeClick
}) => {
  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl mb-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate(-1)}
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
          onClick={() => onNavigate(1)}
          className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white hover:scale-110"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

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
                <div
                  key={emp.id}
                  onClick={() => onEmployeeClick(emp.id)}
                  className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10 cursor-pointer hover:bg-white/10 hover:scale-105 transition-all duration-200"
                >
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
    </div>
  );
};

export default memo(MonthlyStatsOverview);
