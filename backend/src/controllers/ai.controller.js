/**
 * @file ai.controller.js
 * @description Controller handlers for all AI Intelligence Layer endpoints.
 *
 * Every handler follows this security pipeline:
 *   1. protect middleware (JWT auth, done in router)
 *   2. restrictTo('therapist') (done in router)
 *   3. checkFeatureEnabled('featureName') (done in router)
 *   4. Ownership check (this controller)
 *   5. Gather data from MongoDB
 *   6. Call Python AI service via ai.service.js
 *   7. Persist result to DB (when appropriate)
 *   8. Return sanitized response to React
 *
 * SECURITY NOTES:
 *   - Clients CANNOT access any endpoint in this controller
 *   - aiRisk fields are excluded from all client-facing API responses
 *   - aiSentiment fields are excluded from all client-facing API responses
 *   - AI outputs are labeled as indicators/estimates/recommendations
 */

const asyncHandler   = require('../utils/asyncHandler');
const ApiResponse    = require('../utils/ApiResponse');
const ApiError       = require('../utils/ApiError');
const aiService      = require('../services/ai.service');
const { Session, SessionNote, Payment, Availability, AIInsight, Client } = require('../models');
const mongoose       = require('mongoose');

// Cache TTL constants
const CACHE_TTL = {
  forecast:   4 * 60 * 60 * 1000,   // 4 hours
  scheduling: 4 * 60 * 60 * 1000,   // 4 hours
  sentiment:  24 * 60 * 60 * 1000,  // 24 hours
};

// ── Helper: Build no-show feature vector from session + client history ────────

const _buildNoShowPayload = async (session, therapistId) => {
  const scheduledAt  = new Date(session.scheduledAt);
  const dayOfWeek    = scheduledAt.getDay() === 0 ? 6 : scheduledAt.getDay() - 1; // Mon=0, Sun=6
  const hourOfDay    = scheduledAt.getHours();
  const createdAt    = new Date(session.createdAt || session.scheduledAt);
  const bookingLead  = Math.max(0, (scheduledAt - createdAt) / (1000 * 60 * 60 * 24));

  // Client's historical no-show rate
  const clientSessions = await Session.find({
    clientId: session.clientId,
    therapistId,
    status: { $in: ['completed', 'no_show', 'cancelled'] },
    _id: { $ne: session._id },
  }).select('status scheduledAt').lean();

  const totalPrev    = clientSessions.length;
  const noShowCount  = clientSessions.filter(s => s.status === 'no_show').length;
  const noShowRate   = totalPrev > 0 ? noShowCount / totalPrev : 0;

  // Days since last session
  let daysSinceLast = null;
  if (totalPrev > 0) {
    const sorted = clientSessions.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    daysSinceLast = (scheduledAt - new Date(sorted[0].scheduledAt)) / (1000 * 60 * 60 * 24);
  }

  return {
    session_id: session._id.toString(),
    day_of_week: dayOfWeek,
    hour_of_day: hourOfDay,
    booking_lead_days: Math.round(bookingLead * 10) / 10,
    client_historical_no_show_rate: Math.round(noShowRate * 1000) / 1000,
    client_total_sessions: totalPrev,
    days_since_last_session: daysSinceLast !== null ? Math.round(daysSinceLast * 10) / 10 : null,
    medium: session.medium || 'video',
    session_type: session.sessionType || 'individual',
  };
};

// ── 1. Predict no-show for a specific session ─────────────────────────────────

const predictNoShow = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const { sessionId } = req.params;

  const session = await Session.findOne({ _id: sessionId, therapistId });
  if (!session) {
    throw new ApiError(404, 'Session not found.');
  }

  if (session.status !== 'scheduled') {
    // Return existing risk data if already predicted
    return res.status(200).json(
      new ApiResponse(200, { aiRisk: session.aiRisk, alreadyPast: true }, 'Session is not upcoming')
    );
  }

  const payload = await _buildNoShowPayload(session, therapistId);
  const result  = await aiService.predictNoShow(payload);

  if (!result) {
    return res.status(200).json(
      new ApiResponse(200, { aiUnavailable: true }, 'AI service temporarily unavailable')
    );
  }

  // Persist result to Session document
  session.aiRisk = {
    noShowProbability: result.probability,
    noShowRiskLevel:   result.risk_level,
    modelVersion:      result.model_version,
    predictedAt:       new Date(),
    isLowConfidence:   result.is_low_confidence,
  };
  await session.save();

  res.status(200).json(
    new ApiResponse(200, {
      sessionId: session._id,
      aiRisk: session.aiRisk,
      disclaimer: 'Prediction — Decision support indicator only. Not a clinical judgment.',
    }, 'No-show risk predicted')
  );
});

