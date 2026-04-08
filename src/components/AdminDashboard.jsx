import { useState, useCallback, useTransition } from 'react';
import { useAuth } from '../contexts/AuthContext';
import OriginalApp from '../OriginalApp';
import AdminShiftAssignment from './AdminShiftAssignment';
import ShiftCalendar from './ShiftCalendar';
import EmailNotificationViewer from './EmailNotificationViewer';
import Sidebar from './Sidebar';

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleViewChange = useCallback((newView) => {
    startTransition(() => {
      setCurrentView(newView);
    });
  }, []);

  const handleShiftCreated = useCallback(() => {
    // Trigger a refresh of the calendar
    setRefreshKey(prev => prev + 1);
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'nightshift':
        return (
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto mb-6">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Night Shift Manager</h2>
                <p className="text-white/60 text-sm mt-1">Assign and manage night shift schedules</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left side - Staff Assignment */}
                <div className="lg:col-span-1">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-md">
                    <h3 className="text-white font-semibold text-lg mb-4">Assign Shift</h3>
                    <AdminShiftAssignment onShiftCreated={handleShiftCreated} />
                  </div>
                </div>

                {/* Right side - Calendar View */}
                <div className="lg:col-span-2">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-md">
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
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="p-4 md:p-8">
             <div className="max-w-7xl mx-auto">
               <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Email Notifications</h2>
                <p className="text-white/60 text-sm mt-1">View logs of sent email notifications</p>
              </div>
              <EmailNotificationViewer />
             </div>
          </div>
        );

      case 'dashboard':
      default:
        return (
          <div className="admin-app-wrapper">
             <OriginalApp />
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'radial-gradient(circle at top left, #1e1b4b, #312e81, #1e1b4b)', backgroundAttachment: 'fixed' }}>
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        employeeName={currentUser?.displayName || currentUser?.email}
        isAdmin={true}
      />

      <div className={`flex-1 overflow-auto transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {renderContent()}
      </div>

      <style>{`
        .admin-app-wrapper .min-h-screen {
          min-height: auto !important;
          background: transparent !important;
          padding: 1rem !important;
        }
      `}</style>
    </div>
  );
}
