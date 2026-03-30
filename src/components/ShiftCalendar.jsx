import { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '../config/supabase';

// Component to draw connection lines between nightshift weeks
function ShiftConnectionLines({ shifts }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !shifts.length) return;

    // Get calendar tiles to calculate positions
    const calendarElement = document.querySelector('.react-calendar__month-view__days');
    if (!calendarElement) return;

    const tiles = calendarElement.querySelectorAll('.react-calendar__tile');
    if (!tiles.length) return;

    // Group shifts by employee
    const shiftsByEmployee = {};
    shifts.forEach(shift => {
      const empId = shift.employee_id;
      if (!shiftsByEmployee[empId]) {
        shiftsByEmployee[empId] = {
          weeks: {},
          employee: shift.employee
        };
      }
      const weekStart = shift.week_start_date;
      if (!shiftsByEmployee[empId].weeks[weekStart]) {
        shiftsByEmployee[empId].weeks[weekStart] = [];
      }
      shiftsByEmployee[empId].weeks[weekStart].push(shift);
    });

    // Draw lines for each employee
    const lines = [];
    Object.entries(shiftsByEmployee).forEach(([empId, { weeks, employee }]) => {
      const weekStarts = Object.keys(weeks).sort();

      // Connect each week to the next week for this employee
      for (let i = 0; i < weekStarts.length - 1; i++) {
        const currentWeek = weeks[weekStarts[i]];
        const nextWeek = weeks[weekStarts[i + 1]];

        // Get the last shift of current week
        const lastShift = currentWeek.sort((a, b) =>
          new Date(b.shift_date) - new Date(a.shift_date)
        )[0];

        // Get the first shift of next week
        const firstShift = nextWeek.sort((a, b) =>
          new Date(a.shift_date) - new Date(b.shift_date)
        )[0];

        // Find the tile elements for these dates
        const lastTile = Array.from(tiles).find(tile => {
          const abbr = tile.querySelector('abbr');
          if (!abbr) return false;
          const dateStr = abbr.getAttribute('aria-label');
          const tileDate = new Date(dateStr);
          const shiftDate = new Date(lastShift.shift_date + 'T00:00:00');
          return tileDate.toDateString() === shiftDate.toDateString();
        });

        const firstTile = Array.from(tiles).find(tile => {
          const abbr = tile.querySelector('abbr');
          if (!abbr) return false;
          const dateStr = abbr.getAttribute('aria-label');
          const tileDate = new Date(dateStr);
          const shiftDate = new Date(firstShift.shift_date + 'T00:00:00');
          return tileDate.toDateString() === shiftDate.toDateString();
        });

        if (lastTile && firstTile) {
          const rect1 = lastTile.getBoundingClientRect();
          const rect2 = firstTile.getBoundingClientRect();
          const calendarRect = calendarElement.getBoundingClientRect();

          const x1 = rect1.left + rect1.width / 2 - calendarRect.left;
          const y1 = rect1.top + rect1.height / 2 - calendarRect.top;
          const x2 = rect2.left + rect2.width / 2 - calendarRect.left;
          const y2 = rect2.top + rect2.height / 2 - calendarRect.top;

          const color = employee?.color || 'from-gray-500 to-gray-600';
          const gradientColor = getGradientColor(color);

          lines.push({
            x1, y1, x2, y2, color: gradientColor, employee: employee?.name || 'Unknown'
          });
        }
      }
    });

    // Render lines
    if (svgRef.current) {
      svgRef.current.innerHTML = '';
      lines.forEach((line, idx) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Create a curved path
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Control point for curve (perpendicular to the line)
        const controlOffset = Math.min(distance * 0.2, 20);
        const controlX = midX - (dy / distance) * controlOffset;
        const controlY = midY + (dx / distance) * controlOffset;

        path.setAttribute('d', `M ${line.x1} ${line.y1} Q ${controlX} ${controlY} ${line.x2} ${line.y2}`);
        path.setAttribute('stroke', line.color);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('opacity', '0.6');
        path.setAttribute('class', 'shift-connection-line');

        // Add title for tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${line.employee}'s shift continuation`;
        path.appendChild(title);

        svgRef.current.appendChild(path);
      });
    }
  }, [shifts]);

  // Helper to extract color from gradient class
  const getGradientColor = (colorClass) => {
    const colorMap = {
      'from-purple-500': '#a855f7',
      'from-blue-500': '#3b82f6',
      'from-green-500': '#22c55e',
      'from-yellow-500': '#eab308',
      'from-red-500': '#ef4444',
      'from-pink-500': '#ec4899',
      'from-cyan-500': '#06b6d4',
      'from-orange-500': '#f97316',
      'from-indigo-500': '#6366f1',
      'from-teal-500': '#14b8a6',
    };

    for (const [key, value] of Object.entries(colorMap)) {
      if (colorClass.includes(key)) return value;
    }
    return '#9ca3af'; // default gray
  };

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
}

