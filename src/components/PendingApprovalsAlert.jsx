import { memo } from 'react';

const PendingApprovalsAlert = ({ pendingApprovals, onReject, onApprove }) => {
  if (pendingApprovals.length === 0) return null;

  return (
    <div className="w-full mb-6 backdrop-blur-md bg-amber-500/10 rounded-2xl border border-amber-400/30 p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/50" />
        <h3 className="text-lg font-bold text-amber-300">
          Completion Requests — {pendingApprovals.length} Awaiting Your Approval
        </h3>
      </div>
      <div className="space-y-3">
        {pendingApprovals.map(ob => (
          <div key={ob.id} className="flex items-center justify-between gap-4 bg-white/5 rounded-xl border border-amber-400/20 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white">{ob.clientName}</span>
                <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">Session #{ob.sessionNumber}</span>
                <span className="text-xs text-amber-300/80">by {ob.employeeName}</span>
              </div>
              <div className="text-sm text-white/50 mt-1">
                Account {ob.accountNumber} · {new Date(ob.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onReject(ob.id)}
                className="px-4 py-2 text-sm font-semibold bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg hover:bg-red-500/35 transition-all"
              >
                Reject
              </button>
              <button
                onClick={() => onApprove(ob.id)}
                className="px-4 py-2 text-sm font-semibold bg-green-500/20 text-green-300 border border-green-500/40 rounded-lg hover:bg-green-500/35 transition-all"
              >
                Approve ✓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(PendingApprovalsAlert);
