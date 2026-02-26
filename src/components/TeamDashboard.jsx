import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSheetsService } from '../services/googleSheets';
import { SupabaseService } from '../services/supabase';
import NightShiftBanner from './NightShiftBanner';

export default function TeamDashboard() {
  const { currentUser, employeeId, logout } = useAuth();
  const [clientName, setClientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [myOnboardings, setMyOnboardings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [importStatus, setImportStatus] = useState({ isLoading: false, message: '', type: '' });
  const [employees] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 2, name: 'Danreb', color: 'from-purple-500 to-pink-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
  ]);

  // Fetch user's onboardings from Supabase
  const fetchMyOnboardings = async () => {
    if (!employeeId) return;

    try {
      const result = await SupabaseService.getOnboardingsByEmployee(employeeId);
      if (result.success) {
        setMyOnboardings(result.onboardings);
      } else {
        console.error('Error fetching onboardings:', result.error);
      }
    } catch (err) {
      console.error('Error fetching onboardings:', err);
    }
  };

  // Calculate stats
  const calculateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    const todayCount = myOnboardings.filter(ob => ob.date === today).length;
    const monthCount = myOnboardings.filter(ob => ob.month === currentMonth).length;
    const totalCount = myOnboardings.length;

    // Calculate streak (consecutive days with sessions)
    const sortedDates = [...new Set(myOnboardings.map(ob => ob.date))].sort().reverse();
    let streak = 0;
    let currentDate = new Date();

    for (let i = 0; i < sortedDates.length; i++) {
      const sessionDate = new Date(sortedDates[i] + 'T00:00:00');
      const daysDiff = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    // Find most frequent client
    const clientCounts = {};
    myOnboardings.forEach(ob => {
      clientCounts[ob.clientName] = (clientCounts[ob.clientName] || 0) + 1;
    });

    const mostFrequentClient = Object.keys(clientCounts).length > 0
      ? Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0]
      : null;

    return {
      todayCount,
      monthCount,
      totalCount,
      streak,
      mostFrequentClient: mostFrequentClient ? { name: mostFrequentClient[0], count: mostFrequentClient[1] } : null
    };
  };

  const stats = calculateStats();

  useEffect(() => {
    fetchMyOnboardings();

    // Subscribe to real-time changes from Supabase
    const subscription = SupabaseService.subscribeToOnboardings((payload) => {
      console.log('Real-time update detected:', payload);
      fetchMyOnboardings();
    });

    return () => {
      SupabaseService.unsubscribe(subscription);
    };
  }, [employeeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Get all onboardings for this account number to determine session number
      // Sort by date ascending so session # reflects chronological order
      const allResult = await SupabaseService.getAllOnboardings();
      const accountOnboardings = allResult.success
        ? allResult.onboardings.filter(ob =>
            ob.accountNumber?.trim() === accountNumber.trim()
          )
        : [];
      const sorted = [...accountOnboardings].sort((a, b) =>
        (a.date || '').localeCompare(b.date || '')
      );
      // Find where the new date falls in the sorted list to assign the right session number
      const insertPos = sorted.filter(ob => (ob.date || '') <= selectedDate).length;
      const sessionNumber = insertPos + 1;

      // Create the new onboarding entry
      const newOnboarding = {
        employeeId: employeeId,
        employeeName: employees.find(e => e.id === employeeId)?.name,
        clientName: clientName.trim(),
        accountNumber: accountNumber.trim(),
        sessionNumber,
        attendance: 'pending',
        date: selectedDate,
        month: selectedDate.slice(0, 7),
        notes: notes.trim() || undefined
      };

      // Save to Supabase
      const result = await SupabaseService.createOnboarding(newOnboarding);

      if (result.success) {
        // Sync to Google Sheets
        setMessage('Syncing to Google Sheets...');
        try {
          await GoogleSheetsService.appendOnboarding({
            ...newOnboarding,
            id: result.onboarding.id
          });
          setMessage('Onboarding session logged successfully!');
        } catch (syncError) {
          console.error('Google Sheets sync error:', syncError);
          setMessage('Session logged to database. Google Sheets sync may have failed.');
        }

        // Clear form
        setClientName('');
        setAccountNumber('');
        setNotes('');

        // Refresh will happen automatically via real-time subscription
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch (err) {
      console.error('Error logging onboarding:', err);
      setMessage('Error: Failed to log session');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Import sessions from Supabase (refresh from Sales Dashboard data)
  const handleImportSessions = async () => {
    // Check if employeeId is valid
    if (!employeeId) {
      setImportStatus({
        isLoading: false,
        message: 'Error: Your account is not properly configured. Please contact an administrator to set up your employee ID.',
        type: 'error'
      });
      setTimeout(() => {
        setImportStatus({ isLoading: false, message: '', type: '' });
      }, 7000);
      return;
    }

    setImportStatus({ isLoading: true, message: 'Refreshing your sessions from database...', type: 'info' });

    try {
      // Simply refresh from Supabase - all data is already there from Sales Dashboard
      const result = await SupabaseService.getOnboardingsByEmployee(employeeId);

      console.log('📥 Refresh result:', result);
      console.log('👤 Current employee ID:', employeeId);

      if (result.success) {
        const sessionCount = result.onboardings.length;
        console.log(`📊 Total sessions found: ${sessionCount}`);

        setMyOnboardings(result.onboardings);

        if (sessionCount === 0) {
          setImportStatus({
            isLoading: false,
            message: `No sessions found for you. Sessions need to be added via Sales Dashboard first.`,
            type: 'warning'
          });
        } else {
          setImportStatus({
            isLoading: false,
            message: `Successfully loaded ${sessionCount} session${sessionCount !== 1 ? 's' : ''}!`,
            type: 'success'
          });
        }
      } else {
        setImportStatus({
          isLoading: false,
          message: result.error || 'Failed to load sessions. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        isLoading: false,
        message: 'Failed to load sessions. Please try again.',
        type: 'error'
      });
    } finally {
      // Clear status message after 7 seconds
      setTimeout(() => {
        setImportStatus({ isLoading: false, message: '', type: '' });
      }, 7000);
    }
  };

  const [statusLoading, setStatusLoading] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAttendanceColor = (attendance) => {
    const colors = {
      pending: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      completed: 'bg-green-500/20 text-green-300 border-green-500/50',
      pending_approval: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/50',
      rescheduled: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      'no-show': 'bg-orange-500/20 text-orange-300 border-orange-500/50'
    };
    return colors[attendance] || colors.pending;
  };

  const getAttendanceLabel = (attendance) => {
    const labels = {
      pending: 'Pending',
      completed: 'Completed',
      pending_approval: 'Awaiting Approval',
      cancelled: 'Cancelled',
      rescheduled: 'Rescheduled',
      'no-show': 'No Show',
    };
    return labels[attendance] || 'Pending';
  };

  const handleStatusChange = async (id, newStatus) => {
    setStatusLoading(prev => ({ ...prev, [id]: true }));

    try {
      let result;
      if (newStatus === 'completed') {
        result = await SupabaseService.requestCompletion(id);
        if (result.success) {
          setNotification({
            show: true,
            message: 'Completion request sent for approval',
            type: 'success'
          });
        }
      } else {
        result = await SupabaseService.updateOnboardingStatus(id, newStatus);
        if (result.success) {
          const statusMessages = {
            'no-show': 'Session marked as No Show',
            'rescheduled': 'Session marked as Rescheduled',
            'pending': 'Session reset to Pending',
            'cancelled': 'Session marked as Cancelled'
          };
          setNotification({
            show: true,
            message: statusMessages[newStatus] || 'Status updated',
            type: 'success'
          });
        }
      }

      if (!result.success) {
        setNotification({
          show: true,
          message: 'Failed to update status',
          type: 'error'
        });
      }

      // Auto-hide notification after 2 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '', type: '' });
      }, 2000);

      // Real-time subscription will refresh the data
      await fetchMyOnboardings();
    } catch (err) {
      console.error('Status update error:', err);
      setNotification({
        show: true,
        message: 'Error updating status',
        type: 'error'
      });
      setTimeout(() => {
        setNotification({ show: false, message: '', type: '' });
      }, 2000);
    } finally {
      setStatusLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'radial-gradient(circle at top left, #1e1b4b, #312e81, #1e1b4b)', backgroundAttachment: 'fixed' }}>
      {/* Center Notification */}
      {notification.show && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-fadeIn">
          <div className={`px-6 py-4 rounded-xl shadow-2xl border-2 backdrop-blur-md text-center min-w-[300px] ${
            notification.type === 'success'
              ? 'bg-green-500/90 border-green-300 text-white'
              : 'bg-red-500/90 border-red-300 text-white'
          }`}>
            <p className="font-bold text-lg">{notification.message}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .td-glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 1rem;
        }
        .td-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding: 0.65rem 1rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .td-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.25);
        }
        .td-input::placeholder { color: rgba(148,163,184,0.6); }
        .td-label {
          display: block;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }
        .td-table th {
          padding: 0.75rem 1.25rem;
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #64748b;
          background: rgba(255,255,255,0.04);
          text-align: left;
        }
        .td-table td {
          padding: 0.85rem 1.25rem;
          font-size: 0.875rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .td-table tr:hover td { background: rgba(255,255,255,0.03); }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">My Onboarding Sessions</h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome, <span className="text-indigo-300">{currentUser?.displayName || currentUser?.email}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="td-glass px-5 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Sign Out
          </button>
        </header>

        {/* Night Shift Banner */}
        <NightShiftBanner />

        {/* Main two-column layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT — Stats + Sessions Table */}
          <section className="lg:col-span-8 space-y-6">

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="td-glass p-5 flex flex-col justify-between h-32">
                <span className="td-label">Today</span>
                <div>
                  <div className="text-4xl font-bold text-white">{stats.todayCount}</div>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">sessions</p>
                </div>
              </div>
              <div className="td-glass p-5 flex flex-col justify-between h-32">
                <span className="td-label">This Month</span>
                <div>
                  <div className="text-4xl font-bold text-indigo-300">{stats.monthCount}</div>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">sessions</p>
                </div>
              </div>
              <div className="td-glass p-5 flex flex-col justify-between h-32">
                <span className="td-label">All Time</span>
                <div>
                  <div className="text-4xl font-bold text-purple-300">{stats.totalCount}</div>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">sessions</p>
                </div>
              </div>
              <div className="td-glass p-5 flex flex-col justify-between h-32" style={{ borderColor: 'rgba(74,222,128,0.25)' }}>
                <span className="td-label" style={{ color: '#4ade80' }}>Streak</span>
                <div>
                  <div className="text-4xl font-bold text-green-400">{stats.streak}</div>
                  <p className="text-[10px] text-slate-500 uppercase mt-1">{stats.streak === 1 ? 'day' : 'days'}</p>
                </div>
              </div>
            </div>

            {/* Most Frequent Client */}
            {stats.mostFrequentClient && (
              <div className="td-glass p-5" style={{ borderColor: 'rgba(99,102,241,0.25)' }}>
                <span className="td-label">Most Frequent Client</span>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xl font-bold text-white">{stats.mostFrequentClient.name}</p>
                  <span className="text-sm bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                    {stats.mostFrequentClient.count} sessions
                  </span>
                </div>
              </div>
            )}

            {/* Sessions Table */}
            <div className="td-glass overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center flex-wrap gap-3">
                <h3 className="text-lg font-bold text-white">My Recent Sessions</h3>
                <button
                  onClick={handleImportSessions}
                  disabled={importStatus.isLoading}
                  className="text-xs bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-md font-semibold text-white transition-colors flex items-center gap-1.5"
                >
                  <svg className={`w-3.5 h-3.5 ${importStatus.isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {importStatus.isLoading ? 'Importing...' : 'Import Sessions'}
                </button>
              </div>

              {importStatus.message && (
                <div className={`mx-5 mt-4 rounded-lg p-3 border text-sm ${
                  importStatus.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
                  importStatus.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                  importStatus.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}>
                  {importStatus.message}
                </div>
              )}

              {myOnboardings.length === 0 ? (
                <p className="text-slate-500 text-center py-12 text-sm">
                  No sessions logged yet. Log your first one using the form.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full td-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Account #</th>
                        <th>Session</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myOnboardings
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 15)
                        .map((onboarding) => (
                          <tr key={onboarding.id}>
                            <td>
                              <div className="font-semibold text-white">{onboarding.clientName}</div>
                              {onboarding.notes && (
                                <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate" title={onboarding.notes}>
                                  {onboarding.notes}
                                </div>
                              )}
                            </td>
                            <td className="text-slate-400 font-mono text-xs">{onboarding.accountNumber}</td>
                            <td className="text-slate-400">#{onboarding.sessionNumber}</td>
                            <td className="text-slate-300 whitespace-nowrap">{formatDate(onboarding.date)}</td>
                            <td>
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${getAttendanceColor(onboarding.attendance)}`}>
                                {getAttendanceLabel(onboarding.attendance)}
                              </span>
                              {onboarding.attendance === 'pending_approval' && (
                                <p className="text-amber-400/60 text-[10px] mt-1">Waiting for admin</p>
                              )}
                            </td>
                            <td>
                              {onboarding.attendance !== 'completed' && (
                                <div className="flex flex-wrap gap-1">
                                  {onboarding.attendance !== 'no-show' && (
                                    <button
                                      onClick={() => handleStatusChange(onboarding.id, 'no-show')}
                                      disabled={statusLoading[onboarding.id]}
                                      className="px-2 py-0.5 text-[10px] bg-orange-500/15 text-orange-300 border border-orange-500/30 rounded hover:bg-orange-500/25 transition-all disabled:opacity-50 whitespace-nowrap"
                                    >
                                      No Show
                                    </button>
                                  )}
                                  {onboarding.attendance !== 'rescheduled' && (
                                    <button
                                      onClick={() => handleStatusChange(onboarding.id, 'rescheduled')}
                                      disabled={statusLoading[onboarding.id]}
                                      className="px-2 py-0.5 text-[10px] bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 rounded hover:bg-yellow-500/25 transition-all disabled:opacity-50 whitespace-nowrap"
                                    >
                                      Reschedule
                                    </button>
                                  )}
                                  {onboarding.attendance !== 'pending_approval' && (
                                    <button
                                      onClick={() => handleStatusChange(onboarding.id, 'completed')}
                                      disabled={statusLoading[onboarding.id]}
                                      className="px-2 py-0.5 text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/25 transition-all disabled:opacity-50 whitespace-nowrap"
                                    >
                                      Request ✓
                                    </button>
                                  )}
                                  {(onboarding.attendance === 'no-show' || onboarding.attendance === 'rescheduled' || onboarding.attendance === 'pending_approval') && (
                                    <button
                                      onClick={() => handleStatusChange(onboarding.id, 'pending')}
                                      disabled={statusLoading[onboarding.id]}
                                      className="px-2 py-0.5 text-[10px] bg-white/5 text-white/40 border border-white/10 rounded hover:bg-white/10 transition-all disabled:opacity-50"
                                    >
                                      Undo
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT — Log Session Form */}
          <aside className="lg:col-span-4">
            <div className="td-glass p-6 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-6">Log New Onboarding Session</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="td-label" htmlFor="clientName">Client Name</label>
                  <input
                    id="clientName"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    className="td-input"
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <label className="td-label" htmlFor="accountNumber">Account Number</label>
                  <input
                    id="accountNumber"
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    className="td-input"
                    placeholder="Enter account number"
                  />
                </div>

                <div>
                  <label className="td-label" htmlFor="date">Session Date</label>
                  <input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                    className="td-input"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div>
                  <label className="td-label" htmlFor="notes">Notes (Optional)</label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="td-input resize-none"
                    placeholder="e.g., Client asked about feature X, Follow-up needed, etc."
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">Add any important details or reminders</p>
                </div>

                {message && (
                  <div className={`rounded-lg p-3 border text-sm ${
                    message.startsWith('Error')
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-green-500/10 border-green-500/30 text-green-300'
                  }`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold py-3 px-4 rounded-lg text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                  style={{
                    background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.35)'
                  }}
                >
                  {loading ? 'Logging Session...' : 'Log Session'}
                </button>
              </form>
            </div>
          </aside>

        </main>
      </div>
    </div>
  );
}
