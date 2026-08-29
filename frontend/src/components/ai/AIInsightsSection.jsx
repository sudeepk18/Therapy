/**
 * AIInsightsSection.jsx
 * Main AI Insights dashboard section.
 * Aggregates all AI features into a single expandable panel on the dashboard.
 *
 * Features shown:
 *  1. No-show risk — high/medium risk upcoming sessions
 *  2. Revenue forecast — historical + forecast chart
 *  3. Smart scheduling — recommended time slots
 *
 * Graceful degradation: if AI service is unavailable, shows a gentle notice.
 * Respects entitlement — if a feature isn't available, it's simply not shown.
 */

import { useEffect, useState } from 'react';
import {
  Brain, TrendingUp, Calendar, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { aiApi } from '../../api/ai.api';
import NoShowRiskBadge from './NoShowRiskBadge';
import RevenueForecastChart from './RevenueForecastChart';
import './ai-insights.css';

export default function AIInsightsSection() {
  const [insights,   setInsights]   = useState(null);
  const [forecast,   setForecast]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [collapsed,  setCollapsed]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [insightsRes, forecastRes] = await Promise.allSettled([
        aiApi.getInsights(),
        aiApi.getRevenueForecast(),
      ]);

      if (insightsRes.status === 'fulfilled') {
        setInsights(insightsRes.value.data.data);
      }
      if (forecastRes.status === 'fulfilled') {
        const fd = forecastRes.value.data.data;
        if (!fd.aiUnavailable) setForecast(fd);
      }
    } catch {
      // Silently fail — AI section is non-critical
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const aiOffline = !loading && !insights && !forecast;
  const highRiskSessions = insights?.noShow?.highRiskSessions || [];
  const scheduling       = insights?.scheduling?.recommendations || [];

  return (
    <div className="dashboard-card ai-insights-section">
      {/* Section Header */}
      <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setCollapsed(!collapsed)}>
        <div className="card-title-wrap">
          <Brain size={16} className="card-title-icon" style={{ color: 'var(--teal)' }} />
          <h3 className="card-title">AI Insights</h3>
          <span className="ai-badge">
            <Sparkles size={9} />
            Intelligence Layer
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); load(true); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px',
              display: 'flex', alignItems: 'center',
            }}
            title="Refresh AI insights"
          >
            <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
          </button>
          {collapsed ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronUp size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* AI Offline Banner */}
          {aiOffline && !loading && (
            <div className="ai-unavailable">
              <AlertTriangle size={14} />
              AI service is temporarily unavailable. The rest of your dashboard is unaffected.
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
              ))}
            </div>
          )}

          {!loading && (
            <div className="ai-cards-grid">
              {/* ── No-Show Risk ────────────────────────────────────── */}
              {(insights?.noShow) && (
                <div className="ai-card">
                  <div className="ai-card-header">
                    <div className="ai-card-title">
                      <AlertTriangle size={13} />
                      At-Risk Sessions
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {insights.noShow.totalUpcoming} upcoming
                    </span>
                  </div>

                  {highRiskSessions.length === 0 ? (
                    <div className="ai-empty">
                      ✅ No high-risk sessions in the next 7 days.
                    </div>
                  ) : (
                    <div className="risk-session-list">
                      {highRiskSessions.map((s) => (
                        <div className="risk-session-item" key={s._id}>
                          <div className="risk-session-client">
                            <div className="risk-session-avatar">
                              {(s.client?.name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="risk-session-name">
                                {s.client?.name || 'Unknown'}
                              </div>
                              <div className="risk-session-time">
                                {s.scheduledAt
                                  ? format(new Date(s.scheduledAt), 'EEE, MMM d · h:mm a')
                                  : '—'}
                              </div>
                            </div>
                          </div>
                          <NoShowRiskBadge aiRisk={s.risk} compact />
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="ai-disclaimer">{insights.noShow.disclaimer}</p>
                </div>
              )}

              {/* ── Revenue Forecast ────────────────────────────────── */}
              {forecast && !forecast.aiUnavailable && (
                <div className="ai-card">
                  <div className="ai-card-header">
                    <div className="ai-card-title">
                      <TrendingUp size={13} />
                      Revenue Forecast
                    </div>
                    <span className={`trend-pill ${forecast.trend}`}>
                      {forecast.trend === 'GROWING'   && '↗'}
                      {forecast.trend === 'DECLINING'  && '↘'}
                      {forecast.trend === 'STABLE'    && '→'}
                      {' '}{forecast.trend}
                    </span>
                  </div>

                  <div className="forecast-meta">
                    <div className="forecast-stat">
                      <div className="forecast-stat-label">This month</div>
                      <div className="forecast-stat-value">
                        ₹{((forecast.current_month_revenue || 0) / 100).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="forecast-stat">
                      <div className="forecast-stat-label">Next month (est.)</div>
                      <div className={`forecast-stat-value ${forecast.trend?.toLowerCase()}`}>
                        ₹{((forecast.next_month_forecast || 0) / 100).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <RevenueForecastChart
                    history={forecast.history || []}
                    forecast={forecast.forecast || []}
                    loading={false}
                  />

                  <p className="ai-disclaimer">{forecast.disclaimer}</p>
                </div>
              )}

              {/* ── Smart Scheduling ────────────────────────────────── */}
              {(insights?.scheduling || scheduling.length > 0) && (
                <div className="ai-card">
                  <div className="ai-card-header">
                    <div className="ai-card-title">
                      <Calendar size={13} />
                      Recommended Slots
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Based on history
                    </span>
                  </div>

                  {scheduling.length === 0 ? (
                    <div className="ai-empty">
                      Book more sessions to unlock scheduling insights.
                    </div>
                  ) : (
                    <div className="slot-rec-list">
                      {scheduling.slice(0, 4).map((slot, i) => (
                        <div className="slot-rec-item" key={i}>
                          <span className="slot-rec-day">{slot.day_name}</span>
                          <span className="slot-rec-time">{slot.time_label}</span>
                          <div className="slot-score-bar">
                            <div
                              className="slot-score-fill"
                              style={{ width: `${Math.round(slot.score * 100)}%` }}
                            />
                          </div>
                          <span className="slot-rec-reason" title={slot.reason}>
                            {slot.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {insights?.scheduling?.disclaimer && (
                    <p className="ai-disclaimer">{insights.scheduling.disclaimer}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
