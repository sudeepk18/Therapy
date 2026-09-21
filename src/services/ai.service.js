/**
 * @file ai.service.js
 * @description Internal HTTP client for the Python FastAPI AI service using Node.js native fetch.
 *
 * All communication with the Python AI service goes through this module.
 * Node.js is responsible for:
 *   - Authentication & authorization (done before calling this)
 *   - Entitlement checks (done before calling this)
 *   - Data preparation
 *   - Persisting results to MongoDB
 *   - Responding to React
 *
 * Python is responsible only for:
 *   - Model inference
 *   - NLP processing
 *   - Predictions and forecasting
 *
 * Security:
 *   - Attaches X-AI-Service-Key header from environment
 *   - Never exposed publicly — internal service-to-service only
 *
 * Graceful degradation:
 *   - If Python is unavailable, returns null instead of throwing
 *   - Callers handle null by returning { aiUnavailable: true } to React
 */

const AI_SERVICE_URL    = process.env.AI_SERVICE_URL    || 'http://localhost:8001';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
const AI_TIMEOUT_MS      = parseInt(process.env.AI_TIMEOUT_MS || '8000', 10);

/**
 * Generic AI service caller using native fetch with graceful error handling.
 * Returns null when the AI service is unavailable — callers handle this.
 */
const _call = async (method, path, data = null) => {
  const url = `${AI_SERVICE_URL.replace(/\/$/, '')}${path}`;
  try {
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Key': AI_SERVICE_API_KEY,
      },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = JSON.stringify(data);
    }

    const res = await fetch(url, options);

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      console.error(`[AI Service] Error HTTP ${res.status} from ${path}:`, errorBody);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[AI Service] Unavailable at ${url} (${err.name}: ${err.message}) — returning null`);
    return null;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Predict no-show risk for a single session.
 * @param {Object} payload - Features for the prediction model
 * @returns {Object|null} Prediction result or null if AI unavailable
 */
const predictNoShow = (payload) =>
  _call('post', '/predict/no-show', payload);

/**
 * Analyze sentiment of a session note's text.
 * @param {string} noteId
 * @param {string} text - The note content to analyze
 * @returns {Object|null} Sentiment result or null if AI unavailable
 */
const analyzeSentiment = (noteId, text) =>
  _call('post', '/predict/sentiment', { note_id: noteId, text });

/**
 * Generate a SOAP note draft from free-text session description.
 * @param {string} freeText - Therapist's free-form session description
 * @returns {Object|null} SOAP draft or null if AI unavailable
 */
const generateSoapDraft = (freeText, noteId = null) =>
  _call('post', '/generate/soap-draft', { free_text: freeText, note_id: noteId });

/**
 * Get scheduling slot recommendations based on booking patterns.
 * @param {string} therapistId
 * @param {Array} slotPatterns - Array of { day_of_week, hour_of_day, booking_count, no_show_count }
 * @param {number} numRecommendations
 * @returns {Object|null} Recommendations or null if AI unavailable
 */
const recommendScheduling = (therapistId, slotPatterns, numRecommendations = 3) =>
  _call('post', '/recommend/scheduling', {
    therapist_id: therapistId,
    slot_patterns: slotPatterns,
    num_recommendations: numRecommendations,
  });

/**
 * Forecast future revenue from monthly history.
 * @param {string} therapistId
 * @param {Array} history - Array of { year, month, revenue }
 * @param {number} forecastMonths
 * @returns {Object|null} Forecast or null if AI unavailable
 */
const forecastRevenue = (therapistId, history, forecastMonths = 3) =>
  _call('post', '/forecast/revenue', {
    therapist_id: therapistId,
    history,
    forecast_months: forecastMonths,
  });

/**
 * Health-check the AI service.
 * @returns {boolean} true if alive
 */
const isAlive = async () => {
  try {
    const res = await fetch(`${AI_SERVICE_URL.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

module.exports = {
  predictNoShow,
  analyzeSentiment,
  generateSoapDraft,
  recommendScheduling,
  forecastRevenue,
  isAlive,
};