// ── 2. Get upcoming sessions with pre-computed risk scores ────────────────────

const getUpcomingWithRisk = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sessions = await Session.find({
    therapistId,
    status: 'scheduled',
    scheduledAt: { $gte: now, $lte: next7Days },
  })
    .populate('clientId', 'name email avatar')
    .sort({ scheduledAt: 1 })
    .lean();

  // For sessions without aiRisk, trigger batch prediction (fire-and-forget)
  // We don't await to avoid blocking the response
  const sessionsWithoutRisk = sessions.filter(s => !s.aiRisk?.noShowProbability);
  if (sessionsWithoutRisk.length > 0) {
    setImmediate(async () => {
      for (const s of sessionsWithoutRisk) {
        try {
          const payload = await _buildNoShowPayload(s, therapistId);
          const result  = await aiService.predictNoShow(payload);
          if (result) {
            await Session.findByIdAndUpdate(s._id, {
              aiRisk: {
                noShowProbability: result.probability,
                noShowRiskLevel:   result.risk_level,
                modelVersion:      result.model_version,
                predictedAt:       new Date(),
                isLowConfidence:   result.is_low_confidence,
              }
            });
          }
        } catch { /* ignore background errors */ }
      }
    });
  }

  res.status(200).json(
    new ApiResponse(200, {
      sessions: sessions.map(s => ({
        _id:          s._id,
        scheduledAt:  s.scheduledAt,
        medium:       s.medium,
        status:       s.status,
        client:       s.clientId,
        aiRisk:       s.aiRisk || null,
      })),
      disclaimer: 'Prediction — Decision support indicator only. Not a clinical judgment.',
    }, 'Upcoming sessions with risk data')
  );
});

// ── 3. Analyze sentiment for a specific session note ─────────────────────────

const analyzeSentiment = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const { noteId }  = req.params;

  const note = await SessionNote.findOne({ _id: noteId, therapistId });
  if (!note) {
    throw new ApiError(404, 'Session note not found.');
  }

  // Extract text content for analysis
  let textToAnalyze = '';
  if (note.noteType === 'soap' && note.soap) {
    textToAnalyze = [note.soap.subjective, note.soap.objective, note.soap.assessment, note.soap.plan]
      .filter(Boolean).join(' ');
  } else if (note.noteType === 'dap' && note.dap) {
    textToAnalyze = [note.dap.data, note.dap.assessment, note.dap.plan].filter(Boolean).join(' ');
  } else {
    textToAnalyze = note.content || '';
  }

  if (!textToAnalyze.trim()) {
    throw new ApiError(400, 'Note has no text content to analyze.');
  }

  const result = await aiService.analyzeSentiment(noteId, textToAnalyze);

  if (!result) {
    return res.status(200).json(
      new ApiResponse(200, { aiUnavailable: true }, 'AI service temporarily unavailable')
    );
  }

  // Persist to note
  note.aiSentiment = {
    score:        result.score,
    label:        result.label,
    modelVersion: result.model_version,
    analyzedAt:   new Date(),
  };
  await note.save();

  res.status(200).json(
    new ApiResponse(200, {
      noteId,
      aiSentiment: note.aiSentiment,
      disclaimer: (
        'Indicator — This score reflects linguistic patterns in the note text only. ' +
        'It is NOT a diagnosis, mood assessment, or clinical determination.'
      ),
    }, 'Sentiment analyzed')
  );
});

// ── 4. Get engagement trend for a client ─────────────────────────────────────

const getClientEngagement = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const { clientId } = req.params;

  // Verify client belongs to therapist
  const client = await Client.findOne({ _id: clientId, therapistId });
  if (!client) {
    throw new ApiError(404, 'Client not found.');
  }

  // Get notes with sentiment data, most recent 20
  const notes = await SessionNote.find({
    clientId,
    therapistId,
    'aiSentiment.score': { $exists: true, $ne: null },
  })
    .populate('sessionId', 'scheduledAt sessionNumber')
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

  const trend = notes.map(n => ({
    noteId:      n._id,
    sessionDate: n.sessionId?.scheduledAt,
    sessionNum:  n.sessionId?.sessionNumber,
    score:       n.aiSentiment.score,
    label:       n.aiSentiment.label,
    createdAt:   n.createdAt,
  }));

  // Compute overall indicator
  let engagementIndicator = null;
  if (trend.length >= 3) {
    const recent    = trend.slice(-3).map(t => t.score);
    const earlier   = trend.slice(0, Math.max(1, trend.length - 3)).map(t => t.score);
    const recentAvg  = recent.reduce((a, b) => a + b, 0)  / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    if (recentAvg > earlierAvg + 0.1)       engagementIndicator = 'IMPROVING';
    else if (recentAvg < earlierAvg - 0.1)  engagementIndicator = 'DECLINING';
    else                                     engagementIndicator = 'STABLE';
  }

  res.status(200).json(
    new ApiResponse(200, {
      clientId,
      trend,
      engagementIndicator,
      totalNotesAnalyzed: trend.length,
      disclaimer: (
        'Indicator — Reflects linguistic patterns in session notes over time. ' +
        'NOT a clinical assessment or diagnosis.'
      ),
    }, 'Engagement trend retrieved')
  );
});

