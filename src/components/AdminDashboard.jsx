import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import OriginalApp from '../OriginalApp';
import AdminShiftAssignment from './AdminShiftAssignment';
import ShiftCalendar from './ShiftCalendar';

export default function AdminDashboard() {
  const { logout, currentUser } = useAuth();
  const [showShiftManager, setShowShiftManager] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleShiftCreated = () => {
    // Trigger a refresh of the calendar
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div>
      {/* Add logout button to the header */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg px-4 py-2 border border-white/20 flex items-center gap-4">
          <span className="text-white text-sm">
            {currentUser?.displayName || currentUser?.email}
          </span>
          <button
            onClick={logout}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded border border-white/20 transition-all text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Night Shift Manager Section */}
      <div className="p-4 md:p-8" style={{ background: 'radial-gradient(circle at top left, #1e1b4b, #312e81, #1e1b4b)', backgroundAttachment: 'fixed' }}>
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Night Shift Manager</h2>
              <p className="text-white/60 text-sm mt-1">Assign and manage night shift schedules</p>
            </div>
            <button
              onClick={() => setShowShiftManager(!showShiftManager)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-2 rounded-lg text-white font-medium transition-all shadow-lg"
            >
              {showShiftManager ? 'Hide' : 'Open'} Shift Manager
            </button>
          </div>

          {showShiftManager && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left side - Staff Assignment */}
              <div className="lg:col-span-1">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <AdminShiftAssignment onShiftCreated={handleShiftCreated} />
                </div>
              </div>

              {/* Right side - Calendar View */}
              <div className="lg:col-span-2">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4">Shift Calendar</h3>
                  <ShiftCalendar
                    key={refreshKey}
                    employeeId={null}
                    onShiftSelect={(shift, date) => {
                      // Calendar is read-only for admins in this view
                      console.log('Shift selected:', shift, date);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <OriginalApp />
    </div>
  );
}
