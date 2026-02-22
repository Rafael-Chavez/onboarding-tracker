import { useState, useEffect, useMemo } from 'react';
import { SupabaseService } from '../services/supabase';
import { GoogleSheetsService } from '../services/googleSheets';

const EMPLOYEES = ['All', 'Rafael', 'Danreb', 'Jim', 'Marc', 'Steve', 'Erick'];
const ATTENDANCE_OPTIONS = ['All', 'completed', 'pending', 'no-show', 'rescheduled', 'cancelled'];

function getMonthOptions(onboardings) {
  const months = [...new Set(onboardings.map(o => o.month).filter(Boolean))];
  months.sort((a, b) => b.localeCompare(a));
  return ['All', ...months];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}

function AttendanceBadge({ status, lightMode }) {
  // Sales team sees pending_approval as just "pending"
  const displayStatus = status === 'pending_approval' ? 'pending' : status;
  const darkColors = {
    completed:   { bg: 'rgba(0, 242, 255, 0.12)',   border: 'rgba(0, 242, 255, 0.4)',   text: '#00f2ff' },
    pending:     { bg: 'rgba(255, 200, 0, 0.10)',   border: 'rgba(255, 200, 0, 0.4)',   text: '#ffc800' },
    'no-show':   { bg: 'rgba(255, 60, 80, 0.12)',   border: 'rgba(255, 60, 80, 0.4)',   text: '#ff3c50' },
    rescheduled: { bg: 'rgba(160, 100, 255, 0.12)', border: 'rgba(160, 100, 255, 0.4)', text: '#a064ff' },
    cancelled:   { bg: 'rgba(120, 120, 140, 0.12)', border: 'rgba(120, 120, 140, 0.4)', text: '#78788c' },
  };
  const lightColors = {
    completed:   { bg: 'rgba(6, 182, 212, 0.12)',   border: 'rgba(6, 182, 212, 0.5)',   text: '#0891b2' },
    pending:     { bg: 'rgba(202, 138, 4, 0.10)',   border: 'rgba(202, 138, 4, 0.4)',   text: '#a16207' },
    'no-show':   { bg: 'rgba(220, 38, 38, 0.10)',   border: 'rgba(220, 38, 38, 0.4)',   text: '#b91c1c' },
    rescheduled: { bg: 'rgba(109, 40, 217, 0.10)', border: 'rgba(109, 40, 217, 0.4)', text: '#6d28d9' },
    cancelled:   { bg: 'rgba(100, 116, 139, 0.10)', border: 'rgba(100, 116, 139, 0.4)', text: '#475569' },
  };
  const palette = lightMode ? lightColors : darkColors;
  const c = palette[displayStatus] || palette['pending'];
  const label = displayStatus || 'pending';
  return (
    <span style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      borderRadius: '4px',
      padding: '2px 10px',
      fontSize: '11px',
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

export default function SalesDashboard() {
  const [onboardings, setOnboardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('All');
  const [filterAttendance, setFilterAttendance] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [lightMode, setLightMode] = useState(() => {
    try { return localStorage.getItem('sales-theme') === 'light'; } catch { return false; }
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const toggleTheme = () => {
    setLightMode(prev => {
      const next = !prev;
      try { localStorage.setItem('sales-theme', next ? 'light' : 'dark'); } catch {}
      return next;
    });
  };

  const handleSyncToSheets = async () => {
    setSyncing(true);
    setSyncMessage('Preparing data...');

    try {
      // Sort all onboardings chronologically
      const sortedOnboardings = [...onboardings].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateA.localeCompare(dateB);
      });

      // Build onboardings with corrected session numbers using the sessionNumberMap
      const onboardingsWithCorrectSessions = sortedOnboardings.map(o => ({
        ...o,
        sessionNumber: sessionNumberMap[o.id] || 1
      }));

      // Debug: Check first few records
      console.log('Sample records being synced:');
      onboardingsWithCorrectSessions.slice(0, 3).forEach((o, i) => {
        console.log(`Record ${i + 1}:`, {
          date: o.date,
          employee: o.employeeName,
          client: o.clientName,
          account: o.accountNumber,
          session: o.sessionNumber,
          attendance: o.attendance,
          attendanceType: typeof o.attendance,
          attendanceIsNull: o.attendance === null,
          attendanceIsUndefined: o.attendance === undefined,
          fullObject: o
        });
      });

      setSyncMessage(`Syncing ${onboardingsWithCorrectSessions.length} records...`);

      const result = await GoogleSheetsService.syncAllOnboardings(onboardingsWithCorrectSessions);

      if (result.success) {
        setSyncMessage(`✓ Successfully synced ${onboardingsWithCorrectSessions.length} records`);
        setTimeout(() => setSyncMessage(''), 3000);
      } else {
        setSyncMessage(`✗ Error: ${result.error}`);
        setTimeout(() => setSyncMessage(''), 5000);
      }
    } catch (error) {
      setSyncMessage(`✗ Error: ${error.message}`);
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await SupabaseService.getAllOnboardings();
      if (result.success) {
        setOnboardings(result.onboardings);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    load();

    const sub = SupabaseService.subscribeToOnboardings(() => load());
    return () => SupabaseService.unsubscribe(sub);
  }, []);

  const monthOptions = useMemo(() => getMonthOptions(onboardings), [onboardings]);

  // Build a map of id -> computed session number based on account number + chronological date order
  const sessionNumberMap = useMemo(() => {
    // Group all onboardings by account number
    const byAccount = {};
    for (const o of onboardings) {
      const key = (o.accountNumber || '').trim();
      if (!byAccount[key]) byAccount[key] = [];
      byAccount[key].push(o);
    }
    // Sort each group by date ascending (oldest first = session #1)
    const map = {};
    for (const key of Object.keys(byAccount)) {
      const sorted = [...byAccount[key]].sort((a, b) => {
        const da = a.date || '';
        const db = b.date || '';
        return da.localeCompare(db);
      });
      sorted.forEach((o, idx) => {
        map[o.id] = idx + 1;
      });
    }
    return map;
  }, [onboardings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return onboardings.filter(o => {
      if (filterEmployee !== 'All' && o.employeeName !== filterEmployee) return false;
      // pending_approval is shown as "pending" to sales team
      const effectiveStatus = o.attendance === 'pending_approval' ? 'pending' : o.attendance;
      if (filterAttendance !== 'All' && effectiveStatus !== filterAttendance) return false;
      if (filterMonth !== 'All' && o.month !== filterMonth) return false;
      if (q) {
        const haystack = [
          o.clientName,
          o.employeeName,
          o.accountNumber,
          o.notes,
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [onboardings, search, filterEmployee, filterAttendance, filterMonth]);

  const clearFilters = () => {
    setSearch('');
    setFilterEmployee('All');
    setFilterAttendance('All');
    setFilterMonth('All');
  };

  const activeFilterCount = [
    filterEmployee !== 'All',
    filterAttendance !== 'All',
    filterMonth !== 'All',
    search.trim() !== '',
  ].filter(Boolean).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap');

        :root {
          --bg: #05070a;
          --surface: rgba(255,255,255,0.03);
          --surface-hover: rgba(255,255,255,0.06);
          --border: rgba(255,255,255,0.08);
          --border-bright: rgba(0,242,255,0.25);
          --cyan: #00f2ff;
          --cyan-dim: rgba(0,242,255,0.6);
          --text: #c8d0e0;
          --text-muted: rgba(200,208,224,0.45);
          --text-bright: #e8edf5;
          --row-alt: rgba(255,255,255,0.015);
          --header-bg: linear-gradient(180deg, rgba(0,242,255,0.04) 0%, transparent 100%);
          --toolbar-bg: rgba(0,0,0,0.2);
          --thead-bg: rgba(5,7,10,0.95);
          --statusbar-bg: rgba(5,7,10,0.96);
        }

        .sales-root[data-theme="light"] {
          --bg: #f0f4f8;
          --surface: rgba(255,255,255,0.7);
          --surface-hover: rgba(255,255,255,0.95);
          --border: rgba(100,116,139,0.18);
          --border-bright: rgba(6,182,212,0.4);
          --cyan: #0891b2;
          --cyan-dim: rgba(8,145,178,0.8);
          --text: #334155;
          --text-muted: rgba(71,85,105,0.65);
          --text-bright: #0f172a;
          --row-alt: rgba(241,245,249,0.8);
          --header-bg: linear-gradient(180deg, rgba(6,182,212,0.06) 0%, transparent 100%);
          --toolbar-bg: rgba(226,232,240,0.6);
          --thead-bg: rgba(241,245,249,0.98);
          --statusbar-bg: rgba(248,250,252,0.98);
        }

        .sales-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Inter', sans-serif;
          color: var(--text);
          padding: 0;
        }

        .sales-header {
          padding: 28px 32px 0;
          border-bottom: 1px solid var(--border);
          background: var(--header-bg);
        }

        .sales-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 6px;
          justify-content: space-between;
        }

        .sales-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 22px;
          font-weight: 600;
          color: var(--cyan);
          letter-spacing: -0.01em;
          margin: 0;
        }

        .sales-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0 0 20px;
          font-family: 'JetBrains Mono', monospace;
        }

        .sales-toolbar {
          padding: 16px 32px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          border-bottom: 1px solid var(--border);
          background: var(--toolbar-bg);
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 220px;
          max-width: 380px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 14px;
          pointer-events: none;
        }

        .sales-search {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 12px 8px 36px;
          color: var(--text-bright);
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }

        .sales-search:focus {
          border-color: var(--border-bright);
          box-shadow: 0 0 0 2px rgba(0,242,255,0.08);
        }

        .sales-search::placeholder {
          color: var(--text-muted);
        }

        .filter-select {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s;
          appearance: none;
          padding-right: 28px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23556' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }

        .filter-select:focus {
          border-color: var(--border-bright);
        }

        .filter-select option {
          background: var(--bg);
          color: var(--text);
        }

        .filter-select.active {
          border-color: var(--cyan-dim);
          color: var(--cyan);
        }

        .clear-btn {
          background: rgba(255,60,80,0.1);
          border: 1px solid rgba(255,60,80,0.25);
          color: rgba(255,100,115,0.9);
          border-radius: 6px;
          padding: 8px 14px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .clear-btn:hover {
          background: rgba(255,60,80,0.18);
          border-color: rgba(255,60,80,0.5);
        }

        .sync-btn {
          background: rgba(0,242,255,0.1);
          border: 1px solid rgba(0,242,255,0.25);
          color: var(--cyan);
          border-radius: 6px;
          padding: 8px 14px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .sync-btn:hover:not(:disabled) {
          background: rgba(0,242,255,0.18);
          border-color: rgba(0,242,255,0.5);
        }

        .sync-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sync-message {
          padding: 8px 14px;
          border-radius: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
        }

        .canvas-wrap {
          margin: 0;
          overflow: hidden;
        }

        .table-scroll {
          overflow-x: auto;
          overflow-y: auto;
          max-height: calc(100vh - 220px);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12.5px;
        }

        .data-table thead {
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .data-table thead tr {
          background: var(--thead-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-bright);
        }

        .data-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--cyan-dim);
          white-space: nowrap;
          border-right: 1px solid var(--border);
          user-select: none;
        }

        .data-table th:last-child {
          border-right: none;
        }

        .data-table th.th-num {
          color: var(--text-muted);
          width: 44px;
          text-align: center;
        }

        .data-table tbody tr {
          border-bottom: 1px solid var(--border);
          transition: background 0.1s;
        }

        .data-table tbody tr:nth-child(even) {
          background: var(--row-alt);
        }

        .data-table tbody tr:hover {
          background: var(--surface-hover);
        }

        .data-table td {
          padding: 9px 16px;
          color: var(--text);
          border-right: 1px solid var(--border);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .data-table td:last-child {
          border-right: none;
        }

        .td-num {
          color: var(--text-muted);
          font-size: 10px;
          text-align: center;
          padding: 9px 8px;
        }

        .td-date {
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        .td-employee {
          color: var(--cyan);
          font-weight: 500;
        }

        .td-client {
          color: var(--text-bright);
          font-weight: 400;
        }

        .td-account {
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .td-session {
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state {
          text-align: center;
          padding: 80px 32px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }

        .empty-state-icon {
          font-size: 40px;
          margin-bottom: 16px;
          opacity: 0.3;
        }

        .empty-state-text {
          font-size: 13px;
          margin: 0;
        }

        .status-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 30px;
          background: var(--statusbar-bg);
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 0 32px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-muted);
          z-index: 100;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cyan);
          box-shadow: 0 0 6px var(--cyan);
        }

        .status-val {
          color: var(--cyan);
          font-weight: 500;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--text-muted);
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .theme-toggle {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 5px 14px 5px 10px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--text-muted);
          transition: all 0.2s;
          white-space: nowrap;
        }

        .theme-toggle:hover {
          border-color: var(--border-bright);
          color: var(--cyan);
          background: var(--surface-hover);
        }

        .theme-toggle-icon {
          font-size: 14px;
          line-height: 1;
        }
      `}</style>

      <div className="sales-root" data-theme={lightMode ? 'light' : 'dark'}>
        {/* Header */}
        <div className="sales-header">
          <div className="sales-title-row">
            <h1 className="sales-title">// ONBOARDING RECORDS</h1>
            <button className="theme-toggle" onClick={toggleTheme}>
              <span className="theme-toggle-icon">{lightMode ? '🌙' : '☀️'}</span>
              {lightMode ? 'DARK' : 'LIGHT'}
            </button>
          </div>
          <p className="sales-subtitle">Sales &amp; Accounting View &mdash; Read-only &mdash; Auto-refreshing</p>
        </div>

        {/* Toolbar */}
        <div className="sales-toolbar">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="sales-search"
              type="text"
              placeholder="Search by name, client, account..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className={`filter-select ${filterEmployee !== 'All' ? 'active' : ''}`}
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
          >
            {EMPLOYEES.map(e => (
              <option key={e} value={e}>{e === 'All' ? 'All Employees' : e}</option>
            ))}
          </select>

          <select
            className={`filter-select ${filterAttendance !== 'All' ? 'active' : ''}`}
            value={filterAttendance}
            onChange={e => setFilterAttendance(e.target.value)}
          >
            {ATTENDANCE_OPTIONS.map(a => (
              <option key={a} value={a}>{a === 'All' ? 'All Statuses' : a}</option>
            ))}
          </select>

          <select
            className={`filter-select ${filterMonth !== 'All' ? 'active' : ''}`}
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          >
            {monthOptions.map(m => (
              <option key={m} value={m}>{m === 'All' ? 'All Months' : m}</option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button className="clear-btn" onClick={clearFilters}>
              ✕ Clear ({activeFilterCount})
            </button>
          )}

          <button
            className="sync-btn"
            onClick={handleSyncToSheets}
            disabled={syncing || onboardings.length === 0}
            style={{ marginLeft: 'auto' }}
          >
            {syncing ? '⟳ Syncing...' : '⤓ Sync to Sheets'}
          </button>

          {syncMessage && (
            <div className="sync-message" style={{
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              color: syncMessage.includes('✓') ? 'var(--cyan)' : syncMessage.includes('✗') ? '#ff3c50' : 'var(--text-muted)'
            }}>
              {syncMessage}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="canvas-wrap">
          <div className="table-scroll" style={{ paddingBottom: '30px' }}>
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                Loading records...
              </div>
            ) : error ? (
              <div className="empty-state">
                <div className="empty-state-icon">⚠</div>
                <p className="empty-state-text">Error: {error}</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="th-num">#</th>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Client Name</th>
                    <th>Account No.</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <div className="empty-state-icon">◯</div>
                          <p className="empty-state-text">No records match your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o, i) => (
                      <tr key={o.id}>
                        <td className="td-num">{i + 1}</td>
                        <td className="td-date">{formatDate(o.date)}</td>
                        <td className="td-employee">{o.employeeName || '—'}</td>
                        <td className="td-client">{o.clientName || '—'}</td>
                        <td className="td-account">{o.accountNumber || '—'}</td>
                        <td className="td-session">{sessionNumberMap[o.id] ?? '—'}</td>
                        <td><AttendanceBadge status={o.attendance} lightMode={lightMode} /></td>
                        <td style={{ color: 'var(--text-muted)', maxWidth: '260px' }}>{o.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-item">
            <div className="status-dot" />
            <span>LIVE</span>
          </div>
          <div className="status-item">
            <span>SHOWING</span>
            <span className="status-val">{filtered.length}</span>
            <span>/ {onboardings.length} RECORDS</span>
          </div>
          {activeFilterCount > 0 && (
            <div className="status-item">
              <span>FILTERS</span>
              <span className="status-val">{activeFilterCount} ACTIVE</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
