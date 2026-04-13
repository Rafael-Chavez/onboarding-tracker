import { useState, useEffect, useCallback } from 'react';
import { EmailNotificationService } from '../services/emailNotifications';

export default function EmailNotificationViewer() {
  const [notifications, setNotifications] = useState([]);
  const [showViewer, setShowViewer] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualEmail, setManualEmail] = useState({ to: '', subject: '', body: '' });
  const [isSending, setIsSending] = useState(false);

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

  const sendTestEmail = useCallback(async () => {
    const result = await EmailNotificationService.notifyShiftTrade({
      initiatorName: 'Marc',
      respondentName: 'Jim',
      initiatorShiftDate: '2026-04-13',
      respondentShiftDate: '2026-04-20',
      status: 'accepted'
    });

    setTestEmailStatus({ success: result.success, message: result.message });
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
          <div className={`${testEmailStatus.success ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in max-w-xs text-sm`}>
            {testEmailStatus.success ? '✓ ' : '✗ '} {testEmailStatus.message}
          </div>
        )}

        <button
          onClick={sendTestEmail}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-2"
        >
          📧 Send Test Email
        </button>

        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-2"
        >
          📝 New Email
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

      {/* Manual Email Form */}
      {showManualForm && (
        <div className="absolute bottom-16 right-0 w-[400px] bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 p-6 animate-fade-in">
          <h3 className="text-white font-bold text-lg mb-4">Send New Email</h3>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-xs block mb-1">Recipient</label>
              <input
                type="email"
                value={manualEmail.to}
                onChange={(e) => setManualEmail({ ...manualEmail, to: e.target.value })}
                placeholder="email@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Subject</label>
              <input
                type="text"
                value={manualEmail.subject}
                onChange={(e) => setManualEmail({ ...manualEmail, subject: e.target.value })}
                placeholder="Enter subject..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">Message Body</label>
              <textarea
                value={manualEmail.body}
                onChange={(e) => setManualEmail({ ...manualEmail, body: e.target.value })}
                placeholder="Write your message..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={isSending}
                onClick={async () => {
                  setIsSending(true);
                  const result = await EmailNotificationService.sendCustomEmail(manualEmail);
                  setIsSending(false);
                  if (result.success) {
                    setTestEmailStatus({ success: true, message: 'Email sent successfully!' });
                    setShowManualForm(false);
                    setManualEmail({ to: '', subject: '', body: '' });
                  } else {
                    setTestEmailStatus({ success: false, message: result.error || 'Failed to send' });
                  }
                  loadNotifications();
                  setTimeout(() => setTestEmailStatus(null), 5000);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Send Email'}
              </button>
              <button
                onClick={() => setShowManualForm(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">To:</span>
                        <span className="text-cyan-300 font-mono">{notification.to}</span>
                      </div>
                      {notification.error && (
                        <div className="text-red-400 italic text-[10px] truncate max-w-[200px]" title={notification.error}>
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
