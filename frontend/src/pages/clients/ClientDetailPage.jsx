import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Tag, Users } from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import { sessionsApi } from '../../api/sessions.api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import '../clients/ClientsPage.css';

export default function ClientDetailPage() {
  const { id } = useParams();
  const [client,   setClient]   = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [c, s] = await Promise.all([
          clientsApi.getById(id),
          sessionsApi.list({ clientId: id, limit: 10 }),
        ]);
        setClient(c.data.data);
        setSessions(s.data.data.sessions || []);
      } catch { toast.error('Failed to load client'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>;
  if (!client) return <div style={{ padding: 40, color: 'var(--danger)' }}>Client not found.</div>;

  const initials = client.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="page">
      <Link to="/clients" className="back-link">
        <ArrowLeft size={14} /> Back to clients
      </Link>

      {/* Profile Header */}
      <div className="client-detail-header">
        <div className="client-detail-avatar">{initials}</div>
        <div>
          <h2 className="client-detail-name">{client.name}</h2>
          <span className="status-badge" style={{
            color: client.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
            background: client.status === 'active' ? 'var(--success-bg)' : 'var(--bg-elevated)',
          }}>{client.status}</span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="detail-grid">
        <InfoCard icon={Mail} label="Email" value={client.email} />
        <InfoCard icon={Phone} label="Phone" value={client.phone || '—'} />
        <InfoCard icon={Calendar} label="Date of Birth"
          value={client.dateOfBirth ? format(new Date(client.dateOfBirth), 'dd MMM yyyy') : '—'} />
        <InfoCard icon={Tag} label="Tags"
          value={client.tags?.length ? client.tags.join(', ') : '—'} />
      </div>

      {/* Session History */}
      <div className="table-card">
        <div className="table-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={14} color="var(--teal)" />
          <p className="table-count" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            Session History ({sessions.length})
          </p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Type</th>
                <th>Medium</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0
                ? <tr><td colSpan={5}><div className="table-empty"><Users size={28} /><p>No sessions yet</p></div></td></tr>
                : sessions.map((s) => (
                  <tr key={s._id} className="table-row-hover">
                    <td>{format(new Date(s.scheduledAt), 'dd MMM yyyy, h:mm a')}</td>
                    <td className="text-secondary">{s.sessionType || 'individual'}</td>
                    <td className="text-secondary">{s.medium || 'in-person'}</td>
                    <td className="text-secondary">{s.durationMinutes || 50} min</td>
                    <td><span className="status-badge" style={{
                      color: s.status === 'completed' ? 'var(--success)' : s.status === 'scheduled' ? 'var(--info)' : 'var(--warning)',
                      background: s.status === 'completed' ? 'var(--success-bg)' : s.status === 'scheduled' ? 'var(--info-bg)' : 'var(--warning-bg)',
                    }}>{s.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="info-card">
      <div className="info-card-icon"><Icon size={14} /></div>
      <div>
        <p className="info-card-label">{label}</p>
        <p className="info-card-value">{value}</p>
      </div>
    </div>
  );
}
