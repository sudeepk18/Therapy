"""
datasets/generate_synthetic_data.py
Generates synthetic session data for training the no-show prediction model.

RUN THIS ONCE to create synthetic_sessions.csv:
  cd ai-service
  python datasets/generate_synthetic_data.py

IMPORTANT:
  Data is ENTIRELY SYNTHETIC — it does not represent any real patient.
  It is designed to embed realistic patterns for proof-of-concept training:
  - Monday/Friday sessions have slightly higher no-show rates
  - Long lead times → slightly higher no-show rate
  - Clients with poor history → higher no-show rate
  - First-time clients have moderate uncertainty
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)
N = 2000

OUTPUT_PATH = Path(__file__).parent / "synthetic_sessions.csv"


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


# ── Generate features ─────────────────────────────────────────────────────────
day_of_week   = np.random.randint(0, 7, N)
hour_of_day   = np.random.choice(range(8, 21), N)  # 8 AM – 8 PM
booking_lead  = np.random.exponential(scale=5, size=N).clip(0, 30)  # 0-30 days
total_sessions = np.random.randint(0, 50, N)
no_show_history_rate = np.where(
    total_sessions == 0,
    np.random.beta(2, 5, N),  # New clients: moderate unknown risk
    np.random.beta(1.5, 6, N)  # Existing: mostly low, some high
)
days_since_last = np.where(
    total_sessions == 0,
    -1,
    np.random.exponential(scale=14, size=N).clip(0, 90),
)
is_video = np.random.choice([0, 1], N, p=[0.3, 0.7])

# ── Compute ground-truth no-show probability (latent) ────────────────────────
logit = (
    -1.5
    + 0.15 * np.isin(day_of_week, [0, 4]).astype(float)  # Mon/Fri higher risk
    + 0.05 * (booking_lead - 5) / 5                        # Lead time effect
    + 3.0  * no_show_history_rate                           # Strongest predictor
    - 0.02 * total_sessions.clip(0, 20)                    # Experienced clients less likely
    + 0.10 * (days_since_last > 30).astype(float)          # Long gap → higher risk
    - 0.20 * is_video                                       # Video slightly better attendance
)
prob = sigmoid(logit)
no_show = (np.random.random(N) < prob).astype(int)

df = pd.DataFrame({
    "day_of_week":                      day_of_week,
    "hour_of_day":                      hour_of_day,
    "booking_lead_days":                booking_lead.round(2),
    "client_historical_no_show_rate":   no_show_history_rate.round(4),
    "client_total_sessions":            total_sessions,
    "days_since_last_session":          np.where(days_since_last == -1, np.nan, days_since_last.round(1)),
    "is_video":                         is_video,
    "no_show":                          no_show,
})

df.to_csv(OUTPUT_PATH, index=False)
print(f"✅ Generated {N} synthetic records → {OUTPUT_PATH}")
print(f"   No-show rate: {df['no_show'].mean():.2%}")
print("\n⚠️  REMINDER: This is SYNTHETIC DATA only. Not real patient information.")
