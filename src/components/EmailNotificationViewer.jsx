import { useState, useEffect, useCallback } from 'react';
import { EmailNotificationService } from '../services/emailNotifications';

export default function EmailNotificationViewer() {
  const [notifications, setNotifications] = useState([]);
  const [showViewer, setShowViewer] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);

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
  }, [loadNotifications]);

  const checkSmtpConnection = useCallback(async () => {
    setIsVerifying(true);
    setSmtpStatus(null);
    try {
      const result = await EmailNotificationService.verifyConnection();
      setSmtpStatus({
        success: result.success,
        message: result.success ? 'SMTP Connection Successful' : `SMTP Error: ${result.error}`
      });
    } catch (error) {
      setSmtpStatus({ success: false, message: `System Error: ${error.message}` });
    } finally {
      setIsVerifying(false);
      setTimeout(() => setSmtpStatus(null), 10000);
    }
  }, []);

  const sendTestEmail = useCallback(async () => {
    const result = await EmailNotificationService.notifyShiftTrade({
      initiatorName: 'Marc',
      respondentName: 'Jim',
      initiatorShiftDate: '2026-04-13',
      respondentShiftDate: '2026-04-20',
      status: 'accepted'
    });

    setTestEmailStatus({ success: result.success, message: result.message || (result.success ? 'Sent' : result.error) });
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
      {/* Status Messages */}
      <div className="absolute bottom-16 right-0 mb-4 space-y-2 flex flex-col items-end w-[400px]">
        {testEmailStatus && (
          <div className={`${testEmailStatus.success ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in text-sm border border-white/20 w-full`}>
            <div className="font-bold mb-0.5">{testEmailStatus.success ? '✓ SUCCESS' : '✗ FAILED'}</div>
            {testEmailStatus.message}
          </div>
        )}

        {smtpStatus && (
          <div className={`${smtpStatus.success ? 'bg-emerald-600' : 'bg-rose-600'} text-white px-4 py-3 rounded-lg shadow-xl animate-fade-in text-sm border border-white/20 w-full`}>
            <div className="font-bold mb-1 flex items-center gap-2">
              {smtpStatus.success ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              )}
              {smtpStatus.success ? 'SMTP STATUS: ONLINE' : 'SMTP STATUS: OFFLINE'}
            </div>
            <div className="opacity-90">{smtpStatus.message}</div>
          </div>
        )}
      </div>

      {/* Floating Button Container */}
      <div className="flex items-center gap-2">
        <button
          onClick={checkSmtpConnection}
          disabled={isVerifying}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-all flex items-center gap-2 backdrop-blur-md border border-white/20 disabled:opacity-50"
        >
          {isVerifying ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : '🔍'} Check SMTP
        </button>

        <button
          onClick={sendTestEmail}
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
              <p className="text-white/60 text-xs">
                Emails sent to {EmailNotificationService.ADMIN_EMAIL || 'rchavez@deconetwork.com'}
              </p>
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

                    {notification.error && (
                      <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                        <div className="text-red-400 text-[10px] font-bold uppercase mb-1">Error Details</div>
                        <div className="text-red-300 text-[11px] font-mono whitespace-pre-wrap">{notification.error}</div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">To:</span>
                        <span className="text-cyan-300 font-mono">{notification.to}</span>
                      </div>
                      {notification.backendSent && (
                        <div className="text-green-400 text-[10px] flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                          Verified by SMTP
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
