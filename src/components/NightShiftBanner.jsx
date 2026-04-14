import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export default function NightShiftBanner() {
  const [nightShiftData, setNightShiftData] = useState({ current: null, upcoming: [], weekLabel: '' });

  useEffect(() => {
    loadNightShiftData();
  }, []);

  const loadNightShiftData = async () => {
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
          if (!seenEmployees.has(shift.employee_id) && upcomingEmployees.length < 4) {
            seenEmployees.add(shift.employee_id);
            upcomingEmployees.push({
              name: shift.employee?.name || 'Unknown',
              color: getEmployeeColor(shift.employee_id),
              textColor: getEmployeeTextColor(shift.employee_id)
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
            color: getEmployeeColor(currentWeekShift.employee_id),
            textColor: getEmployeeTextColor(currentWeekShift.employee_id)
          },
          upcoming: upcomingEmployees,
          weekLabel
        });
      }
    } catch (error) {
      console.error('Error loading night shift data:', error);
    }
  };

  const getEmployeeColor = (employeeId) => {
    const colorMap = {
      1: 'from-cyan-500 to-blue-500',
      3: 'from-green-500 to-teal-500',
      4: 'from-orange-500 to-red-500',
      5: 'from-indigo-500 to-purple-500',
      6: 'from-rose-500 to-pink-500'
    };
    return colorMap[employeeId] || 'from-purple-500 to-pink-500';
  };

  const getEmployeeTextColor = (employeeId) => {
    const colorMap = {
      1: 'text-cyan-300',
      3: 'text-green-300',
      4: 'text-orange-300',
      5: 'text-indigo-300',
      6: 'text-rose-300'
    };
    return colorMap[employeeId] || 'text-purple-300';
  };

  const { current, upcoming, weekLabel } = nightShiftData;

  if (!current) {
    return null; // Don't render if data hasn't loaded yet
  }

  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 shadow-2xl overflow-hidden mb-6">
      <div className="flex flex-col sm:flex-row items-stretch">

        {/* Left — current person (prominent) */}
        <div className={`flex-1 bg-gradient-to-r ${current.color} bg-opacity-20 p-5 flex flex-col justify-center`}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">
              Night Shift — {weekLabel}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg ring-2 ring-white/30 shrink-0`}>
              <span className="text-white font-bold text-2xl">{current.name[0]}</span>
            </div>

            <div>
              <p className="text-white/60 text-xs mb-0.5">On duty this week</p>
              <p className="text-white font-bold text-2xl leading-none">{current.name}</p>
              <p className="text-white/70 text-xs mt-1">Sun – Fri</p>
            </div>
          </div>
        </div>

        {/* Right — upcoming queue */}
        <div className="sm:w-56 bg-white/5 border-t sm:border-t-0 sm:border-l border-white/10 p-4 flex flex-col justify-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Up Next</p>
          <div className="space-y-2">
            {upcoming.map((person, i) => (
              <div
                key={person.name}
                className="flex items-center gap-2"
                style={{ opacity: 1 - i * 0.18 }}
              >
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${person.color} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-xs">{person.name[0]}</span>
                </div>
                <span className={`text-sm font-medium ${i === 0 ? 'text-white' : 'text-white/70'}`}>
                  {person.name}
                </span>
                {i === 0 && (
                  <span className="ml-auto text-xs text-white/40">next</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
