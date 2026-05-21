import { memo, useMemo } from 'react';

const CalendarGrid = ({
  currentDate,
  selectedDate,
  setSelectedDate,
  onboardingsByDate
}) => {
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const days = useMemo(() => {
    const daysArray = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Empty slots for the first day of the month
    for (let i = 0; i < firstDay; i++) {
      daysArray.push({ type: 'empty', id: `empty-${i}` });
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOnboardings = onboardingsByDate.get(dateStr) || [];
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();

      daysArray.push({
        type: 'day',
        id: i,
        day: i,
        date,
        dayOnboardings,
        isToday,
        isSelected
      });
    }
    return daysArray;
  }, [currentDate, selectedDate, onboardingsByDate]);

  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-3">
      {days.map((item) => {
        if (item.type === 'empty') {
          return <div key={item.id} className="h-24 min-h-[6rem]"></div>;
        }

        return (
          <div
            key={item.id}
            onClick={() => setSelectedDate(item.date)}
            className={`
              relative h-24 min-h-[6rem] rounded-xl cursor-pointer transition-colors duration-150 p-3
              ${item.isToday ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25' : ''}
              ${item.isSelected && !item.isToday ? 'bg-white/20 ring-2 ring-white/50' : ''}
              ${!item.isToday && !item.isSelected ? 'bg-white/5 hover:bg-white/10' : ''}
              border border-white/10
            `}
          >
            <div className={`text-sm sm:text-base font-medium pointer-events-none ${item.isToday ? 'text-white' : 'text-white/90'}`}>
              {item.day}
            </div>

            {item.dayOnboardings.length > 0 && (
              <div className="absolute bottom-1 right-1 pointer-events-none">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse-subtle">
                  {item.dayOnboardings.length}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default memo(CalendarGrid);
