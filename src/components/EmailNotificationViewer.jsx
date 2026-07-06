import { useState, useEffect, useCallback } from 'react';
import { EmailNotificationService } from '../services/emailNotifications';

export default function EmailNotificationViewer() {
  const [notifications, setNotifications] = useState([]);
  const [showViewer, setShowViewer] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const checkSMTP = useCallback(async () => {
    setIsVerifying(true);
    setSmtpStatus({ type: 'info', message: 'Checking SMTP connection...' });

    try {
      const result = await EmailNotificationService.verifySMTP();
      if (result.success) {
        setSmtpStatus({ type: 'success', message: 'SMTP connection successful!' });
      } else {
        setSmtpStatus({ type: 'error', message: `SMTP failed: ${result.error}` });
      }
    } catch (error) {
      setSmtpStatus({ type: 'error', message: `Verification error: ${error.message}` });
    } finally {
      setIsVerifying(false);
      setTimeout(() => setSmtpStatus(null), 10000);
    }
  }, []);

  const sendTestEmail = useCallback(async () => {
    setTestEmailStatus({ type: 'info', message: 'Attempting to send...' });

    const result = await EmailNotificationService.notifyShiftTrade({
      initiatorName: 'Marc',
      respondentName: 'Jim',
      initiatorShiftDate: '2026-04-13',
      respondentShiftDate: '2026-04-20',
      status: 'accepted'
    });

    setTestEmailStatus({
      success: result.success,
      message: result.success ? '✓ Sent successfully' : `✗ Failed: ${result.error || 'Unknown error'}`
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Status Messages */}
      {smtpStatus && (
        <div className={`${
          smtpStatus.type === 'success' ? 'bg-green-600' :
          smtpStatus.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white px-4 py-3 rounded-lg shadow-2xl animate-fade-in max-w-sm text-sm border border-white/20`}>
          <div className="font-bold mb-1">{smtpStatus.type === 'success' ? '✅ SMTP OK' : smtpStatus.type === 'error' ? '❌ SMTP ERROR' : 'ℹ️ SMTP INFO'}</div>
          {smtpStatus.message}
        </div>
      )}

      {testEmailStatus && (
        <div className={`${testEmailStatus.success === undefined ? 'bg-blue-600' : testEmailStatus.success ? 'bg-green-600' : 'bg-red-600'} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in max-w-xs text-sm border border-white/20`}>
          {testEmailStatus.message}
        </div>
      )}

      {/* Floating Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={checkSMTP}
          disabled={isVerifying}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg font-medium border border-white/20 transition-all flex items-center gap-2"
        >
          {isVerifying ? '⌛' : '🔍'} Check SMTP
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
        <div className="absolute bottom-16 right-0 w-[550px] max-h-[600px] bg-gradient-to-br from-gray-900/95 to-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div>
              <h3 className="text-white font-bold text-lg">Email Notification Log</h3>
              <p className="text-white/60 text-xs">
                Target: {EmailNotificationService.ADMIN_EMAIL}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-500/10 rounded transition-colors font-bold uppercase tracking-wider"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-white/20 mb-2 text-5xl">📭</div>
                <p className="text-white/60 text-sm">No email notifications yet</p>
                <p className="text-white/40 text-xs mt-1">
                  Try "Send Test Email" to check your setup
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          notification.type === 'shift_trade' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' :
                          notification.type === 'shift_override' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' :
                          'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]'
                        }`}></div>
                        <span className="text-white font-bold text-[10px] uppercase tracking-widest">
                          {notification.type?.replace('_', ' ')}
                        </span>
                        {notification.backendSent === false ? (
                          <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-500/30 font-black uppercase tracking-tighter">
                            FAILED
                          </span>
                        ) : (
                          <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/30 font-black uppercase tracking-tighter">
                            SENT
                          </span>
                        )}
                      </div>
                      <span className="text-white/30 text-[10px] font-mono">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="text-white font-semibold text-sm mb-2 group-hover:text-cyan-300 transition-colors">
                        {notification.subject}
                      </div>
                      <div className="text-white/70 text-xs bg-black/40 rounded-lg p-3 font-mono whitespace-pre-wrap border border-white/5 leading-relaxed">
                        {notification.body}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-white/30">TO:</span>
                          <span className="text-cyan-400">{notification.to}</span>
                        </div>
                        {notification.details?.response && (
                          <div className="text-green-400/60 truncate max-w-[250px]" title={notification.details.response}>
                            {notification.details.response}
                          </div>
                        )}
                      </div>

                      {notification.error && (
                        <div className="bg-red-500/10 text-red-400 p-2 rounded border border-red-500/20 text-[10px] font-mono break-words">
                          <span className="font-bold">ERROR:</span> {notification.error}
                        </div>
                      )}

                      {notification.details?.rejected?.length > 0 && (
                        <div className="bg-orange-500/10 text-orange-400 p-2 rounded border border-orange-500/20 text-[10px] font-mono">
                          <span className="font-bold">REJECTED:</span> {notification.details.rejected.join(', ')}
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
