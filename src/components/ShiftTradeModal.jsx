import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { EmailNotificationService } from '../services/emailNotifications';

export default function ShiftTradeModal({
  isOpen,
  onClose,
  myShift,
  myEmployeeId,
  myEmployeeName,
  targetEmployee,
  targetShifts
}) {
  const [myWeeks, setMyWeeks] = useState([]);
  const [selectedMyWeek, setSelectedMyWeek] = useState(null);
  const [tradeMessage, setTradeMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMyWeeks();
    }
  }, [isOpen, myEmployeeId]);

  const loadMyWeeks = async () => {
    try {
      setLoading(true);

      // Get my upcoming weeks
      const today = new Date();
      const fourWeeksLater = new Date(today);
      fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);

      const { data, error } = await supabase
        .from('night_shifts')
        .select('*')
        .eq('employee_id', myEmployeeId)
        .eq('status', 'scheduled')
        .gte('shift_date', today.toISOString().split('T')[0])
        .lte('shift_date', fourWeeksLater.toISOString().split('T')[0])
        .order('shift_date', { ascending: true });

      if (error) throw error;

      // Group by week
      const weekGroups = {};
      data?.forEach(shift => {
        const weekStart = shift.week_start_date;
        if (!weekGroups[weekStart]) {
          weekGroups[weekStart] = {
            weekStart,
            shifts: []
          };
        }
        weekGroups[weekStart].shifts.push(shift);
      });

      setMyWeeks(Object.values(weekGroups));
    } catch (error) {
      console.error('Error loading my weeks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTrade = async () => {
    if (!selectedMyWeek || !targetShifts || targetShifts.length === 0) {
      alert('Please select your week to trade');
      return;
    }

    try {
      setSubmitting(true);

      // We'll create a trade for the first shift of each week as the primary reference
      // The entire week is implied by the week_start_date
      const myFirstShift = selectedMyWeek.shifts[0];
      const theirFirstShift = targetShifts[0];

      const { data, error } = await supabase
        .from('shift_trades')
        .insert({
          initiator_employee_id: myEmployeeId,
          respondent_employee_id: targetEmployee.id,
          initiator_shift_id: myFirstShift.id,
          respondent_shift_id: theirFirstShift.id,
          trade_message: tradeMessage || null,
          auto_swap_back: true,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      await EmailNotificationService.notifyShiftTrade({
        initiatorName: myEmployeeName,
        respondentName: targetEmployee.name,
        initiatorShiftDate: myFirstShift.shift_date,
        respondentShiftDate: theirFirstShift.shift_date,
        status: 'pending'
      });

      alert(`Trade request sent to ${targetEmployee.name}!\n\nAn email notification has been sent to the admin.`);
      onClose();
      setSelectedMyWeek(null);
      setTradeMessage('');
    } catch (error) {
      console.error('Error creating trade request:', error);
      alert('Failed to send trade request: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatWeekRange = (weekStartStr) => {
    const sunday = new Date(weekStartStr);
    const thursday = new Date(sunday);
    thursday.setDate(thursday.getDate() + 4); // Sunday to Thursday

    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(sunday)} – ${fmt(thursday)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Request Shift Trade</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Trading With */}
          {targetEmployee && (
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 mb-6 border border-purple-500/30">
              <div className="text-sm text-white/60 mb-2">Trading with:</div>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${targetEmployee.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {targetEmployee.name[0]}
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">{targetEmployee.name}</div>
                  {targetShifts && targetShifts.length > 0 && (
                    <div className="text-white/60 text-sm">
                      Their week: {formatWeekRange(targetShifts[0].week_start_date)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Select My Week */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">Select which of your weeks to trade:</h3>

            {loading && (
              <div className="text-center text-white/60 py-8">
                Loading your weeks...
              </div>
            )}

            {!loading && myWeeks.length === 0 && (
              <div className="text-center text-white/60 py-8">
                No upcoming weeks available for trading.
              </div>
            )}

            {!loading && myWeeks.length > 0 && (
              <div className="space-y-3">
                {myWeeks.map((week) => (
                  <button
                    key={week.weekStart}
                    onClick={() => setSelectedMyWeek(week)}
                    className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                      selectedMyWeek?.weekStart === week.weekStart
                        ? 'bg-purple-600 border-purple-400 shadow-lg'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold text-lg">
                          {formatWeekRange(week.weekStart)}
                        </div>
                        <div className="text-white/60 text-sm mt-1">
                          {week.shifts.length} days (Sun–Thu)
                        </div>
                      </div>
                      {selectedMyWeek?.weekStart === week.weekStart && (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          {selectedMyWeek && (
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Add a message (optional):
              </label>
              <textarea
                value={tradeMessage}
                onChange={(e) => setTradeMessage(e.target.value)}
                placeholder="Let them know why you'd like to trade..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Trade Summary */}
          {selectedMyWeek && targetShifts && targetShifts.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="text-blue-200 text-sm space-y-2">
                <div className="font-semibold mb-2">Trade Summary:</div>
                <div className="flex items-center gap-2">
                  <span className="text-red-300">You give:</span>
                  <span className="font-medium">{formatWeekRange(selectedMyWeek.weekStart)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-300">You get:</span>
                  <span className="font-medium">{formatWeekRange(targetShifts[0].week_start_date)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-500/30">
                  <strong>Note:</strong> After both weeks are completed, shifts will automatically swap back to the original schedule.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white/5 px-6 py-4 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitTrade}
            disabled={!selectedMyWeek || submitting}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedMyWeek && !submitting
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Sending...' : 'Send Trade Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
