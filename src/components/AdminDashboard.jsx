import { useState, useCallback, useTransition, useEffect, useMemo, useRef } from 'react';
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
  const fetchTimeoutRef = useRef(null);

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

  // Debounced fetch to prevent excessive re-renders from real-time updates
  const debouncedFetchOnboardings = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchOnboardings();
    }, 300);
  }, [fetchOnboardings]);

  useEffect(() => {
    fetchOnboardings();

    // Subscribe to real-time changes with debounced updates
    const subscription = SupabaseService.subscribeToOnboardings(() => {
      debouncedFetchOnboardings();
    });

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      SupabaseService.unsubscribe(subscription);
    };
  }, [fetchOnboardings, debouncedFetchOnboardings]);

  const pendingApprovals = useMemo(() => {
    return onboardings.filter(ob => ob.attendance === 'pending_approval');
  }, [onboardings]);

  const approveCompletion = useCallback(async (id) => {
    const result = await SupabaseService.approveCompletion(id);
    return result;
  }, []);

  const rejectCompletion = useCallback(async (id) => {
    const result = await SupabaseService.rejectCompletion(id);
    return result;
  }, []);

  const addOnboarding = useCallback(async (formData) => {
    const { employeeId, clientName, accountNumber, date } = formData;
    const employees = [
      { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
      { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
      { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
      { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
      { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
    ];

    if (employeeId && clientName.trim() && accountNumber.trim()) {
      const clientOnboardings = onboardings.filter(ob =>
        ob.clientName.toLowerCase() === clientName.trim().toLowerCase()
      );
      const sessionNumber = clientOnboardings.length + 1;
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : (date || new Date().toISOString().split('T')[0]);

      const newOnboarding = {
        employeeId: parseInt(employeeId),
        employeeName: employees.find(e => e.id === parseInt(employeeId))?.name,
        clientName: clientName.trim(),
        accountNumber: accountNumber.trim(),
        sessionNumber,
        attendance: 'pending',
        date: dateStr,
        month: dateStr.slice(0, 7)
      };

      const result = await SupabaseService.createOnboarding(newOnboarding);
      return result;
    }
    return { success: false, error: 'Missing required fields' };
  }, [onboardings]);

  const deleteOnboarding = useCallback(async (id) => {
    const result = await SupabaseService.deleteOnboarding(id);
    return result;
  }, []);

  const updateOnboardingAttendance = useCallback(async (id, newAttendance) => {
    const result = await SupabaseService.updateOnboardingStatus(id, newAttendance);
    return result;
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
            <OriginalApp
              onboardings={onboardings}
              addOnboarding={addOnboarding}
              deleteOnboarding={deleteOnboarding}
              approveCompletion={approveCompletion}
              rejectCompletion={rejectCompletion}
              updateOnboardingAttendance={updateOnboardingAttendance}
            />
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
