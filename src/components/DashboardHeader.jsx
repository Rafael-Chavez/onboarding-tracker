import { memo } from 'react';

const DashboardHeader = ({ stats, syncStatus }) => {
  return (
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
  );
};

export default memo(DashboardHeader);
