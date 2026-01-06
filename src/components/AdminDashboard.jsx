import { useAuth } from '../contexts/AuthContext';
import OriginalApp from '../OriginalApp';

export default function AdminDashboard() {
  const { logout, currentUser } = useAuth();

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
      <OriginalApp />
    </div>
  );
}
