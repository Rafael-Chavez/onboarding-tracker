import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export default function TeamShiftSelector({ myEmployeeId, myEmployeeName, onTradeRequest }) {
  const [teamShifts, setTeamShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const employees = [
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
  ];

  useEffect(() => {
    loadUpcomingShifts();
  }, []);

  const loadUpcomingShifts = async () => {
    try {
      setLoading(true);

      // Get the next 4 weeks of shifts for all team members
      const today = new Date();
      const fourWeeksLater = new Date(today);
      fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);

      const { data, error } = await supabase
        .from('night_shifts')
        .select(`
          *,
          employee:employees(id, name, color)
        `)
        .gte('shift_date', today.toISOString().split('T')[0])
        .lte('shift_date', fourWeeksLater.toISOString().split('T')[0])
        .eq('status', 'scheduled')
        .order('shift_date', { ascending: true });

      if (error) throw error;

      // Group shifts by employee and week
      const groupedByEmployee = {};
      employees.forEach(emp => {
        groupedByEmployee[emp.id] = {
          employee: emp,
          weeks: []
        };
      });

      data?.forEach(shift => {
        const empId = shift.employee_id;
        if (groupedByEmployee[empId]) {
          // Find or create week group
          const weekStart = shift.week_start_date;
          let weekGroup = groupedByEmployee[empId].weeks.find(w => w.weekStart === weekStart);

          if (!weekGroup) {
            weekGroup = {
              weekStart,
              shifts: []
            };
            groupedByEmployee[empId].weeks.push(weekGroup);
          }

          weekGroup.shifts.push(shift);
        }
      });

      setTeamShifts(Object.values(groupedByEmployee));
    } catch (error) {
      console.error('Error loading team shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatWeekRange = (weekStartStr) => {
    const sunday = new Date(weekStartStr);
    const thursday = new Date(sunday);
    thursday.setDate(thursday.getDate() + 4); // Sunday to Thursday

    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(sunday)} – ${fmt(thursday)}`;
  };

  const handleTeamMemberClick = (teamMember) => {
    // Don't allow trading with yourself
    if (teamMember.employee.id === myEmployeeId) {
      return;
    }

    // Get the next available week for this team member
    const nextWeek = teamMember.weeks[0];
    if (!nextWeek || nextWeek.shifts.length === 0) {
      alert(`${teamMember.employee.name} has no upcoming shifts available for trading.`);
      return;
    }

    const weekRange = formatWeekRange(nextWeek.weekStart);
    const confirmed = window.confirm(
      `Do you want to trade shifts with ${teamMember.employee.name}?\n\n` +
      `Their week: ${weekRange}\n` +
      `Days: Sunday - Thursday\n\n` +
      `Click OK to select your shift to trade.`
    );

    if (confirmed && onTradeRequest) {
      onTradeRequest(teamMember.employee, nextWeek.shifts);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-white/60 py-8">
        Loading team shifts...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold text-lg mb-3">Select Team Member to Trade With</h3>
        <p className="text-white/60 text-sm mb-4">
          Click on a team member's icon to request a shift trade with them
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {teamShifts.map((teamMember) => {
          const isMe = teamMember.employee.id === myEmployeeId;
          const nextWeek = teamMember.weeks[0];
          const hasShifts = nextWeek && nextWeek.shifts.length > 0;

          return (
            <button
              key={teamMember.employee.id}
              onClick={() => handleTeamMemberClick(teamMember)}
              disabled={isMe || !hasShifts}
              className={`
                relative p-4 rounded-xl border-2 transition-all
                ${isMe
                  ? 'bg-white/5 border-white/20 cursor-default opacity-50'
                  : hasShifts
                    ? 'bg-white/5 border-white/10 hover:border-purple-500 hover:bg-white/10 cursor-pointer transform hover:scale-105'
                    : 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                }
              `}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className={`
                  w-16 h-16 rounded-full bg-gradient-to-br ${teamMember.employee.color}
                  flex items-center justify-center text-white font-bold text-2xl shadow-lg
                  ${!isMe && hasShifts ? 'ring-2 ring-white/20' : ''}
                `}>
                  {teamMember.employee.name[0]}
                </div>

                <div className="mt-3 text-center">
                  <div className="text-white font-semibold">
                    {teamMember.employee.name}
                    {isMe && <span className="text-purple-400 text-xs ml-1">(You)</span>}
                  </div>

                  {nextWeek && hasShifts && !isMe && (
                    <div className="text-white/60 text-xs mt-1">
                      {formatWeekRange(nextWeek.weekStart)}
                    </div>
                  )}

                  {!hasShifts && !isMe && (
                    <div className="text-white/40 text-xs mt-1">
                      No shifts available
                    </div>
                  )}
                </div>

                {/* Shift count badge */}
                {nextWeek && hasShifts && !isMe && (
                  <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {teamMember.weeks.length}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-2 text-blue-200 text-sm">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <strong>Night Shift Week:</strong> Sunday - Thursday (5 days). After clicking a team member, you'll be able to select which of your weeks to trade.
          </div>
        </div>
      </div>
    </div>
  );
}
