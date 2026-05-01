import { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

function Sidebar({ currentView, onViewChange, employeeName, isAdmin = false }) {
  const { logout } = useAuth();
  const [nightShiftData, setNightShiftData] = useState({ current: null, upcoming: [], weekLabel: '' });

  const loadNightShiftData = useCallback(async () => {
    try {
      const today = new Date();
      const fourWeeksLater = new Date(today);
      fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);

      // Get shifts from today onwards
      const { data: shifts, error } = await supabase
        .from('night_shifts')
        .select('*, employee:employee_id(id, name)')
        .gte('shift_date', today.toISOString().split('T')[0])
        .lte('shift_date', fourWeeksLater.toISOString().split('T')[0])
        .order('shift_date', { ascending: true });

      if (error) throw error;

      if (shifts && shifts.length > 0) {
        // Get current week's shift
        const currentWeekShift = shifts.find(s => {
          const shiftDate = new Date(s.shift_date);
          const dayOfWeek = shiftDate.getDay();
          return dayOfWeek >= today.getDay() && shiftDate >= today;
        }) || shifts[0];

        // Get upcoming unique employees
        const upcomingEmployees = [];
        const seenEmployees = new Set([currentWeekShift.employee_id]);

        for (const shift of shifts) {
          if (!seenEmployees.has(shift.employee_id) && upcomingEmployees.length < 3) {
            seenEmployees.add(shift.employee_id);
            upcomingEmployees.push({
              name: shift.employee?.name || 'Unknown',
              color: getEmployeeColor(shift.employee_id)
            });
          }
        }

        // Format week label
        const weekStart = new Date(currentWeekShift.week_start_date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4);
        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`;

        setNightShiftData({
          current: {
            name: currentWeekShift.employee?.name || 'Unknown',
            color: getEmployeeColor(currentWeekShift.employee_id)
          },
          upcoming: upcomingEmployees,
          weekLabel
        });
      }
    } catch (error) {
      console.error('Error loading night shift data:', error);
    }
  }, []);

  useEffect(() => {
    loadNightShiftData();
  }, [loadNightShiftData]);

  const getEmployeeColor = useCallback((employeeId) => {
    const colorMap = {
      1: 'from-cyan-500 to-blue-500',
      3: 'from-green-500 to-teal-500',
      4: 'from-orange-500 to-red-500',
      5: 'from-indigo-500 to-purple-500',
      6: 'from-rose-500 to-pink-500'
    };
    return colorMap[employeeId] || 'from-purple-500 to-pink-500';
  }, []);

  const { current, upcoming } = nightShiftData;

  const menuItems = isAdmin ? [
    { id: 'dashboard', icon: '📊', label: 'Admin Dashboard' },
    { id: 'sales', icon: '💰', label: 'Sales Channel' },
    { id: 'nightshift', icon: '🌙', label: 'Night Shift Manager' },
    { id: 'notifications', icon: '📧', label: 'Notifications' },
  ] : [
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
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        .sidebar-header {
          margin-bottom: 32px;
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
          will-change: auto;
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

        .night-shift-widget {
          margin-top: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
        }

        .widget-title {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .current-person {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .mini-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: white;
        }

        .person-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
        }

        .person-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
        }

        .upcoming-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .upcoming-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .upcoming-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .upcoming-name {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
        }

        .sidebar-footer {
          margin-top: 24px;
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
          overflow: hidden;
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
          flex-shrink: 0;
        }

        .user-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }

        .user-role {
          font-size: 11px;
          color: rgba(168, 85, 247, 0.8);
          text-transform: capitalize;
          line-height: 1.3;
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
          will-change: auto;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="sidebar-header">
        <div className="sidebar-title">Onboarding</div>
        <div className="sidebar-subtitle">{isAdmin ? 'ADMIN CONSOLE' : 'MANAGEMENT CONSOLE'}</div>
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

        {/* Night Shift Sidebar Widget */}
        {current && (
          <div className="night-shift-widget">
            <div className="widget-title">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse-slow" />
              Night Shift
            </div>

            <div className="current-person">
              <div className={`mini-avatar bg-gradient-to-br ${current.color} ring-1 ring-white/20`}>
                {current.name[0]}
              </div>
              <div>
                <div className="person-name">{current.name}</div>
                <div className="person-label">Current Duty</div>
              </div>
            </div>

            <div className="upcoming-list">
              {upcoming.slice(0, 3).map((person, idx) => (
                <div key={`${person.name}-${idx}`} className="upcoming-item">
                  <div className={`upcoming-dot bg-gradient-to-br ${person.color}`} />
                  <span className="upcoming-name">{person.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {(employeeName || 'U')[0].toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-name">
              {employeeName
                ? (employeeName.includes('@')
                    ? employeeName.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ')
                    : employeeName)
                : 'User'}
            </div>
            <div className="user-role">{isAdmin ? 'Administrator' : 'Team Member'}</div>
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
