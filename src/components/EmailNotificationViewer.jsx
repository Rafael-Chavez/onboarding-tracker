import { useState, useEffect, useCallback } from 'react';
import { EmailNotificationService } from '../services/emailNotifications';

export default function EmailNotificationViewer() {
  const [notifications, setNotifications] = useState([]);
  const [showViewer, setShowViewer] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [smtpStatus, setSmtpStatus] = useState({ loading: false, checked: false, success: false, error: null });

  const checkSmtpConnection = useCallback(async () => {
    setSmtpStatus(prev => ({ ...prev, loading: true }));
    try {
      const result = await EmailNotificationService.verifySmtpConnection();
      setSmtpStatus({
        loading: false,
        checked: true,
        success: result.success,
        error: result.success ? null : result.error
      });
    } catch (err) {
      setSmtpStatus({
        loading: false,
        checked: true,
        success: false,
        error: err.message
      });
    }
  }, []);

  const loadNotifications = useCallback(() => {
    const allNotifications = EmailNotificationService.getNotifications();
    setNotifications(allNotifications);
  }, []);

  // Add animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    loadNotifications();
    checkSmtpConnection();
  }, [loadNotifications, checkSmtpConnection]);

  const sendTestEmail = useCallback(async () => {
    setTestEmailStatus({ success: true, message: 'Attempting to send test email...', loading: true });

    const result = await EmailNotificationService.notifyShiftTrade({
      initiatorName: 'Marc',
      respondentName: 'Jim',
      initiatorShiftDate: '2026-04-13',
      respondentShiftDate: '2026-04-20',
      status: 'accepted'
    });

    setTestEmailStatus({
      success: result.success,
      message: result.success ? result.message : `Failed: ${result.error}`,
      loading: false
    });

    setTimeout(() => setTestEmailStatus(null), 5000);
    loadNotifications();
  }, [loadNotifications]);

  const clearAllNotifications = useCallback(() => {
    if (window.confirm('Clear all email notifications?')) {
      EmailNotificationService.clearNotifications();
      loadNotifications();
    }
  }, [loadNotifications]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      <div className="flex items-center gap-2">
        {testEmailStatus && (
          <div className={`${testEmailStatus.loading ? 'bg-blue-500' : testEmailStatus.success ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in max-w-xs text-sm flex items-center gap-2`}>
            {testEmailStatus.loading ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : testEmailStatus.success ? '✓ ' : '✗ '}
            {testEmailStatus.message}
          </div>
        )}

        <button
          onClick={sendTestEmail}
          disabled={testEmailStatus?.loading}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-2"
        >
          📧 Send Test Email
        </button>

        <button
          onClick={() => setShowViewer(!showViewer)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-2"
        >
          {notifications.length > 0 && (
            <span className="bg-white text-purple-600 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
              {notifications.length}
            </span>
          )}
          {showViewer ? 'Hide' : 'View'} Email Log
        </button>
      </div>

      {/* Notification Viewer Panel */}
      {showViewer && (
        <div className="absolute bottom-16 right-0 w-[500px] max-h-[600px] bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Email Notification Log</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-white/60 text-xs">
                  To: {EmailNotificationService.ADMIN_EMAIL || 'rchavez@deconetwork.com'}
                </p>
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10">
                  <div className={`w-1.5 h-1.5 rounded-full ${smtpStatus.loading ? 'bg-blue-400 animate-pulse' : smtpStatus.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${smtpStatus.success ? 'text-green-400' : 'text-red-400'}`}>
                    SMTP: {smtpStatus.loading ? 'Checking...' : smtpStatus.success ? 'Online' : 'Offline'}
                  </span>
                  <button
                    onClick={checkSmtpConnection}
                    disabled={smtpStatus.loading}
                    className="text-white/40 hover:text-white transition-colors"
                    title="Check SMTP Connection"
                  >
                    <svg className={`w-3 h-3 ${smtpStatus.loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
              {smtpStatus.error && !smtpStatus.loading && (
                <p className="text-red-400 text-[10px] mt-1 italic leading-tight max-w-[300px]">
                  Error: {smtpStatus.error}
                </p>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[500px] p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-white/40 mb-2 text-4xl">📭</div>
                <p className="text-white/60 text-sm">No email notifications yet</p>
                <p className="text-white/40 text-xs mt-1">
                  Send a test email or perform a shift trade
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          notification.type === 'shift_trade' ? 'bg-cyan-400' :
                          notification.type === 'shift_override' ? 'bg-orange-400' :
                          'bg-purple-400'
                        }`}></div>
                        <span className="text-white/80 text-xs font-medium uppercase tracking-wide">
                          {notification.type?.replace('_', ' ')}
                        </span>
                        {notification.backendSent === false && (
                          <span className="bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0.5 rounded border border-red-500/30 font-bold uppercase tracking-tight">
                            FAILED
                          </span>
                        )}
                      </div>
                      <span className="text-white/40 text-xs">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="text-white font-semibold text-sm mb-1">
                        {notification.subject}
                      </div>
                      <div className="text-white/60 text-xs bg-black/20 rounded p-2 font-mono whitespace-pre-wrap">
                        {notification.body}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">To:</span>
                          <span className="text-cyan-300 font-mono">{notification.to}</span>
                        </div>
                        {notification.messageId && (
                          <span className="text-white/30 text-[10px] font-mono">ID: {notification.messageId.split('@')[0]}</span>
                        )}
                      </div>

                      {notification.error && (
                        <div className="text-red-400 italic text-[10px] bg-red-500/10 rounded p-1.5 border border-red-500/20">
                          <strong>Error:</strong> {notification.error}
                        </div>
                      )}

                      {notification.details && (
                        <div className="text-[10px] text-white/40 bg-black/20 rounded p-1.5 font-mono">
                          <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
                            <span>Accepted: {notification.details.accepted?.length || 0}</span>
                            <span>Rejected: {notification.details.rejected?.length || 0}</span>
                          </div>
                          <div className="truncate" title={notification.details.response}>
                            {notification.details.response}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
