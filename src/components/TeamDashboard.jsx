import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSheetsService } from '../services/googleSheets';

export default function TeamDashboard() {
  const { currentUser, employeeId, logout } = useAuth();
  const [clientName, setClientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [myOnboardings, setMyOnboardings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState({ isLoading: false, message: '', type: '' });
  const [importStatus, setImportStatus] = useState({ isLoading: false, message: '', type: '' });
  const [employees] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 2, name: 'Danreb', color: 'from-purple-500 to-pink-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
  ]);

  // Load onboardings from localStorage
  const loadFromStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  // Fetch user's onboardings from localStorage
  const fetchMyOnboardings = () => {
    if (!employeeId) return;

    try {
      const allOnboardings = loadFromStorage('onboardings', []);
      const myOnboardings = allOnboardings.filter(ob => ob.employeeId === employeeId);
      setMyOnboardings(myOnboardings);
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

    // Listen for storage changes from other tabs/windows (like admin dashboard)
    const handleStorageChange = (e) => {
      if (e.key === 'onboardings') {
        fetchMyOnboardings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [employeeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Load all existing onboardings
      const allOnboardings = loadFromStorage('onboardings', []);

      // Find existing onboardings for this client to determine session number
      const clientOnboardings = allOnboardings.filter(ob =>
        ob.clientName.toLowerCase() === clientName.trim().toLowerCase()
      );
      const sessionNumber = clientOnboardings.length + 1;

      // Create the new onboarding entry
      const newOnboarding = {
        id: Date.now(),
        employeeId: employeeId,
        employeeName: employees.find(e => e.id === employeeId)?.name,
        clientName: clientName.trim(),
        accountNumber: accountNumber.trim(),
        sessionNumber,
        attendance: 'pending',
        date: selectedDate,
        month: selectedDate.slice(0, 7),
        notes: notes.trim() || undefined  // Only add notes if provided
      };

      // Update localStorage
      const updatedOnboardings = [...allOnboardings, newOnboarding];
      localStorage.setItem('onboardings', JSON.stringify(updatedOnboardings));

      // Sync to Google Sheets
      setMessage('Syncing to Google Sheets...');
      try {
        await GoogleSheetsService.appendOnboarding(newOnboarding);
        setMessage('Onboarding session logged successfully!');
      } catch (syncError) {
        console.error('Google Sheets sync error:', syncError);
        setMessage('Session logged locally. Google Sheets sync may have failed.');
      }

      // Clear form
      setClientName('');
      setAccountNumber('');
      setNotes('');

      // Refresh the list
      fetchMyOnboardings();
    } catch (err) {
      console.error('Error logging onboarding:', err);
      setMessage('Error: Failed to log session');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Import sessions from Google Sheets
  const handleImportSessions = async () => {
    setImportStatus({ isLoading: true, message: 'Importing your sessions from Google Sheets...', type: 'info' });

    try {
      const result = await GoogleSheetsService.importFromGoogleSheetsAPI();

      if (result.success && result.onboardings) {
        // Filter to only this team member's sessions
        const mySessions = result.onboardings.filter(ob => ob.employeeId === employeeId);

        if (mySessions.length === 0) {
          setImportStatus({
            isLoading: false,
            message: 'No sessions found for you in Google Sheets.',
            type: 'warning'
          });
        } else {
          // Load existing onboardings from localStorage
          const existingOnboardings = loadFromStorage('onboardings', []);

          // Merge with existing (avoid duplicates by checking date + client + account)
          const existingKeys = new Set(
            existingOnboardings.map(ob => `${ob.date}-${ob.clientName}-${ob.accountNumber}`)
          );

          const newSessions = mySessions.filter(ob =>
            !existingKeys.has(`${ob.date}-${ob.clientName}-${ob.accountNumber}`)
          );

          if (newSessions.length === 0) {
            setImportStatus({
              isLoading: false,
              message: 'All your sessions are already up to date!',
              type: 'success'
            });
          } else {
            // Add new sessions to localStorage
            const updatedOnboardings = [...existingOnboardings, ...newSessions];
            localStorage.setItem('onboardings', JSON.stringify(updatedOnboardings));

            setImportStatus({
              isLoading: false,
              message: `Successfully imported ${newSessions.length} new session${newSessions.length !== 1 ? 's' : ''} from Google Sheets!`,
              type: 'success'
            });

            // Refresh the list
            fetchMyOnboardings();
          }
        }
      } else {
        setImportStatus({
          isLoading: false,
          message: result.error || 'Failed to import sessions. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        isLoading: false,
        message: 'Failed to import sessions. Please try again.',
        type: 'error'
      });
    }

    // Clear status message after 7 seconds
    setTimeout(() => {
      setImportStatus({ isLoading: false, message: '', type: '' });
    }, 7000);
  };

  // Manual sync function for team members
  const handleManualSync = async () => {
    setSyncStatus({ isLoading: true, message: 'Syncing your sessions to Google Sheets...', type: 'info' });

    try {
      let successCount = 0;
      let errorCount = 0;

      // Sync all of the team member's sessions
      for (const onboarding of myOnboardings) {
        try {
          await GoogleSheetsService.appendOnboarding(onboarding);
          successCount++;
        } catch (error) {
          console.error(`Error syncing session ${onboarding.id}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        setSyncStatus({
          isLoading: false,
          message: `Successfully synced ${successCount} session${successCount !== 1 ? 's' : ''} to Google Sheets!`,
          type: 'success'
        });
      } else {
        setSyncStatus({
          isLoading: false,
          message: `Synced ${successCount} session${successCount !== 1 ? 's' : ''}, but ${errorCount} failed. Check console for details.`,
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus({
        isLoading: false,
        message: 'Failed to sync sessions. Please try again.',
        type: 'error'
      });
    }

    // Clear status message after 5 seconds
    setTimeout(() => {
      setSyncStatus({ isLoading: false, message: '', type: '' });
    }, 5000);
  };

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
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/50',
      rescheduled: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      'no-show': 'bg-orange-500/20 text-orange-300 border-orange-500/50'
    };
    return colors[attendance] || colors.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                My Onboarding Sessions
              </h1>
              <p className="text-gray-300">
                Welcome, {currentUser?.displayName || currentUser?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-4 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">Today</div>
            <div className="text-3xl font-bold text-white">{stats.todayCount}</div>
            <div className="text-gray-300 text-xs mt-1">sessions</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-4 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">This Month</div>
            <div className="text-3xl font-bold text-blue-400">{stats.monthCount}</div>
            <div className="text-gray-300 text-xs mt-1">sessions</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-4 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">All Time</div>
            <div className="text-3xl font-bold text-purple-400">{stats.totalCount}</div>
            <div className="text-gray-300 text-xs mt-1">sessions</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-4 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">Streak</div>
            <div className="text-3xl font-bold text-green-400">{stats.streak}</div>
            <div className="text-gray-300 text-xs mt-1">{stats.streak === 1 ? 'day' : 'days'}</div>
          </div>
        </div>

        {/* Most Frequent Client */}
        {stats.mostFrequentClient && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-4 mb-6 border border-white/20">
            <div className="text-gray-400 text-sm mb-1">Most Frequent Client</div>
            <div className="text-xl font-bold text-white">{stats.mostFrequentClient.name}</div>
            <div className="text-gray-300 text-sm mt-1">{stats.mostFrequentClient.count} sessions</div>
          </div>
        )}

        {/* Log New Session Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Log New Onboarding Session</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-200 mb-2">
                Client Name
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-200 mb-2">
                Account Number
              </label>
              <input
                id="accountNumber"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter account number"
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-200 mb-2">
                Session Date
              </label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-200 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="e.g., Client asked about feature X, Follow-up needed, etc."
              />
              <p className="text-gray-400 text-xs mt-1">Add any important details or reminders about this session</p>
            </div>

            {message && (
              <div className={`rounded-lg p-3 border ${
                message.startsWith('Error')
                  ? 'bg-red-500/10 border-red-500/50 text-red-300'
                  : 'bg-green-500/10 border-green-500/50 text-green-300'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Logging Session...' : 'Log Session'}
            </button>
          </form>
        </div>

        {/* My Recent Sessions */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-xl font-bold text-white">My Recent Sessions</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportSessions}
                disabled={importStatus.isLoading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${importStatus.isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {importStatus.isLoading ? 'Importing...' : 'Import Sessions'}
              </button>
              {myOnboardings.length > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={syncStatus.isLoading}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <svg className={`w-4 h-4 ${syncStatus.isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncStatus.isLoading ? 'Syncing...' : 'Sync to Sheets'}
                </button>
              )}
            </div>
          </div>

          {importStatus.message && (
            <div className={`rounded-lg p-3 mb-4 border ${
              importStatus.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-300' :
              importStatus.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-300' :
              importStatus.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300' :
              'bg-blue-500/10 border-blue-500/50 text-blue-300'
            }`}>
              {importStatus.message}
            </div>
          )}

          {syncStatus.message && (
            <div className={`rounded-lg p-3 mb-4 border ${
              syncStatus.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-300' :
              syncStatus.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-300' :
              syncStatus.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300' :
              'bg-blue-500/10 border-blue-500/50 text-blue-300'
            }`}>
              {syncStatus.message}
            </div>
          )}

          {myOnboardings.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No sessions logged yet. Submit your first one above!
            </p>
          ) : (
            <div className="space-y-3">
              {myOnboardings
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10)
                .map((onboarding) => (
                  <div
                    key={onboarding.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">
                          {onboarding.clientName}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Account: {onboarding.accountNumber}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Session #{onboarding.sessionNumber}
                        </p>
                        {onboarding.notes && (
                          <div className="mt-2 p-2 bg-white/5 rounded border border-white/10">
                            <p className="text-gray-300 text-sm">
                              <span className="text-gray-400 font-medium">Notes:</span> {onboarding.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300 text-sm mb-2">
                          {formatDate(onboarding.date)}
                        </p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getAttendanceColor(onboarding.attendance)}`}>
                          {onboarding.attendance}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
