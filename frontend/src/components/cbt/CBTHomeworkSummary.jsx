import { useState, useEffect } from 'react';
import {
  Brain, BookOpen, TrendingUp, AlertTriangle,
  Check, Loader, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cbtApi } from '../../api/cbt.api';
import './CBTHomeworkSummary.css';

const DISTORTION_LABELS = {
  catastrophizing:     'Catastrophizing',
  all_or_nothing:      'All-or-Nothing',
  mind_reading:        'Mind Reading',
  emotional_reasoning: 'Emotional Reasoning',
  overgeneralization:  'Overgeneralization',
  personalization:     'Personalization',
  labeling:            'Labeling',
  should_statements:   'Should Statements',
};

const DISTORTION_COLORS = {
  catastrophizing:     '#ef4444',
  all_or_nothing:      '#f59e0b',
  mind_reading:        '#8b5cf6',
  emotional_reasoning: '#ec4899',
  overgeneralization:  '#f97316',
  personalization:     '#06b6d4',
  labeling:            '#6366f1',
  should_statements:   '#14b8a6',
};

export default function CBTHomeworkSummary({ clientId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const fetch = async () => {
      try {
        const res = await cbtApi.getClientSummary(clientId);
        setData(res.data?.data || null);
      } catch {
        // Client may not have any CBT records yet
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [clientId]);

  if (loading) {
    return (
      <div className="hwk-card hwk-loading">
        <Loader size={16} className="spin" />
        <span>Loading homework summary...</span>
      </div>
    );
  }

  if (!data || !data.summary || data.summary.totalRecords === 0) {
    return (
      <div className="hwk-card hwk-empty">
        <BookOpen size={24} className="hwk-empty-icon" />
        <h4>Between-Session Homework</h4>
        <p>No CBT thought records submitted by this client yet.</p>
      </div>
    );
  }

  const { summary, records } = data;
  const distortionEntries = Object.entries(summary.distortionBreakdown || {}).sort(([,a],[,b]) => b - a);
  const maxDistortion = distortionEntries.length > 0 ? distortionEntries[0][1] : 1;

  return (
    <div className="hwk-card">
      <div className="hwk-header">
        <div className="hwk-header-left">
          <div className="hwk-icon-wrap">
            <Brain size={16} />
          </div>
          <div>
            <h3 className="hwk-title">Between-Session Homework</h3>
            <p className="hwk-subtitle">CBT Thought Record summary</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="hwk-stats">
        <div className="hwk-stat-box">
          <span className="hwk-stat-num">{summary.totalRecords}</span>
          <span className="hwk-stat-label">Total Logs</span>
        </div>
        <div className="hwk-stat-box">
          <span className="hwk-stat-num">{summary.completedReframes}</span>
          <span className="hwk-stat-label">Reframed</span>
        </div>
        <div className="hwk-stat-box">
          <span className="hwk-stat-num">{summary.thisWeekCount}</span>
          <span className="hwk-stat-label">This Week</span>
        </div>
        <div className="hwk-stat-box">
          <span className="hwk-stat-num" style={{ color: summary.avgMoodImprovement > 0 ? '#14b8a6' : '#ef4444' }}>
            {summary.avgMoodImprovement > 0 ? '+' : ''}{summary.avgMoodImprovement}
          </span>
          <span className="hwk-stat-label">Avg Mood Δ</span>
        </div>
      </div>

      {/* Predominant Distortion */}
      {summary.predominantDistortion && summary.predominantDistortion !== 'none' && (
        <div className="hwk-predominant">
          <AlertTriangle size={13} />
          <span>Primary Pattern:</span>
          <strong style={{ color: DISTORTION_COLORS[summary.predominantDistortion] || '#6b7280' }}>
            {DISTORTION_LABELS[summary.predominantDistortion] || summary.predominantDistortion}
          </strong>
        </div>
      )}

      {/* Distortion Breakdown */}
      {distortionEntries.length > 0 && (
        <div className="hwk-breakdown">
          <p className="hwk-breakdown-title">Distortion Frequency</p>
          {distortionEntries.map(([key, count]) => (
            <div key={key} className="hwk-bar-row">
              <span className="hwk-bar-label">
                {DISTORTION_LABELS[key] || key}
              </span>
              <div className="hwk-bar-track">
                <div
                  className="hwk-bar-fill"
                  style={{
                    width: `${(count / maxDistortion) * 100}%`,
                    background: DISTORTION_COLORS[key] || '#6b7280',
                  }}
                />
              </div>
              <span className="hwk-bar-count">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expandable Recent Records */}
      <button className="hwk-expand-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {expanded ? 'Hide' : 'View'} Recent Records ({records?.length || 0})
      </button>

      {expanded && records?.length > 0 && (
        <div className="hwk-records">
          {records.slice(0, 8).map((r) => (
            <div key={r._id} className={`hwk-record ${r.isCompleted ? 'hwk-record--done' : ''}`}>
              <div className="hwk-record-top">
                <p className="hwk-record-thought">"{r.automaticThought}"</p>
                {r.isCompleted && <Check size={13} className="hwk-record-check" />}
              </div>
              <div className="hwk-record-meta">
                <span>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                {r.primaryDistortion && r.primaryDistortion !== 'none' && (
                  <span
                    className="hwk-record-distortion"
                    style={{ color: DISTORTION_COLORS[r.primaryDistortion], background: `${DISTORTION_COLORS[r.primaryDistortion]}15` }}
                  >
                    {DISTORTION_LABELS[r.primaryDistortion] || r.primaryDistortion}
                  </span>
                )}
                {r.moodBefore && r.moodAfter && (
                  <span className="hwk-record-mood">
                    Mood: {r.moodBefore}→{r.moodAfter}
                    {r.moodAfter > r.moodBefore && <TrendingUp size={10} />}
                  </span>
                )}
              </div>
              {r.isCompleted && r.balancedThought && (
                <p className="hwk-record-balanced">
                  <strong>Balanced thought:</strong> "{r.balancedThought}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
