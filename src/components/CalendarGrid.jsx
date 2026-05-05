import { memo, useMemo } from 'react';

const CalendarGrid = ({
  currentDate,
  selectedDate,
  onboardingsByDate,
  onDateClick
}) => {
  const daysInMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  }, [currentDate]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  }, [currentDate]);

  const days = useMemo(() => {
    const result = [];
    // Empty slots for days from previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      result.push({ type: 'empty', id: `empty-${i}` });
    }

    // Days of the current month
    const today = new Date().toDateString();
    const selected = selectedDate.toDateString();

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOnboardings = onboardingsByDate.get(dateStr) || [];

      result.push({
        type: 'day',
        day: i,
        date: date,
        onboardingsCount: dayOnboardings.length,
        isToday: date.toDateString() === today,
        isSelected: date.toDateString() === selected
      });
    }
    return result;
  }, [currentDate, selectedDate, onboardingsByDate, daysInMonth, firstDayOfMonth]);

  return (
    <>
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-blue-200 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((item) => {
          if (item.type === 'empty') {
            return <div key={item.id} className="h-20 sm:h-24"></div>;
          }

          return (
            <div
              key={item.day}
              onClick={() => onDateClick(item.date)}
              className={`
                relative h-20 sm:h-24 rounded-xl cursor-pointer transition-colors duration-150 p-2 sm:p-3 will-change-auto
                ${item.isToday ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25' : ''}
                ${item.isSelected && !item.isToday ? 'bg-white/20 ring-2 ring-white/50' : ''}
                ${!item.isToday && !item.isSelected ? 'bg-white/5 hover:bg-white/10' : ''}
                border border-white/10
              `}
            >
              <div className={`text-sm sm:text-base font-medium pointer-events-none ${item.isToday ? 'text-white' : 'text-white/90'}`}>
                {item.day}
              </div>

              {item.onboardingsCount > 0 && (
                <div className="absolute bottom-1 right-1 pointer-events-none">
                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse-subtle">
                    {item.onboardingsCount}
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
