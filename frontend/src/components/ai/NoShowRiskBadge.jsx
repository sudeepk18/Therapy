/**
 * NoShowRiskBadge.jsx
 * Displays a colored risk level badge for session no-show predictions.
 * Therapist-only — never shown to clients.
 */

import './ai-insights.css';

const ICONS = {
  HIGH:   '🔴',
  MEDIUM: '🟡',
  LOW:    '🟢',
};

export default function NoShowRiskBadge({ aiRisk, compact = false }) {
  if (!aiRisk?.noShowRiskLevel) return null;

  const { noShowRiskLevel, noShowProbability, isLowConfidence } = aiRisk;
  const pct = noShowProbability != null
    ? `${Math.round(noShowProbability * 100)}%`
    : null;

  return (
    <span
      className={`risk-badge ${noShowRiskLevel}${isLowConfidence ? ' low-confidence' : ''}`}
      title={isLowConfidence
        ? 'Prediction (low confidence — fewer than 3 prior sessions)'
        : `No-show risk: ${noShowRiskLevel} · Probability: ${pct}`}
    >
      <span className="risk-dot" />
      {ICONS[noShowRiskLevel]}{' '}
      {compact ? noShowRiskLevel : `${noShowRiskLevel}${pct ? ` · ${pct}` : ''}`}
      {isLowConfidence && ' ⓘ'}
    </span>
  );
}
