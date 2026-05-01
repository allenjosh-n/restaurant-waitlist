import React, { useState, useEffect, useCallback } from 'react';
import { createToken, getQueue, getTables, deleteToken, seatCustomer } from './api';
import './App.css';

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast--${type}`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  );
}

// ── Add Token Form ────────────────────────────────────────────────────────────
function AddTokenForm({ onSuccess, onError }) {
  const [form, setForm]     = useState({ customer_name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim() || form.customer_name.trim().length < 2)
      e.customer_name = 'Name must be at least 2 characters';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 10)
      e.phone = 'Enter a valid 10-digit phone number';
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
      setForm({ customer_name: '', phone: '' });
      onSuccess('Token created! Customer added to queue.');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create token';
      onError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-form" onSubmit={handleSubmit} noValidate>
      <h2 className="add-form__title">Add to Waitlist</h2>

      <div className="field">
        <label className="field__label">Customer Name</label>
        <input
          className={`field__input ${errors.customer_name ? 'field__input--error' : ''}`}
          type="text"
          placeholder="e.g. Arjun Sharma"
          value={form.customer_name}
          onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
        />
        {errors.customer_name && <span className="field__error">{errors.customer_name}</span>}
      </div>

      <div className="field">
        <label className="field__label">Phone Number</label>
        <input
          className={`field__input ${errors.phone ? 'field__input--error' : ''}`}
          type="tel"
          placeholder="e.g. +91-9876543210"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        />
        {errors.phone && <span className="field__error">{errors.phone}</span>}
      </div>

      <button className="btn btn--accent" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : '+ Add Customer'}
      </button>
    </form>
  );
}

// ── Queue List ────────────────────────────────────────────────────────────────
function QueueList({ queue, loading, onDelete, onSeat }) {
  if (loading) return <div className="loading-state">Loading queue…</div>;
  if (!queue.length) return (
    <div className="empty-state">
      <span className="empty-state__icon">🍽️</span>
      <p>Queue is empty — no one waiting!</p>
    </div>
  );

  return (
    <div className="queue-list">
      {queue.map((entry) => (
        <div key={entry.queue_id} className="queue-card">
          <div className="queue-card__pos">#{entry.position}</div>
          <div className="queue-card__info">
            <span className="queue-card__name">{entry.customer_name}</span>
            <span className="queue-card__phone">{entry.phone}</span>
          </div>
          <div className="queue-card__wait">
            <span className="wait-label">~{entry.estimated_wait_time} min</span>
          </div>
          <div className="queue-card__actions">
            <button className="btn btn--sm btn--green" onClick={() => onSeat(entry.token_id)}>
              Seat
            </button>
            <button className="btn btn--sm btn--danger" onClick={() => onDelete(entry.token_id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tables Grid ───────────────────────────────────────────────────────────────
function TablesGrid({ tables, loading }) {
  if (loading) return <div className="loading-state">Loading tables…</div>;
  if (!tables.length) return <div className="empty-state"><p>No table data.</p></div>;

  const statusIcon = { available: '🟢', occupied: '🔴', reserved: '🟡' };

  return (
    <div className="tables-grid">
      {tables.map(t => (
        <div key={t.id} className={`table-card table-card--${t.status}`}>
          <div className="table-card__number">T{t.table_number}</div>
          <div className="table-card__cap">{t.capacity} seats</div>
          <div className="table-card__status">
            {statusIcon[t.status]} {t.status}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ queue, tables }) {
  const available = tables.filter(t => t.status === 'available').length;
  const occupied  = tables.filter(t => t.status === 'occupied').length;
  const maxWait   = queue.length ? Math.max(...queue.map(q => q.estimated_wait_time)) : 0;

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat__value">{queue.length}</span>
        <span className="stat__label">In Queue</span>
      </div>
      <div className="stat">
        <span className="stat__value stat__value--green">{available}</span>
        <span className="stat__label">Tables Free</span>
      </div>
      <div className="stat">
        <span className="stat__value stat__value--red">{occupied}</span>
        <span className="stat__label">Occupied</span>
      </div>
      <div className="stat">
        <span className="stat__value stat__value--accent">{maxWait}m</span>
        <span className="stat__label">Max Wait</span>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [queue,      setQueue]      = useState([]);
  const [tables,     setTables]     = useState([]);
  const [qLoading,   setQLoading]   = useState(true);
  const [tLoading,   setTLoading]   = useState(true);
  const [toast,      setToast]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('queue');

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchQueue = useCallback(async () => {
    setQLoading(true);
    try {
      const { data } = await getQueue();
      setQueue(data);
    } catch { showToast('Could not load queue', 'error'); }
    finally { setQLoading(false); }
  }, []);

  const fetchTables = useCallback(async () => {
    setTLoading(true);
    try {
      const { data } = await getTables();
      setTables(data);
    } catch { showToast('Could not load tables', 'error'); }
    finally { setTLoading(false); }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchTables();
    const interval = setInterval(() => { fetchQueue(); fetchTables(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchTables]);

  const handleDelete = async (id) => {
    try {
      await deleteToken(id);
      showToast('Customer removed from queue');
      fetchQueue();
    } catch { showToast('Failed to remove customer', 'error'); }
  };

  const handleSeat = async (id) => {
    try {
      await seatCustomer(id);
      showToast('Customer seated! 🎉');
      fetchQueue();
      fetchTables();
    } catch { showToast('Failed to seat customer', 'error'); }
  };

  const handleTokenAdded = (msg) => {
    showToast(msg);
    fetchQueue();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__brand">
          <span className="header__logo">🍴</span>
          <div>
            <h1 className="header__title">Waitlist</h1>
            <span className="header__sub">Dashboard</span>
          </div>
        </div>
        <div className="header__live">
          <span className="live-dot" />
          Live
        </div>
      </header>

      <main className="main">
        <StatsBar queue={queue} tables={tables} />

        {/* Add Form */}
        <AddTokenForm
          onSuccess={handleTokenAdded}
          onError={(msg) => showToast(msg, 'error')}
        />

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'queue' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            Queue {queue.length > 0 && <span className="badge">{queue.length}</span>}
          </button>
          <button
            className={`tab ${activeTab === 'tables' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            Tables
          </button>
        </div>

        {activeTab === 'queue' ? (
          <QueueList
            queue={queue}
            loading={qLoading}
            onDelete={handleDelete}
            onSeat={handleSeat}
          />
        ) : (
          <TablesGrid tables={tables} loading={tLoading} />
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
