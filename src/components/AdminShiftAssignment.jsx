import { useState } from 'react';
import { supabase } from '../config/supabase';

export default function AdminShiftAssignment({ onShiftCreated }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const employees = [
    { id: 1, name: 'Rafael', color: 'from-cyan-500 to-blue-500' },
    { id: 3, name: 'Jim', color: 'from-green-500 to-teal-500' },
    { id: 4, name: 'Marc', color: 'from-orange-500 to-red-500' },
    { id: 5, name: 'Steve', color: 'from-indigo-500 to-purple-500' },
    { id: 6, name: 'Erick', color: 'from-rose-500 to-pink-500' }
  ];

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setShowDatePicker(true);
    setMessage({ text: '', type: '' });

    // Set default dates (today to 4 days later for Sun-Thu week)
    const today = new Date();
    const fourDaysLater = new Date(today);
    fourDaysLater.setDate(fourDaysLater.getDate() + 4);

    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(fourDaysLater.toISOString().split('T')[0]);
  };

  const handleCloseModal = () => {
    setShowDatePicker(false);
    setSelectedEmployee(null);
    setStartDate('');
    setEndDate('');
    setMessage({ text: '', type: '' });
  };

  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
    return sunday.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      setMessage({ text: 'Please fill in all fields', type: 'error' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setMessage({ text: 'End date must be after start date', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: 'Creating shifts...', type: 'info' });

    try {
      // Generate all dates in the range
      const dates = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create shifts for each date
      const shifts = dates.map(date => ({
        employee_id: selectedEmployee.id,
        shift_date: date.toISOString().split('T')[0],
        week_start_date: getWeekStartDate(date),
        status: 'scheduled',
        original_employee_id: selectedEmployee.id
      }));

      // Batch insert using Supabase
      const { data, error } = await supabase
        .from('night_shifts')
        .upsert(shifts, {
          onConflict: 'shift_date',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        throw error;
      }

      setMessage({
        text: `Successfully assigned ${dates.length} shift(s) to ${selectedEmployee.name}!`,
        type: 'success'
      });

      // Notify parent component
      if (onShiftCreated) {
        onShiftCreated();
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        handleCloseModal();
      }, 2000);

    } catch (error) {
      console.error('Error creating shifts:', error);
      setMessage({
        text: `Error: ${error.message}. Some dates may already be assigned.`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold text-lg mb-2">Assign Night Shifts</h3>
        <p className="text-white/60 text-sm mb-4">
          Click on a staff member to assign them night shift dates
        </p>
      </div>

      {/* Staff Icons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {employees.map((employee) => (
          <button
            key={employee.id}
            onClick={() => handleEmployeeClick(employee)}
            className="group relative p-4 rounded-xl border-2 bg-white/5 border-white/10 hover:border-purple-500 hover:bg-white/10 cursor-pointer transition-all transform hover:scale-105"
          >
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className={`
                w-16 h-16 rounded-full bg-gradient-to-br ${employee.color}
                flex items-center justify-center text-white font-bold text-2xl shadow-lg
                ring-2 ring-white/20 group-hover:ring-purple-500 transition-all
              `}>
                {employee.name[0]}
              </div>

              <div className="mt-3 text-center">
                <div className="text-white font-semibold text-sm">
                  {employee.name}
                </div>
              </div>
            </div>

            {/* Hover indicator */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600/20 rounded-xl">
              <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Date Range Picker Modal */}
      {showDatePicker && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-2xl border border-white/20 p-6 shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${selectedEmployee.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {selectedEmployee.name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Assign Shifts</h3>
                  <p className="text-white/60 text-sm">{selectedEmployee.name}</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Message */}
            {message.text && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${
                message.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-300' :
                message.type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-300' :
                'bg-blue-500/20 border border-blue-500/30 text-blue-300'
              }`}>
                {message.text}
              </div>
            )}

            {/* Date Inputs */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent backdrop-blur-sm"
                  style={{ colorScheme: 'dark' }}
                />
                {startDate && (
                  <p className="text-white/60 text-xs mt-1">{formatDateDisplay(startDate)}</p>
                )}
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent backdrop-blur-sm"
                  style={{ colorScheme: 'dark' }}
                />
                {endDate && (
                  <p className="text-white/60 text-xs mt-1">{formatDateDisplay(endDate)}</p>
                )}
              </div>

              {/* Date Range Summary */}
              {startDate && endDate && (
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-300 text-sm font-medium">
                    Assigning {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                  </p>
                  <p className="text-white/60 text-xs mt-1">
                    {formatDateDisplay(startDate)} → {formatDateDisplay(endDate)}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !startDate || !endDate}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Assigning...' : 'Assign Shifts'}
              </button>
            </div>

            {/* Info */}
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2 text-blue-200 text-xs">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  If a date is already assigned, it will be updated with the new assignment.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
