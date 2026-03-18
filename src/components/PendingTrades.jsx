import { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabase';

export default function PendingTrades({ employeeId, employeeName, onTradeUpdate }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingTradeId, setProcessingTradeId] = useState(null);

  useEffect(() => {
    loadTrades();
    setupRealtimeSubscription();
  }, [employeeId]);

  const loadTrades = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabaseService.client
        .from('shift_trades')
        .select(`
          *,
          initiator:initiator_employee_id(id, name, color),
          respondent:respondent_employee_id(id, name, color),
          initiator_shift:initiator_shift_id(id, shift_date, week_start_date),
          respondent_shift:respondent_shift_id(id, shift_date, week_start_date)
        `)
        .or(`initiator_employee_id.eq.${employeeId},respondent_employee_id.eq.${employeeId}`)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabaseService.client
      .channel('shift_trades_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_trades',
          filter: `initiator_employee_id=eq.${employeeId},respondent_employee_id=eq.${employeeId}`
        },
        (payload) => {
          console.log('Trade change detected:', payload);
          loadTrades();
          if (onTradeUpdate) onTradeUpdate();
        }
      )
      .subscribe();

    return () => {
      supabaseService.client.removeChannel(channel);
    };
  };

  const handleAcceptTrade = async (trade) => {
    if (!window.confirm(
      `Accept trade request from ${trade.initiator.name}?\n\nYou'll take their shift on ${formatDate(trade.initiator_shift.shift_date)} and they'll take yours on ${formatDate(trade.respondent_shift.shift_date)}.`
    )) {
      return;
    }

    try {
      setProcessingTradeId(trade.id);

      const { error } = await supabaseService.client
        .from('shift_trades')
        .update({
          status: 'accepted',
          response_message: 'Trade accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', trade.id);

      if (error) throw error;

      // Update the shifts
      await supabaseService.client
        .from('night_shifts')
        .update({
          employee_id: trade.respondent_employee_id,
          status: 'traded'
        })
        .eq('id', trade.initiator_shift_id);

      await supabaseService.client
        .from('night_shifts')
        .update({
          employee_id: trade.initiator_employee_id,
          status: 'traded'
        })
        .eq('id', trade.respondent_shift_id);

      alert('Trade accepted successfully!');
      loadTrades();
      if (onTradeUpdate) onTradeUpdate();
    } catch (error) {
      console.error('Error accepting trade:', error);
      alert('Failed to accept trade: ' + error.message);
    } finally {
      setProcessingTradeId(null);
    }
  };

  const handleRejectTrade = async (trade) => {
    if (!window.confirm(`Reject trade request from ${trade.initiator.name}?`)) {
      return;
    }

    try {
      setProcessingTradeId(trade.id);

      const { error } = await supabaseService.client
        .from('shift_trades')
        .update({
          status: 'rejected',
          response_message: 'Trade rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', trade.id);

      if (error) throw error;

      alert('Trade request rejected');
      loadTrades();
      if (onTradeUpdate) onTradeUpdate();
    } catch (error) {
      console.error('Error rejecting trade:', error);
      alert('Failed to reject trade: ' + error.message);
    } finally {
      setProcessingTradeId(null);
    }
  };

  const handleCancelTrade = async (trade) => {
    if (!window.confirm('Cancel this trade request?')) {
      return;
    }

    try {
      setProcessingTradeId(trade.id);

      const { error } = await supabaseService.client
        .from('shift_trades')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', trade.id);

      if (error) throw error;

      alert('Trade request cancelled');
      loadTrades();
      if (onTradeUpdate) onTradeUpdate();
    } catch (error) {
      console.error('Error cancelling trade:', error);
      alert('Failed to cancel trade: ' + error.message);
    } finally {
      setProcessingTradeId(null);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWeekRange = (weekStartStr) => {
    const sunday = new Date(weekStartStr);
    const friday = new Date(sunday);
    friday.setDate(friday.getDate() + 5);

    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(sunday)} – ${fmt(friday)}`;
  };

  const isIncoming = (trade) => trade.respondent_employee_id === employeeId;
  const isOutgoing = (trade) => trade.initiator_employee_id === employeeId;

  const incomingTrades = trades.filter(t => isIncoming(t) && t.status === 'pending');
  const outgoingTrades = trades.filter(t => isOutgoing(t) && t.status === 'pending');
  const activeTrades = trades.filter(t => t.status === 'accepted');

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="text-center text-white/60">Loading trade requests...</div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <div className="text-center text-white/60">No pending trade requests</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Incoming Trade Requests */}
      {incomingTrades.length > 0 && (
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <h3 className="text-white font-semibold text-lg">
              Incoming Requests ({incomingTrades.length})
            </h3>
          </div>

          <div className="space-y-3">
            {incomingTrades.map((trade) => (
              <div
                key={trade.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${trade.initiator.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                      {trade.initiator.name[0]}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        {trade.initiator.name} wants to trade shifts
                      </div>
                      <div className="text-white/60 text-sm">
                        {new Date(trade.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {trade.trade_message && (
                  <div className="bg-white/5 rounded p-3 mb-3 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Message:</div>
                    <div className="text-white text-sm">{trade.trade_message}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                    <div className="text-red-300 text-xs mb-1">You give up:</div>
                    <div className="text-white font-medium text-sm">
                      {formatDate(trade.respondent_shift.shift_date)}
                    </div>
                    <div className="text-white/60 text-xs">
                      {formatWeekRange(trade.respondent_shift.week_start_date)}
                    </div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                    <div className="text-green-300 text-xs mb-1">You receive:</div>
                    <div className="text-white font-medium text-sm">
                      {formatDate(trade.initiator_shift.shift_date)}
                    </div>
                    <div className="text-white/60 text-xs">
                      {formatWeekRange(trade.initiator_shift.week_start_date)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptTrade(trade)}
                    disabled={processingTradeId === trade.id}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingTradeId === trade.id ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleRejectTrade(trade)}
                    disabled={processingTradeId === trade.id}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg font-medium transition-all border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Trade Requests */}
      {outgoingTrades.length > 0 && (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-white font-semibold text-lg mb-4">
            Sent Requests ({outgoingTrades.length})
          </h3>

          <div className="space-y-3">
            {outgoingTrades.map((trade) => (
              <div
                key={trade.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${trade.respondent.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                      {trade.respondent.name[0]}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        Waiting for {trade.respondent.name}
                      </div>
                      <div className="text-white/60 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                        Pending
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelTrade(trade)}
                    disabled={processingTradeId === trade.id}
                    className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-white/60 text-xs mb-1">Your shift:</div>
                    <div className="text-white text-sm">
                      {formatDate(trade.initiator_shift.shift_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs mb-1">Their shift:</div>
                    <div className="text-white text-sm">
                      {formatDate(trade.respondent_shift.shift_date)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <div className="bg-green-900/20 rounded-xl p-6 border border-green-500/30">
          <h3 className="text-white font-semibold text-lg mb-4">
            Active Trades ({activeTrades.length})
          </h3>

          <div className="space-y-3">
            {activeTrades.map((trade) => {
              const otherPerson = isIncoming(trade) ? trade.initiator : trade.respondent;
              const myShift = isIncoming(trade) ? trade.initiator_shift : trade.respondent_shift;
              const theirShift = isIncoming(trade) ? trade.respondent_shift : trade.initiator_shift;

              return (
                <div
                  key={trade.id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${otherPerson.color} flex items-center justify-center text-white font-bold shadow-lg`}>
                      {otherPerson.name[0]}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        Trade with {otherPerson.name}
                      </div>
                      <div className="text-green-400 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Accepted
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-sm text-blue-200">
                    <div className="mb-2">
                      <span className="font-medium">Your new shift:</span> {formatDate(myShift.shift_date)}
                    </div>
                    <div className="text-xs">
                      After both shifts are completed, they will automatically swap back.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
