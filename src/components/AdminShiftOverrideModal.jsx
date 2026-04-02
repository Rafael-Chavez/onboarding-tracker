import { useState } from 'react';
import { supabase } from '../config/supabase';
import { EmailNotificationService } from '../services/emailNotifications';

export default function AdminShiftOverrideModal({ isOpen, onClose, shift, employees, adminName }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !shift) return null;

  const currentEmployee = employees.find(e => e.id === shift.employee_id);
  const shiftDate = new Date(shift.shift_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleOverride = async () => {
    if (!selectedEmployeeId) {
      alert('Please select an employee');
      return;
    }

    if (!reason.trim()) {
      alert('Please provide a reason for the override');
      return;
    }

    try {
      setSubmitting(true);

      const newEmployeeId = parseInt(selectedEmployeeId);
      const newEmployee = employees.find(e => e.id === newEmployeeId);

      // Update the shift assignment
      const { error } = await supabase
        .from('night_shifts')
        .update({
          employee_id: newEmployeeId,
          status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', shift.id);

      if (error) throw error;

      // Send email notification
      await EmailNotificationService.notifyShiftOverride({
        originalEmployee: currentEmployee.name,
        newEmployee: newEmployee.name,
        shiftDate: shift.shift_date,
        reason: reason.trim(),
        adminName: adminName || 'Admin'
      });

      alert(`Shift successfully reassigned to ${newEmployee.name}!\n\nAn email notification has been sent to the admin.`);
      onClose();
      setSelectedEmployeeId('');
      setReason('');
    } catch (error) {
      console.error('Error overriding shift:', error);
      alert('Failed to override shift: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl max-w-md w-full border border-purple-500/20 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Override Shift Assignment</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-purple-300">Admin Override</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Current Assignment */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs uppercase font-bold text-white/50 mb-2">Current Assignment</div>
            <div className="text-white font-semibold mb-1">{currentEmployee?.name}</div>
            <div className="text-sm text-white/70">{shiftDate}</div>
          </div>

          {/* New Employee Selection */}
          <div>
            <label className="block text-xs uppercase font-bold text-white/70 mb-2">
              Reassign To
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} disabled={emp.id === shift.employee_id}>
                  {emp.name} {emp.id === shift.employee_id ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs uppercase font-bold text-white/70 mb-2">
              Reason for Override *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Last-minute schedule conflict, emergency coverage needed, etc."
              rows={3}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-white/50 mt-1">
              This reason will be included in the email notification.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-orange-400 text-xl">⚠️</div>
              <div>
                <div className="text-orange-300 font-semibold text-sm mb-1">Admin Override</div>
                <div className="text-orange-200/80 text-xs leading-relaxed">
                  This will immediately reassign the shift and notify all parties. This action bypasses the normal trade request process.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleOverride}
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? 'Overriding...' : 'Confirm Override'}
          </button>
        </div>
      </div>
    </div>
  );
}
