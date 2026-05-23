import { memo, useMemo } from 'react';

const CalendarGrid = ({
  currentDate,
  selectedDate,
  setSelectedDate,
  onboardings
}) => {
  // Memoize calendar calculation values
  const daysInMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  }, [currentDate]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  }, [currentDate]);

  // Pre-index onboardings by date for O(1) lookup in the grid
  const onboardingCountsByDate = useMemo(() => {
    const counts = new Map();
    onboardings.forEach(ob => {
      const dateStr = ob.date;
      counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
    });
    return counts;
  }, [onboardings]);

  const todayStr = new Date().toDateString();
  const selectedDateStr = selectedDate.toDateString();

  return (
    <>
      {/* Calendar Days Header */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-blue-200 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {/* Empty slots for days before the first of the month */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} className="h-24 min-h-[6rem]"></div>
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateStr = date.toISOString().split('T')[0];
          const count = onboardingCountsByDate.get(dateStr) || 0;

          const isToday = date.toDateString() === todayStr;
          const isSelected = date.toDateString() === selectedDateStr;

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(date)}
              className={`
                relative h-24 min-h-[6rem] rounded-xl cursor-pointer transition-colors duration-150 p-3
                ${isToday ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25' : ''}
                ${isSelected && !isToday ? 'bg-white/20 ring-2 ring-white/50' : ''}
                ${!isToday && !isSelected ? 'bg-white/5 hover:bg-white/10' : ''}
                border border-white/10
              `}
            >
              <div className={`text-sm sm:text-base font-medium pointer-events-none ${isToday ? 'text-white' : 'text-white/90'}`}>
                {day}
              </div>

              {count > 0 && (
                <div className="absolute bottom-1 right-1 pointer-events-none">
                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse-subtle">
                    {count}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default memo(CalendarGrid);
