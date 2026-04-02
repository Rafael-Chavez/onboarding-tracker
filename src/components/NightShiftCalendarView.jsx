import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import ShiftTradeModal from './ShiftTradeModal';
import AdminShiftOverrideModal from './AdminShiftOverrideModal';

export default function NightShiftCalendarView({ employeeId, employeeName }) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [teamMembers] = useState([
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500', colorClass: 'primary' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500', colorClass: 'primary' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500', colorClass: 'primary' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500', colorClass: 'secondary' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500', colorClass: 'secondary' }
  ]);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedShiftForOverride, setSelectedShiftForOverride] = useState(null);

  // Load shifts for current month
  useEffect(() => {
    loadShifts();
  }, [currentDate]);

  const loadShifts = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('night_shifts')
        .select('*')
        .gte('shift_date', startOfMonth.toISOString().split('T')[0])
        .lte('shift_date', endOfMonth.toISOString().split('T')[0])
        .order('shift_date', { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        fullDate: new Date(year, month, i)
      });
    }

    // Add next month's leading days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, i)
      });
    }

    return days;
  }, [currentDate]);

  const getShiftForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.find(s => s.shift_date === dateStr);
  };

  const getEmployeeForShift = (shift) => {
    return teamMembers.find(m => m.id === shift?.employee_id);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isMyShift = (shift) => {
    return shift?.employee_id === employeeId;
  };

  const isCurrentWorkWeek = (date) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return date >= weekStart && date <= weekEnd;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getColorClass = (colorClass) => {
    const colors = {
      primary: 'bg-purple-500/10 border-purple-500/40 text-purple-300',
      secondary: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
      tertiary: 'bg-orange-500/10 border-orange-500/40 text-orange-300'
    };
    return colors[colorClass] || colors.primary;
  };

  return (
    <div className="night-shift-calendar-view">
      <style>{`
        .night-shift-calendar-view {
          padding: 32px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .rotation-banner {
          background: linear-gradient(135deg, rgba(30, 21, 53, 0.8), rgba(15, 10, 30, 0.9));
          border-left: 4px solid #c29bff;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .calendar-container {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 32px;
        }

        @media (max-width: 1400px) {
          .calendar-container {
            grid-template-columns: 1fr;
          }
        }

        .calendar-main {
          background: linear-gradient(135deg, rgba(30, 21, 53, 0.6), rgba(15, 10, 30, 0.8));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 24px;
          overflow: hidden;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .day-cell {
          aspect-ratio: 1;
          min-height: 120px;
          padding: 12px;
          border-right: 1px solid rgba(139, 92, 246, 0.1);
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          position: relative;
          transition: background-color 0.15s ease;
          cursor: default;
        }

        .day-cell.has-shift {
          cursor: pointer;
        }

        .day-cell.has-shift:hover {
          background: rgba(139, 92, 246, 0.05);
        }

        .day-cell.has-shift:hover .shift-badge {
          transform: scale(1.05);
        }

        .day-cell.inactive {
          opacity: 0.3;
        }

        .day-cell.today {
          background: rgba(194, 155, 255, 0.1);
          box-shadow: inset 0 0 20px rgba(194, 155, 255, 0.15);
        }

        .day-cell.my-shift {
          border: 2px solid #c29bff;
          background: rgba(194, 155, 255, 0.08);
        }

        .day-cell.current-week {
          background: rgba(45, 183, 242, 0.05);
        }

        .shift-badge {
          margin-top: 8px;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          border: 1px solid;
        }

        .sidebar-section {
          background: linear-gradient(135deg, rgba(30, 21, 53, 0.8), rgba(15, 10, 30, 0.9));
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 16px;
          padding: 24px;
        }

        .team-member-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 12px;
          padding: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .team-member-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(139, 92, 246, 0.2);
        }
      `}</style>

      {/* Rotation Banner */}
      <div className="rotation-banner">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Night Shift Rotation</h3>
            <p className="text-sm text-purple-300">Active sequence - 4 person rotation (Sun-Thu)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {teamMembers.slice(2).map((member, idx) => (
            <div key={member.id}>
              <div className="flex items-center bg-white/5 px-4 py-2 rounded-xl gap-3 border border-purple-500/20 shrink-0">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${member.color}`}></div>
                <span className="text-sm font-medium text-white">{member.name}</span>
              </div>
              {idx < 3 && <span className="inline-block mx-2 text-purple-400">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-container">
        {/* Main Calendar */}
        <div>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-white">{monthName}</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  ‹
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-purple-400"></div>
                <span className="text-white/70">Your shifts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500/20 border border-cyan-500/40"></div>
                <span className="text-white/70">Current week</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-main">
            {/* Day Headers */}
            <div className="calendar-grid bg-white/5 border-b border-purple-500/20">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-4 text-center text-xs font-bold text-purple-300 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="calendar-grid">
              {calendarDays.map((day, idx) => {
                const shift = getShiftForDate(day.fullDate);
                const employee = getEmployeeForShift(shift);
                const isMyShiftDay = isMyShift(shift);
                const isTodayDay = isToday(day.fullDate);
                const isWeek = isCurrentWorkWeek(day.fullDate);

                return (
                  <div
                    key={idx}
                    className={`day-cell ${!day.isCurrentMonth ? 'inactive' : ''} ${isTodayDay ? 'today' : ''} ${isMyShiftDay ? 'my-shift' : ''} ${isWeek && day.isCurrentMonth ? 'current-week' : ''} ${shift ? 'has-shift' : ''}`}
                    onClick={() => {
                      if (isAdmin && shift && day.isCurrentMonth) {
                        setSelectedShiftForOverride(shift);
                        setShowOverrideModal(true);
                      }
                    }}
                  >
                    <span className={`text-sm font-medium ${isTodayDay ? 'text-purple-300 font-bold' : 'text-white'}`}>
                      {day.date}
                    </span>
                    {shift && employee && (
                      <div className={`shift-badge ${getColorClass(employee.colorClass)}`}>
                        {employee.name} On Duty
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: Shift Trades */}
        <div className="space-y-6">
          {/* Shift Trade Availability */}
          <div className="sidebar-section">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Shift Trade Availability</h3>
              <span className="bg-white/10 px-2 py-1 rounded text-xs font-bold text-purple-300">
                {teamMembers.length} MEMBERS
              </span>
            </div>

            <div className="space-y-3">
              {teamMembers.map(member => {
                const isMe = member.id === employeeId;
                const upcomingShifts = shifts.filter(s =>
                  s.employee_id === member.id &&
                  new Date(s.shift_date) >= new Date()
                ).slice(0, 1);

                return (
                  <div key={member.id} className="team-member-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${member.color} flex items-center justify-center text-white font-bold`}>
                          {member.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {member.name} {isMe && '(You)'}
                          </p>
                          {upcomingShifts.length > 0 && (
                            <p className="text-xs text-purple-300">
                              Next: {new Date(upcomingShifts[0].shift_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      {!isMe && (
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowTradeModal(true);
                          }}
                          className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-xs font-bold text-purple-300 transition-colors"
                        >
                          Request Trade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Your Overview */}
          <div className="sidebar-section">
            <h3 className="text-lg font-bold text-white mb-6">Your Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs uppercase font-bold text-purple-300 mb-1">Upcoming Shift</p>
                  {(() => {
                    const myNextShift = shifts.find(s => s.employee_id === employeeId && new Date(s.shift_date) >= new Date());
                    if (myNextShift) {
                      const shiftDate = new Date(myNextShift.shift_date);
                      const daysUntil = Math.ceil((shiftDate - new Date()) / (1000 * 60 * 60 * 24));
                      return (
                        <>
                          <p className="text-sm font-bold text-white">
                            {shiftDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                          </p>
                          <span className="text-xs text-cyan-300 font-bold">In {daysUntil} days</span>
                        </>
                      );
                    }
                    return <p className="text-sm text-white/50">No upcoming shifts</p>;
                  })()}
                </div>
              </div>
              <div className="h-px bg-purple-500/20 w-full"></div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs uppercase font-bold text-purple-300 mb-1">Shifts This Month</p>
                  <p className="text-sm font-bold text-white">
                    {shifts.filter(s => s.employee_id === employeeId).length} shifts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Trade Modal */}
      {showTradeModal && selectedMember && (
        <ShiftTradeModal
          isOpen={showTradeModal}
          onClose={() => {
            setShowTradeModal(false);
            setSelectedMember(null);
          }}
          myEmployeeId={employeeId}
          myEmployeeName={employeeName}
          targetEmployee={selectedMember}
          targetShifts={shifts.filter(s =>
            s.employee_id === selectedMember.id &&
            new Date(s.shift_date) >= new Date()
          ).slice(0, 5)}
        />
      )}

      {/* Admin Shift Override Modal */}
      {showOverrideModal && selectedShiftForOverride && (
        <AdminShiftOverrideModal
          isOpen={showOverrideModal}
          onClose={() => {
            setShowOverrideModal(false);
            setSelectedShiftForOverride(null);
            loadShifts(); // Refresh calendar after override
          }}
          shift={selectedShiftForOverride}
          employees={teamMembers}
          adminName={employeeName}
        />
      )}
    </div>
  );
}
