import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabaseService } from '../services/supabase';

export default function ShiftCalendar({ employeeId, onShiftSelect }) {
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadShifts();
  }, [employeeId, currentMonth]);

  const loadShifts = async () => {
    try {
      setLoading(true);

      // Get first and last day of the displayed month(s)
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);

      const { data, error } = await supabaseService.client
        .from('night_shifts')
        .select(`
          *,
          employee:employees(id, name, color)
        `)
        .gte('shift_date', startDate.toISOString().split('T')[0])
        .lte('shift_date', endDate.toISOString().split('T')[0])
        .order('shift_date', { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getShiftForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.find(shift => shift.shift_date === dateStr);
  };

  const isMyShift = (date) => {
    const shift = getShiftForDate(date);
    return shift && shift.employee_id === employeeId;
  };

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const shift = getShiftForDate(date);
    if (!shift) return null;

    const isOwn = shift.employee_id === employeeId;
    const employeeName = shift.employee?.name || 'Unknown';
    const employeeInitial = employeeName[0];

    // Get color class from employee color gradient
    const colorClass = shift.employee?.color || 'from-gray-500 to-gray-600';

    return (
      <div className="flex flex-col items-center justify-center mt-1">
        <div
          className={`w-6 h-6 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xs font-bold shadow-sm ${isOwn ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''}`}
          title={`${employeeName}'s shift${shift.status === 'traded' ? ' (traded)' : ''}`}
        >
          {employeeInitial}
        </div>
        {shift.status === 'traded' && (
          <span className="text-[8px] text-yellow-400 font-semibold">↔</span>
        )}
      </div>
    );
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return '';

    const shift = getShiftForDate(date);
    if (!shift) return '';

    const isOwn = shift.employee_id === employeeId;
    let className = 'night-shift-tile';

    if (isOwn) {
      className += ' my-shift-tile';
    }

    if (shift.status === 'completed') {
      className += ' completed-shift';
    }

    return className;
  };

  const handleDateClick = (date) => {
    const shift = getShiftForDate(date);
    setSelectedDate(date);

    if (onShiftSelect && shift) {
      onShiftSelect(shift, date);
    }
  };

  return (
    <div className="shift-calendar-container">
      <style>{`
        .shift-calendar-container {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .react-calendar {
          background: transparent;
          border: none;
          color: white;
          font-family: inherit;
        }

        .react-calendar__navigation button {
          color: white;
          font-size: 16px;
          font-weight: 600;
          padding: 10px;
        }

        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .react-calendar__month-view__weekdays {
          text-transform: uppercase;
          font-weight: 600;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        .react-calendar__tile {
          color: white;
          padding: 10px 5px;
          position: relative;
          border-radius: 8px;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .react-calendar__tile--now {
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.4);
        }

        .react-calendar__tile--active {
          background: rgba(59, 130, 246, 0.3) !important;
          border: 1px solid rgba(59, 130, 246, 0.6);
        }

        .night-shift-tile {
          background: rgba(255, 255, 255, 0.05);
        }

        .my-shift-tile {
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .completed-shift {
          opacity: 0.6;
        }

        .react-calendar__month-view__days__day--weekend {
          color: rgba(248, 113, 113, 0.8);
        }

        .react-calendar__month-view__days__day--neighboringMonth {
          color: rgba(255, 255, 255, 0.3);
        }

        .react-calendar__tile abbr {
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>

      {loading && (
        <div className="text-center text-white/60 py-8">
          Loading shifts...
        </div>
      )}

      {!loading && (
        <>
          <Calendar
            onChange={handleDateClick}
            value={selectedDate}
            tileContent={getTileContent}
            tileClassName={getTileClassName}
            onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
            className="w-full"
          />

          <div className="mt-4 space-y-2">
            <div className="text-sm text-white/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white ring-offset-2 ring-offset-gray-800"></div>
                <span>Your shifts</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold"></div>
                <span>Team shifts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-lg">↔</span>
                <span>Traded shift</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
