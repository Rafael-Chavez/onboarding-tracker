import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../config/supabase';
import ShiftTradeModal from './ShiftTradeModal';

export default function TeamMembersView({ currentEmployeeId, currentEmployeeName }) {
  const [teamMembers] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500', role: 'Senior Onboarding Specialist' },
    { id: 2, name: 'Danreb', color: 'from-purple-500 to-pink-500', role: 'Onboarding Specialist' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500', role: 'Lead Onboarding Specialist' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500', role: 'Onboarding Specialist' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500', role: 'Senior Onboarding Specialist' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500', role: 'Onboarding Specialist' }
  ]);

  const [memberShifts, setMemberShifts] = useState({});
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedShifts, setSelectedShifts] = useState(null);

  useEffect(() => {
    loadAllMemberShifts();
  }, [loadAllMemberShifts]);

  const loadAllMemberShifts = useCallback(async () => {
    try {
      const today = new Date();
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      const { data, error } = await supabase
        .from('night_shifts')
        .select('*')
        .gte('shift_date', today.toISOString().split('T')[0])
        .lte('shift_date', threeMonthsLater.toISOString().split('T')[0])
        .eq('status', 'scheduled')
        .order('shift_date', { ascending: true });

      if (error) throw error;

      // Group shifts by employee and then by week
      const shiftsByMember = {};
      data?.forEach(shift => {
        if (!shiftsByMember[shift.employee_id]) {
          shiftsByMember[shift.employee_id] = {};
        }
        const weekStart = shift.week_start_date;
        if (!shiftsByMember[shift.employee_id][weekStart]) {
          shiftsByMember[shift.employee_id][weekStart] = [];
        }
        shiftsByMember[shift.employee_id][weekStart].push(shift);
      });

      setMemberShifts(shiftsByMember);
    } catch (error) {
      console.error('Error loading member shifts:', error);
    }
  }, []);

  const handleTradeClick = useCallback((member) => {
    const memberWeekShifts = memberShifts[member.id];
    if (!memberWeekShifts || Object.keys(memberWeekShifts).length === 0) {
      alert(`${member.name} has no available shifts to trade.`);
      return;
    }

    // Get the first available week
    const firstWeek = Object.keys(memberWeekShifts).sort()[0];
    const shifts = memberWeekShifts[firstWeek];

    setSelectedMember(member);
    setSelectedShifts(shifts);
    setShowTradeModal(true);
  }, [memberShifts]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatWeekRange = (weekStartStr) => {
    const sunday = new Date(weekStartStr);
    const thursday = new Date(sunday);
    thursday.setDate(thursday.getDate() + 4);

    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(sunday)} – ${fmt(thursday)}`;
  };

  return (
    <div className="team-members-view">
      <style>{`
        .team-members-view {
          padding: 32px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .view-header {
          margin-bottom: 32px;
        }

        .view-title {
          font-size: 32px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }

        .view-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 24px;
        }

        .member-card {
          background: linear-gradient(135deg, rgba(30, 21, 53, 0.8), rgba(15, 10, 30, 0.9));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 16px;
          padding: 24px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          will-change: transform;
        }

        .member-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
          border-color: rgba(139, 92, 246, 0.4);
        }

        .member-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .member-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-from), var(--color-to));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .member-info {
          flex: 1;
        }

        .member-name {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .member-role {
          font-size: 13px;
          color: rgba(168, 85, 247, 0.8);
          font-weight: 500;
        }

        .member-shifts {
          margin-bottom: 20px;
        }

        .shifts-header {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .shift-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .shift-list::-webkit-scrollbar {
          width: 6px;
        }

        .shift-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .shift-list::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 3px;
        }

        .shift-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          font-size: 13px;
        }

        .shift-week {
          color: white;
          font-weight: 600;
        }

        .shift-days {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
        }

        .no-shifts {
          text-align: center;
          padding: 24px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
        }

        .trade-button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .trade-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
        }

        .trade-button:active {
          transform: translateY(0);
        }

        .trade-button:disabled {
          background: rgba(255, 255, 255, 0.1);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .current-user-badge {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: rgba(34, 197, 94, 1);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="view-header">
        <h1 className="view-title">Team Members</h1>
        <p className="view-subtitle">View team members and trade night shifts</p>
      </div>

      <div className="members-grid">
        {teamMembers.map((member) => {
          const isCurrentUser = member.id === currentEmployeeId;
          const shifts = memberShifts[member.id] || {};
          const weekStarts = Object.keys(shifts).sort().slice(0, 5); // Show next 5 weeks

          // Get color values for gradient
          const colorClass = member.color;
          const colorFrom = colorClass.includes('cyan') ? '#06b6d4' :
                          colorClass.includes('purple') && colorClass.includes('pink') ? '#a855f7' :
                          colorClass.includes('green') ? '#22c55e' :
                          colorClass.includes('orange') ? '#f97316' :
                          colorClass.includes('indigo') ? '#6366f1' :
                          colorClass.includes('rose') ? '#ec4899' : '#8b5cf6';
          const colorTo = colorClass.includes('cyan') ? '#3b82f6' :
                        colorClass.includes('purple') && colorClass.includes('pink') ? '#ec4899' :
                        colorClass.includes('green') ? '#14b8a6' :
                        colorClass.includes('orange') ? '#ef4444' :
                        colorClass.includes('indigo') ? '#8b5cf6' :
                        colorClass.includes('rose') ? '#ec4899' : '#ec4899';

          return (
            <div key={member.id} className="member-card">
              <div className="member-header">
                <div
                  className="member-avatar"
                  style={{ '--color-from': colorFrom, '--color-to': colorTo }}
                >
                  {member.name[0]}
                </div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-role">{member.role}</div>
                </div>
                {isCurrentUser && (
                  <div className="current-user-badge">You</div>
                )}
              </div>

              <div className="member-shifts">
                <div className="shifts-header">Upcoming Night Shifts</div>
                {weekStarts.length > 0 ? (
                  <div className="shift-list">
                    {weekStarts.map((weekStart) => (
                      <div key={weekStart} className="shift-item">
                        <div>
                          <div className="shift-week">{formatWeekRange(weekStart)}</div>
                          <div className="shift-days">{shifts[weekStart].length} days (Sun-Thu)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-shifts">No upcoming shifts scheduled</div>
                )}
              </div>

              <button
                className="trade-button"
                disabled={isCurrentUser || weekStarts.length === 0}
                onClick={() => handleTradeClick(member)}
              >
                {isCurrentUser ? 'This is You' : 'Request Trade'}
              </button>
            </div>
          );
        })}
      </div>

      <ShiftTradeModal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setSelectedMember(null);
          setSelectedShifts(null);
        }}
        myEmployeeId={currentEmployeeId}
        myEmployeeName={currentEmployeeName}
        targetEmployee={selectedMember}
        targetShifts={selectedShifts}
      />
    </div>
  );
}
