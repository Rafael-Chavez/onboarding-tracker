import { memo, useMemo } from 'react';

const CalendarGrid = ({
  currentDate,
  selectedDate,
  onDateSelect,
  onboardings,
  getFirstDayOfMonth,
  getDaysInMonth
}) => {
  // Optimization: Pre-index onboardings by date string for O(1) lookup
  const onboardingMap = useMemo(() => {
    const map = new Map();
    onboardings.forEach(ob => {
      if (!map.has(ob.date)) {
        map.set(ob.date, []);
      }
      map.get(ob.date).push(ob);
    });
    return map;
  }, [onboardings]);

  const days = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentDate);
    const totalDays = getDaysInMonth(currentDate);
    const todayStr = new Date().toISOString().split('T')[0];
    const selectedStr = selectedDate.toISOString().split('T')[0];

    const result = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      result.push({ type: 'empty', key: `empty-${i}` });
    }

    // Day cells
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOnboardings = onboardingMap.get(dateStr) || [];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedStr;

      result.push({
        type: 'day',
        day: i,
        date,
        dayOnboardings,
        isToday,
        isSelected,
        key: i
      });
    }

    return result;
  }, [currentDate, selectedDate, onboardingMap, getFirstDayOfMonth, getDaysInMonth]);

  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-3">
      {days.map((item) => {
        if (item.type === 'empty') {
          return <div key={item.key} className="h-24 min-h-[6rem]"></div>;
        }

        const { day, date, dayOnboardings, isToday, isSelected } = item;

        return (
          <div
            key={item.key}
            onClick={() => onDateSelect(date)}
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

            {dayOnboardings.length > 0 && (
              <div className="absolute bottom-1 right-1 pointer-events-none">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse-subtle">
                  {dayOnboardings.length}
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
