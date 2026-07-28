import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Icons, iconProps } from './icons';

export default function FullScheduleModal({ isOpen, onClose, employee }) {
  const [allShifts, setAllShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedDates, setCopiedDates] = useState(false);

  useEffect(() => {
    if (isOpen && employee) {
      loadAllShifts();
    }
  }, [isOpen, employee]);

  const loadAllShifts = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const endOfYear = new Date('2026-12-31');

      const { data, error } = await supabase
        .from('night_shifts')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('shift_date', today.toISOString().split('T')[0])
        .lte('shift_date', endOfYear.toISOString().split('T')[0])
        .order('shift_date', { ascending: true });

      if (error) throw error;
      setAllShifts(data || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyDatesToClipboard = () => {
    // Format dates in a clean, Zoom-friendly format
    const dateList = allShifts.map(shift => {
      const date = new Date(shift.shift_date);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }).join('\n');

    navigator.clipboard.writeText(dateList).then(() => {
      setCopiedDates(true);
      setTimeout(() => setCopiedDates(false), 2000);
    });
  };

  const groupShiftsByMonth = () => {
    const grouped = {};
    allShifts.forEach(shift => {
      const date = new Date(shift.shift_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(shift);
    });
    return grouped;
  };

  if (!isOpen) return null;

  const groupedShifts = groupShiftsByMonth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          position: relative;
          background: linear-gradient(135deg, #1e1535 0%, #0f0a1e 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 24px;
          width: 90%;
          max-width: 900px;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease-out;
        }

        .modal-header {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15));
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
          padding: 24px 32px;
        }

        .modal-body {
          padding: 24px 32px;
          overflow-y: auto;
          max-height: calc(85vh - 180px);
        }

        .modal-footer {
          border-top: 1px solid rgba(139, 92, 246, 0.2);
          padding: 20px 32px;
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .month-section {
          margin-bottom: 32px;
        }

        .month-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .shift-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .shift-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          transition: all 0.2s ease;
        }

        .shift-card:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-2px);
        }

        .shift-day {
          font-size: 14px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .shift-date {
          font-size: 12px;
          color: rgba(168, 85, 247, 0.8);
        }

        .btn {
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(139, 92, 246, 0.4);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: white;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .stats-row {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .stat-item {
          flex: 1;
        }

        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(168, 85, 247, 0.8);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Custom scrollbar */
        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose} />

      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${employee.color} flex items-center justify-center text-white font-bold text-2xl`}>
                {employee.name[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {employee.name}'s Full Schedule
                </h2>
                <p className="text-sm text-purple-300">
                  Complete shift schedule through December 2026
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
            >
              <Icons.X size={24} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Icons.Clock size={32} className="animate-spin text-purple-400" />
                <p className="text-white/60">Loading schedule...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="stats-row">
                <div className="stat-item">
                  <div className="stat-label">Total Shifts</div>
                  <div className="stat-value">{allShifts.length}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Days Per Week</div>
                  <div className="stat-value">5</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Next Shift</div>
                  <div className="stat-value text-lg">
                    {allShifts.length > 0
                      ? new Date(allShifts[0].shift_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Shifts grouped by month */}
              {Object.entries(groupedShifts).map(([month, shifts]) => (
                <div key={month} className="month-section">
                  <div className="month-title">
                    <Icons.Calendar size={20} strokeWidth={2} />
                    {month}
                    <span className="ml-auto text-sm font-normal text-purple-300">
                      {shifts.length} shifts
                    </span>
                  </div>
                  <div className="shift-grid">
                    {shifts.map(shift => {
                      const date = new Date(shift.shift_date);
                      return (
                        <div key={shift.id} className="shift-card">
                          <div className="shift-day">
                            {date.toLocaleDateString('en-US', { weekday: 'long' })}
                          </div>
                          <div className="shift-date">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            onClick={copyDatesToClipboard}
            className={`btn ${copiedDates ? 'btn-success' : 'btn-primary'}`}
            disabled={loading || allShifts.length === 0}
          >
            {copiedDates ? (
              <>
                <Icons.CheckCircle {...iconProps} />
                Copied!
              </>
            ) : (
              <>
                <Icons.Download {...iconProps} />
                Copy All Dates
              </>
            )}
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
