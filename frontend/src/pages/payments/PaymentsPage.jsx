import { useEffect, useState } from 'react';
import { Plus, CreditCard, DollarSign, TrendingUp, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { paymentsApi } from '../../api/payments.api';
import { clientsApi } from '../../api/clients.api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import '../clients/ClientsPage.css';
import './PaymentsPage.css';

const STATUS_BADGES = {
  succeeded:          { color: 'var(--success)', bg: 'var(--success-bg)' },
  pending:            { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  refunded:           { color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  partially_refunded: { color: 'var(--violet)',  bg: 'var(--violet-glow)'},
};

export default function PaymentsPage() {
  const [payments,   setPayments]   = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [total,      setTotal]      = useState(0);
  const [status,     setStatus]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        paymentsApi.list({ status, limit: 30 }),
        paymentsApi.revenueSummary({ year: new Date().getFullYear() }),
      ]);
      setPayments(pRes.data.data.payments || []);
      setTotal(pRes.data.data.pagination?.total || 0);
      setSummary(sRes.data.data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [status]);

  const totalRev = summary?.totalRevenue ? `₹${(summary.totalRevenue / 100).toLocaleString('en-IN')}` : '₹0';

  return (
    <div className="page">
      {/* Revenue Header Summary Cards */}
      <div className="revenue-summary-row">
        <div className="rev-card">
          <div className="rev-card-top">
            <span>Total Revenue</span>
            <div className="rev-card-icon" style={{ background: 'var(--teal-glow)' }}>
              <TrendingUp size={16} color="var(--teal)" />
            </div>
          </div>
          <p className="rev-card-value">{totalRev}</p>
          <span className="rev-card-sub">Year to date</span>
        </div>

        <div className="rev-card">
          <div className="rev-card-top">
            <span>Total Payments</span>
            <div className="rev-card-icon" style={{ background: 'var(--violet-glow)' }}>
              <CreditCard size={16} color="var(--violet)" />
            </div>
          </div>
          <p className="rev-card-value">{total}</p>
          <span className="rev-card-sub">Recorded transactions</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <select
            id="payment-status-filter"
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button id="record-payment-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Record Manual Payment
        </button>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-meta">
          <p className="table-count">{total} transaction{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Payment For</th>
                <th>Gateway / Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ height: 14, borderRadius: 4, width: 70 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <CreditCard size={32} />
                      <p>No payment records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const st = STATUS_BADGES[p.status] || STATUS_BADGES.succeeded;
                  const clientName = p.clientId?.name || 'Manual Client';
                  return (
                    <tr key={p._id} className="table-row-hover">
                      <td className="text-secondary">
                        {format(new Date(p.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td>
                        <span className="payment-client-name">{clientName}</span>
                      </td>
                      <td>
                        <span className="payment-amount">
                          ₹{(p.amount / 100).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-secondary" style={{ textTransform: 'capitalize' }}>
                        {p.paymentFor}
                      </td>
                      <td className="text-secondary" style={{ textTransform: 'capitalize' }}>
                        {p.gateway || 'manual'}
                      </td>
                      <td>
                        <span className="status-badge" style={{ color: st.color, background: st.bg }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RecordPaymentModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchPayments();
          }}
        />
      )}
    </div>
  );
}

function RecordPaymentModal({ onClose, onSuccess }) {
  const [clients, setClients] = useState([]);
  const [form, setForm]       = useState({
    clientId: '',
    paymentFor: 'session',
    amount: '',
    description: '',
    gatewayReceiptId: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    clientsApi.list({ limit: 100, status: 'active' }).then((res) => {
      const cls = res.data.data.clients || [];
      setClients(cls);
      if (cls.length > 0) {
        setForm((f) => ({ ...f, clientId: cls[0]._id }));
      }
    });
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setBusy(true);
    try {
      // Backend expects amount in paise (1 INR = 100 paise)
      const amountPaise = Math.round(Number(form.amount) * 100);
      await paymentsApi.markManual({
        ...form,
        amount: amountPaise,
      });
      toast.success('Manual payment recorded successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Record Offline / Manual Payment</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Client
            <select
              name="clientId"
              className="modal-input"
              value={form.clientId}
              onChange={handleChange}
              required
            >
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Amount (₹ INR)
              <input
                name="amount"
                type="number"
                step="1"
                className="modal-input"
                placeholder="1500"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Payment Purpose
              <select
                name="paymentFor"
                className="modal-input"
                value={form.paymentFor}
                onChange={handleChange}
              >
                <option value="session">Individual Session</option>
                <option value="package">Package / Bundle</option>
                <option value="consultation">Consultation Fee</option>
              </select>
            </label>
          </div>

          <label>
            Receipt / Transaction Reference (Optional)
            <input
              name="gatewayReceiptId"
              className="modal-input"
              placeholder="e.g. UPI Ref #987654321"
              value={form.gatewayReceiptId}
              onChange={handleChange}
            />
          </label>

          <label>
            Description / Notes
            <textarea
              name="description"
              className="modal-input"
              rows={2}
              placeholder="e.g. Cash payment received at clinic"
              value={form.description}
              onChange={handleChange}
            />
          </label>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
