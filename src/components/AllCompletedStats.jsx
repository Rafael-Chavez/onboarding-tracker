import { memo } from 'react';

const AllCompletedStats = ({
  completedStatsDate,
  navigateCompletedStatsMonth,
  formatDateForDisplay,
  getAllCompletedStats,
  setSelectedEmployeeHistory
}) => {
  const stats = getAllCompletedStats(completedStatsDate);

  return (
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
        {stats.map(emp => (
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
        {stats.length === 0 && (
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
  );
};

export default memo(AllCompletedStats);