export default function ShiftCalendar({ employeeId, onShiftSelect }) {
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showConnectionLines, setShowConnectionLines] = useState(true);

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

  // Get all shifts for a specific employee grouped by week
  const getEmployeeShiftsByWeek = (employee_id) => {
    const employeeShifts = shifts.filter(shift => shift.employee_id === employee_id);
    const weeks = {};

    employeeShifts.forEach(shift => {
      const weekStart = shift.week_start_date;
      if (!weeks[weekStart]) {
        weeks[weekStart] = [];
      }
      weeks[weekStart].push(shift);
    });

    return Object.values(weeks).map(weekShifts => ({
      weekStart: weekShifts[0].week_start_date,
      shifts: weekShifts.sort((a, b) => new Date(a.shift_date) - new Date(b.shift_date)),
      employee: weekShifts[0].employee
    }));
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

    // Get employee ID for custom styling
    const empId = shift.employee_id;

    let className = 'night-shift-tile';
    className += ` shift-employee-${empId}`;

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
    <div className="shift-calendar-container" style={{ position: 'relative' }}>
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

        /* Employee-specific colored borders and backgrounds */
        .shift-employee-1 {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(6, 182, 212, 0.15)) !important;
          border: 3px solid #06b6d4 !important;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
        }

        .shift-employee-2 {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(168, 85, 247, 0.15)) !important;
          border: 3px solid #a855f7 !important;
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
        }

        .shift-employee-3 {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.15)) !important;
          border: 3px solid #22c55e !important;
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
        }

        .shift-employee-4 {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.25), rgba(249, 115, 22, 0.15)) !important;
          border: 3px solid #f97316 !important;
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.4);
        }

        .shift-employee-5 {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(99, 102, 241, 0.15)) !important;
          border: 3px solid #6366f1 !important;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }

        .shift-employee-6 {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(236, 72, 153, 0.15)) !important;
          border: 3px solid #ec4899 !important;
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.4);
        }

        .my-shift-tile {
          background: rgba(139, 92, 246, 0.15);
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
          <div style={{ position: 'relative' }}>
            <Calendar
              onChange={handleDateClick}
              value={selectedDate}
              tileContent={getTileContent}
              tileClassName={getTileClassName}
              onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
              className="w-full"
            />
            {showConnectionLines && <ShiftConnectionLines shifts={shifts} />}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/60 text-sm font-semibold">Legend</div>
              <button
                onClick={() => setShowConnectionLines(!showConnectionLines)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  showConnectionLines
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {showConnectionLines ? 'Hide' : 'Show'} Connection Lines
              </button>
            </div>
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
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400 text-lg">↔</span>
                <span>Traded shift</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="24" height="12" style={{ overflow: 'visible' }}>
                  <path d="M 2 6 L 22 6" stroke="currentColor" strokeWidth="2" strokeDasharray="3,3" fill="none" opacity="0.6" />
                </svg>
                <span>Week connections</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
