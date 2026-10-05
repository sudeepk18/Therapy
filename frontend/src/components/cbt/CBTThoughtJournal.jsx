import { useState, useEffect } from 'react';
import {
  Brain, Send, ChevronRight, ChevronDown, Check,
  AlertTriangle, Lightbulb, TrendingUp, Loader,
  Smile, Frown, Meh, Phone, Heart, Shield,
  X, Wind,
} from 'lucide-react';
import { cbtApi } from '../../api/cbt.api';
import toast from 'react-hot-toast';
import './CBTThoughtJournal.css';

// ─── Mood Selector ──────────────────────────────────────────────────────────

function MoodSelector({ value, onChange, label }) {
  const moods = [
    { val: 1, emoji: '😰', label: 'Awful' },
    { val: 2, emoji: '😟', label: 'Bad' },
    { val: 3, emoji: '😕', label: 'Poor' },
    { val: 4, emoji: '🙁', label: 'Low' },
    { val: 5, emoji: '😐', label: 'Okay' },
    { val: 6, emoji: '🙂', label: 'Fair' },
    { val: 7, emoji: '😊', label: 'Good' },
    { val: 8, emoji: '😄', label: 'Great' },
    { val: 9, emoji: '😁', label: 'Very good' },
    { val: 10, emoji: '🤩', label: 'Excellent' },
  ];

  return (
    <div className="cbt-mood-selector">
      <p className="cbt-mood-label">{label}</p>
      <div className="cbt-mood-track">
        {moods.map((m) => (
          <button
            key={m.val}
            type="button"
            className={`cbt-mood-btn ${value === m.val ? 'cbt-mood-btn--active' : ''}`}
            onClick={() => onChange(m.val)}
            title={m.label}
          >
            <span className="cbt-mood-emoji">{m.emoji}</span>
            <span className="cbt-mood-val">{m.val}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Crisis Support Modal ───────────────────────────────────────────────────

function CrisisModal({ resources, onClose }) {
  const [breathPhase, setBreathPhase] = useState('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [breathing, setBreathing] = useState(false);

  useEffect(() => {
    if (!breathing) return;
    const phases = ['inhale', 'hold', 'exhale', 'hold'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % 4;
      setBreathPhase(phases[idx]);
      if (idx === 0) setBreathCount((c) => c + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [breathing]);

  return (
    <div className="crisis-overlay">
      <div className="crisis-modal">
        <button className="crisis-close" onClick={onClose}><X size={18} /></button>

        <div className="crisis-header">
          <Heart size={28} className="crisis-heart-icon" />
          <h2>You Are Not Alone</h2>
          <p>We noticed you may be going through a difficult time. Please remember — support is available right now.</p>
        </div>

        {/* Emergency Resources */}
        <div className="crisis-resources">
          <h3><Phone size={16} /> Immediate Support</h3>
          {resources.map((r, i) => (
            <a key={i} href={`tel:${r.number.replace(/\s/g, '')}`} className="crisis-resource-card">
              <div className="crisis-resource-info">
                <strong>{r.name}</strong>
                <span>{r.description}</span>
              </div>
              <span className="crisis-resource-number">{r.number}</span>
            </a>
          ))}
        </div>

        {/* Box Breathing */}
        <div className="crisis-breathing">
          <h3><Wind size={16} /> Grounding Breathing Exercise</h3>
          <p className="crisis-breathing-desc">A simple 4-4-4-4 box breathing technique to help calm your nervous system.</p>

          {!breathing ? (
            <button className="crisis-breathe-start" onClick={() => setBreathing(true)}>
              Start Breathing Exercise
            </button>
          ) : (
            <div className="crisis-breathe-box">
              <div className={`crisis-breathe-circle crisis-breathe--${breathPhase}`}>
                <span className="crisis-breathe-text">
                  {breathPhase === 'inhale' && 'Breathe In'}
                  {breathPhase === 'hold' && 'Hold'}
                  {breathPhase === 'exhale' && 'Breathe Out'}
                </span>
                <span className="crisis-breathe-count">4 seconds</span>
              </div>
              <p className="crisis-breathe-rounds">Cycles completed: {breathCount}</p>
              <button className="crisis-breathe-stop" onClick={() => { setBreathing(false); setBreathCount(0); }}>
                Stop
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Distortion Badge ───────────────────────────────────────────────────────

function DistortionBadge({ distortion }) {
  const [open, setOpen] = useState(false);
  const colors = {
    catastrophizing: '#ef4444',
    all_or_nothing:  '#f59e0b',
    mind_reading:    '#8b5cf6',
    emotional_reasoning: '#ec4899',
    overgeneralization: '#f97316',
    personalization: '#06b6d4',
    labeling:        '#6366f1',
    should_statements: '#14b8a6',
  };
  const bg = colors[distortion.type] || '#6b7280';

  return (
    <div className="cbt-distortion-badge">
      <button
        className="cbt-distortion-tag"
        style={{ background: `${bg}18`, color: bg, borderColor: `${bg}40` }}
        onClick={() => setOpen(!open)}
      >
        <AlertTriangle size={12} />
        {distortion.label}
        <span className="cbt-distortion-conf">{Math.round(distortion.confidence * 100)}%</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {open && (
        <div className="cbt-distortion-detail">
          <p className="cbt-distortion-desc">{distortion.description}</p>
          <div className="cbt-distortion-prompts">
            <Lightbulb size={13} />
            <strong>Reflection Questions:</strong>
            {distortion.reframePrompts?.map((p, i) => (
              <p key={i} className="cbt-distortion-prompt">• {p}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CBTThoughtJournal() {
  const [records, setRecords]       = useState([]);
  const [thought, setThought]       = useState('');
  const [moodBefore, setMoodBefore] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [crisisData, setCrisisData] = useState(null);
  const [loading, setLoading]       = useState(true);

  // Reframe form state
  const [evidenceFor, setEvidenceFor]       = useState('');
  const [evidenceAgainst, setEvidenceAgainst] = useState('');
  const [balancedThought, setBalancedThought] = useState('');
  const [moodAfter, setMoodAfter]           = useState(null);
  const [reframing, setReframing]           = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const res = await cbtApi.getMyRecords();
      setRecords(res.data?.data?.records || []);
    } catch {
      // Silent fail — records may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitThought = async (e) => {
    e.preventDefault();
    if (!thought.trim()) return;
    setSubmitting(true);

    try {
      const res = await cbtApi.submitThought({
        automaticThought: thought.trim(),
        moodBefore,
      });
      const data = res.data?.data;
      const newRecord = data?.record;

      if (newRecord) {
        setRecords((prev) => [newRecord, ...prev]);
        setActiveRecord(newRecord);
      }

      // Check for crisis
      if (data?.showCrisisUI && data?.resources?.length) {
        setCrisisData({ resources: data.resources });
      }

      setThought('');
      setMoodBefore(null);
      toast.success('Thought analyzed! Review the insights below.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not analyze thought.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReframe = async () => {
    if (!activeRecord) return;
    setReframing(true);

    try {
      await cbtApi.submitReframe(activeRecord._id, {
        evidenceFor,
        evidenceAgainst,
        balancedThought,
        moodAfter,
      });

      // Update local state
      setRecords((prev) =>
        prev.map((r) =>
          r._id === activeRecord._id
            ? { ...r, evidenceFor, evidenceAgainst, balancedThought, moodAfter, isCompleted: true }
            : r
        )
      );
      setActiveRecord(null);
      setEvidenceFor('');
      setEvidenceAgainst('');
      setBalancedThought('');
      setMoodAfter(null);
      toast.success('Reframing exercise completed! Great work 💪');
    } catch {
      toast.error('Could not save reframing.');
    } finally {
      setReframing(false);
    }
  };

  const completedCount = records.filter((r) => r.isCompleted).length;

  return (
    <div className="cbt-journal">
      {crisisData && (
        <CrisisModal resources={crisisData.resources} onClose={() => setCrisisData(null)} />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="cbt-journal-header">
        <div className="cbt-journal-icon-wrap">
          <Brain size={20} />
        </div>
        <div>
          <h2 className="cbt-journal-title">Thought Journal</h2>
          <p className="cbt-journal-desc">
            Log negative thoughts between sessions. Our AI identifies thinking patterns and guides you through reframing.
          </p>
        </div>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div className="cbt-stats-row">
          <div className="cbt-stat">
            <span className="cbt-stat-num">{records.length}</span>
            <span className="cbt-stat-label">Total Logs</span>
          </div>
          <div className="cbt-stat">
            <span className="cbt-stat-num">{completedCount}</span>
            <span className="cbt-stat-label">Reframed</span>
          </div>
          <div className="cbt-stat">
            <span className="cbt-stat-num">
              {records.length > 0 ? Math.round((completedCount / records.length) * 100) : 0}%
            </span>
            <span className="cbt-stat-label">Completion</span>
          </div>
        </div>
      )}

      {/* ── Input Form ──────────────────────────────────────────────────── */}
      <form className="cbt-input-section" onSubmit={handleSubmitThought}>
        <label className="cbt-input-label">
          <AlertTriangle size={14} />
          What negative thought is on your mind?
        </label>
        <textarea
          className="cbt-textarea"
          placeholder="Write your automatic thought here... e.g. 'My boss ignored me in the meeting, I'm going to get fired and I'm a complete failure.'"
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          rows={3}
          maxLength={5000}
        />
        <MoodSelector value={moodBefore} onChange={setMoodBefore} label="How do you feel right now?" />
        <button
          type="submit"
          className="cbt-submit-btn"
          disabled={!thought.trim() || submitting}
        >
          {submitting ? <><Loader size={14} className="spin" /> Analyzing...</> : <><Send size={14} /> Analyze Thought</>}
        </button>
      </form>

      {/* ── Active Analysis & Reframe ───────────────────────────────────── */}
      {activeRecord && activeRecord.distortions?.length > 0 && (
        <div className="cbt-analysis-card">
          <h3 className="cbt-analysis-title">
            <Brain size={16} /> AI Analysis
          </h3>

          <div className="cbt-thought-display">
            <p className="cbt-thought-text">"{activeRecord.automaticThought}"</p>
          </div>

          <div className="cbt-distortions-list">
            <p className="cbt-distortions-heading">
              Detected {activeRecord.distortionCount} cognitive distortion{activeRecord.distortionCount !== 1 ? 's' : ''}:
            </p>
            {activeRecord.distortions.map((d, i) => (
              <DistortionBadge key={i} distortion={d} />
            ))}
          </div>

          {!activeRecord.isCompleted && (
            <div className="cbt-reframe-section">
              <h4 className="cbt-reframe-title">
                <Lightbulb size={15} /> 3-Step Reframing Exercise
              </h4>

              <div className="cbt-reframe-step">
                <span className="cbt-step-num">1</span>
                <div>
                  <label>Evidence that supports this thought:</label>
                  <textarea
                    className="cbt-reframe-input"
                    placeholder="What facts support this negative thought?"
                    value={evidenceFor}
                    onChange={(e) => setEvidenceFor(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="cbt-reframe-step">
                <span className="cbt-step-num">2</span>
                <div>
                  <label>Evidence against this thought:</label>
                  <textarea
                    className="cbt-reframe-input"
                    placeholder="What facts contradict this negative thought?"
                    value={evidenceAgainst}
                    onChange={(e) => setEvidenceAgainst(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="cbt-reframe-step">
                <span className="cbt-step-num">3</span>
                <div>
                  <label>A more balanced, realistic thought:</label>
                  <textarea
                    className="cbt-reframe-input"
                    placeholder="Rewrite the thought in a more balanced way..."
                    value={balancedThought}
                    onChange={(e) => setBalancedThought(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <MoodSelector value={moodAfter} onChange={setMoodAfter} label="How do you feel after reframing?" />

              <button
                className="cbt-reframe-btn"
                onClick={handleReframe}
                disabled={reframing || !balancedThought.trim()}
              >
                {reframing ? <><Loader size={14} className="spin" /> Saving...</> : <><Check size={14} /> Complete Exercise</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Past Records ────────────────────────────────────────────────── */}
      {records.length > 0 && (
        <div className="cbt-history">
          <h3 className="cbt-history-title">
            <TrendingUp size={16} /> Recent Thought Records
          </h3>
          {records.slice(0, 10).map((r) => (
            <div key={r._id} className={`cbt-history-card ${r.isCompleted ? 'cbt-history-card--done' : ''}`}>
              <div className="cbt-history-top">
                <p className="cbt-history-thought">"{r.automaticThought}"</p>
                {r.isCompleted && <Check size={14} className="cbt-history-check" />}
              </div>
              <div className="cbt-history-meta">
                <span className="cbt-history-date">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                {r.primaryDistortion && r.primaryDistortion !== 'none' && (
                  <span className="cbt-history-distortion">{r.primaryDistortion.replace(/_/g, ' ')}</span>
                )}
                {r.moodBefore && r.moodAfter && (
                  <span className="cbt-history-mood">
                    Mood: {r.moodBefore} → {r.moodAfter}
                    {r.moodAfter > r.moodBefore && <TrendingUp size={11} />}
                  </span>
                )}
              </div>
              {!r.isCompleted && (
                <button
                  className="cbt-history-continue"
                  onClick={() => {
                    setActiveRecord(r);
                    setEvidenceFor(r.evidenceFor || '');
                    setEvidenceAgainst(r.evidenceAgainst || '');
                    setBalancedThought(r.balancedThought || '');
                    setMoodAfter(r.moodAfter || null);
                  }}
                >
                  Continue Reframing <ChevronRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
