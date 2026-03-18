import { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabase';

export default function ShiftTradeModal({
  isOpen,
  onClose,
  myShift,
  myEmployeeId,
  myEmployeeName
}) {
  const [availableShifts, setAvailableShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [tradeMessage, setTradeMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && myShift) {
      loadAvailableShifts();
    }
  }, [isOpen, myShift]);

  const loadAvailableShifts = async () => {
    try {
      setLoading(true);

      // Get all shifts for other team members around the same time period
      const { data, error } = await supabaseService.client
        .from('night_shifts')
        .select(`
          *,
          employee:employees(id, name, color)
        `)
        .neq('employee_id', myEmployeeId)
        .eq('status', 'scheduled')
        .gte('shift_date', new Date().toISOString().split('T')[0])
        .order('shift_date', { ascending: true })
        .limit(30);

      if (error) throw error;

      // Group by employee and week
      setAvailableShifts(data || []);
    } catch (error) {
      console.error('Error loading available shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTrade = async () => {
    if (!selectedShift) {
      alert('Please select a shift to trade with');
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabaseService.client
        .from('shift_trades')
        .insert({
          initiator_employee_id: myEmployeeId,
          respondent_employee_id: selectedShift.employee_id,
          initiator_shift_id: myShift.id,
          respondent_shift_id: selectedShift.id,
          trade_message: tradeMessage || null,
          auto_swap_back: true,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      alert('Trade request sent successfully!');
      onClose();
      setSelectedShift(null);
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
    const friday = new Date(sunday);
    friday.setDate(friday.getDate() + 5);

    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(sunday)} – ${fmt(friday)}`;
  };

  // Group shifts by employee
  const shiftsByEmployee = availableShifts.reduce((acc, shift) => {
    const empId = shift.employee_id;
    if (!acc[empId]) {
      acc[empId] = {
        employee: shift.employee,
        shifts: []
      };
    }
    acc[empId].shifts.push(shift);
    return acc;
  }, {});

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
          {/* My Shift Info */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <div className="text-sm text-white/60 mb-2">You're trading:</div>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${myShift?.employee?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                {myEmployeeName?.[0]}
              </div>
              <div>
                <div className="text-white font-semibold text-lg">
                  {formatDate(myShift?.shift_date)}
                </div>
                <div className="text-white/60 text-sm">
                  Week: {formatWeekRange(myShift?.week_start_date)}
                </div>
              </div>
            </div>
          </div>

          {/* Available Shifts */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">Select a shift to trade with:</h3>

            {loading && (
              <div className="text-center text-white/60 py-8">
                Loading available shifts...
              </div>
            )}

            {!loading && Object.keys(shiftsByEmployee).length === 0 && (
              <div className="text-center text-white/60 py-8">
                No available shifts to trade with at this time.
              </div>
            )}

            {!loading && (
              <div className="space-y-4">
                {Object.values(shiftsByEmployee).map(({ employee, shifts }) => (
                  <div key={employee.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${employee.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                        {employee.name[0]}
                      </div>
                      <div className="text-white font-semibold text-lg">{employee.name}</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {shifts.slice(0, 6).map((shift) => (
                        <button
                          key={shift.id}
                          onClick={() => setSelectedShift(shift)}
                          className={`p-3 rounded-lg text-left transition-all ${
                            selectedShift?.id === shift.id
                              ? 'bg-purple-600 border-purple-400 shadow-lg scale-105'
                              : 'bg-white/5 hover:bg-white/10 border-white/10'
                          } border`}
                        >
                          <div className="text-white text-sm font-medium">
                            {formatDate(shift.shift_date)}
                          </div>
                          <div className="text-white/60 text-xs">
                            {formatWeekRange(shift.week_start_date)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          {selectedShift && (
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

          {/* Trade Info */}
          {selectedShift && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2 text-blue-200 text-sm">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <strong>Automatic swap-back:</strong> After you both complete your traded shifts, the assignments will automatically swap back to the original schedule.
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
            disabled={!selectedShift || submitting}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedShift && !submitting
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
