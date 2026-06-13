import { useState, useCallback, useTransition, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../services/supabase';
import { GoogleSheetsService } from '../services/googleSheets';
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
  const [syncStatus, setSyncStatus] = useState({ isLoading: false, message: '', type: '' });
  const [autoSync, setAutoSync] = useState(() => {
    try {
      const item = localStorage.getItem('autoSync');
      return item ? JSON.parse(item) : true;
    } catch (error) {
      return true;
    }
  });
  const fetchTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('autoSync', JSON.stringify(autoSync));
  }, [autoSync]);

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

  // Pre-index onboardings by date for O(1) lookup
  const onboardingsByDate = useMemo(() => {
    const map = new Map();
    onboardings.forEach(ob => {
      if (!map.has(ob.date)) {
        map.set(ob.date, []);
      }
      map.get(ob.date).push(ob);
    });
    return map;
  }, [onboardings]);

  // Pre-index onboardings by month for statistics
  const onboardingsByMonth = useMemo(() => {
    const map = new Map();
    onboardings.forEach(ob => {
      if (!map.has(ob.month)) {
        map.set(ob.month, []);
      }
      map.get(ob.month).push(ob);
    });
    return map;
  }, [onboardings]);

  const addOnboarding = useCallback(async (formData, employees, selectedDate) => {
    const { employeeId, clientName, accountNumber } = formData;
    if (employeeId && clientName && accountNumber) {
      const clientOnboardings = onboardings.filter(ob =>
        ob.clientName.toLowerCase() === clientName.toLowerCase()
      );
      const sessionNumber = clientOnboardings.length + 1;

      const newOnboarding = {
        employeeId: parseInt(employeeId),
        employeeName: employees.find(e => e.id === parseInt(employeeId))?.name,
        clientName: clientName,
        accountNumber: accountNumber,
        sessionNumber,
        attendance: 'pending',
        date: selectedDate.toISOString().split('T')[0],
        month: selectedDate.toISOString().slice(0, 7)
      };

      const result = await SupabaseService.createOnboarding(newOnboarding);

      if (result.success) {
        if (autoSync) {
          setSyncStatus({ isLoading: true, message: 'Auto-syncing to Google Sheets...', type: '' });
          try {
            await GoogleSheetsService.appendOnboarding({
              ...newOnboarding,
              id: result.onboarding.id
            });
            setSyncStatus({ isLoading: false, message: 'Successfully synced to Google Sheets!', type: 'success' });
            setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 2000);
          } catch (error) {
            setSyncStatus({ isLoading: false, message: `Auto-sync to Sheets failed: ${error.message}`, type: 'error' });
            setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 4000);
          }
        }
        return { success: true };
      } else {
        setSyncStatus({ isLoading: false, message: `Failed to add session: ${result.error}`, type: 'error' });
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 4000);
        return { success: false, error: result.error };
      }
    }
    return { success: false, error: 'Missing required fields' };
  }, [onboardings, autoSync]);

  const deleteOnboarding = useCallback(async (id) => {
    const result = await SupabaseService.deleteOnboarding(id);
    if (!result.success) {
      setSyncStatus({ isLoading: false, message: `Failed to delete: ${result.error}`, type: 'error' });
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000);
    }
  }, []);

  const approveCompletion = useCallback(async (id) => {
    setSyncStatus({ isLoading: true, message: 'Approving completion...', type: '' });
    const result = await SupabaseService.approveCompletion(id);
    if (result.success) {
      setSyncStatus({ isLoading: false, message: '✓ Session marked as completed!', type: 'success' });
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 2000);
      if (autoSync) {
        try {
          await GoogleSheetsService.updateOnboarding(result.onboarding);
        } catch (error) {
          console.error('Error syncing to Google Sheets:', error);
        }
      }
    } else {
      setSyncStatus({ isLoading: false, message: `✗ Error approving: ${result.error}`, type: 'error' });
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000);
    }
  }, [autoSync]);

  const rejectCompletion = useCallback(async (id) => {
    setSyncStatus({ isLoading: true, message: 'Rejecting completion...', type: '' });
    const result = await SupabaseService.rejectCompletion(id);
    if (result.success) {
      setSyncStatus({ isLoading: false, message: '✓ Session marked as pending', type: 'success' });
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 2000);
      if (autoSync) {
        try {
          await GoogleSheetsService.updateOnboarding(result.onboarding);
        } catch (error) {
          console.error('Error syncing to Google Sheets:', error);
        }
      }
    } else {
      setSyncStatus({ isLoading: false, message: `✗ Error rejecting: ${result.error}`, type: 'error' });
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000);
    }
  }, [autoSync]);

  const updateOnboardingAttendance = useCallback(async (id, newAttendance) => {
    const result = await SupabaseService.updateOnboardingStatus(id, newAttendance);
    if (result.success) {
      if (autoSync) {
        try {
          await GoogleSheetsService.updateOnboarding(result.onboarding);
        } catch (error) {
          console.error('Error syncing attendance update to Sheets:', error);
        }
      }
    }
  }, [autoSync]);

  const testSheetsConnection = useCallback(async () => {
    setSyncStatus({ isLoading: true, message: 'Testing Google Sheets connection...', type: '' });
    try {
      const result = await GoogleSheetsService.testConnection();
      if (result.success) {
        setSyncStatus({ isLoading: false, message: 'Google Sheets connection successful!', type: 'success' });
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000);
      } else {
        setSyncStatus({ isLoading: false, message: `Connection failed: ${result.error}`, type: 'error' });
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000);
      }
    } catch (error) {
      setSyncStatus({ isLoading: false, message: `Connection test failed: ${error.message}`, type: 'error' });
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000);
    }
  }, []);

  const importFromGoogleSheets = useCallback(async () => {
    setSyncStatus({ isLoading: true, message: 'Importing data from Google Sheets...', type: '' });
    try {
      let result = await GoogleSheetsService.importFromGoogleSheetsAPI();
      if (!result.success && result.error.includes('403')) {
        setSyncStatus({ isLoading: true, message: 'API access denied, trying alternative method...', type: '' });
        result = await GoogleSheetsService.importFromGoogleAppsScript();
      }

      if (result.success) {
        if (result.onboardings && result.onboardings.length > 0) {
          const existingMap = new Map();
          onboardings.forEach(ob => {
            const key = `${ob.date}-${ob.clientName}-${ob.accountNumber}`;
            existingMap.set(key, ob);
          });

          const newOnboardings = result.onboardings.filter(importedOb => {
            const key = `${importedOb.date}-${importedOb.clientName}-${importedOb.accountNumber}`;
            return !existingMap.has(key);
          });

          if (newOnboardings.length > 0) {
            let successCount = 0;
            for (const onboarding of newOnboardings) {
              const importResult = await SupabaseService.createOnboarding(onboarding);
              if (importResult.success) successCount++;
            }
            setSyncStatus({
              isLoading: false,
              message: `Successfully imported ${successCount} new onboarding${successCount !== 1 ? 's' : ''} from Google Sheets!`,
              type: 'success'
            });
          } else {
            setSyncStatus({ isLoading: false, message: 'No new data to import.', type: 'success' });
          }
        } else {
          setSyncStatus({ isLoading: false, message: result.message || 'No data found in Google Sheet', type: 'success' });
        }
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 3000);
      } else {
        setSyncStatus({ isLoading: false, message: `Import failed: ${result.error}`, type: 'error' });
        setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000);
      }
    } catch (error) {
      setSyncStatus({ isLoading: false, message: `Import failed: ${error.message}`, type: 'error' });
      setTimeout(() => setSyncStatus({ isLoading: false, message: '', type: '' }), 5000);
    }
  }, [onboardings]);

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
              onboardingsByDate={onboardingsByDate}
              onboardingsByMonth={onboardingsByMonth}
              syncStatus={syncStatus}
              autoSync={autoSync}
              setAutoSync={setAutoSync}
              addOnboarding={addOnboarding}
              deleteOnboarding={deleteOnboarding}
              approveCompletion={approveCompletion}
              rejectCompletion={rejectCompletion}
              updateOnboardingAttendance={updateOnboardingAttendance}
              importFromGoogleSheets={importFromGoogleSheets}
              testSheetsConnection={testSheetsConnection}
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
