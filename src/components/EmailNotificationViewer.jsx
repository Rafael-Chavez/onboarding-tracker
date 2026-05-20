import { useState, useEffect, useCallback } from 'react';
import { EmailNotificationService } from '../services/emailNotifications';
import { auth } from '../config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  const verifySmtp = useCallback(async () => {
    setIsVerifying(true);
    setSmtpStatus(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not logged in');
      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/email/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSmtpStatus({ success: response.ok, message: data.message || data.error });
    } catch (error) {
      setSmtpStatus({ success: false, message: error.message });
    } finally {
      setIsVerifying(false);
      setTimeout(() => setSmtpStatus(null), 8000);
    }
  }, []);

  const sendTestEmail = useCallback(async () => {
    setTestEmailStatus({ loading: true, message: 'Sending test email...' });
    const result = await EmailNotificationService.notifyShiftTrade({
      initiatorName: 'Test User',
      respondentName: 'Admin',
      initiatorShiftDate: new Date().toISOString(),
      respondentShiftDate: new Date(Date.now() + 86400000).toISOString(),
      status: 'test'
    });

    setTestEmailStatus({
      success: result.success,
      message: result.success ? 'Email sent! Check logs below.' : result.message
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
      {/* Status Indicators */}
      <div className="flex flex-col items-end gap-2 mb-2">
        {testEmailStatus && (
          <div className={`${testEmailStatus.success ? 'bg-green-500' : testEmailStatus.loading ? 'bg-blue-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in max-w-xs text-sm`}>
            {testEmailStatus.loading ? '⏳ ' : testEmailStatus.success ? '✓ ' : '✗ '} {testEmailStatus.message}
          </div>
        )}
        {smtpStatus && (
          <div className={`${smtpStatus.success ? 'bg-emerald-600' : 'bg-rose-600'} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in max-w-xs text-sm border border-white/20`}>
            <strong>SMTP Check:</strong> {smtpStatus.message}
          </div>
        )}
      </div>

      {/* Floating Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={verifySmtp}
          disabled={isVerifying}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          title="Verify SMTP Connection"
        >
          {isVerifying ? 'Checking...' : '🔍 Check SMTP'}
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

                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">To:</span>
                          <span className="text-cyan-300 font-mono">{notification.to}</span>
                        </div>
                        {notification.backendSent && (
                          <span className="text-green-400 text-[10px]">✓ SMTP Accepted</span>
                        )}
                      </div>
                      {notification.error && (
                        <div className="text-red-400 bg-red-900/20 rounded p-2 mt-1 border border-red-500/20 break-words" title={notification.error}>
                          <span className="font-bold uppercase text-[9px] block mb-1">Error Details:</span>
                          {notification.error}
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
