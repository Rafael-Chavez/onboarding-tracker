import { useState, useCallback, useTransition, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/supabase';
import OriginalApp from '../OriginalApp';
import NightShiftCalendarView from './NightShiftCalendarView';
import EmailNotificationViewer from './EmailNotificationViewer';
import PendingApprovalsAlert from './PendingApprovalsAlert';
import SalesDashboard from './SalesDashboard';
import Sidebar from './Sidebar';

export default function AdminDashboard() {
  const { currentUser, employeeId } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isPending, startTransition] = useTransition();
  const [onboardings, setOnboardings] = useState([]);

  const handleViewChange = useCallback((newView) => {
    startTransition(() => {
      setCurrentView(newView);
    });
  }, []);

  // Load onboardings for pending approvals
  const fetchOnboardings = useCallback(async () => {
    const result = await SupabaseService.getAllOnboardings();
    if (result.success) {
      setOnboardings(result.onboardings);
    }
  }, []);

  useEffect(() => {
    fetchOnboardings();

    // Subscribe to real-time changes
    const subscription = SupabaseService.subscribeToOnboardings(() => {
      fetchOnboardings();
    });

    return () => {
      SupabaseService.unsubscribe(subscription);
    };
  }, [fetchOnboardings]);

  const pendingApprovals = useMemo(() => {
    return onboardings.filter(ob => ob.attendance === 'pending_approval');
  }, [onboardings]);

  const approveCompletion = useCallback(async (id) => {
    const result = await SupabaseService.approveCompletion(id);
    if (result.success) {
      // Real-time subscription will update the UI
    }
  }, []);

  const rejectCompletion = useCallback(async (id) => {
    const result = await SupabaseService.rejectCompletion(id);
    if (result.success) {
      // Real-time subscription will update the UI
    }
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'sales':
        return (
          <div className="p-4 md:p-8">
            <SalesDashboard />
          </div>
        );

      case 'nightshift':
        return (
          <NightShiftCalendarView
            employeeId={employeeId}
            employeeName={currentUser?.displayName || currentUser?.email || 'Admin'}
          />
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
            <div className="p-4 md:p-8">
              <PendingApprovalsAlert
                pendingApprovals={pendingApprovals}
                onApprove={approveCompletion}
                onReject={rejectCompletion}
              />
            </div>
            <OriginalApp onboardingsProp={onboardings} />
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
