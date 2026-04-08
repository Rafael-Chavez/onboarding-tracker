import { memo } from 'react';

const ScheduledOnboardings = ({
  selectedDate,
  onboardings,
  formatSelectedDate,
  getEmployeeColor,
  onReject,
  onApprove,
  onUpdateAttendance,
  onDelete
}) => {
  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          {formatSelectedDate(selectedDate)}
        </h3>
        <div className="text-blue-200 text-sm">
          {onboardings.length} onboardings scheduled
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {onboardings.length > 0 ? (
          onboardings.map(onboarding => (
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
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg">
                          Awaiting Approval
                        </span>
                        <button
                          onClick={() => onReject(onboarding.id)}
                          className="px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg hover:bg-red-500/35 transition-all"
                        >
                          ✗
                        </button>
                        <button
                          onClick={() => onApprove(onboarding.id)}
                          className="px-2 py-1 text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/40 rounded-lg hover:bg-green-500/35 transition-all"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <select
                        value={onboarding.attendance || 'pending'}
                        onChange={(e) => onUpdateAttendance(onboarding.id, e.target.value)}
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
                  onClick={() => onDelete(onboarding.id)}
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
  );
};

export default memo(ScheduledOnboardings);