// ── 5. Generate SOAP draft ────────────────────────────────────────────────────

const generateSoapDraft = asyncHandler(async (req, res) => {
  const { freeText, noteId } = req.body;

  if (!freeText || freeText.trim().length < 10) {
    throw new ApiError(400, 'Please provide at least a short session description (min 10 characters).');
  }

  const result = await aiService.generateSoapDraft(freeText.trim(), noteId || null);

  if (!result) {
    return res.status(200).json(
      new ApiResponse(200, { aiUnavailable: true }, 'AI service temporarily unavailable')
    );
  }

  res.status(200).json(
    new ApiResponse(200, {
      draft: {
        subjective:  result.subjective,
        objective:   result.objective,
        assessment:  result.assessment,
        plan:        result.plan,
        disclaimer:  result.disclaimer,
        modelVersion: result.model_version,
      },
    }, 'SOAP draft generated')
  );
});

// ── 6. Smart scheduling recommendations ──────────────────────────────────────

const getSchedulingRecommendations = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;

  // Check cache first (4-hour TTL)
  const cached = await AIInsight.findOne({
    therapistId,
    type: 'scheduling',
    expiresAt: { $gt: new Date() },
  }).sort({ generatedAt: -1 });

  if (cached) {
    return res.status(200).json(
      new ApiResponse(200, { ...cached.value, fromCache: true }, 'Scheduling recommendations (cached)')
    );
  }

  // Build slot patterns from completed sessions history
  const sessions = await Session.find({
    therapistId,
    status: { $in: ['completed', 'no_show'] },
    scheduledAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // last 90 days
  }).select('scheduledAt status').lean();

  // Aggregate by (dayOfWeek, hour)
  const patternMap = {};
  for (const s of sessions) {
    const d    = new Date(s.scheduledAt);
    const dow  = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const hour = d.getHours();
    const key  = `${dow}_${hour}`;
    if (!patternMap[key]) {
      patternMap[key] = { day_of_week: dow, hour_of_day: hour, booking_count: 0, no_show_count: 0 };
    }
    patternMap[key].booking_count++;
    if (s.status === 'no_show') patternMap[key].no_show_count++;
  }

  const slotPatterns = Object.values(patternMap);

  // If no history, use availability patterns
  if (slotPatterns.length === 0) {
    const availabilities = await Availability.find({ therapistId, isActive: true }).lean();
    for (const av of availabilities) {
      if (av.slots) {
        for (const slot of av.slots) {
          const hour = parseInt(slot.startTime?.split(':')[0] || '10', 10);
          const key  = `${av.dayOfWeek || 0}_${hour}`;
          if (!patternMap[key]) {
            patternMap[key] = {
              day_of_week:   av.dayOfWeek || 0,
              hour_of_day:   hour,
              booking_count: 0,
              no_show_count: 0,
            };
          }
        }
      }
    }
    slotPatterns.push(...Object.values(patternMap));
  }

  const result = await aiService.recommendScheduling(
    therapistId.toString(),
    slotPatterns,
    5,
  );

  if (!result) {
    return res.status(200).json(
      new ApiResponse(200, { aiUnavailable: true }, 'AI service temporarily unavailable')
    );
  }

  // Cache for 4 hours
  await AIInsight.findOneAndUpdate(
    { therapistId, type: 'scheduling' },
    {
      therapistId,
      type: 'scheduling',
      value: result,
      modelVersion: result.model_version,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL.scheduling),
    },
    { upsert: true, new: true }
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Scheduling recommendations generated')
  );
});

// ── 7. Revenue forecast ───────────────────────────────────────────────────────

