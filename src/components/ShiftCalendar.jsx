import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../config/supabase';

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

      const { data, error } = await supabase
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


  // Group consecutive shifts for bar display
  const getShiftRanges = () => {
    const ranges = [];
    const sortedShifts = [...shifts].sort((a, b) =>
      new Date(a.shift_date) - new Date(b.shift_date)
    );

    let currentRange = null;

    sortedShifts.forEach(shift => {
      const shiftDate = new Date(shift.shift_date + 'T00:00:00');

      if (!currentRange || currentRange.employee_id !== shift.employee_id) {
        // Start new range
        if (currentRange) ranges.push(currentRange);
        currentRange = {
          employee_id: shift.employee_id,
          employee: shift.employee,
          startDate: shiftDate,
          endDate: shiftDate,
          shifts: [shift]
        };
      } else {
        // Check if consecutive
        const lastDate = new Date(currentRange.endDate);
        const dayDiff = Math.floor((shiftDate - lastDate) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
          // Extend current range
          currentRange.endDate = shiftDate;
          currentRange.shifts.push(shift);
        } else {
          // Gap detected, start new range
          ranges.push(currentRange);
          currentRange = {
            employee_id: shift.employee_id,
            employee: shift.employee,
            startDate: shiftDate,
            endDate: shiftDate,
            shifts: [shift]
          };
        }
      }
    });

    if (currentRange) ranges.push(currentRange);
    return ranges;
  };

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const shift = getShiftForDate(date);
    if (!shift) return null;

    const isOwn = employeeId && shift.employee_id === employeeId;
    const employeeName = shift.employee?.name || 'Unknown';
    const employeeInitial = employeeName[0];

    // Get color class from employee color gradient
    const colorClass = shift.employee?.color || 'from-gray-500 to-gray-600';

    // Check if this is part of a range
    const ranges = getShiftRanges();
    const range = ranges.find(r =>
      r.employee_id === shift.employee_id &&
      date >= r.startDate &&
      date <= r.endDate
    );

    const isRangeStart = range && date.getTime() === range.startDate.getTime();
    const isRangeEnd = range && date.getTime() === range.endDate.getTime();

    return (
      <div className="flex flex-col items-center justify-center mt-1 relative">
        {/* Colored bar for ranges */}
        {range && range.shifts.length > 1 && (
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClass} ${
            isRangeStart ? 'rounded-l-full' : ''
          } ${isRangeEnd ? 'rounded-r-full' : ''}`}
            style={{
              marginLeft: isRangeStart ? '0' : '-4px',
              marginRight: isRangeEnd ? '0' : '-4px',
              width: isRangeStart || isRangeEnd ? 'calc(100% + 4px)' : 'calc(100% + 8px)'
            }}
          />
        )}

        <div
          className={`w-6 h-6 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xs font-bold shadow-sm ${isOwn ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''} relative z-10`}
          title={`${employeeName}'s shift${shift.status === 'traded' ? ' (traded)' : ''}`}
        >
          {employeeInitial}
        </div>

        {/* Show date range label on start date */}
        {isRangeStart && range.shifts.length > 1 && (
          <div className="text-[8px] text-white/80 font-semibold mt-1 whitespace-nowrap">
            {employeeName}
          </div>
        )}

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

    const isOwn = employeeId && shift.employee_id === employeeId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tileDate = new Date(date);
    tileDate.setHours(0, 0, 0, 0);

    // Check if this date is in the current work week (Sunday-Thursday)
    const isCurrentWeek = shift.week_start_date === getCurrentWeekStart();
    const isToday = tileDate.getTime() === today.getTime();

    let className = 'night-shift-tile';

    if (isOwn) {
      className += ' my-shift-tile';
      if (isCurrentWeek) {
        className += ' current-week-tile';
      }
    }

    if (shift.status === 'completed') {
      className += ' completed-shift';
    }

    if (isToday) {
      className += ' today-shift';
    }

    return className;
  };

  const getCurrentWeekStart = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday
    const sunday = new Date(today);
    sunday.setDate(sunday.getDate() - day);
    return sunday.toISOString().split('T')[0];
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

        .current-week-tile {
          background: rgba(59, 130, 246, 0.25) !important;
          border: 2px solid rgba(59, 130, 246, 0.6) !important;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
        }

        .today-shift {
          position: relative;
        }

        .today-shift::before {
          content: '';
          position: absolute;
          top: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px #22c55e;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
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
                <div className="w-6 h-6 rounded-xl bg-blue-500/25 border-2 border-blue-500/60"></div>
                <span>Current work week (Sun-Thu)</span>
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
