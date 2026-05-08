import React, { useState, useEffect, useCallback } from 'react';
import {
  createToken, getQueue, getTables, deleteToken, seatCustomer,
  cancelToken, getAnalytics, suggestSeating, getHistory, exportCSV,
  freeTable, reserveTable, unreserveTable, freeAllTables
} from './api';
import './App.css';

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`toast toast--${type}`}>
      <span className="toast__icon">{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, queueCount }) {
  const navItems = [
    { id: 'queue',     icon: '⬡', label: 'Queue',     badge: queueCount },
    { id: 'tables',    icon: '⊞', label: 'Tables',    badge: null },
    { id: 'analytics', icon: '◈', label: 'Analytics', badge: null },
    { id: 'history',   icon: '◷', label: 'History',   badge: null },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo-row">
          <div className="sidebar__icon">🍴</div>
          <span className="sidebar__title">Waitlist</span>
        </div>
        <div className="sidebar__subtitle">Restaurant OS</div>
      </div>
      <nav className="sidebar__nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar__nav-item ${activeTab === item.id ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar__live">
        <span className="live-dot" />
        Live Updates
      </div>
    </aside>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ queue, tables }) {
  const available = tables.filter(t => t.status === 'available').length;
  const occupied  = tables.filter(t => t.status === 'occupied').length;
  const maxWait   = queue.length ? Math.max(...queue.map(q => q.estimated_wait_time)) : 0;

  const stats = [
    { icon: '⬡', iconClass: 'stat__icon--orange', value: queue.length,  valueClass: 'stat__value--accent', label: 'In Queue' },
    { icon: '✓', iconClass: 'stat__icon--green',  value: available,     valueClass: 'stat__value--green',  label: 'Tables Free' },
    { icon: '●', iconClass: 'stat__icon--red',    value: occupied,      valueClass: 'stat__value--red',    label: 'Occupied' },
    { icon: '◷', iconClass: 'stat__icon--yellow', value: `${maxWait}m`, valueClass: 'stat__value--yellow', label: 'Max Wait' },
  ];

  return (
    <div className="stats-bar">
      {stats.map((s, i) => (
        <div key={i} className="stat">
          <div className={`stat__icon ${s.iconClass}`}>{s.icon}</div>
          <div className="stat__body">
            <span className={`stat__value ${s.valueClass}`}>{s.value}</span>
            <div className="stat__label">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Add Token Form ────────────────────────────────────────────────────────────
function AddTokenForm({ onSuccess, onError }) {
  const [form, setForm]     = useState({ customer_name: '', phone: '', party_size: 2 });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim() || form.customer_name.trim().length < 2)
      e.customer_name = 'Min 2 characters';
    if (form.phone.replace(/\D/g, '').length < 10)
      e.phone = 'Enter valid 10-digit number';
    if (form.party_size < 1) e.party_size = 'Min 1';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await createToken(form);
      setForm({ customer_name: '', phone: '', party_size: 2 });
      onSuccess('Token created — customer added to queue.');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create token';
      onError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">+ Add to Waitlist</span>
      </div>
      <div className="card__body">
        <form className="add-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label">Customer Name</label>
            <input className={`field__input ${errors.customer_name ? 'field__input--error' : ''}`}
              type="text" placeholder="e.g. Arjun Sharma"
              value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            {errors.customer_name && <span className="field__error">{errors.customer_name}</span>}
          </div>
          <div className="field">
            <label className="field__label">Phone Number</label>
            <input className={`field__input ${errors.phone ? 'field__input--error' : ''}`}
              type="tel" placeholder="+91-9876543210"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            {errors.phone && <span className="field__error">{errors.phone}</span>}
          </div>
          <div className="field">
            <label className="field__label">Party Size</label>
            <input className={`field__input ${errors.party_size ? 'field__input--error' : ''}`}
              type="number" min="1" max="20"
              value={form.party_size}
              onChange={e => setForm(f => ({ ...f, party_size: parseInt(e.target.value) || 1 }))} />
            {errors.party_size && <span className="field__error">{errors.party_size}</span>}
          </div>
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : '+ Add Customer'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Queue List ────────────────────────────────────────────────────────────────
function QueueList({ queue, loading, onDelete, onSeat, onCancel, suggestedTokenId, onSuggest }) {
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = queue.filter(q =>
    q.customer_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    q.phone.includes(filterQuery) ||
    q.party_size.toString() === filterQuery
  );

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Live Queue</span>
        <button className="btn btn--outline btn--sm" onClick={onSuggest}>✦ Suggest</button>
      </div>
      <div className="queue-toolbar">
        <input type="text" placeholder="Search name, phone, party size…"
          className="field__input"
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)} />
      </div>
      {loading ? (
        <div className="loading-state">Loading queue…</div>
      ) : queue.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">◎</span>
          <p>Queue is empty — no one waiting</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No matches found.</p></div>
      ) : (
        <div className="queue-list">
          {filtered.map(entry => (
            <div key={entry.queue_id}
              className={`queue-card ${suggestedTokenId === entry.token_id ? 'queue-card--suggested' : ''}`}>
              <div className="queue-card__pos">#{entry.position}</div>
              <div className="queue-card__avatar">{getInitials(entry.customer_name)}</div>
              <div className="queue-card__info">
                <div className="queue-card__name">{entry.customer_name}</div>
                <div className="queue-card__meta">{entry.phone} · {entry.party_size} guests</div>
              </div>
              <div className="queue-card__wait">
                <span className="wait-badge">~{entry.estimated_wait_time}m</span>
              </div>
              <div className="queue-card__actions">
                <button className="btn btn--sm btn--green" onClick={() => onSeat(entry.token_id)}>Seat</button>
                <button className="btn btn--sm btn--warning" onClick={() => onCancel(entry.token_id)}>No-Show</button>
                <button className="btn btn--sm btn--danger" onClick={() => onDelete(entry.token_id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tables Grid ───────────────────────────────────────────────────────────────
function TablesGrid({ tables, loading, onFree, onReserve, onUnreserve, onFreeAll }) {
  if (loading) return <div className="loading-state">Loading tables…</div>;
  if (!tables.length) return <div className="empty-state"><p>No table data.</p></div>;

  const statusIcon = { available: '●', occupied: '●', reserved: '●' };
  const counts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
    reserved:  tables.filter(t => t.status === 'reserved').length,
  };

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Table Status</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span style={{ color: 'var(--green)' }}>● {counts.available} Free</span>
            <span style={{ color: 'var(--red)' }}>● {counts.occupied} Occupied</span>
            <span style={{ color: 'var(--yellow)' }}>● {counts.reserved} Reserved</span>
          </div>
          {counts.occupied > 0 && (
            <button className="btn btn--sm btn--green" onClick={onFreeAll}>Free All</button>
          )}
        </div>
      </div>
      <div className="tables-grid">
        {tables.map(t => (
          <div key={t.id} className={`table-card table-card--${t.status}`}>
            <div className="table-card__number">T{t.table_number}</div>
            <div className="table-card__cap">{t.capacity} seats</div>
            <div className="table-card__status">
              {statusIcon[t.status]} {t.status}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {t.status === 'occupied' && (
                <button className="btn btn--sm btn--green" style={{ width: '100%', fontSize: '10px' }} onClick={() => onFree(t.id)}>Free</button>
              )}
              {t.status === 'available' && (
                <button className="btn btn--sm btn--warning" style={{ width: '100%', fontSize: '10px' }} onClick={() => onReserve(t.id)}>Reserve</button>
              )}
              {t.status === 'reserved' && (
                <button className="btn btn--sm btn--outline" style={{ width: '100%', fontSize: '10px' }} onClick={() => onUnreserve(t.id)}>Unreserve</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────
function AnalyticsTab({ loading, analytics }) {
  if (loading) return <div className="loading-state">Loading analytics…</div>;
  if (!analytics) return <div className="empty-state"><p>No analytics available.</p></div>;

  const cards = [
    { icon: '◈', iconClass: 'stat__icon--orange', value: analytics.total_today,     label: 'Total Today',    color: 'var(--accent)' },
    { icon: '◷', iconClass: 'stat__icon--yellow', value: analytics.total_waiting,   label: 'Waiting',        color: 'var(--yellow)' },
    { icon: '✓', iconClass: 'stat__icon--green',  value: analytics.total_seated,    label: 'Seated',         color: 'var(--green)' },
    { icon: '✕', iconClass: 'stat__icon--red',    value: analytics.total_cancelled, label: 'No-Shows',       color: 'var(--red)' },
  ];

  const seated = analytics.total_seated || 0;
  const total  = analytics.total_today  || 1;
  const pct    = Math.round((seated / total) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card">
        <div className="card__header">
          <span className="card__title">Today's Overview</span>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="analytics-grid">
          {cards.map((c, i) => (
            <div key={i} className="analytics-card">
              <div className={`analytics-card__icon ${c.iconClass}`}>{c.icon}</div>
              <div>
                <div className="analytics-card__value" style={{ color: c.color }}>{c.value}</div>
                <div className="analytics-card__label">{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <span className="card__title">Seating Rate</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>{pct}%</span>
        </div>
        <div className="card__body">
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text3)' }}>
            <span>{seated} seated of {analytics.total_today} total</span>
            <span>{analytics.total_cancelled} no-shows</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    getHistory()
      .then(({ data }) => setHistory(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => window.open(exportCSV(), '_blank');

  const filtered = filter === 'all' ? history : history.filter(e => e.status === filter);

  const counts = {
    all:       history.length,
    seated:    history.filter(e => e.status === 'seated').length,
    cancelled: history.filter(e => e.status === 'cancelled').length,
  };

  const filterBtns = [
    { key: 'all',       label: `All  ${counts.all}` },
    { key: 'seated',    label: `Seated  ${counts.seated}` },
    { key: 'cancelled', label: `No-Show  ${counts.cancelled}` },
  ];

  const statusStyle = {
    seated:    { bg: 'var(--green-dim)',  color: 'var(--green)',  border: 'rgba(34,197,94,0.2)',   icon: '✓' },
    cancelled: { bg: 'var(--red-dim)',    color: 'var(--red)',    border: 'rgba(239,68,68,0.15)',  icon: '✕' },
  };

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Today's History</span>
        <button className="btn btn--outline btn--sm" onClick={handleExport}>↓ Export CSV</button>
      </div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '6px' }}>
        {filterBtns.map(btn => (
          <button key={btn.key} onClick={() => setFilter(btn.key)}
            style={{
              padding: '4px 12px', borderRadius: '20px', border: '1px solid',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              borderColor: filter === btn.key ? 'rgba(255,140,66,0.3)' : 'var(--border)',
              background: filter === btn.key ? 'var(--accent-dim)' : 'transparent',
              color: filter === btn.key ? 'var(--accent)' : 'var(--text3)',
            }}>
            {btn.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">Loading history…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">◎</span>
          <p>{filter === 'all' ? 'No entries yet today.' : `No ${filter} entries today.`}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Customer', 'Phone', 'Party', 'Status', 'Time (IST)'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const s = statusStyle[entry.status] || statusStyle.cancelled;
                return (
                  <tr key={entry.id}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 16px', color: 'var(--text3)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--text)' }}>{entry.customer_name}</td>
                    <td style={{ padding: '11px 16px', color: 'var(--text3)' }}>{entry.phone}</td>
                    <td style={{ padding: '11px 16px', color: 'var(--text3)' }}>{entry.party_size}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{
                        background: s.bg, color: s.color,
                        border: `1px solid ${s.border}`,
                        padding: '2px 9px', borderRadius: '20px',
                        fontSize: '10px', fontWeight: 600,
                      }}>
                        {s.icon} {entry.status === 'cancelled' ? 'No-Show' : 'Seated'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', color: 'var(--text3)' }}>
                      {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [queue,     setQueue]     = useState([]);
  const [tables,    setTables]    = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [qLoading,  setQLoading]  = useState(true);
  const [tLoading,  setTLoading]  = useState(true);
  const [aLoading,  setALoading]  = useState(true);
  const [toast,     setToast]     = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [suggestedTokenId, setSuggestedTokenId] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchQueue = useCallback(async () => {
    setQLoading(true);
    try { const { data } = await getQueue(); setQueue(data); }
    catch { showToast('Could not load queue', 'error'); }
    finally { setQLoading(false); }
  }, []);

  const fetchTables = useCallback(async () => {
    setTLoading(true);
    try { const { data } = await getTables(); setTables(data); }
    catch { showToast('Could not load tables', 'error'); }
    finally { setTLoading(false); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setALoading(true);
    try { const { data } = await getAnalytics(); setAnalytics(data); }
    catch { console.error('analytics error'); }
    finally { setALoading(false); }
  }, []);

  useEffect(() => {
    fetchQueue(); fetchTables(); fetchAnalytics();
    const interval = setInterval(() => { fetchQueue(); fetchTables(); fetchAnalytics(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchTables, fetchAnalytics]);

  const handleDelete = async (id) => {
    try { await deleteToken(id); showToast('Customer removed'); fetchQueue(); }
    catch { showToast('Failed to remove customer', 'error'); }
  };

  const handleSeat = async (id) => {
    try {
      await seatCustomer(id); showToast('Customer seated ✓');
      fetchQueue(); fetchTables(); fetchAnalytics();
      if (suggestedTokenId === id) setSuggestedTokenId(null);
    } catch { showToast('Failed to seat customer', 'error'); }
  };

  const handleCancel = async (id) => {
    try {
      await cancelToken(id); showToast('Marked as no-show');
      fetchQueue(); fetchAnalytics();
      if (suggestedTokenId === id) setSuggestedTokenId(null);
    } catch { showToast('Failed to cancel', 'error'); }
  };

  const handleSuggest = async () => {
    try {
      const { data } = await suggestSeating();
      if (data.token_id) { setSuggestedTokenId(data.token_id); setActiveTab('queue'); showToast(data.message); }
      else showToast(data.message, 'error');
    } catch { showToast('Error suggesting seating', 'error'); }
  };

  const handleFreeTable     = async (id) => { try { await freeTable(id);      showToast('Table freed');      fetchTables(); } catch { showToast('Failed', 'error'); } };
  const handleReserveTable  = async (id) => { try { await reserveTable(id);   showToast('Table reserved');   fetchTables(); } catch { showToast('Failed', 'error'); } };
  const handleUnreserveTable= async (id) => { try { await unreserveTable(id); showToast('Table unreserved'); fetchTables(); } catch { showToast('Failed', 'error'); } };
  const handleFreeAllTables = async ()   => {
    try { const { data } = await freeAllTables(); showToast(data.message); fetchTables(); }
    catch { showToast('Failed to free tables', 'error'); }
  };

  const tabTitles = {
    queue:     { title: 'Live Queue',    subtitle: 'Manage walk-in customers in real time' },
    tables:    { title: 'Table Status',  subtitle: 'Monitor and control dining tables' },
    analytics: { title: 'Analytics',     subtitle: "Today's performance at a glance" },
    history:   { title: 'History',       subtitle: "Today's completed and cancelled entries" },
  };

  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const dateStr = time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} queueCount={queue.length} />

      <div className="main-content">
        <div className="topbar">
          <div className="topbar__left">
            <div className="topbar__title">{tabTitles[activeTab].title}</div>
            <div className="topbar__subtitle">{tabTitles[activeTab].subtitle}</div>
          </div>
          <div className="topbar__right">
            <div className="topbar__status">
              <span className="live-dot" /> Live
            </div>
            <div className="topbar__date">
              📅 {dateStr} &nbsp;·&nbsp; {timeStr}
            </div>
            <div className="topbar__avatar">AJ</div>
          </div>
        </div>

        <div className="page-body">
          <StatsBar queue={queue} tables={tables} />

          {activeTab === 'queue' && (
            <div className="two-col">
              <AddTokenForm
                onSuccess={(msg) => { showToast(msg); fetchQueue(); }}
                onError={(msg) => showToast(msg, 'error')}
              />
              <QueueList
                queue={queue} loading={qLoading}
                onDelete={handleDelete} onSeat={handleSeat}
                onCancel={handleCancel} suggestedTokenId={suggestedTokenId}
                onSuggest={handleSuggest}
              />
            </div>
          )}

          {activeTab === 'tables' && (
            <TablesGrid tables={tables} loading={tLoading}
              onFree={handleFreeTable} onReserve={handleReserveTable}
              onUnreserve={handleUnreserveTable} onFreeAll={handleFreeAllTables} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab analytics={analytics} loading={aLoading} />
          )}

          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
