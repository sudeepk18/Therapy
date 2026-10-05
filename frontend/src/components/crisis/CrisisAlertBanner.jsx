import { useState, useEffect } from 'react';
import {
  AlertTriangle, ShieldAlert, Eye, X,
  User, Clock, ChevronRight, Check,
  MessageSquare,
} from 'lucide-react';
import { crisisApi } from '../../api/crisis.api';
import toast from 'react-hot-toast';
import './CrisisAlertBanner.css';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CrisisAlertBanner() {
  const [alerts, setAlerts]       = useState([]);
  const [expanded, setExpanded]   = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [notes, setNotes]         = useState('');

  useEffect(() => {
    loadAlerts();
    // Refresh every 60 seconds
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await crisisApi.getAlerts();
      setAlerts(res.data?.data?.alerts || []);
    } catch {
      // Silent
    }
  };

  const handleReview = async (alertId) => {
    try {
      await crisisApi.reviewAlert(alertId, { therapistNotes: notes });
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      setReviewing(null);
      setNotes('');
      toast.success('Alert reviewed and acknowledged.');
    } catch {
      toast.error('Could not review alert.');
    }
  };

  if (!alerts.length) return null;

  const criticalAlerts = alerts.filter((a) => a.riskLevel === 'critical');
  const highAlerts     = alerts.filter((a) => a.riskLevel === 'high');
  const hasUrgent      = criticalAlerts.length > 0;

  return (
    <div className={`cab-wrapper ${hasUrgent ? 'cab-wrapper--critical' : 'cab-wrapper--high'}`}>
      {/* Summary Bar */}
      <button className="cab-summary" onClick={() => setExpanded(!expanded)}>
        <div className="cab-summary-left">
          <ShieldAlert size={18} className="cab-icon" />
          <div>
            <span className="cab-summary-title">
              {hasUrgent ? '🚨 Critical Safety Alert' : '⚠️ Safety Alert'}
            </span>
            <span className="cab-summary-count">
              {alerts.length} unreviewed alert{alerts.length !== 1 ? 's' : ''}
              {criticalAlerts.length > 0 && ` · ${criticalAlerts.length} critical`}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className={`cab-chevron ${expanded ? 'cab-chevron--open' : ''}`} />
      </button>

      {/* Expanded Alert List */}
      {expanded && (
        <div className="cab-alerts-list">
          {alerts.map((alert) => (
            <div key={alert._id} className={`cab-alert-card cab-alert--${alert.riskLevel}`}>
              <div className="cab-alert-top">
                <div className="cab-alert-client">
                  <User size={13} />
                  <strong>{alert.clientId?.name || 'Unknown Client'}</strong>
                </div>
                <div className="cab-alert-meta">
                  <span className={`cab-risk-tag cab-risk-tag--${alert.riskLevel}`}>
                    {alert.riskLevel}
                  </span>
                  <span className="cab-alert-time">
                    <Clock size={11} /> {timeAgo(alert.createdAt)}
                  </span>
                </div>
              </div>

              {alert.sourceText && (
                <p className="cab-alert-text">"{alert.sourceText}"</p>
              )}

              {alert.flags?.length > 0 && (
                <div className="cab-alert-flags">
                  {alert.flags.map((f, i) => (
                    <span key={i} className={`cab-flag cab-flag--${f.severity}`}>
                      {f.severity}: {f.keywords?.join(', ')}
                    </span>
                  ))}
                </div>
              )}

              {reviewing === alert._id ? (
                <div className="cab-review-form">
                  <textarea
                    className="cab-review-input"
                    placeholder="Optional therapist notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                  <div className="cab-review-actions">
                    <button className="cab-review-btn" onClick={() => handleReview(alert._id)}>
                      <Check size={13} /> Acknowledge & Review
                    </button>
                    <button className="cab-review-cancel" onClick={() => { setReviewing(null); setNotes(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button className="cab-review-trigger" onClick={() => setReviewing(alert._id)}>
                  <Eye size={13} /> Review Alert
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
