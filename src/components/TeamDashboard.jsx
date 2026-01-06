import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSheetsService } from '../services/googleSheets';

export default function TeamDashboard() {
  const { currentUser, employeeId, logout } = useAuth();
  const [clientName, setClientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [myOnboardings, setMyOnboardings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
        month: selectedDate.slice(0, 7)
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
          <h2 className="text-xl font-bold text-white mb-4">My Recent Sessions</h2>

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
