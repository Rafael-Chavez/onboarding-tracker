import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import TeamDashboard from './components/TeamDashboard';
import SalesDashboard from './components/SalesDashboard';
import EmailNotificationViewer from './components/EmailNotificationViewer';

export default function App() {
  const { currentUser, userRole, loading } = useAuth();

  // Public sales/accounting view — no login required
  if (window.location.pathname === '/sales') {
    const showDebugEmail = window.location.search.includes('debugEmail=true');
    return (
      <>
        <SalesDashboard />
        {showDebugEmail && <EmailNotificationViewer />}
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (userRole === 'admin') {
    return <AdminDashboard />;
  }

  return <TeamDashboard />;
}
