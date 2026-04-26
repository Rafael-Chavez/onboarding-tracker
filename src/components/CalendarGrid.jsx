import { memo } from 'react';

const CalendarGrid = ({
  currentDate,
  selectedDate,
  onboardingsByDate,
  getFirstDayOfMonth,
  getDaysInMonth,
  setSelectedDate
}) => {
  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl border border-white/20 p-6 shadow-2xl">
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-blue-200 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
          <div key={`empty-${i}`} className="h-20 sm:h-24"></div>
        ))}
        {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
          const day = i + 1;
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateStr = date.toISOString().split('T')[0];
          const dayOnboardings = onboardingsByDate.get(dateStr) || [];
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(date)}
              className={`
                relative h-20 sm:h-24 rounded-xl cursor-pointer transition-all duration-200 p-2 sm:p-3
                ${isToday ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-2 ring-blue-400 shadow-lg shadow-blue-500/25' : ''}
                ${isSelected && !isToday ? 'bg-white/20 ring-2 ring-white/50' : ''}
                ${!isToday && !isSelected ? 'bg-white/5 hover:bg-white/10' : ''}
                border border-white/10
              `}
            >
              <div className={`text-sm sm:text-base font-medium ${isToday ? 'text-white' : 'text-white/90'}`}>
                {day}
              </div>

              {dayOnboardings.length > 0 && (
                <div className="absolute bottom-1 right-1">
                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full text-xs text-white font-bold shadow-lg animate-pulse">
                    {dayOnboardings.length}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(CalendarGrid);
