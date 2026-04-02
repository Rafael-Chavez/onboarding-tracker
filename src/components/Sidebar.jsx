import { useAuth } from '../contexts/AuthContext';
import { memo } from 'react';

function Sidebar({ currentView, onViewChange, employeeName }) {
  const { logout } = useAuth();

  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'sessions', icon: '📅', label: 'Sessions' },
    { id: 'calendar', icon: '🌙', label: 'Night Shift Calendar' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div className="sidebar-container">
      <style>{`
        .sidebar-container {
          width: 240px;
          background: linear-gradient(180deg, #1a1535 0%, #0f0a1e 100%);
          min-height: 100vh;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(139, 92, 246, 0.2);
        }

        .sidebar-header {
          margin-bottom: 40px;
        }

        .sidebar-title {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
          letter-spacing: -0.5px;
        }

        .sidebar-subtitle {
          font-size: 11px;
          font-weight: 500;
          color: rgba(168, 85, 247, 0.7);
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .sidebar-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          font-weight: 500;
        }

        .menu-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }

        .menu-item.active {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3));
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .menu-item-icon {
          font-size: 18px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          color: white;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin-bottom: 2px;
        }

        .user-role {
          font-size: 11px;
          color: rgba(168, 85, 247, 0.8);
        }

        .logout-btn {
          width: 100%;
          padding: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: rgba(239, 68, 68, 0.9);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }
      `}</style>

      <div className="sidebar-header">
        <div className="sidebar-title">Onboarding</div>
        <div className="sidebar-subtitle">MANAGEMENT CONSOLE</div>
      </div>

      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="menu-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {employeeName?.[0] || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{employeeName || 'User'}</div>
            <div className="user-role">Team Member</div>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default memo(Sidebar);