const getRevenueForecast = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;

  // Check cache first (4-hour TTL)
  const cached = await AIInsight.findOne({
    therapistId,
    type: 'forecast',
    expiresAt: { $gt: new Date() },
  }).sort({ generatedAt: -1 });

  if (cached) {
    return res.status(200).json(
      new ApiResponse(200, { ...cached.value, fromCache: true }, 'Revenue forecast (cached)')
    );
  }

  // Get monthly revenue from payments (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const therapistObjectId = mongoose.Types.ObjectId.isValid(therapistId)
    ? new mongoose.Types.ObjectId(therapistId.toString())
    : therapistId;

  const monthlyRevenue = await Payment.aggregate([
    {
      $match: {
        therapistId: therapistObjectId,
        status: 'succeeded',
        paidAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year:  { $year: '$paidAt' },
          month: { $month: '$paidAt' },
        },
        revenue: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        year:    '$_id.year',
        month:   '$_id.month',
        revenue: 1,
      },
    },
    { $sort: { year: 1, month: 1 } },
  ]);

  const result = await aiService.forecastRevenue(
    therapistId.toString(),
    monthlyRevenue,
    3,
  );

  if (!result) {
    return res.status(200).json(
      new ApiResponse(200, { aiUnavailable: true, history: monthlyRevenue }, 'AI service temporarily unavailable')
    );
  }

  // Cache for 4 hours
  await AIInsight.findOneAndUpdate(
    { therapistId, type: 'forecast' },
    {
      therapistId,
      type: 'forecast',
      value: result,
      modelVersion: result.model_version,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL.forecast),
    },
    { upsert: true, new: true }
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Revenue forecast generated')
  );
});

// ── 8. Combined AI Insights Dashboard ────────────────────────────────────────

const getAIInsightsDashboard = asyncHandler(async (req, res) => {
  const therapistId = req.user._id;
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Parallel data fetch
  const [upcomingSessions, cachedForecast, cachedScheduling] = await Promise.allSettled([
    // Upcoming high-risk sessions
    Session.find({
      therapistId,
      status: 'scheduled',
      scheduledAt: { $gte: now, $lte: next7Days },
      'aiRisk.noShowRiskLevel': { $in: ['HIGH', 'MEDIUM'] },
    })
      .populate('clientId', 'name avatar')
      .sort({ 'aiRisk.noShowProbability': -1 })
      .limit(5)
      .lean(),

    // Cached forecast
    AIInsight.findOne({
      therapistId,
      type: 'forecast',
      expiresAt: { $gt: now },
    }).sort({ generatedAt: -1 }).lean(),

    // Cached scheduling recommendations
    AIInsight.findOne({
      therapistId,
      type: 'scheduling',
      expiresAt: { $gt: now },
    }).sort({ generatedAt: -1 }).lean(),
  ]);

  const highRiskSessions = upcomingSessions.status === 'fulfilled' ? upcomingSessions.value : [];
  const forecast  = cachedForecast.status  === 'fulfilled' ? cachedForecast.value?.value   : null;
  const scheduling = cachedScheduling.status === 'fulfilled' ? cachedScheduling.value?.value : null;

  // Count total upcoming sessions
  const totalUpcoming = await Session.countDocuments({
    therapistId,
    status: 'scheduled',
    scheduledAt: { $gte: now },
  });

  res.status(200).json(
    new ApiResponse(200, {
      noShow: {
        highRiskSessions: highRiskSessions.map(s => ({
          _id:         s._id,
          scheduledAt: s.scheduledAt,
          client:      s.clientId,
          risk:        s.aiRisk,
        })),
        totalUpcoming,
        disclaimer: 'Prediction — Decision support indicator only. Not a clinical judgment.',
      },
      forecast: forecast ? {
        ...forecast,
        disclaimer: 'Estimate — Based on historical payment trends.',
      } : null,
      scheduling: scheduling ? {
        ...scheduling,
        disclaimer: 'Recommendation — Based on historical booking patterns.',
      } : null,
      aiServiceHint: 'Some data may be stale or pending — refresh individual sections for live data.',
    }, 'AI Insights Dashboard data retrieved')
  );
});

// ── 9. AI Service health ──────────────────────────────────────────────────────

const checkAIHealth = asyncHandler(async (req, res) => {
  const alive = await aiService.isAlive();
  res.status(200).json(
    new ApiResponse(200, { aiServiceOnline: alive }, 'AI service health check')
  );
});

module.exports = {
  predictNoShow,
  getUpcomingWithRisk,
  analyzeSentiment,
  getClientEngagement,
  generateSoapDraft,
  getSchedulingRecommendations,
  getRevenueForecast,
  getAIInsightsDashboard,
  checkAIHealth,
};
