import { memo } from 'react';

const GoogleSheetsSync = ({
  onboardingsCount,
  autoSync,
  onAutoSyncChange,
  onImport,
  onTestConnection,
  onDebugSheet,
  onForceHeaders,
  isLoading
}) => {
  return (
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
          Sync {onboardingsCount} Records
        </button>

        <div className="flex items-center gap-2 px-2">
          <input
            type="checkbox"
            id="autoSync"
            checked={autoSync}
            onChange={(e) => onAutoSyncChange(e.target.checked)}
            className="w-4 h-4 text-green-500 bg-white/10 border-white/30 rounded focus:ring-green-400/50 focus:ring-2"
          />
          <label htmlFor="autoSync" className="text-sm text-white/80 cursor-pointer">
            Auto-sync new entries
          </label>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <button
            onClick={onImport}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25"
          >
            📥 Import from Sheet
          </button>
          <button
            onClick={onTestConnection}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm bg-white/10 text-white/80 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Test Connection
          </button>

          <details className="pt-2">
            <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">Debug Tools</summary>
            <div className="mt-2 space-y-2">
              <button
                onClick={onDebugSheet}
                disabled={isLoading}
                className="w-full px-4 py-1.5 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Debug Sheet
              </button>
              <button
                onClick={onForceHeaders}
                disabled={isLoading}
                className="w-full px-4 py-1.5 text-xs bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Force Headers
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default memo(GoogleSheetsSync);
