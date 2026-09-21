# AI Intelligence Layer Architecture — UNFAZED

UNFAZED is an AI-enhanced therapist practice-management SaaS platform.
This document details the design, architecture, security model, and clinical boundaries of the AI/ML Intelligence Layer.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│             React Frontend (Vite + Recharts)           │
│  - No-Show Risk Badges on Session rows                 │
│  - AI SOAP Draft Generator Modal                       │
│  - Sentiment Indicators & Client Engagement Trends     │
│  - AI Insights Dashboard Section (Forecast & Slots)    │
└───────────────────────────▲────────────────────────────┘
                            │  HTTP (REST API + JWT)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Node.js / Express Backend (Port 5000)        │
│  - Authentication & Authorization (JWT + httpOnly)     │
│  - Entitlement & Feature-Gating (checkFeatureEnabled)  │
│  - Ownership & Permission enforcement                  │
│  - AI Gateway Controller (`ai.controller.js`)          │
│  - AI Internal Client (`ai.service.js`)                │
│  - Database Operations & Caching (`AIInsight.js`)      │
└───────────────────────────▲────────────────────────────┘
                            │  Internal HTTP (X-AI-Service-Key)
                            ▼
┌────────────────────────────────────────────────────────┐
│        Python FastAPI AI Inference Service (Port 8001)  │
│  - No-Show Risk Prediction (Logistic Regression)       │
│  - Session Note Sentiment Analysis (VADER NLP)         │
│  - SOAP Note Draft Generator (Rule-based NLP Engine)   │
│  - Revenue Forecaster (Linear Regression Model)        │
│  - Smart Scheduling Slot Recommender                   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Clinical and Ethical Boundaries

> [!IMPORTANT]
> **Decision-Support Only**: All AI outputs are strictly decision-support indicators and administrative assistants. They are **NEVER** presented as medical diagnoses, mental health assessments, psychiatric evaluations, or definitive clinical conclusions.

- **Labeling Standard**:
  - Predictions are labeled: `Prediction` (e.g. `No-Show Risk: LOW / MEDIUM / HIGH`)
  - Note drafts are labeled: `AI Draft — Review and edit before saving. NOT a clinical record.`
  - Revenue trends are labeled: `Estimate`
  - Slot suggestions are labeled: `Recommendation`
- **Therapist-in-the-Loop**: AI never auto-saves clinical records or modifies appointments automatically.
- **Client Privacy**: Clinical sentiment and attendance risk scores are therapist-only and are filtered out of all client-facing APIs (`/api/v1/portal/*`).

---

## 3. Security & Entitlement Model

1. **Authentication**: Handled exclusively by Node.js using JWT (`protect` middleware).
2. **Role-Based Access Control (RBAC)**: Handled by `restrictTo('therapist')`. Clients receive HTTP 403.
3. **Entitlement Layer**: Uses existing `SubscriptionTierConfig` feature flags via `checkFeatureEnabled(...)`.
   - `aiNoShowPrediction`
   - `aiSentimentAnalysis`
   - `aiNoteSuggestions` (for SOAP drafts)
   - `aiSmartScheduling`
   - `aiRevenueForecast`
4. **Internal Service Security**: Python FastAPI endpoints are protected by `X-AI-Service-Key` header matching `AI_SERVICE_API_KEY`.
5. **Graceful Degradation**: If the Python service is offline, Node.js returns `{ aiUnavailable: true }` with HTTP 200 without crashing the main application.

---

## 4. Models & Algorithms

| Feature | Technology / Algorithm | Key Inputs | Output |
|---|---|---|---|
| **No-Show Prediction** | Scikit-Learn Logistic Regression | Day of week, hour, lead days, historical no-show rate, prior sessions, days since last session, medium | Probability (0–1), Risk (`LOW`, `MEDIUM`, `HIGH`), `isLowConfidence` flag |
| **Sentiment Analysis** | VADER Sentiment Intensity Analyzer | Note text (Subjective / Objective / Content) | Compound score (-1.0 to 1.0), Label (`POSITIVE`, `NEUTRAL`, `NEGATIVE`) |
| **SOAP Note Draft** | Rule-Based Sentence Classifier | Therapist free-text session summary | Structured `subjective`, `objective`, `assessment`, `plan` draft |
| **Revenue Forecast** | Least-Squares Linear Regression | Monthly payment aggregations | Next month forecast, 3-month projection, Trend (`GROWING`, `STABLE`, `DECLINING`) |
| **Smart Scheduling** | Slot Utilization Pattern Analysis | Historical completed & no-show sessions | Ranked slot recommendations with confidence score and reasons |

---

## 5. Directory Structure

```
d:\Therapy\
├── ai-service\
│   ├── app\
│   │   ├── main.py                  # FastAPI app entry with API key guard & lifespan loader
│   │   ├── models\                  # Model wrappers (no-show, sentiment, revenue, SOAP)
│   │   ├── routes\                  # API route handlers (/predict, /generate, /recommend, /forecast)
│   │   ├── schemas\                 # Pydantic validation schemas
│   │   └── services\model_loader.py # Central model loader
│   ├── datasets\                    # Synthetic training dataset & generator
│   ├── training\                    # Scikit-learn training & evaluation scripts
│   ├── tests\                       # Pytest test suite
│   ├── requirements.txt             # Lightweight Python dependencies
│   ├── start.bat                    # Windows startup script
│   └── .env.example
├── backend\
│   ├── src\
│   │   ├── controllers\ai.controller.js  # Node.js AI endpoints controller
│   │   ├── services\ai.service.js        # Internal HTTP client for Python AI service
│   │   ├── routes\ai.routes.js           # Express routes with auth & tierLimit middleware
│   │   ├── models\AIInsight.js           # Mongoose model for cached aggregate insights
│   │   ├── models\Session.js             # Extended with aiRisk sub-schema
│   │   ├── models\SessionNote.js         # Extended with aiSentiment sub-schema
│   │   └── models\SubscriptionTierConfig.js # Extended with AI feature flags
├── frontend\
│   ├── src\
│   │   ├── api\ai.api.js                 # Axios API calls to Node.js backend
│   │   ├── components\ai\
│   │   │   ├── AIInsightsSection.jsx     # Collapsible AI dashboard panel
│   │   │   ├── NoShowRiskBadge.jsx       # Color-coded risk badge
│   │   │   ├── SoapDraftModal.jsx        # AI SOAP draft editor modal
│   │   │   ├── RevenueForecastChart.jsx  # Recharts forecast chart
│   │   │   ├── EngagementTrendChart.jsx  # Client sentiment timeline chart
│   │   │   └── ai-insights.css           # Design-token aligned styles
```

---

## 6. How to Run the AI Service

### Prerequisites
- Python 3.10+ installed

### Setup & Startup
```bash
# 1. Install dependencies
cd ai-service
pip install -r requirements.txt

# 2. Generate synthetic data & train the no-show model
python datasets/generate_synthetic_data.py
python training/train_no_show.py

# 3. Run unit tests
pytest tests/ -v

# 4. Start the FastAPI server
# On Windows:
start.bat
# Or manually:
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
